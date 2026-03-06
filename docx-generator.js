/*     This file is part of Quiz Keeper, a test generation and question bank tool. (C) 2026 by Mark Bryant.

    Quiz Keeper is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    Quiz Keeper is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Quiz Keeper. If not, see <https://www.gnu.org/licenses/>. */

// DOCX Generation Module
// Uses docx library to generate Word documents

class DOCXGenerator {
    constructor() {
        this.Document = null;
        this.Paragraph = null;
        this.TextRun = null;
        this.AlignmentType = null;
        this.HeadingLevel = null;
        this.Packer = null;
        this.Table = null;
        this.TableRow = null;
        this.TableCell = null;
        this.WidthType = null;
        this.BorderStyle = null;
    }

    // Initialize docx library classes
    init() {
        if (window.docx) {
            const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer,
                    Table, TableRow, TableCell, WidthType, BorderStyle,
                    Footer, PageNumber, ImageRun } = window.docx;
            this.Document = Document;
            this.Paragraph = Paragraph;
            this.TextRun = TextRun;
            this.AlignmentType = AlignmentType;
            this.HeadingLevel = HeadingLevel;
            this.Packer = Packer;
            this.Table = Table;
            this.TableRow = TableRow;
            this.TableCell = TableCell;
            this.WidthType = WidthType || {};
            this.BorderStyle = BorderStyle || {};
            this.Footer = Footer;
            this.PageNumber = PageNumber;
            this.ImageRun = ImageRun;
        } else {
            throw new Error('docx library not loaded');
        }
    }

    // Create title paragraph
    createTitle(text) {
        return new this.Paragraph({
            children: [
                new this.TextRun({
                    text: text,
                    bold: true,
                    size: 22  // 11pt
                })
            ],
            alignment: this.AlignmentType.CENTER,
            spacing: { before: 0, after: 120 }
        });
    }

    // Create heading paragraph
    createHeading(text, showHr = true) {
        return new this.Paragraph({
            children: [
                new this.TextRun({
                    text: text,
                    bold: true,
                    size: 22  // 11pt
                })
            ],
            spacing: { before: 120, after: 80 },
            keepNext: true,  // prevent orphaned header at bottom of page
            border: showHr ? {
                bottom: { color: '000000', style: 'single', size: 6 }
            } : undefined
        });
    }

    // Create normal paragraph
    createParagraph(text, options = {}) {
        return new this.Paragraph({
            children: [
                new this.TextRun({
                    text: text,
                    bold: options.bold || false,
                    italics: options.italic || false,
                    size: options.size || 22  // default 11pt (22 half-points)
                })
            ],
            spacing: options.spacing || { after: 100 },
            indent: options.indent || {}
        });
    }

    // Create bullet point
    createBullet(text, level = 0) {
        return new this.Paragraph({
            text: text,
            bullet: { level: level },
            spacing: { after: 50 }
        });
    }

    // Generate test DOCX
    async generateTestDOCX(testData, includeAnswers = false, paperSize = 'letter') {
        this.init();

        // Pre-load images for embedding
        const imageCache = {};
        for (const q of testData.questions) {
            if (q.imageUrl && !imageCache[q.imageUrl]) {
                imageCache[q.imageUrl] = await this.fetchImageForDocx(q.imageUrl);
            }
        }

        const sections = [];

        // Name line / do not write (top left, before title)
        if (testData.showNameLine) {
            sections.push(this.createParagraph('Name: _______________________________', { spacing: { after: 80 } }));
        }
        if (testData.doNotWrite) {
            sections.push(this.createParagraph('Do not write on this exam', { bold: true, italic: true, spacing: { after: 80 } }));
        }

        // Title and metadata
        sections.push(this.createTitle(testData.title));
        if (testData.showDate ?? false)
            sections.push(this.createParagraph(`Date: ${testData.date || new Date().toLocaleDateString()}`));
        if ((testData.showSubject ?? false) && testData.subject)
            sections.push(this.createParagraph(`Subject: ${testData.subject}`));
        if ((testData.showClass ?? true) && testData.class)
            sections.push(this.createParagraph(`Class: ${testData.class}`));
        if ((testData.showVersion ?? false) && testData.version)
            sections.push(this.createParagraph(`Version: ${testData.version}`));
        if (testData.showTotalQuestions ?? false)
            sections.push(this.createParagraph(`Total Questions: ${testData.questions.length}`));
        if ((testData.showCustomFields ?? false) && testData.customFields && testData.customFields.length > 0) {
            testData.customFields.forEach(f => sections.push(this.createParagraph(`${f.label}: ${f.value}`)));
        }

        // Instructions
        if (testData.showInstructions ?? false) {
            const instr = testData.instructions || 'Instructions: Please answer all questions to the best of your ability. Show your work where applicable.';
            sections.push(this.createParagraph(instr, { italic: true, spacing: { after: 200 } }));
        }

        // Group questions by type
        const questionsByType = {
            'multiple-choice': [],
            'true-false': [],
            'short-answer': [],
            'matching': [],
            'table': [],
            'essay': []
        };

        testData.questions.forEach(q => {
            if (questionsByType[q.type]) {
                questionsByType[q.type].push(q);
            }
        });

        const typeLabels = {
            'multiple-choice': 'Multiple Choice',
            'true-false': 'True/False',
            'short-answer': 'Short Answer',
            'essay': 'Essay',
            'matching': 'Matching',
            'table': 'Table'
        };

        let questionNumber = 1;

        // Render each section
        for (const [type, questions] of Object.entries(questionsByType)) {
            if (questions.length === 0) continue;

            sections.push(this.createHeading(typeLabels[type], testData.showSectionHr ?? true));
            
            // Add section-specific instructions if they exist
            if (testData.sectionInstructions && testData.sectionInstructions[type]) {
                sections.push(this.createParagraph(testData.sectionInstructions[type], {
                    italic: true,
                    spacing: { after: 200 }
                }));
            }

            questions.forEach(question => {
                // Collect all items for this question as specs, then build with keepLines/keepNext
                // so Word never splits a question across pages.
                const qItems = []; // { kind:'para', args } | { kind:'table', obj }
                const addPara  = (args) => qItems.push({ kind: 'para', args });
                const addTable = (obj)  => qItems.push({ kind: 'table', obj });

                // Question number and text
                addPara({
                    children: [
                        new this.TextRun({ text: `${questionNumber}. `, bold: true, size: 22 }),
                        new this.TextRun({ text: question.text, size: 22 })
                    ],
                    spacing: { before: 80, after: 80 }
                });

                // Image (if present)
                if (question.imageUrl && imageCache[question.imageUrl] && this.ImageRun) {
                    try {
                        const imgData = imageCache[question.imageUrl];
                        const scale = (question.imageWidth || 100) / 100 * 1.75; // +75% vs preview
                        const maxWidthPx = 576; // ~6 inches at 96dpi
                        let w = Math.round(imgData.width * scale);
                        let h = Math.round(imgData.height * scale);
                        if (w > maxWidthPx) { h = Math.round(h * maxWidthPx / w); w = maxWidthPx; }
                        addPara({
                            children: [new this.ImageRun({
                                data: imgData.dataUrl,
                                type: 'png',
                                transformation: { width: w, height: h }
                            })],
                            spacing: { after: 80 }
                        });
                    } catch (e) { /* skip if image can't be embedded */ }
                }

                // Render based on question type
                switch (type) {
                    case 'multiple-choice': {
                        const allShort = question.choices.length <= 4 && question.choices.every(c => c.text.length <= 12);
                        if (allShort) {
                            const runs = [];
                            question.choices.forEach((choice, index) => {
                                const letter = String.fromCharCode(65 + index);
                                if (index > 0) runs.push(new this.TextRun({ text: '        ', size: 22 }));
                                runs.push(new this.TextRun({
                                    text: `${letter}. ${choice.text}`,
                                    bold: choice.correct && includeAnswers,
                                    size: 22
                                }));
                            });
                            addPara({ children: runs, indent: { left: 720 }, spacing: { after: 100 } });
                        } else {
                            question.choices.forEach((choice, index) => {
                                const letter = String.fromCharCode(65 + index);
                                addPara({
                                    children: [new this.TextRun({
                                        text: `${letter}. ${choice.text}`,
                                        bold: choice.correct && includeAnswers,
                                        size: 22
                                    })],
                                    indent: { left: 720 },
                                    spacing: { after: 50 }
                                });
                            });
                        }
                        if (includeAnswers) {
                            const correctIndex = question.choices.findIndex(c => c.correct);
                            const correctLetter = String.fromCharCode(65 + correctIndex);
                            addPara({
                                children: [new this.TextRun({ text: `Answer: ${correctLetter}`, bold: true, size: 22 })],
                                indent: { left: 720 },
                                spacing: { after: 100 }
                            });
                        }
                        break;
                    }

                    case 'true-false':
                        addPara({
                            children: [new this.TextRun({ text: 'True        False', size: 22 })],
                            indent: { left: 720 },
                            spacing: { after: 100 }
                        });
                        if (includeAnswers) {
                            addPara({
                                children: [new this.TextRun({ text: `Answer: ${question.answer ? 'True' : 'False'}`, bold: true, size: 22 })],
                                indent: { left: 720 },
                                spacing: { after: 100 }
                            });
                        }
                        break;

                    case 'short-answer':
                        if (includeAnswers && question.answer) {
                            addPara({ children: [new this.TextRun({ text: 'Sample Answer:', italics: true, size: 22 })], indent: { left: 720 }, spacing: { after: 50 } });
                            addPara({ children: [new this.TextRun({ text: question.answer, size: 22 })], indent: { left: 720 }, spacing: { after: 100 } });
                        } else if (testData.showAnswerLinesSA ?? testData.showAnswerLines ?? false) {
                            addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 50 } });
                            addPara({ children: [new this.TextRun({ text: '_'.repeat(80), size: 22 })], spacing: { after: 50 } });
                            addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 100 } });
                        } else {
                            addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 400 } });
                        }
                        break;

                    case 'essay':
                        if (includeAnswers && question.rubric) {
                            addPara({ children: [new this.TextRun({ text: 'Grading Rubric:', italics: true, size: 22 })], indent: { left: 720 }, spacing: { after: 50 } });
                            addPara({ children: [new this.TextRun({ text: question.rubric, size: 22 })], indent: { left: 720 }, spacing: { after: 100 } });
                        } else if (testData.showAnswerLinesEssay ?? testData.showAnswerLines ?? false) {
                            for (let i = 0; i < 5; i++) {
                                addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 50 } });
                                addPara({ children: [new this.TextRun({ text: '_'.repeat(80), size: 22 })], spacing: { after: 50 } });
                            }
                            addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 100 } });
                        } else {
                            for (let i = 0; i < 5; i++) {
                                addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 240 } });
                            }
                        }
                        break;

                    case 'matching': {
                        if (!question.originalPairs) {
                            question.originalPairs = [...question.pairs];
                        }
                        const rightItems = question.pairs.map(pair => pair.right);
                        const shuffledRight = this.shuffleArray(rightItems);

                        // Use a borderless 2-column table so each side has its own
                        // wrapping column and long items can never bleed across sides.
                        const noBorder = { style: 'nil', size: 0, color: 'FFFFFF' };
                        const colW = 4320; // 4320 dxa ≈ 3 in; two columns = 8640 (~6 in usable)

                        const matchRows = question.pairs.map((pair, index) => {
                            return new this.TableRow({
                                cantSplit: true,
                                children: [
                                    new this.TableCell({
                                        width: { size: colW, type: 'dxa' },
                                        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                                        margins: { top: 0, bottom: 0, left: 100, right: 100 },
                                        children: [new this.Paragraph({
                                            spacing: { after: 60 },
                                            children: [new this.TextRun({
                                                text: `${index + 1}.  ${pair.left}`,
                                                size: 22
                                            })]
                                        })]
                                    }),
                                    new this.TableCell({
                                        width: { size: colW, type: 'dxa' },
                                        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                                        margins: { top: 0, bottom: 0, left: 100, right: 100 },
                                        children: [new this.Paragraph({
                                            spacing: { after: 60 },
                                            children: [new this.TextRun({
                                                text: `${String.fromCharCode(65 + index)}.  ${shuffledRight[index]}`,
                                                size: 22
                                            })]
                                        })]
                                    })
                                ]
                            });
                        });

                        addTable(new this.Table({
                            rows: matchRows,
                            width: { size: colW * 2, type: 'dxa' },
                            indent: { size: 360, type: 'dxa' },
                            borders: {
                                top: noBorder, bottom: noBorder,
                                left: noBorder, right: noBorder,
                                insideH: noBorder, insideV: noBorder
                            }
                        }));

                        if (includeAnswers) {
                            addPara({
                                children: [new this.TextRun({ text: 'Answers:', bold: true, size: 22 })],
                                indent: { left: 1440 },
                                spacing: { before: 200, after: 100 }
                            });
                            question.pairs.forEach((pair, index) => {
                                const shuffledIndex = shuffledRight.indexOf(pair.right);
                                const letter = String.fromCharCode(65 + shuffledIndex);
                                addPara({
                                    children: [new this.TextRun({ text: `${index + 1} \u2192 ${letter}`, size: 22 })],
                                    indent: { left: 1440 },
                                    spacing: { after: 50 }
                                });
                            });
                        } else {
                            addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 100 } });
                        }
                        break;
                    }

                    case 'table': {
                        if (question.tableData && question.tableData.cells && this.Table) {
                            const colCount = question.tableData.cols || (question.tableData.cells[0] ? question.tableData.cells[0].length : 1);
                            const pageWidthDxa = 9000;
                            const cellWidthDxa = Math.floor(pageWidthDxa / colCount);
                            const lastRowIndex = question.tableData.cells.length - 1;

                            const tableRows = question.tableData.cells.map((row, rowIndex) => {
                                const keepNextRow = rowIndex < lastRowIndex;
                                const tableCells = row.map(cell => {
                                    const isQuestion = cell.question !== undefined ? cell.question : cell.bold;
                                    const showText = isQuestion || includeAnswers;
                                    return new this.TableCell({
                                        width: { size: cellWidthDxa, type: 'dxa' },
                                        children: [
                                            new this.Paragraph({
                                                keepNext: keepNextRow,
                                                children: [new this.TextRun({
                                                    text: showText ? (cell.text || '') : '',
                                                    bold: cell.bold || false,
                                                    size: 20
                                                })]
                                            })
                                        ]
                                    });
                                });
                                return new this.TableRow({ children: tableCells, cantSplit: true });
                            });

                            addTable(new this.Table({ rows: tableRows, width: { size: pageWidthDxa, type: 'dxa' } }));
                        }
                        // Blank after table (inside case — preserved from original)
                        addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 100 } });
                        break;
                    }
                }

                // Trailing blank separator between questions
                addPara({ children: [new this.TextRun({ text: '', size: 22 })], spacing: { after: 100 } });

                // Find last para index — the chain (keepNext) stops here so page breaks CAN
                // happen between questions but NOT within a question.
                let lastParaIdx = -1;
                for (let i = qItems.length - 1; i >= 0; i--) {
                    if (qItems[i].kind === 'para') { lastParaIdx = i; break; }
                }

                qItems.forEach((item, i) => {
                    if (item.kind === 'para') {
                        const isLast = i === lastParaIdx;
                        sections.push(new this.Paragraph({
                            ...item.args,
                            keepLines: true,       // prevent a single paragraph's lines from splitting
                            keepNext: !isLast      // chain all paragraphs of this question together
                        }));
                    } else {
                        // Table: the preceding question-text paragraph has keepNext:true,
                        // which keeps it anchored to the table in Word.
                        sections.push(item.obj);
                    }
                });

                questionNumber++;
            });
        }

        // Add answer key if requested
        if (includeAnswers) {
            sections.push(this.createHeading('Answer Key', this.HeadingLevel.HEADING_1));
            sections.push(this.createParagraph(''));

            questionNumber = 1;
            for (const [type, questions] of Object.entries(questionsByType)) {
                if (questions.length === 0) continue;

                sections.push(this.createHeading(typeLabels[type], this.HeadingLevel.HEADING_2));

                questions.forEach(question => {
                    let answerText = `${questionNumber}. `;
                    
                    switch (type) {
                        case 'multiple-choice':
                            const correctIndex = question.choices.findIndex(c => c.correct);
                            answerText += String.fromCharCode(65 + correctIndex);
                            break;
                        case 'true-false':
                            answerText += question.answer ? 'True' : 'False';
                            break;
                        case 'short-answer':
                            answerText += question.answer || 'See rubric';
                            break;
                        case 'essay':
                            answerText += 'See rubric';
                            break;
                        case 'matching':
                            answerText += 'Answers shown with question above';
                            break;
                        case 'table':
                            answerText += 'Table answers shown with question above';
                            break;
                    }
                    
                    sections.push(this.createParagraph(answerText, { 
                        bold: true,
                        spacing: { after: 50 }
                    }));
                    questionNumber++;
                });
            }
        }

        // Create document
        const doc = new this.Document({
            styles: {
                default: {
                    document: {
                        run: { size: 22 }
                    }
                },
                paragraphStyles: [
                    {
                        id: 'Normal',
                        name: 'Normal',
                        run: { size: 22, font: 'Calibri' },
                        paragraph: {}
                    }
                ]
            },
            sections: [{
                properties: {
                    page: {
                        size: paperSize === 'a4'
                            ? { width: 11906, height: 16838 } // A4: 210mm × 297mm in twips
                            : { width: 12240, height: 15840 } // US Letter: 8.5" × 11" in twips
                    }
                },
                ...(testData.showPageNumbers ?? true ? {
                    footers: {
                        default: new this.Footer({
                            children: [
                                new this.Paragraph({
                                    alignment: this.AlignmentType.CENTER,
                                    children: [
                                        new this.TextRun({
                                            children: ['Page ', this.PageNumber.CURRENT, ' of ', this.PageNumber.TOTAL_PAGES]
                                        })
                                    ]
                                })
                            ]
                        })
                    }
                } : {}),
                children: sections
            }]
        });

        // Generate and download
        const blob = await this.Packer.toBlob(doc);
        const _prefix = (testData.class || testData.subject || '').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const _title  = (testData.title || 'Test').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const _date   = new Date().toISOString().slice(0, 10);
        const filename = [_prefix, _title, _date].filter(Boolean).join('_') + '.docx';
        this.downloadBlob(blob, filename);
    }

    // Generate question bank DOCX
    async generateQuestionBankDOCX(questions, title = 'Question Bank') {
        this.init();

        const sections = [];

        sections.push(this.createTitle(title));
        sections.push(this.createParagraph(`Total Questions: ${questions.length}`));
        sections.push(this.createParagraph(`Generated: ${new Date().toLocaleDateString()}`));
        sections.push(this.createParagraph(''));

        questions.forEach((question, index) => {
            sections.push(this.createHeading(`Question ${index + 1}`, this.HeadingLevel.HEADING_2));
            
            sections.push(this.createParagraph(`Type: ${question.type}`, { 
                italic: true,
                spacing: { after: 50 }
            }));
            
            if (question.subject) {
                sections.push(this.createParagraph(`Subject: ${question.subject}`, { 
                    italic: true,
                    spacing: { after: 50 }
                }));
            }
            
            sections.push(this.createParagraph(question.text));
            sections.push(this.createParagraph(''));
        });

        const doc = new this.Document({
            styles: {
                default: {
                    document: {
                        run: { size: 22 }
                    }
                },
                paragraphStyles: [
                    {
                        id: 'Normal',
                        name: 'Normal',
                        run: { size: 22, font: 'Calibri' },
                        paragraph: {}
                    }
                ]
            },
            sections: [{
                properties: {},
                children: sections
            }]
        });

        const blob = await this.Packer.toBlob(doc);
        const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
        this.downloadBlob(blob, filename);
    }

    // Helper method to download blob
    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Load an image from a URL and return { dataUrl, width, height } or null.
    // Uses a canvas so jsPDF/docx can embed it; CORS headers required for cross-origin images.
    fetchImageForDocx(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    resolve({
                        dataUrl: canvas.toDataURL('image/png'),
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    });
                } catch (e) { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // Utility method to shuffle array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Create and export instance
const docxGenerator = new DOCXGenerator();
