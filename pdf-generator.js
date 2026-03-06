/*     This file is part of Quiz Keeper, a test generation and question bank tool. (C) 2026 by Mark Bryant.

    Quiz Keeper is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    Quiz Keeper is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Quiz Keeper. If not, see <https://www.gnu.org/licenses/>. */

// PDF Generation Module
// Uses jsPDF library to generate PDF documents

class PDFGenerator {
    constructor() {
        this.doc = null;
        this.currentY = 20;
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 20;
        this.maxWidth = this.pageWidth - (this.margin * 2);
    }

    // Initialize new PDF document
    init() {
        const { jsPDF } = window.jspdf;
        this.doc = new jsPDF();
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
        this.currentY = 15;
    }

    // Estimate the rendered height (mm) of a question so we can avoid mid-question page breaks
    estimateQuestionHeight(question, type, testData, includeAnswers, imageCache = {}) {
        const lineH   = 6;   // mm per text line
        const itemH   = 8;   // mm per choice / bullet row
        const answerLineH = 8; // mm per drawn answer line

        // Question text lines
        const textLines = this.doc.splitTextToSize(question.text, this.maxWidth - 10);
        let h = textLines.length * lineH + 8; // +8 for post-text spacing

        // Image height
        if (question.imageUrl && imageCache[question.imageUrl]) {
            const imgData = imageCache[question.imageUrl];
            const mmPerPx = 25.4 / 96;
            const scale = (question.imageWidth || 100) / 100 * 1.75; // +75% vs preview
            const maxW = this.maxWidth - 10;
            let iW = imgData.naturalWidth * mmPerPx * scale;
            let iH = imgData.naturalHeight * mmPerPx * scale;
            if (iW > maxW) { iH *= maxW / iW; }
            h += iH + 8;
        }

        switch (type) {
            case 'multiple-choice': {
                const allShort = question.choices.length <= 4 &&
                    question.choices.every(c => c.text.length <= 12);
                if (allShort) {
                    h += itemH;
                } else {
                    question.choices.forEach(c => {
                        const lines = this.doc.splitTextToSize(c.text, this.maxWidth - 13);
                        h += lines.length * lineH + 2;
                    });
                }
                if (includeAnswers) h += itemH;
                break;
            }
            case 'true-false':
                h += itemH;
                if (includeAnswers) h += itemH;
                break;
            case 'short-answer':
                if (includeAnswers && question.answer) {
                    const aLines = this.doc.splitTextToSize(question.answer, this.maxWidth);
                    h += 6 + aLines.length * lineH + 4;
                } else if (testData.showAnswerLinesSA ?? testData.showAnswerLines ?? false) {
                    h += 2 * answerLineH + 3;
                } else {
                    h += 16;
                }
                break;
            case 'essay':
                if (includeAnswers && question.rubric) {
                    const rLines = this.doc.splitTextToSize(question.rubric, this.maxWidth);
                    h += 6 + rLines.length * lineH + 4;
                } else if (testData.showAnswerLinesEssay ?? testData.showAnswerLines ?? false) {
                    h += 5 * answerLineH + 3;
                } else {
                    h += 40;
                }
                break;
            case 'matching':
                h += question.pairs.length * lineH + 5;
                if (includeAnswers) h += question.pairs.length * lineH + 11;
                break;
            case 'table': {
                if (question.tableData && question.tableData.cells) {
                    h += question.tableData.cells.length * 8 + 3;
                }
                break;
            }
        }

        h += 5; // post-question spacing
        return h;
    }

    // Check if we need a new page
    checkPageBreak(requiredSpace = 20) {
        if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.currentY = 20;
            return true;
        }
        return false;
    }

    // Add title to document
    addTitle(title) {
        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'bold');
        const safe = this.sanitizeText(title);
        const textWidth = this.doc.getTextWidth(safe);
        const x = (this.pageWidth - textWidth) / 2;
        this.doc.text(safe, x, this.currentY);
        this.currentY += 10;
    }

    // Add section header
    addSectionHeader(header, showHr = true) {
        // Reserve space for header + at least one question so the header is never the last line on a page
        this.checkPageBreak(50);
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(this.sanitizeText(header), this.margin, this.currentY);
        this.currentY += 5;
        if (showHr) {
            this.doc.setLineWidth(0.5);
            this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        }
        this.currentY += 5;
    }

    // Add text with word wrapping
    addText(text, fontSize = 11, style = 'normal') {
        this.doc.setFontSize(fontSize);
        this.doc.setFont('helvetica', style);
        
        const lines = this.doc.splitTextToSize(this.sanitizeText(text), this.maxWidth);
        
        for (let line of lines) {
            this.checkPageBreak(8);
            this.doc.text(line, this.margin, this.currentY);
            this.currentY += 6;
        }
        
        this.currentY += 2; // Extra spacing after text
    }

    // Add bullet point
    addBullet(text, indent = 0) {
        this.checkPageBreak(8);
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
        
        const x = this.margin + indent;
        const bulletX = x;
        const textX = x + 8;
        
        this.doc.text('•', bulletX, this.currentY);
        
        const lines = this.doc.splitTextToSize(this.sanitizeText(text), this.maxWidth - 8 - indent);
        for (let i = 0; i < lines.length; i++) {
            this.checkPageBreak(6);
            this.doc.text(lines[i], textX, this.currentY);
            this.currentY += 6;
        }
        
        this.currentY += 2;
    }

    // Add blank lines for answers
    addAnswerSpace(lines = 3) {
        this.checkPageBreak(lines * 8);
        for (let i = 0; i < lines; i++) {
            this.doc.setLineWidth(0.3);
            this.doc.line(this.margin, this.currentY + 5, this.pageWidth - this.margin, this.currentY + 5);
            this.currentY += 8;
        }
        this.currentY += 3;
    }

    // Pre-load images for all questions that have an imageUrl.
    // Returns a map of url -> { dataUrl, naturalWidth, naturalHeight } (or null on failure).
    async preloadTestImages(questions) {
        const imageCache = {};
        const urls = [...new Set(questions.filter(q => q.imageUrl).map(q => q.imageUrl))];
        await Promise.all(urls.map(async url => {
            imageCache[url] = await this.loadImageForPdf(url);
        }));
        return imageCache;
    }

    loadImageForPdf(url) {
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
                        dataUrl: canvas.toDataURL('image/jpeg', 0.88),
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight
                    });
                } catch (e) { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // Generate test PDF
    async generateTestPDF(testData, includeAnswers = false) {
        this.init();

        // Pre-load images
        const imageCache = await this.preloadTestImages(testData.questions);

        // Name line / do not write (top left, before title)
        if (testData.showNameLine || testData.doNotWrite) {
            this.doc.setFontSize(11);
            if (testData.showNameLine) {
                this.doc.setFont('helvetica', 'normal');
                this.doc.text('Name: _______________________________', this.margin, this.currentY);
                this.currentY += 8;
            }
            if (testData.doNotWrite) {
                this.doc.setFont('helvetica', 'bolditalic');
                this.doc.text('Do not write on this exam', this.margin, this.currentY);
                this.doc.setFont('helvetica', 'normal');
                this.currentY += 8;
            }
        }

        // Add title
        this.addTitle(testData.title);

        // Add metadata fields based on show flags
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
        if (testData.showDate ?? false) {
            this.doc.text(this.sanitizeText(`Date: ${testData.date || new Date().toLocaleDateString()}`), this.margin, this.currentY);
            this.currentY += 6;
        }
        if ((testData.showSubject ?? false) && testData.subject) {
            this.doc.text(this.sanitizeText(`Subject: ${testData.subject}`), this.margin, this.currentY);
            this.currentY += 6;
        }
        if ((testData.showClass ?? true) && testData.class) {
            this.doc.text(this.sanitizeText(`Class: ${testData.class}`), this.margin, this.currentY);
            this.currentY += 6;
        }
        if ((testData.showVersion ?? false) && testData.version) {
            this.doc.text(this.sanitizeText(`Version: ${testData.version}`), this.margin, this.currentY);
            this.currentY += 6;
        }
        if (testData.showTotalQuestions ?? false) {
            this.doc.text(`Total Questions: ${testData.questions.length}`, this.margin, this.currentY);
            this.currentY += 6;
        }
        if ((testData.showCustomFields ?? false) && testData.customFields && testData.customFields.length > 0) {
            testData.customFields.forEach(f => {
                this.doc.text(this.sanitizeText(`${f.label}: ${f.value}`), this.margin, this.currentY);
                this.currentY += 6;
            });
        }
        this.currentY += 3;

        // Instructions
        if (testData.showInstructions ?? false) {
            const instr = testData.instructions || 'Instructions: Please answer all questions to the best of your ability. Show your work where applicable.';
            this.addText(instr, 11, 'italic');
            this.currentY += 2;
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

            this.addSectionHeader(typeLabels[type], testData.showSectionHr ?? true);
            
            // Add section-specific instructions if they exist
            if (testData.sectionInstructions && testData.sectionInstructions[type]) {
                this.doc.setFontSize(11);
                this.doc.setFont('helvetica', 'italic');
                const instrLines = this.doc.splitTextToSize(this.sanitizeText(testData.sectionInstructions[type]), this.maxWidth);
                instrLines.forEach(line => {
                    this.checkPageBreak(6);
                    this.doc.text(line, this.margin, this.currentY);
                    this.currentY += 5;
                });
                this.currentY += 3;
                this.doc.setFont('helvetica', 'normal');
            }

            questions.forEach(question => {
                // Calculate full question height and ensure it starts on a page where it fits entirely
                const qHeight = this.estimateQuestionHeight(question, type, testData, includeAnswers, imageCache);
                this.checkPageBreak(qHeight);
                
                // Question number and text
                this.doc.setFontSize(11);
                this.doc.setFont('helvetica', 'bold');
                this.doc.text(`${questionNumber}.`, this.margin, this.currentY);
                
                this.doc.setFont('helvetica', 'normal');
                const questionLines = this.doc.splitTextToSize(this.sanitizeText(question.text), this.maxWidth - 10);
                questionLines.forEach((line, index) => {
                    if (index === 0) {
                        this.doc.text(line, this.margin + 10, this.currentY);
                    } else {
                        this.currentY += 6;
                        this.checkPageBreak(6);
                        this.doc.text(line, this.margin + 10, this.currentY);
                    }
                });
                this.currentY += 8;

                // Render image if present
                if (question.imageUrl && imageCache[question.imageUrl]) {
                    const imgData = imageCache[question.imageUrl];
                    const mmPerPx = 25.4 / 96;
                    const scale = (question.imageWidth || 100) / 100 * 1.75; // +75% vs preview
                    const maxW = this.maxWidth - 10;
                    let iW = imgData.naturalWidth * mmPerPx * scale;
                    let iH = imgData.naturalHeight * mmPerPx * scale;
                    if (iW > maxW) { iH *= maxW / iW; iW = maxW; }
                    this.checkPageBreak(iH + 5);
                    try {
                        this.doc.addImage(imgData.dataUrl, 'JPEG', this.margin + 5, this.currentY, iW, iH);
                        this.currentY += iH + 3;
                    } catch (e) { /* skip if image can't be embedded */ }
                }

                // Render based on question type
                switch (type) {
                    case 'multiple-choice': {
                        const allShort = question.choices.length <= 4 && question.choices.every(c => c.text.length <= 12);
                        if (allShort) {
                            this.doc.setFontSize(11);
                            this.doc.setFont('helvetica', 'normal');
                            const inline = question.choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}`).join('        ');
                            this.checkPageBreak(8);
                            this.doc.text(this.sanitizeText(inline), this.margin + 10, this.currentY);
                            this.currentY += 8;
                        } else {
                            this.doc.setFontSize(11);
                            this.doc.setFont('helvetica', 'normal');
                            question.choices.forEach((choice, index) => {
                                const letter = String.fromCharCode(65 + index);
                                const choiceText = `${letter}. ${this.sanitizeText(choice.text)}`;
                                const lines = this.doc.splitTextToSize(choiceText, this.maxWidth - 10);
                                lines.forEach(line => {
                                    this.checkPageBreak(7);
                                    this.doc.text(line, this.margin + 10, this.currentY);
                                    this.currentY += 7;
                                });
                            });
                            this.currentY += 1;
                        }
                        if (includeAnswers) {
                            const correctIndex = question.choices.findIndex(c => c.correct);
                            const correctLetter = String.fromCharCode(65 + correctIndex);
                            this.doc.setFont('helvetica', 'bold');
                            this.doc.text(`Answer: ${correctLetter}`, this.margin + 10, this.currentY);
                            this.currentY += 8;
                        }
                        break;
                    }

                    case 'true-false':
                        this.doc.setFontSize(11);
                        this.doc.text('True        False', this.margin + 10, this.currentY);
                        this.currentY += 8;
                        if (includeAnswers) {
                            this.doc.setFont('helvetica', 'bold');
                            this.doc.text(`Answer: ${question.answer ? 'True' : 'False'}`, this.margin + 10, this.currentY);
                            this.currentY += 8;
                        }
                        break;

                    case 'short-answer':
                        if (includeAnswers && question.answer) {
                            this.doc.setFontSize(11);
                            this.doc.setFont('helvetica', 'italic');
                            this.doc.text('Sample Answer:', this.margin + 10, this.currentY);
                            this.currentY += 6;
                            this.addText(question.answer, 11);
                        } else if (testData.showAnswerLinesSA ?? testData.showAnswerLines ?? false) {
                            this.addAnswerSpace(2);
                        } else {
                            this.currentY += 16;
                        }
                        break;

                    case 'essay':
                        if (includeAnswers && question.rubric) {
                            this.doc.setFontSize(11);
                            this.doc.setFont('helvetica', 'italic');
                            this.doc.text('Grading Rubric:', this.margin + 10, this.currentY);
                            this.currentY += 6;
                            this.addText(question.rubric, 11);
                        } else if (testData.showAnswerLinesEssay ?? testData.showAnswerLines ?? false) {
                            this.addAnswerSpace(5);
                        } else {
                            this.currentY += 40;
                        }
                        break;

                    case 'matching':
                        this.doc.setFontSize(11);
                        
                        // Store original pairs for answer key
                        if (!question.originalPairs) {
                            question.originalPairs = [...question.pairs];
                        }
                        
                        // Create shuffled right side for the test
                        const rightItems = question.pairs.map(pair => pair.right);
                        const shuffledRight = this.shuffleArray(rightItems);

                        // Calculate right column x based on longest left item
                        const maxLeftW = Math.max(
                            ...question.pairs.map((pair, i) =>
                                this.doc.getTextWidth(`${i + 1}. ${pair.left}`)
                            )
                        );
                        const rightColX = this.margin + 15 + maxLeftW + 12;
                        
                        question.pairs.forEach((pair, index) => {
                            const number = index + 1;
                            this.checkPageBreak(8);
                            this.doc.text(this.sanitizeText(`${number}. ${pair.left}`), this.margin + 15, this.currentY);
                            this.doc.text(this.sanitizeText(`${String.fromCharCode(65 + index)}. ${shuffledRight[index]}`), rightColX, this.currentY);
                            this.currentY += 6;
                        });
                        
                        if (includeAnswers) {
                            this.currentY += 5;
                            this.doc.setFont('helvetica', 'bold');
                            this.doc.text('Answers:', this.margin + 10, this.currentY);
                            this.currentY += 6;
                            this.doc.setFont('helvetica', 'normal');
                            
                            // Show correct mappings based on original pairs and shuffled positions
                            question.pairs.forEach((pair, index) => {
                                const correctRight = pair.right;
                                const shuffledIndex = shuffledRight.indexOf(correctRight);
                                const letter = String.fromCharCode(65 + shuffledIndex);
                                this.checkPageBreak(8);
                                this.doc.text(`${index + 1} -> ${letter}`, this.margin + 15, this.currentY);
                                this.currentY += 6;
                            });
                        } else {
                            this.currentY += 5;
                        }
                        break;

                    case 'table': {
                        if (question.tableData && question.tableData.cells) {
                            const { cells } = question.tableData;
                            const colCount = cells[0] ? cells[0].length : 0;
                            if (colCount > 0) {
                                const colW = Math.min((this.maxWidth - 10) / colCount, 45);
                                const cellH = 8;
                                const startX = this.margin + 10;
                                // Check if the entire table fits; if not, start a new page
                                const totalTableH = cells.length * cellH + 3;
                                this.checkPageBreak(totalTableH);
                                this.doc.setLineWidth(0.3);
                                this.doc.setDrawColor(80, 80, 80);
                                cells.forEach(row => {
                                    row.forEach((cell, ci) => {
                                        const x = startX + ci * colW;
                                        this.doc.rect(x, this.currentY - 5, colW, cellH);
                                        // backward compat: old data used bold as question flag
                                        const isQuestion = cell.question !== undefined ? cell.question : cell.bold;
                                        if (isQuestion || includeAnswers) {
                                            const style = cell.bold ? 'bold' : 'normal';
                                            this.doc.setFont('helvetica', style);
                                            this.doc.setFontSize(9);
                                            const txt = this.doc.splitTextToSize(this.sanitizeText(cell.text || ''), colW - 2);
                                            this.doc.text(txt[0] || '', x + 1, this.currentY - 0.5);
                                        }
                                    });
                                    this.doc.setFont('helvetica', 'normal');
                                    this.doc.setFontSize(11);
                                    this.currentY += cellH;
                                });
                                this.currentY += 3;
                            }
                        }
                        break;
                    }
                }

                this.currentY += 3;
                questionNumber++;
            });
        }

        // Add answer key section if requested
        if (includeAnswers) {
            this.doc.addPage();
            this.currentY = 15;
            this.addTitle('Answer Key');
            this.currentY += 6;

            questionNumber = 1;
            for (const [type, questions] of Object.entries(questionsByType)) {
                if (questions.length === 0) continue;

                this.addSectionHeader(typeLabels[type], true);

                questions.forEach(question => {
                    this.doc.setFontSize(11);
                    this.doc.setFont('helvetica', 'bold');
                    
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
                            answerText += this.sanitizeText(question.answer || 'See rubric');
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
                    
                    const answerLines = this.doc.splitTextToSize(this.sanitizeText(answerText), this.maxWidth);
                    answerLines.forEach(line => {
                        this.checkPageBreak(8);
                        this.doc.text(line, this.margin, this.currentY);
                        this.currentY += 6;
                    });
                    questionNumber++;
                });
            }
        }

        // Page numbers
        if (testData.showPageNumbers ?? true) {
            const pageCount = this.doc.getNumberOfPages();
            this.doc.setFontSize(9);
            this.doc.setFont('helvetica', 'normal');
            for (let i = 1; i <= pageCount; i++) {
                this.doc.setPage(i);
                const text = `Page ${i} of ${pageCount}`;
                const textW = this.doc.getTextWidth(text);
                this.doc.text(text, (this.pageWidth - textW) / 2, this.pageHeight - 8);
            }
        }

        // Save the PDF
        const _prefix = (testData.class || testData.subject || '').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const _title  = (testData.title || 'Test').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const _date   = new Date().toISOString().slice(0, 10);
        const filename = [_prefix, _title, _date].filter(Boolean).join('_') + '.pdf';
        this.doc.save(filename);
    }

    // Generate question bank PDF
    generateQuestionBankPDF(questions, title = 'Question Bank') {
        this.init();

        this.addTitle(title);
        this.doc.setFontSize(11);
        this.doc.text(`Total Questions: ${questions.length}`, this.margin, this.currentY);
        this.doc.text(`Generated: ${new Date().toLocaleDateString()}`, this.pageWidth - this.margin - 60, this.currentY);
        this.currentY += 15;

        questions.forEach((question, index) => {
            this.checkPageBreak(35);
            
            // Question number
            this.doc.setFontSize(11);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`Question ${index + 1}`, this.margin, this.currentY);
            this.currentY += 6;

            // Type badge
            this.doc.setFontSize(11);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(this.sanitizeText(`Type: ${question.type}`), this.margin, this.currentY);
            if (question.subject) {
                this.doc.text(this.sanitizeText(`Subject: ${question.subject}`), this.margin + 60, this.currentY);
            }
            this.currentY += 8;

            // Question text
            this.addText(question.text, 11);

            // Add a separator
            this.doc.setLineWidth(0.2);
            this.doc.setDrawColor(200, 200, 200);
            this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
            this.currentY += 10;
        });

        const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
        this.doc.save(filename);
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

    // Sanitize text for jsPDF's Latin-1 fonts.
    // Replaces Unicode characters that fall outside the Latin-1 range with readable ASCII equivalents
    // so jsPDF doesn't fall back to character-by-character rendering.
    sanitizeText(text) {
        if (!text) return '';
        return String(text)
            // Common arrows
            .replace(/\u2192/g, '->')      // →
            .replace(/\u2190/g, '<-')      // ←
            .replace(/\u2194/g, '<->')     // ↔
            .replace(/\u21D2/g, '=>')      // ⇒
            .replace(/\u21D0/g, '<=')      // ⇐
            .replace(/\u21D4/g, '<=>')     // ⇔
            .replace(/\u2191/g, '^')       // ↑
            .replace(/\u2193/g, 'v')       // ↓
            // Math / science
            .replace(/\u2248/g, '~=')      // ≈
            .replace(/\u2260/g, '!=')      // ≠
            .replace(/\u2264/g, '<=')      // ≤
            .replace(/\u2265/g, '>=')      // ≥
            .replace(/\u00B1/g, '+/-')     // ±
            .replace(/\u00D7/g, 'x')       // ×
            .replace(/\u00F7/g, '/')       // ÷
            .replace(/\u221E/g, 'inf')     // ∞
            .replace(/\u03B1/g, 'alpha')   // α
            .replace(/\u03B2/g, 'beta')    // β
            .replace(/\u03B3/g, 'gamma')   // γ
            .replace(/\u03B4/g, 'delta')   // δ
            .replace(/\u03B8/g, 'theta')   // θ
            .replace(/\u03BB/g, 'lambda')  // λ
            .replace(/\u03BC/g, 'mu')      // μ
            .replace(/\u03C0/g, 'pi')      // π
            .replace(/\u03C3/g, 'sigma')   // σ
            .replace(/\u03A3/g, 'Sigma')   // Σ
            .replace(/\u03A9/g, 'Omega')   // Ω
            // Quotes / punctuation
            .replace(/[\u2018\u2019]/g, "'")   // '' smart single quotes
            .replace(/[\u201C\u201D]/g, '"')   // "" smart double quotes
            .replace(/\u2013/g, '-')            // – en dash
            .replace(/\u2014/g, '--')           // — em dash
            .replace(/\u2026/g, '...')          // … ellipsis
            .replace(/\u00A0/g, ' ')            // non-breaking space
            // Superscripts / subscripts
            .replace(/\u00B2/g, '^2')   // ²
            .replace(/\u00B3/g, '^3')   // ³
            .replace(/\u00B9/g, '^1')   // ¹
            // Strip remaining non-Latin-1 characters (> U+00FF) that have no good ASCII equivalent
            .replace(/[^\x00-\xFF]/g, '?');
    }
}

// Create and export instance
const pdfGenerator = new PDFGenerator();
