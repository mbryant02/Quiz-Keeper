/*     This file is part of Quiz Keeper, a test generation and question bank tool. (C) 2026 by Mark Bryant.

    Quiz Keeper is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    Quiz Keeper is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Quiz Keeper. If not, see <https://www.gnu.org/licenses/>. */

// Main Application Logic
// Coordinates UI, database, and generation modules

class QuizKeeperApp {
    constructor() {
        this.currentView = 'questions';
        this.currentTest = null;
        this.editingQuestion = null;
        this.currentFilters = {
            searchTerm: '',
            type: '',
            subject: '',
            class: '',
            examPeriod: ''
        };
        this.questionTypeConfig = [
            { key: 'multiple-choice', label: 'Multiple Choice', countId: 'countMultipleChoice', rangeId: 'rangeMultipleChoice' },
            { key: 'true-false',      label: 'True/False',      countId: 'countTrueFalse',       rangeId: 'rangeTrueFalse'       },
            { key: 'short-answer',   label: 'Short Answer',    countId: 'countShortAnswer',     rangeId: 'rangeShortAnswer'     },
            { key: 'matching',       label: 'Matching',        countId: 'countMatching',        rangeId: 'rangeMatching'        },
            { key: 'table',          label: 'Table',           countId: 'countTable',           rangeId: 'rangeTable'           },
            { key: 'essay',          label: 'Essay',           countId: 'countEssay',           rangeId: 'rangeEssay'           }
        ];
    }

    // Initialize the application
    async init() {
        try {
            // Apply saved theme before anything renders
            this.applyTheme(localStorage.getItem('theme') || 'light');

            // Initialize database
            await db.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadQuestions();
            await this.updateFilters();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Theme toggle
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            this.applyTheme(current === 'dark' ? 'light' : 'dark');
        });

        // Header buttons
        document.getElementById('newQuestionBtn').addEventListener('click', () => {
            this.openQuestionModal();
        });

        document.getElementById('generateTestBtn').addEventListener('click', () => {
            this.openGenerateTestModal();
        });

        // Collection buttons
        document.getElementById('newSubjectBtn').addEventListener('click', () => {
            this.openSubjectModal();
        });

        document.getElementById('newClassBtn').addEventListener('click', () => {
            this.openClassModal();
        });

        document.getElementById('newExamPeriodBtn').addEventListener('click', () => {
            this.openExamPeriodModal();
        });

        // Question form
        document.getElementById('questionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuestion();
        });

        document.getElementById('questionType').addEventListener('change', (e) => {
            this.updateQuestionTypeOptions(e.target.value);
        });

        document.getElementById('numChoices').addEventListener('change', (e) => {
            this.updateChoicesInputs(parseInt(e.target.value));
        });

        document.getElementById('numPairs').addEventListener('change', (e) => {
            this.updatePairsInputs(parseInt(e.target.value));
        });

        document.getElementById('questionSubject').addEventListener('change', (e) => {
            this.updateQuestionClassOptions(e.target.value);
        });

        document.getElementById('questionClass').addEventListener('change', (e) => {
            const subject = document.getElementById('questionSubject').value;
            this.updateQuestionExamPeriodOptions(subject, e.target.value);
        });

        // Search and filters
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });

        document.getElementById('filterSubject').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('filterClass').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('filterExamPeriod').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('filterType').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('filterSubject').value = '';
            document.getElementById('filterClass').value = '';
            document.getElementById('filterExamPeriod').value = '';
            document.getElementById('filterType').value = '';
            this.currentFilters = { searchTerm: '', type: '', subject: '', class: '', examPeriod: '' };
            this.applyFilters();
        });

        // Generate test form
        document.getElementById('generateTestForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.previewTest();
        });

        document.getElementById('testSubject').addEventListener('change', (e) => {
            this.updateTestClassOptions(e.target.value);
        });

        document.getElementById('testClass').addEventListener('change', (e) => {
            const subject = document.getElementById('testSubject').value;
            this.updateTestExamPeriodOptions(subject, e.target.value);
        });

        document.getElementById('testExamPeriod').addEventListener('change', async () => {
            const subject   = document.getElementById('testSubject').value;
            const className = document.getElementById('testClass').value;
            const examPeriod = document.getElementById('testExamPeriod').value;
            await this.updateQuestionSliders(subject, className, examPeriod);
            await this.updateExamPeriodMixUI(subject, className, examPeriod);
        });

        // Test preview actions
        document.getElementById('editTestBtn').addEventListener('click', () => {
            this.openEditTestModal();
        });

        document.getElementById('exportTestBtn').addEventListener('click', () => {
            this.openExportModal();
        });

        document.getElementById('refreshQuestionsBtn').addEventListener('click', () => {
            this.refreshTestQuestions();
        });

        document.getElementById('randomizeQuestionsBtn').addEventListener('click', () => {
            this.randomizeTestQuestions();
        });

        document.getElementById('saveTestBtn').addEventListener('click', () => {
            this.saveTestToHistory();
        });

        // Test history search
        document.getElementById('testSearchBtn').addEventListener('click', () => {
            this.searchTestHistory();
        });

        document.getElementById('testSearchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.searchTestHistory();
            }
        });

        document.getElementById('clearTestSearchBtn').addEventListener('click', () => {
            document.getElementById('testSearchInput').value = '';
            this.loadTestHistory();
        });

        // Edit test modal search/filter
        document.getElementById('editTestSearchInput').addEventListener('keyup', () => {
            this.filterAvailableQuestions();
        });

        document.getElementById('editTestFilterSubject').addEventListener('change', () => {
            this.filterAvailableQuestions();
        });

        document.getElementById('editTestFilterClass').addEventListener('change', () => {
            this.filterAvailableQuestions();
        });

        document.getElementById('editTestFilterExamPeriod').addEventListener('change', () => {
            this.filterAvailableQuestions();
        });

        document.getElementById('editTestFilterType').addEventListener('change', () => {
            this.filterAvailableQuestions();
        });

        // Test editor toolbar actions
        document.getElementById('toggleEditModeBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
            this.applyFontSize(e.target.value);
        });

        document.getElementById('textColorPicker').addEventListener('change', (e) => {
            this.applyTextColor(e.target.value);
        });

        document.getElementById('boldBtn').addEventListener('click', () => {
            this.applyFormat('bold');
        });

        document.getElementById('italicBtn').addEventListener('click', () => {
            this.applyFormat('italic');
        });

        document.getElementById('underlineBtn').addEventListener('click', () => {
            this.applyFormat('underline');
        });

        document.getElementById('alignLeftBtn').addEventListener('click', () => {
            this.applyAlignment('left');
        });

        document.getElementById('alignCenterBtn').addEventListener('click', () => {
            this.applyAlignment('center');
        });

        document.getElementById('alignRightBtn').addEventListener('click', () => {
            this.applyAlignment('right');
        });

        document.getElementById('editMetadataBtn').addEventListener('click', () => {
            this.openEditMetadataModal();
        });

        document.getElementById('addCustomFieldBtn').addEventListener('click', () => {
            this.addCustomFieldToForm();
        });

        // Metadata form
        document.getElementById('metadataForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyMetadataChanges();
        });

        // Export actions
        document.getElementById('exportPdfBtn').addEventListener('click', () => {
            this.exportTest('pdf');
        });

        document.getElementById('exportDocxBtn').addEventListener('click', () => {
            this.exportTest('docx');
        });

        // Edit test actions
        document.getElementById('saveTestEditsBtn').addEventListener('click', () => {
            this.saveTestEdits();
        });

        // Subject and Class forms
        document.getElementById('subjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSubject();
        });

        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClass();
        });

        document.getElementById('examPeriodForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveExamPeriod();
        });

        document.getElementById('examPeriodSubject').addEventListener('change', (e) => {
            this.updateExamPeriodClassOptions(e.target.value);
        });

        // Database menu
        document.getElementById('databaseMenuBtn').addEventListener('click', () => {
            this.toggleDatabaseMenu();
        });

        document.getElementById('exportDatabaseBtn').addEventListener('click', () => {
            this.exportDatabase();
            this.closeDatabaseMenu();
        });

        document.getElementById('importDatabaseBtn').addEventListener('click', () => {
            this.openModal('importDatabaseModal');
            this.closeDatabaseMenu();
        });

        document.getElementById('clearDatabaseBtn').addEventListener('click', () => {
            this.openModal('clearDatabaseModal');
            this.closeDatabaseMenu();
        });

        document.getElementById('confirmImportBtn').addEventListener('click', () => {
            this.importDatabase();
        });

        document.getElementById('confirmClearBtn').addEventListener('click', () => {
            this.clearDatabase();
        });

        // Close database menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('databaseMenu');
            const btn = document.getElementById('databaseMenuBtn');
            if (menu.classList.contains('show') && !menu.contains(e.target) && !btn.contains(e.target)) {
                this.closeDatabaseMenu();
            }
        });

        // Modal close buttons
        document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Image URL preview
        document.getElementById('previewImageBtn').addEventListener('click', () => {
            this.previewQuestionImage();
        });
        document.getElementById('questionImageUrl').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.previewQuestionImage();
        });
        document.getElementById('questionImageWidth').addEventListener('input', (e) => {
            document.getElementById('imageWidthDisplay').textContent = e.target.value;
            const img = document.getElementById('imagePreviewImg');
            if (img) img.style.width = e.target.value + '%';
        });

        // Image browse button & file input
        document.getElementById('browseImageBtn').addEventListener('click', () => {
            document.getElementById('questionImageFile').click();
        });
        document.getElementById('questionImageFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadImageFile(file);
            e.target.value = '';
        });

        // Drag-and-drop onto the image drop zone
        const imageDropZone = document.getElementById('imageDropZone');
        imageDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            imageDropZone.classList.add('drag-over');
        });
        imageDropZone.addEventListener('dragleave', (e) => {
            if (!imageDropZone.contains(e.relatedTarget)) {
                imageDropZone.classList.remove('drag-over');
            }
        });
        imageDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            imageDropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImageFile(file);
            } else {
                // Dragged from browser (URL)
                const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                if (url && url.trim()) {
                    document.getElementById('questionImageUrl').value = url.trim();
                    this.previewQuestionImage();
                }
            }
        });
    }

    // View Management
    switchView(viewName) {
        this.currentView = viewName;
        
        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`).classList.add('active');

        // Load view data
        switch (viewName) {
            case 'questions':
                this.loadQuestions();
                break;
            case 'collections':
                this.loadCollections();
                break;
            case 'tests':
                this.loadTests();
                break;
        }
    }

    // Question Management
    async loadQuestions() {
        try {
            let questions = await db.filterQuestions(this.currentFilters);
            this.renderQuestions(questions);
        } catch (error) {
            console.error('Failed to load questions:', error);
            this.showToast('Failed to load questions', 'error');
        }
    }

    renderQuestions(questions) {
        const container = document.getElementById('questionsContainer');
        
        if (questions.length === 0) {
            container.innerHTML = '<p class="empty-state">No questions found.</p>';
            return;
        }

        container.innerHTML = questions.map(q => this.createQuestionCard(q)).join('');

        // Add event listeners to action buttons
        container.querySelectorAll('.edit-question-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.editQuestion(id);
            });
        });

        container.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteQuestion(id);
            });
        });
    }

    createQuestionCard(question) {
        const typeLabels = {
            'multiple-choice': 'Multiple Choice',
            'true-false': 'True/False',
            'short-answer': 'Short Answer',
            'essay': 'Essay',
            'matching': 'Matching',
            'table': 'Table'
        };

        const typeBadgeClass = `badge-${question.type}`;
        
        return `
            <div class="question-card">
                <div class="question-header">
                    <span class="question-type-badge ${typeBadgeClass}">
                        ${typeLabels[question.type]}
                    </span>
                    <div class="question-actions">
                        <button class="btn btn-secondary edit-question-btn" data-id="${question.id}">Edit</button>
                        <button class="btn btn-danger delete-question-btn" data-id="${question.id}">Delete</button>
                    </div>
                </div>
                <div class="question-text">${this.escapeHtml(question.text)}</div>
                ${question.imageUrl ? `<div class="question-image-wrapper"><img src="${this.escapeHtml(question.imageUrl)}" class="question-image" style="width:${question.imageWidth || 100}%" alt="Question image" onerror="this.closest('.question-image-wrapper').style.display='none'"></div>` : ''}
                <div class="question-meta">
                    ${question.subject ? `<span>📚 ${this.escapeHtml(question.subject)}</span>` : ''}
                    ${question.class ? `<span>📖 ${this.escapeHtml(question.class)}</span>` : ''}
                    ${question.examPeriod ? `<span>📋 ${this.escapeHtml(question.examPeriod)}</span>` : ''}
                    <span>📅 ${new Date(question.createdAt).toLocaleDateString()}</span>
                </div>
                ${this.createAnswerPreview(question)}
            </div>
        `;
    }

    createAnswerPreview(question) {
        let preview = '';
        
        switch (question.type) {
            case 'multiple-choice':
                preview = '<div class="answer-preview"><strong>Choices:</strong>';
                question.choices.forEach((choice, index) => {
                    const letter = String.fromCharCode(65 + index);
                    const className = choice.correct ? 'choice-item correct' : 'choice-item';
                    preview += `<div class="${className}">${letter}. ${this.escapeHtml(choice.text)}</div>`;
                });
                preview += '</div>';
                break;
                
            case 'true-false':
                preview = `<div class="answer-preview"><strong>Answer:</strong> ${question.answer ? 'True' : 'False'}</div>`;
                break;
                
            case 'short-answer':
                if (question.answer) {
                    preview = `<div class="answer-preview"><strong>Sample Answer:</strong> ${this.escapeHtml(question.answer)}</div>`;
                }
                break;
                
            case 'essay':
                if (question.rubric) {
                    preview = `<div class="answer-preview"><strong>Rubric:</strong> ${this.escapeHtml(question.rubric)}</div>`;
                }
                break;
                
            case 'matching':
                preview = '<div class="answer-preview"><strong>Pairs:</strong>';
                question.pairs.forEach((pair, index) => {
                    preview += `<div class="choice-item">${index + 1}. ${this.escapeHtml(pair.left)} → ${this.escapeHtml(pair.right)}</div>`;
                });
                preview += '</div>';
                break;

            case 'table':
                if (question.tableData) {
                    const { rows, cols } = question.tableData;
                    preview = `<div class="answer-preview"><strong>Table:</strong> ${rows} row${rows !== 1 ? 's' : ''} × ${cols} column${cols !== 1 ? 's' : ''}</div>`;
                }
                break;
        }
        
        return preview;
    }

    async openQuestionModal(question = null) {
        try {
            this.editingQuestion = question;
            const modal = document.getElementById('questionModal');
            const form = document.getElementById('questionForm');
            
            form.reset();
            
            // Populate subject dropdown
            await this.updateQuestionSubjectOptions();
            
            if (question) {
                document.getElementById('questionModalTitle').textContent = 'Edit Question';
                document.getElementById('questionType').value = question.type;
                document.getElementById('questionText').value = question.text;
                document.getElementById('questionSubject').value = question.subject || '';
                
                // Update class options based on selected subject
                if (question.subject) {
                    await this.updateQuestionClassOptions(question.subject);
                    document.getElementById('questionClass').value = question.class || '';
                    await this.updateQuestionExamPeriodOptions(question.subject, question.class || '');
                    document.getElementById('questionExamPeriod').value = question.examPeriod || '';
                } else {
                    await this.updateQuestionClassOptions('');
                }
                
                this.updateQuestionTypeOptions(question.type);
                
                // Load type-specific data
                switch (question.type) {
                    case 'multiple-choice':
                        document.getElementById('numChoices').value = question.choices.length;
                        this.updateChoicesInputs(question.choices.length);
                        question.choices.forEach((choice, index) => {
                            document.getElementById(`choice${index}`).value = choice.text;
                            if (choice.correct) {
                                document.getElementById(`correct${index}`).checked = true;
                            }
                        });
                        break;
                        
                    case 'true-false':
                        document.getElementById('tfAnswer').value = question.answer.toString();
                        break;
                        
                    case 'short-answer':
                        document.getElementById('shortAnswer').value = question.answer || '';
                        break;
                        
                    case 'essay':
                        document.getElementById('essayRubric').value = question.rubric || '';
                        break;
                        
                    case 'matching':
                        document.getElementById('numPairs').value = question.pairs.length;
                        this.updatePairsInputs(question.pairs.length);
                        question.pairs.forEach((pair, index) => {
                            document.getElementById(`left${index}`).value = pair.left;
                            document.getElementById(`right${index}`).value = pair.right;
                        });
                        break;

                    case 'table':
                        if (question.tableData) {
                            document.getElementById('tableCols').value = question.tableData.cols;
                            document.getElementById('tableRows').value = question.tableData.rows;
                            this.buildTableEditor(question.tableData.rows, question.tableData.cols, question.tableData.cells);
                        }
                        break;
                }
            } else {
                document.getElementById('questionModalTitle').textContent = 'New Question';
                this.updateQuestionTypeOptions('multiple-choice');
                await this.updateQuestionClassOptions('');
            }

            // Image fields
            const imgUrl = question ? (question.imageUrl || '') : '';
            const imgWidth = question ? (question.imageWidth || 100) : 100;
            document.getElementById('questionImageUrl').value = imgUrl;
            document.getElementById('questionImageWidth').value = imgWidth;
            document.getElementById('imageWidthDisplay').textContent = imgWidth;
            document.getElementById('imagePreviewContainer').style.display = 'none';
            document.getElementById('imageWidthGroup').style.display = 'none';
            if (imgUrl) this.previewQuestionImage();
            
            this.openModal(modal.id);
        } catch (error) {
            console.error('Failed to open question modal:', error);
            this.showToast('Failed to open question form', 'error');
        }
    }

    loadImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            document.getElementById('questionImageUrl').value = dataUrl;
            const previewImg = document.getElementById('imagePreviewImg');
            const widthVal = document.getElementById('questionImageWidth').value;
            previewImg.style.width = widthVal + '%';
            previewImg.onload = () => {
                document.getElementById('imagePreviewContainer').style.display = 'block';
                document.getElementById('imageWidthGroup').style.display = 'block';
            };
            previewImg.onerror = () => {
                document.getElementById('imagePreviewContainer').style.display = 'none';
                document.getElementById('imageWidthGroup').style.display = 'none';
            };
            previewImg.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    previewQuestionImage() {
        const url = document.getElementById('questionImageUrl').value.trim();
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('imagePreviewImg');
        const widthGroup = document.getElementById('imageWidthGroup');
        const widthVal = document.getElementById('questionImageWidth').value;
        if (url) {
            previewImg.style.width = widthVal + '%';
            previewImg.onload = () => {
                previewContainer.style.display = 'block';
                widthGroup.style.display = 'block';
            };
            previewImg.onerror = () => {
                previewContainer.style.display = 'none';
                widthGroup.style.display = 'none';
            };
            previewImg.src = url;
        } else {
            previewContainer.style.display = 'none';
            widthGroup.style.display = 'none';
            previewImg.src = '';
        }
    }

    updateQuestionTypeOptions(type) {
        // Hide all option sections and disable their required fields
        document.querySelectorAll('.question-type-options').forEach(section => {
            section.style.display = 'none';
            // Disable required validation for hidden fields
            section.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
                field.removeAttribute('required');
            });
        });

        // Show relevant section and enable its required fields
        switch (type) {
            case 'multiple-choice':
                document.getElementById('multipleChoiceOptions').style.display = 'block';
                this.updateChoicesInputs(parseInt(document.getElementById('numChoices').value));
                break;
            case 'true-false':
                document.getElementById('trueFalseOptions').style.display = 'block';
                break;
            case 'short-answer':
                document.getElementById('shortAnswerOptions').style.display = 'block';
                break;
            case 'essay':
                document.getElementById('essayOptions').style.display = 'block';
                break;
            case 'matching':
                document.getElementById('matchingOptions').style.display = 'block';
                this.updatePairsInputs(parseInt(document.getElementById('numPairs').value));
                break;
            case 'table':
                document.getElementById('tableOptions').style.display = 'block';
                document.getElementById('buildTableBtn').onclick = () => {
                    const rows = parseInt(document.getElementById('tableRows').value) || 3;
                    const cols = parseInt(document.getElementById('tableCols').value) || 3;
                    this.buildTableEditor(rows, cols);
                };
                if (!document.getElementById('tableEditorContainer').hasChildNodes()) {
                    const rows = parseInt(document.getElementById('tableRows').value) || 3;
                    const cols = parseInt(document.getElementById('tableCols').value) || 3;
                    this.buildTableEditor(rows, cols);
                }
                break;
        }
    }

    updateChoicesInputs(numChoices) {
        const container = document.getElementById('choicesContainer');
        container.innerHTML = '';
        
        for (let i = 0; i < numChoices; i++) {
            const letter = String.fromCharCode(65 + i);
            const div = document.createElement('div');
            div.className = 'choice-input-group';
            div.innerHTML = `
                <label>Choice ${letter}</label>
                <input type="text" id="choice${i}" placeholder="Enter choice text">
                <input type="radio" name="correctChoice" id="correct${i}" value="${i}" ${i === 0 ? 'checked' : ''}>
                <label for="correct${i}">Correct</label>
            `;
            container.appendChild(div);
        }
    }

    updatePairsInputs(numPairs) {
        const container = document.getElementById('pairsContainer');
        container.innerHTML = '';
        
        for (let i = 0; i < numPairs; i++) {
            const div = document.createElement('div');
            div.className = 'pair-input-group';
            div.innerHTML = `
                <label>Pair ${i + 1}</label>
                <input type="text" id="left${i}" placeholder="Left item">
                <input type="text" id="right${i}" placeholder="Right item">
            `;
            container.appendChild(div);
        }
    }

    buildTableEditor(rows, cols, existingCells = null) {
        const container = document.getElementById('tableEditorContainer');
        container.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'table-editor-row';
            for (let c = 0; c < cols; c++) {
                const cellData = existingCells && existingCells[r] ? existingCells[r][c] : null;
                const cellText = cellData ? cellData.text : '';
                const isBold = cellData ? (cellData.bold || false) : false;
                // backward compat: old data used bold as question flag
                const isQuestion = cellData
                    ? (cellData.question !== undefined ? cellData.question : cellData.bold || false)
                    : false;

                const cellDiv = document.createElement('div');
                cellDiv.className = 'table-editor-cell' +
                    (isQuestion ? ' is-question' : '') +
                    (isBold ? ' is-bold' : '');
                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = cellText;
                input.placeholder = `R${r+1}C${c+1}`;

                const questionBtn = document.createElement('button');
                questionBtn.type = 'button';
                questionBtn.className = 'table-question-btn' + (isQuestion ? ' active' : '');
                questionBtn.textContent = 'Q';
                questionBtn.title = 'Mark as question cell (shown on student test; non-Q cells are blank)';
                questionBtn.addEventListener('click', () => {
                    const active = questionBtn.classList.toggle('active');
                    cellDiv.classList.toggle('is-question', active);
                });

                const boldBtn = document.createElement('button');
                boldBtn.type = 'button';
                boldBtn.className = 'table-bold-btn' + (isBold ? ' active' : '');
                boldBtn.textContent = 'B';
                boldBtn.title = 'Toggle bold text formatting';
                boldBtn.addEventListener('click', () => {
                    const active = boldBtn.classList.toggle('active');
                    cellDiv.classList.toggle('is-bold', active);
                });

                cellDiv.appendChild(input);
                cellDiv.appendChild(questionBtn);
                cellDiv.appendChild(boldBtn);
                rowDiv.appendChild(cellDiv);
            }
            container.appendChild(rowDiv);
        }
    }

    async saveQuestion() {
        try {
            const type = document.getElementById('questionType').value;
            const questionText = document.getElementById('questionText').value.trim();
            
            // Validate required fields
            if (!questionText) {
                alert('Please enter a question text');
                return;
            }
            
            const subjectValue = document.getElementById('questionSubject').value;
            const classValue = document.getElementById('questionClass').value;
            const examPeriodValue = document.getElementById('questionExamPeriod').value;
            
            const questionData = {
                type: type,
                text: questionText,
                subject: subjectValue && subjectValue !== '' ? subjectValue : null,
                class: classValue && classValue !== '' ? classValue : null,
                examPeriod: examPeriodValue && examPeriodValue !== '' ? examPeriodValue : null
            };

            // Add type-specific data
            switch (type) {
                case 'multiple-choice':
                    const numChoices = parseInt(document.getElementById('numChoices').value);
                    questionData.choices = [];
                    for (let i = 0; i < numChoices; i++) {
                        const choiceText = document.getElementById(`choice${i}`).value.trim();
                        if (!choiceText) {
                            alert(`Please enter text for Choice ${String.fromCharCode(65 + i)}`);
                            return;
                        }
                        questionData.choices.push({
                            text: choiceText,
                            correct: document.getElementById(`correct${i}`).checked
                        });
                    }
                    break;

                case 'true-false':
                    questionData.answer = document.getElementById('tfAnswer').value === 'true';
                    break;

                case 'short-answer':
                    questionData.answer = document.getElementById('shortAnswer').value;
                    break;

                case 'essay':
                    questionData.rubric = document.getElementById('essayRubric').value;
                    break;

                case 'matching':
                    const numPairs = parseInt(document.getElementById('numPairs').value);
                    questionData.pairs = [];
                    for (let i = 0; i < numPairs; i++) {
                        const leftText = document.getElementById(`left${i}`).value.trim();
                        const rightText = document.getElementById(`right${i}`).value.trim();
                        if (!leftText || !rightText) {
                            alert(`Please enter both items for Pair ${i + 1}`);
                            return;
                        }
                        questionData.pairs.push({
                            left: leftText,
                            right: rightText
                        });
                    }
                    break;

                case 'table': {
                    const container = document.getElementById('tableEditorContainer');
                    const rows = container.querySelectorAll('.table-editor-row');
                    if (rows.length === 0) {
                        alert('Please build the table first');
                        return;
                    }
                    const cells = [];
                    rows.forEach(rowEl => {
                        const rowData = [];
                        rowEl.querySelectorAll('.table-editor-cell').forEach(cellEl => {
                            const input = cellEl.querySelector('input[type="text"]');
                            const questionBtn = cellEl.querySelector('.table-question-btn');
                            const boldBtn = cellEl.querySelector('.table-bold-btn');
                            rowData.push({
                                text: input ? input.value : '',
                                question: questionBtn ? questionBtn.classList.contains('active') : false,
                                bold: boldBtn ? boldBtn.classList.contains('active') : false
                            });
                        });
                        cells.push(rowData);
                    });
                    questionData.tableData = {
                        rows: cells.length,
                        cols: cells.length > 0 ? cells[0].length : 0,
                        cells: cells
                    };
                    break;
                }
            }

            // Image
            const imageUrl = document.getElementById('questionImageUrl').value.trim() || null;
            questionData.imageUrl = imageUrl;
            questionData.imageWidth = imageUrl ? parseInt(document.getElementById('questionImageWidth').value) : null;

            if (this.editingQuestion) {
                questionData.id = this.editingQuestion.id;
                questionData.createdAt = this.editingQuestion.createdAt;
                await db.updateQuestion(questionData);
                this.showToast('Question updated successfully', 'success');
            } else {
                await db.addQuestion(questionData);
                this.showToast('Question added successfully', 'success');
            }

            this.closeModal('questionModal');
            await this.loadQuestions();
            await this.updateFilters();
        } catch (error) {
            console.error('Failed to save question:', error);
            this.showToast('Failed to save question', 'error');
        }
    }

    async editQuestion(id) {
        try {
            const question = await db.getQuestion(id);
            this.openQuestionModal(question);
        } catch (error) {
            console.error('Failed to load question:', error);
            this.showToast('Failed to load question', 'error');
        }
    }

    async deleteQuestion(id) {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }

        try {
            await db.deleteQuestion(id);
            this.showToast('Question deleted successfully', 'success');
            await this.loadQuestions();
        } catch (error) {
            console.error('Failed to delete question:', error);
            this.showToast('Failed to delete question', 'error');
        }
    }

    async applyFilters() {
        this.currentFilters = {
            searchTerm: document.getElementById('searchInput').value,
            type: document.getElementById('filterType').value,
            subject: document.getElementById('filterSubject').value,
            class: document.getElementById('filterClass').value,
            examPeriod: document.getElementById('filterExamPeriod').value
        };

        await this.loadQuestions();
    }

    async updateFilters() {
        // Get subjects from both database and questions
        const dbSubjects = await db.getAllSubjects();
        const questionSubjects = await db.getUniqueSubjects();
        
        const allSubjects = new Set();
        dbSubjects.forEach(s => allSubjects.add(s.name));
        questionSubjects.forEach(s => allSubjects.add(s));
        
        const subjects = Array.from(allSubjects).sort();
        
        // Get classes from both database and questions
        const dbClasses = await db.getAllClasses();
        const questionClasses = await db.getUniqueClasses();
        
        const allClasses = new Set();
        dbClasses.forEach(c => allClasses.add(c.name));
        questionClasses.forEach(c => allClasses.add(c));
        
        const classes = Array.from(allClasses).sort();

        // Update subject filter
        const subjectFilter = document.getElementById('filterSubject');
        const currentSubject = subjectFilter.value;
        subjectFilter.innerHTML = '<option value="">All Subjects</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            if (subject === currentSubject) option.selected = true;
            subjectFilter.appendChild(option);
        });

        // Update class filter
        const classFilter = document.getElementById('filterClass');
        const currentClass = classFilter.value;
        classFilter.innerHTML = '<option value="">All Classes</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            if (cls === currentClass) option.selected = true;
            classFilter.appendChild(option);
        });

        // Update exam period filter
        const examPeriods = await db.getUniqueExamPeriods();
        const examPeriodFilter = document.getElementById('filterExamPeriod');
        const currentExamPeriod = examPeriodFilter.value;
        examPeriodFilter.innerHTML = '<option value="">All Exam Periods</option>';
        examPeriods.forEach(ep => {
            const option = document.createElement('option');
            option.value = ep;
            option.textContent = ep;
            if (ep === currentExamPeriod) option.selected = true;
            examPeriodFilter.appendChild(option);
        });

        // Note: Subject and class dropdowns are updated when opening question modal
    }

    // Test Generation
    openGenerateTestModal() {
        const modal = document.getElementById('generateTestModal');
        document.getElementById('generateTestForm').reset();
        this.renderQuestionSliders({});
        document.getElementById('examPeriodMixSection').style.display = 'none';
        document.getElementById('sliderHint').textContent = 'Select a subject to see available questions.';
        this.updateTestSubjectOptions();
        this.openModal(modal.id);
    }

    async updateTestSubjectOptions() {
        // Get subjects from both database and questions
        const dbSubjects = await db.getAllSubjects();
        const questionSubjects = await db.getUniqueSubjects();
        
        const allSubjects = new Set();
        dbSubjects.forEach(s => allSubjects.add(s.name));
        questionSubjects.forEach(s => allSubjects.add(s));
        
        const subjects = Array.from(allSubjects).sort();
        
        const select = document.getElementById('testSubject');
        select.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
        });
    }

    async updateQuestionSubjectOptions() {
        try {
            // Get subjects from both database and questions
            const dbSubjects = await db.getAllSubjects();
            const questionSubjects = await db.getUniqueSubjects();
            
            const allSubjects = new Set();
            dbSubjects.forEach(s => allSubjects.add(s.name));
            questionSubjects.forEach(s => allSubjects.add(s));
            
            const subjects = Array.from(allSubjects).sort();
            
            const select = document.getElementById('questionSubject');
            if (!select) {
                console.error('questionSubject select element not found');
                return;
            }
            
            select.innerHTML = '<option value="">Select Subject (Optional)</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error updating question subject options:', error);
        }
    }

    async updateQuestionClassOptions(subject) {
        try {
            const select = document.getElementById('questionClass');
            if (!select) {
                console.error('questionClass select element not found');
                return;
            }
            
            select.innerHTML = '<option value="">Select Class (Optional)</option>';

            // Reset exam period dropdown when subject changes
            const epSelect = document.getElementById('questionExamPeriod');
            if (epSelect) epSelect.innerHTML = '<option value="">Select Exam Period (Optional)</option>';

            if (!subject) {
                return;
            }
            
            // Get classes from database for this subject
            const dbClasses = await db.getAllClasses();
            const subjectClasses = dbClasses.filter(c => c.subject === subject);
            
            // Get classes from questions for this subject
            const questions = await db.getQuestionsBySubject(subject);
            const questionClassNames = [...new Set(questions.map(q => q.class).filter(c => c))];
            
            // Combine and deduplicate
            const allClasses = new Set();
            subjectClasses.forEach(c => allClasses.add(c.name));
            questionClassNames.forEach(c => allClasses.add(c));
            
            const classes = Array.from(allClasses).sort();
            
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error updating question class options:', error);
        }
    }

    async updateQuestionExamPeriodOptions(subject, className) {
        try {
            const select = document.getElementById('questionExamPeriod');
            if (!select) return;
            select.innerHTML = '<option value="">Select Exam Period (Optional)</option>';
            if (!subject || !className) return;

            const dbPeriods = await db.getExamPeriodsByClass(subject, className);
            const questions = await db.getQuestionsBySubject(subject);
            const classQuestions = questions.filter(q => q.class === className);
            const questionPeriodNames = [...new Set(classQuestions.map(q => q.examPeriod).filter(p => p))];

            const allPeriods = new Set();
            dbPeriods.forEach(p => allPeriods.add(p.name));
            questionPeriodNames.forEach(p => allPeriods.add(p));

            Array.from(allPeriods).sort().forEach(period => {
                const option = document.createElement('option');
                option.value = period;
                option.textContent = period;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error updating question exam period options:', error);
        }
    }

    async updateTestClassOptions(subject) {
        const select = document.getElementById('testClass');
        select.innerHTML = '<option value="">All Classes</option>';

        // Reset exam period dropdown when subject changes
        const epSelect = document.getElementById('testExamPeriod');
        if (epSelect) epSelect.innerHTML = '<option value="">All Exam Periods</option>';

        if (!subject) {
            this.renderQuestionSliders({});
            document.getElementById('examPeriodMixSection').style.display = 'none';
            document.getElementById('sliderHint').textContent = 'Select a subject to see available questions.';
            return;
        }
        
        // Get classes from database for this subject
        const dbClasses = await db.getAllClasses();
        const subjectClasses = dbClasses.filter(c => c.subject === subject);
        
        // Get classes from questions for this subject
        const questions = await db.getQuestionsBySubject(subject);
        const questionClassNames = [...new Set(questions.map(q => q.class).filter(c => c))];
        
        // Combine and deduplicate
        const allClasses = new Set();
        subjectClasses.forEach(c => allClasses.add(c.name));
        questionClassNames.forEach(c => allClasses.add(c));
        
        const classes = Array.from(allClasses).sort();
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            select.appendChild(option);
        });

        // Refresh sliders for subject (no class/period filter yet)
        await this.updateQuestionSliders(subject, '', '');
        document.getElementById('examPeriodMixSection').style.display = 'none';
    }

    async updateTestExamPeriodOptions(subject, className) {
        const select = document.getElementById('testExamPeriod');
        if (!select) return;
        select.innerHTML = '<option value="">All Exam Periods</option>';
        if (!subject || !className) return;

        const dbPeriods = await db.getExamPeriodsByClass(subject, className);
        const questions = await db.getQuestionsBySubject(subject);
        const classQuestions = questions.filter(q => q.class === className);
        const questionPeriodNames = [...new Set(classQuestions.map(q => q.examPeriod).filter(p => p))];

        const allPeriods = new Set();
        dbPeriods.forEach(p => allPeriods.add(p.name));
        questionPeriodNames.forEach(p => allPeriods.add(p));

        Array.from(allPeriods).sort().forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = period;
            select.appendChild(option);
        });

        // Refresh sliders and exam period mix UI
        await this.updateQuestionSliders(subject, className, '');
        await this.updateExamPeriodMixUI(subject, className, '');
    }

    async updateQuestionSliders(subject, className, examPeriod) {
        let questions = subject ? await db.getQuestionsBySubject(subject) : [];
        if (className) questions = questions.filter(q => q.class === className);
        if (examPeriod) questions = questions.filter(q => q.examPeriod === examPeriod);

        const available = {};
        this.questionTypeConfig.forEach(({ key }) => {
            available[key] = questions.filter(q => q.type === key).length;
        });

        const total = Object.values(available).reduce((a, b) => a + b, 0);
        const hint = document.getElementById('sliderHint');
        if (hint) {
            hint.textContent = subject
                ? `${total} question${total !== 1 ? 's' : ''} available for the selected filters.`
                : 'Select a subject to see available questions.';
        }

        this.renderQuestionSliders(available);
    }

    renderQuestionSliders(available) {
        const container = document.getElementById('questionSliders');
        if (!container) return;

        // Preserve existing values before re-render
        const existing = {};
        this.questionTypeConfig.forEach(({ countId }) => {
            const el = document.getElementById(countId);
            if (el) existing[countId] = parseInt(el.value) || 0;
        });

        // Build slider rows
        let html = '';
        this.questionTypeConfig.forEach(({ key, label, countId, rangeId }) => {
            const max = available[key] || 0;
            const disabled = max === 0 ? 'disabled' : '';
            html += `
                <div class="slider-row">
                    <label class="slider-label">${label}</label>
                    <div class="slider-track">
                        <input type="range" id="${rangeId}" min="0" max="${max}" value="0" class="count-range" data-count-id="${countId}" ${disabled}>
                    </div>
                    <div class="slider-value-group">
                        <input type="number" id="${countId}" min="0" max="${max}" value="0" class="slider-number" data-range-id="${rangeId}">
                        <span class="slider-available">/ ${max}</span>
                    </div>
                </div>`;
        });
        container.innerHTML = html;

        // Restore capped values
        this.questionTypeConfig.forEach(({ key, countId, rangeId }) => {
            const max = available[key] || 0;
            const val = Math.min(existing[countId] || 0, max);
            const countEl = document.getElementById(countId);
            const rangeEl = document.getElementById(rangeId);
            if (countEl) countEl.value = val;
            if (rangeEl) rangeEl.value = val;
        });

        // Sync range → number
        container.querySelectorAll('.count-range').forEach(range => {
            range.addEventListener('input', () => {
                const num = document.getElementById(range.dataset.countId);
                if (num) num.value = range.value;
            });
        });

        // Sync number → range (with clamping)
        container.querySelectorAll('.slider-number').forEach(num => {
            num.addEventListener('input', () => {
                const max = parseInt(num.max) || 0;
                let val = parseInt(num.value) || 0;
                if (val < 0) val = 0;
                if (val > max) val = max;
                num.value = val;
                const range = document.getElementById(num.dataset.rangeId);
                if (range) range.value = val;
            });
        });
    }

    async updateExamPeriodMixUI(subject, className, examPeriod) {
        const section = document.getElementById('examPeriodMixSection');
        if (!section) return;

        // Only show when subject+class chosen but no specific exam period
        if (!subject || !className || examPeriod) {
            section.style.display = 'none';
            return;
        }

        const dbPeriods = await db.getExamPeriodsByClass(subject, className);
        const questions = await db.getQuestionsBySubject(subject);
        const classQuestions = questions.filter(q => q.class === className);
        const questionPeriodNames = [...new Set(classQuestions.map(q => q.examPeriod).filter(p => p))];

        const allPeriods = new Set();
        dbPeriods.forEach(p => allPeriods.add(p.name));
        questionPeriodNames.forEach(p => allPeriods.add(p));
        const periods = Array.from(allPeriods).sort();

        if (periods.length < 2) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        // Default: equal split
        const equalPct = Math.floor(100 / periods.length);
        const remainder = 100 - equalPct * periods.length;

        const container = document.getElementById('examPeriodMixContainer');
        let html = '';
        periods.forEach((period, i) => {
            const pct = equalPct + (i === 0 ? remainder : 0);
            const pCount = classQuestions.filter(q => q.examPeriod === period).length;
            const safeId = 'epMix_' + period.replace(/\W+/g, '_');
            html += `
                <div class="ep-mix-row">
                    <label class="ep-mix-label">${this.escapeHtml(period)} <span class="ep-mix-qcount">(${pCount})</span></label>
                    <div class="ep-mix-track">
                        <input type="range" id="${safeId}_range" min="0" max="100" value="${pct}" class="ep-mix-range" data-num-id="${safeId}_num">
                    </div>
                    <div class="ep-mix-value-group">
                        <input type="number" id="${safeId}_num" min="0" max="100" value="${pct}" class="ep-mix-num" data-period="${this.escapeHtml(period)}" data-range-id="${safeId}_range">
                        <span>%</span>
                    </div>
                </div>`;
        });
        container.innerHTML = html;

        // Auto-balance: when one value changes, redistribute the remaining 100% among
        // the other periods proportionally to their current values.
        const balanceOthers = (changedNumId) => {
            const allNums = Array.from(container.querySelectorAll('.ep-mix-num'));
            const changedNum = document.getElementById(changedNumId);
            const changedVal = Math.max(0, Math.min(100, parseInt(changedNum.value) || 0));
            changedNum.value = changedVal;
            const changedRange = document.getElementById(changedNum.dataset.rangeId);
            if (changedRange) changedRange.value = changedVal;

            const others = allNums.filter(n => n.id !== changedNumId);
            if (others.length === 0) { this.updateEpMixTotal(); return; }

            const remaining = Math.max(0, 100 - changedVal);
            const othersSum = others.reduce((s, n) => s + (parseInt(n.value) || 0), 0);

            let newVals;
            if (othersSum === 0) {
                // Equal split of remaining
                const base  = Math.floor(remaining / others.length);
                const extra = remaining - base * others.length;
                newVals = others.map((_, i) => base + (i < extra ? 1 : 0));
            } else {
                // Proportional split using largest-remainder
                let allocated = 0;
                newVals = others.map(n => {
                    const share = Math.floor(remaining * (parseInt(n.value) || 0) / othersSum);
                    allocated += share;
                    return share;
                });
                const byFrac = others
                    .map((n, i) => ({ i, f: remaining * (parseInt(n.value) || 0) / othersSum - newVals[i] }))
                    .sort((a, b) => b.f - a.f);
                for (let j = 0; j < remaining - allocated; j++) newVals[byFrac[j].i]++;
            }

            others.forEach((n, i) => {
                n.value = newVals[i];
                const r = document.getElementById(n.dataset.rangeId);
                if (r) r.value = newVals[i];
            });

            this.updateEpMixTotal();
        };

        // Range drag → sync number then balance
        container.querySelectorAll('.ep-mix-range').forEach(range => {
            range.addEventListener('input', () => {
                const num = document.getElementById(range.dataset.numId);
                if (num) { num.value = range.value; balanceOthers(num.id); }
            });
        });

        // Number field → clamp, sync range, then balance
        container.querySelectorAll('.ep-mix-num').forEach(num => {
            num.addEventListener('input', () => { balanceOthers(num.id); });
            // Also fire on blur to catch manual edits that didn't trigger input
            num.addEventListener('change', () => { balanceOthers(num.id); });
        });

        this.updateEpMixTotal();
    }

    updateEpMixTotal() {
        const nums = document.querySelectorAll('#examPeriodMixContainer .ep-mix-num');
        let total = 0;
        nums.forEach(n => total += parseInt(n.value) || 0);
        const totalEl = document.getElementById('epMixTotal');
        const msgEl   = document.getElementById('epMixTotalMsg');
        if (totalEl) totalEl.textContent = total;
        if (msgEl) {
            if (total === 0)        { msgEl.textContent = '— set at least one period above 0'; msgEl.className = 'ep-mix-warning'; }
            else if (total !== 100) { msgEl.textContent = '(will be normalized to 100%)';       msgEl.className = 'ep-mix-info';    }
            else                    { msgEl.textContent = '\u2713';                               msgEl.className = 'ep-mix-ok';      }
        }
    }

    async previewTest() {
        try {
            const title           = document.getElementById('testTitle').value;
            const subject         = document.getElementById('testSubject').value;
            const className       = document.getElementById('testClass').value;
            const examPeriodValue = document.getElementById('testExamPeriod').value;

            const counts = {};
            this.questionTypeConfig.forEach(({ key, countId }) => {
                counts[key] = parseInt(document.getElementById(countId)?.value) || 0;
            });

            const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0);
            if (totalQuestions === 0) {
                alert('Please select at least one question type');
                return;
            }

            // Read exam period mix weights
            let examPeriodWeights = null;
            const mixSection = document.getElementById('examPeriodMixSection');
            if (mixSection && mixSection.style.display !== 'none') {
                examPeriodWeights = {};
                document.querySelectorAll('#examPeriodMixContainer .ep-mix-num').forEach(num => {
                    examPeriodWeights[num.dataset.period] = parseInt(num.value) || 0;
                });
                const totalWeight = Object.values(examPeriodWeights).reduce((a, b) => a + b, 0);
                if (totalWeight === 0) {
                    alert('Please set at least one exam period percentage above 0.');
                    return;
                }
            }

            // Get questions filtered by subject and class (NOT period — mix mode handles period internally)
            let availableQuestions = await db.getQuestionsBySubject(subject);
            if (className)       availableQuestions = availableQuestions.filter(q => q.class === className);
            if (examPeriodValue) availableQuestions = availableQuestions.filter(q => q.examPeriod === examPeriodValue);

            const selectedQuestions = [];

            if (!examPeriodWeights) {
                // ── Simple (non-mix) path ────────────────────────────────────────
                for (const [type, count] of Object.entries(counts)) {
                    if (!count) continue;
                    const pool = availableQuestions.filter(q => q.type === type);
                    if (pool.length < count) {
                        const label = this.questionTypeConfig.find(t => t.key === type)?.label || type;
                        alert(`Not enough ${label} questions available. Found ${pool.length}, need ${count}.`);
                        return;
                    }
                    selectedQuestions.push(...pool.sort(() => 0.5 - Math.random()).slice(0, count));
                }
            } else {
                // ── Mixed exam-period path ────────────────────────────────────────
                const activePeriods = Object.keys(examPeriodWeights).filter(p => examPeriodWeights[p] > 0);
                const totalWeight   = activePeriods.reduce((s, p) => s + examPeriodWeights[p], 0);

                // Step 1 — compute initial allocations and build question pools per type/period
                const typeAllocs = {};
                const shortfalls = [];

                for (const [type, count] of Object.entries(counts)) {
                    if (!count) continue;
                    const questionsOfType = availableQuestions.filter(q => q.type === type);

                    // Build pool per period
                    const poolByPeriod = {};
                    activePeriods.forEach(p => {
                        poolByPeriod[p] = questionsOfType.filter(q => q.examPeriod === p);
                    });

                    // Largest-remainder allocation
                    const allocs = {};
                    let allocTotal = 0;
                    activePeriods.forEach(p => {
                        allocs[p] = Math.floor(count * examPeriodWeights[p] / totalWeight);
                        allocTotal += allocs[p];
                    });
                    const byFrac = activePeriods
                        .map(p => ({ p, f: (count * examPeriodWeights[p] / totalWeight) - allocs[p] }))
                        .sort((a, b) => b.f - a.f);
                    for (let i = 0; i < count - allocTotal; i++) allocs[byFrac[i].p]++;

                    typeAllocs[type] = { allocs, poolByPeriod };

                    // Identify shortfalls
                    activePeriods.forEach(p => {
                        const need = allocs[p];
                        const have = poolByPeriod[p].length;
                        if (need > have) {
                            const shortage = need - have;
                            const label = this.questionTypeConfig.find(t => t.key === type)?.label || type;
                            // Alternative periods: others that have at least 1 question of this type
                            const altPeriods = activePeriods
                                .filter(ap => ap !== p && poolByPeriod[ap].length > 0)
                                .map(ap => ({
                                    period: ap,
                                    available: poolByPeriod[ap].length,
                                    spare: poolByPeriod[ap].length - allocs[ap]
                                }));
                            shortfalls.push({ type, label, period: p, need, have, shortage, altPeriods });
                        }
                    });
                }

                // Step 2 — if shortfalls, ask user about fallbacks
                if (shortfalls.length > 0) {
                    const fallbackChoices = await this.showFallbackDialog(shortfalls);
                    if (fallbackChoices === null) return; // cancelled

                    // Step 3 — apply fallback choices
                    for (const sf of shortfalls) {
                        const sfKey = `${sf.type}|${sf.period}`;
                        const chosen = fallbackChoices[sfKey] || [];

                        // Cap the short period at what it has
                        typeAllocs[sf.type].allocs[sf.period] = sf.have;

                        if (chosen.length > 0) {
                            // Distribute the shortage to chosen fallback periods (largest-remainder equal split)
                            const shortage = sf.shortage;
                            const base     = Math.floor(shortage / chosen.length);
                            const extra    = shortage - base * chosen.length;
                            chosen.forEach((p, i) => {
                                typeAllocs[sf.type].allocs[p] = (typeAllocs[sf.type].allocs[p] || 0) + base + (i < extra ? 1 : 0);
                            });
                        }
                        // If chosen is empty: questions are simply omitted (total reduced)
                    }

                    // Step 4 — verify final allocs are satisfiable
                    for (const [type, { allocs, poolByPeriod }] of Object.entries(typeAllocs)) {
                        for (const [period, need] of Object.entries(allocs)) {
                            const have = poolByPeriod[period]?.length || 0;
                            if (need > have) {
                                const label = this.questionTypeConfig.find(t => t.key === type)?.label || type;
                                alert(`Not enough ${label} questions in "${period}" even after fallback redistribution.\nNeed ${need}, have ${have}.\nPlease adjust your selections.`);
                                return;
                            }
                        }
                    }
                }

                // Step 5 — select questions
                for (const [type, { allocs, poolByPeriod }] of Object.entries(typeAllocs)) {
                    for (const [period, need] of Object.entries(allocs)) {
                        if (!need) continue;
                        const pool = poolByPeriod[period];
                        selectedQuestions.push(...pool.sort(() => 0.5 - Math.random()).slice(0, need));
                    }
                }
            }

            this.currentTest = {
                title: title,
                subject: subject,
                class: className,
                examPeriod: examPeriodValue || null,
                questions: selectedQuestions,
                createdAt: new Date().toISOString()
            };

            this.closeModal('generateTestModal');
            this.renderTestPreview(this.currentTest);
            this.openModal('testPreviewModal');
        } catch (error) {
            console.error('Failed to generate test:', error);
            this.showToast('Failed to generate test', 'error');
        }
    }

    /**
     * Shows the fallback dialog when mixed-mode exam period allocation has shortfalls.
     * Returns a Promise that resolves to:
     *   - null  → user cancelled
     *   - object mapping "type|period" → string[] of chosen fallback periods
     */
    showFallbackDialog(shortfalls) {
        return new Promise(resolve => {
            const container = document.getElementById('fallbackShortfallList');

            // Build dialog content
            let html = '';
            shortfalls.forEach(sf => {
                const sfKey     = `${sf.type}|${sf.period}`;
                const escapedKey = this.escapeHtml(sfKey);
                html += `
                <div class="fallback-shortfall" data-sf-key="${escapedKey}">
                    <div class="fallback-shortfall-header">
                        <span class="fallback-type-badge">${this.escapeHtml(sf.label)}</span>
                        in <strong>"${this.escapeHtml(sf.period)}"</strong>:
                        need <strong>${sf.need}</strong>, have <strong>${sf.have}</strong>
                        &nbsp;<span class="fallback-shortage">(${sf.shortage} short)</span>
                    </div>`;

                if (sf.altPeriods.length === 0) {
                    // No alternatives — omission is automatic, just inform the user
                    html += `<p class="fallback-no-alt">No other exam periods have ${this.escapeHtml(sf.label)} questions available.
                        These ${sf.shortage} question(s) will be omitted and the test total will be reduced.</p>`;
                } else {
                    html += `<div class="fallback-period-options">
                        <p class="fallback-prompt">Draw the ${sf.shortage} missing question(s) from:</p>`;
                    sf.altPeriods.forEach(({ period, available, spare }) => {
                        const safeDataKey = this.escapeHtml(period);
                        const spareNote = spare > 0
                            ? `<span class="fallback-enough">(${available} available, ${spare} spare)</span>`
                            : `<span class="fallback-limited">(${available} available, 0 spare — may cause a cascade shortfall)</span>`;
                        html += `
                        <label class="fallback-cb-label">
                            <input type="checkbox" class="fallback-cb"
                                data-sf-key="${escapedKey}"
                                data-period="${safeDataKey}"
                                ${spare > 0 ? 'checked' : ''}>
                            ${this.escapeHtml(period)} ${spareNote}
                        </label>`;
                    });
                    // Explicit omit option
                    html += `
                        <div class="fallback-omit-sep"></div>
                        <label class="fallback-cb-label fallback-omit-label">
                            <input type="checkbox" class="fallback-omit-cb" data-sf-key="${escapedKey}">
                            <em>Skip these ${sf.shortage} question(s) &mdash; build the test without them (reduces total)</em>
                        </label>
                        <p class="fallback-unresolved-msg" id="fallback-msg-${CSS.escape(escapedKey)}" style="display:none"></p>
                    </div>`;
                }
                html += `</div>`;
            });

            container.innerHTML = html;

            const modal      = document.getElementById('fallbackModal');
            const confirmBtn = document.getElementById('fallbackConfirmBtn');
            const cancelBtn  = document.getElementById('fallbackCancelBtn');
            const closeBtn   = modal.querySelector('.close-btn');

            // ── Validation: every shortfall with alternatives must have a resolution ──
            const validate = () => {
                let allResolved = true;
                shortfalls.forEach(sf => {
                    if (sf.altPeriods.length === 0) return; // auto-omitted, always resolved
                    const sfKey      = `${sf.type}|${sf.period}`;
                    const escapedKey = this.escapeHtml(sfKey);
                    const anyFallback = container.querySelectorAll(`.fallback-cb[data-sf-key="${escapedKey}"]:checked`).length > 0;
                    const omitChecked = container.querySelector(`.fallback-omit-cb[data-sf-key="${escapedKey}"]`)?.checked;
                    const resolved    = anyFallback || omitChecked;
                    const msgEl       = container.querySelector(`#fallback-msg-${CSS.escape(escapedKey)}`);
                    if (msgEl) {
                        if (!resolved) {
                            msgEl.textContent = 'Choose at least one period above, or check \u201cSkip\u201d to omit these questions.';
                            msgEl.style.display = 'block';
                        } else {
                            msgEl.style.display = 'none';
                        }
                    }
                    if (!resolved) allResolved = false;
                });
                const btn = document.getElementById('fallbackConfirmBtn');
                if (btn) btn.disabled = !allResolved;
            };

            // ── Mutual exclusion: fallback period CBs ↔ omit CB ──
            container.addEventListener('change', e => {
                const target = e.target;
                if (target.classList.contains('fallback-cb')) {
                    const sfKey      = target.dataset.sfKey;
                    const omitCb     = container.querySelector(`.fallback-omit-cb[data-sf-key="${sfKey}"]`);
                    if (omitCb && target.checked) omitCb.checked = false;
                }
                if (target.classList.contains('fallback-omit-cb') && target.checked) {
                    const sfKey  = target.dataset.sfKey;
                    container.querySelectorAll(`.fallback-cb[data-sf-key="${sfKey}"]`)
                        .forEach(cb => { cb.checked = false; });
                }
                validate();
            });

            const cleanup = () => modal.classList.remove('active');

            const onConfirm = () => {
                cleanup();
                const choices = {};
                shortfalls.forEach(sf => {
                    const sfKey      = `${sf.type}|${sf.period}`;
                    const escapedKey = this.escapeHtml(sfKey);
                    const checked    = container.querySelectorAll(`.fallback-cb[data-sf-key="${escapedKey}"]:checked`);
                    choices[sfKey]   = Array.from(checked).map(cb => cb.dataset.period);
                    // empty array = omit (whether explicit omit-cb or no fallback alternatives)
                });
                resolve(choices);
            };

            const onCancel = () => { cleanup(); resolve(null); };

            // Wire buttons (replace to avoid duplicate listeners)
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            const newConfirm = document.getElementById('fallbackConfirmBtn');
            const newCancel  = document.getElementById('fallbackCancelBtn');
            newConfirm.addEventListener('click', onConfirm);
            newCancel.addEventListener('click', onCancel);
            closeBtn.onclick = onCancel;

            // Run initial validation (some shortfalls may open with no CBs pre-checked)
            validate();

            modal.classList.add('active');
        });
    }

    renderTestPreview(test) {
        const container = document.getElementById('testPreviewContent');
        
        // Use stored metadata or defaults
        const title = test.title || 'Untitled Test';
        const date = test.date || new Date().toLocaleDateString();
        const subject = test.subject || '';
        const className = test.class || '';
        const version = test.version || '';
        const instructions = test.instructions || 'Instructions: Please answer all questions to the best of your ability. Show your work where applicable.';
        
        // Show flags — defaults: showNameLine=true, showClass=true, everything else=false
        const showNameLine       = test.showNameLine       ?? true;
        const doNotWrite         = test.doNotWrite         ?? false;
        const showDate           = test.showDate           ?? false;
        const showSubject        = test.showSubject        ?? false;
        const showClass          = test.showClass          ?? true;
        const showVersion        = test.showVersion        ?? false;
        const showTotalQuestions = test.showTotalQuestions ?? false;
        const showInstructions      = test.showInstructions      ?? false;
        const showAnswerLinesSA    = test.showAnswerLinesSA    ?? test.showAnswerLines ?? false;
        const showAnswerLinesEssay = test.showAnswerLinesEssay ?? test.showAnswerLines ?? false;
        const showSectionHr        = test.showSectionHr        ?? true;
        const showCustomFields     = test.showCustomFields     ?? false;

        let html = '';
        if (showNameLine || doNotWrite) {
            html += '<div class="test-top-bar">';
            if (showNameLine) html += '<div class="test-top-left">Name: _______________________________</div>';
            if (doNotWrite)   html += '<div class="test-top-left test-do-not-write">Do not write on this exam</div>';
            html += '</div>';
        }

        html += `<h1>${this.escapeHtml(title)}</h1>`;
        if (showDate)           html += `<p><strong>Date:</strong> ${this.escapeHtml(date)}</p>`;
        if (showSubject && subject)   html += `<p><strong>Subject:</strong> ${this.escapeHtml(subject)}</p>`;
        if (showClass && className)   html += `<p><strong>Class:</strong> ${this.escapeHtml(className)}</p>`;
        if (showVersion && version)   html += `<p><strong>Version:</strong> ${this.escapeHtml(version)}</p>`;
        if (showTotalQuestions) html += `<p><strong>Total Questions:</strong> ${test.questions.length}</p>`;

        if (showCustomFields && test.customFields && test.customFields.length > 0) {
            test.customFields.forEach(field => {
                html += `<p><strong>${this.escapeHtml(field.label)}:</strong> ${this.escapeHtml(field.value)}</p>`;
            });
        }

        if (showInstructions) {
            html += `<hr><p><em>${this.escapeHtml(instructions)}</em></p>`;
        }

        // Group by type
        const questionsByType = {
            'multiple-choice': [],
            'true-false': [],
            'short-answer': [],
            'matching': [],
            'table': [],
            'essay': []
        };

        test.questions.forEach(q => {
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

        for (const [type, questions] of Object.entries(questionsByType)) {
            if (questions.length === 0) continue;

            html += `<div class="test-section"><h2 class="${showSectionHr ? '' : 'no-hr'}">${typeLabels[type]}</h2>`;
            
            // Add section-specific instructions if they exist
            const sectionInstructions = test.sectionInstructions || {};
            if (sectionInstructions[type]) {
                html += `<p class="section-instructions"><em>${this.escapeHtml(sectionInstructions[type])}</em></p>`;
            }

            questions.forEach(q => {
                html += `<div class="test-question">`;
                html += `<div class="test-question-text"><span class="test-question-number">${questionNumber}.</span> ${this.escapeHtml(q.text)}</div>`;
                if (q.imageUrl) {
                    html += `<div class="test-question-image-wrapper" data-qid="${q.id}" style="width:${q.imageWidth || 100}%">`
                        + `<img src="${this.escapeHtml(q.imageUrl)}" class="test-question-image" alt="" onerror="this.closest('.test-question-image-wrapper').style.display='none'">`
                        + `<div class="img-resize-handle" title="Drag to resize"></div>`
                        + `</div>`;
                }

                switch (type) {
                    case 'multiple-choice': {
                        const allShort = q.choices.length <= 4 && q.choices.every(c => c.text.length <= 12);
                        if (allShort) {
                            html += '<div class="test-choices-horizontal">';
                            q.choices.forEach((choice, index) => {
                                const letter = String.fromCharCode(65 + index);
                                html += `<span class="test-choice-inline">${letter}. ${this.escapeHtml(choice.text)}</span>`;
                            });
                            html += '</div>';
                        } else {
                            html += '<div class="test-choices">';
                            q.choices.forEach((choice, index) => {
                                const letter = String.fromCharCode(65 + index);
                                html += `<div class="test-choice">${letter}. ${this.escapeHtml(choice.text)}</div>`;
                            });
                            html += '</div>';
                        }
                        break;
                    }

                    case 'true-false':
                        html += '<div class="test-choices-horizontal">';
                        html += '<span class="test-choice-inline">True</span>';
                        html += '<span class="test-choice-inline">False</span>';
                        html += '</div>';
                        break;

                    case 'short-answer':
                        if (showAnswerLinesSA) html += '<div class="test-answer-space"></div>';
                        else html += '<div style="min-height:60px;"></div>';
                        break;

                    case 'essay':
                        if (showAnswerLinesEssay) html += '<div class="test-answer-space" style="min-height: 200px;"></div>';
                        else html += '<div style="min-height:200px;"></div>';
                        break;

                    case 'matching': {
                        if (!q.originalPairs) q.originalPairs = [...q.pairs];
                        const mRightItems = q.pairs.map(p => p.right);
                        const mShuffledRight = this.shuffleArray(mRightItems);
                        html += '<div class="test-matching-grid">';
                        q.pairs.forEach((pair, index) => {
                            html += `<div class="test-matching-row">`;
                            html += `<div class="test-matching-left">${index + 1}. ${this.escapeHtml(pair.left)}</div>`;
                            html += `<div class="test-matching-right">${String.fromCharCode(65 + index)}. ${this.escapeHtml(mShuffledRight[index])}</div>`;
                            html += `</div>`;
                        });
                        html += '</div>';
                        break;
                    }

                    case 'table': {
                        if (q.tableData && q.tableData.cells) {
                            html += '<table class="test-table">';
                            q.tableData.cells.forEach(row => {
                                html += '<tr>';
                                row.forEach(cell => {
                                    // backward compat: old data used bold as question flag
                                    const isQuestion = cell.question !== undefined ? cell.question : cell.bold;
                                    if (isQuestion) {
                                        const content = cell.bold
                                            ? `<strong>${this.escapeHtml(cell.text)}</strong>`
                                            : this.escapeHtml(cell.text);
                                        html += `<td>${content}</td>`;
                                    } else {
                                        html += `<td>&nbsp;</td>`;
                                    }
                                });
                                html += '</tr>';
                            });
                            html += '</table>';
                        }
                        break;
                    }
                }

                html += '</div>';
                questionNumber++;
            });

            html += '</div>';
        }

        container.innerHTML = html;
        this.setupTestPreviewImageResize();
    }

    setupTestPreviewImageResize() {
        const container = document.getElementById('testPreviewContent');
        if (!container) return;
        container.querySelectorAll('.img-resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const wrapper = handle.closest('.test-question-image-wrapper');
                const qid = parseInt(wrapper.dataset.qid);
                const parentWidth = wrapper.parentElement.getBoundingClientRect().width || 600;
                const startX = e.clientX;
                const startPct = parseFloat(wrapper.style.width) || 100;
                const startPx = parentWidth * startPct / 100;

                const onMouseMove = (ev) => {
                    const delta = ev.clientX - startX;
                    const newPct = Math.round(Math.max(10, Math.min(100, (startPx + delta) / parentWidth * 100)));
                    wrapper.style.width = newPct + '%';
                    wrapper.dataset.currentWidth = newPct;
                };

                const onMouseUp = async () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    const finalWidth = parseInt(wrapper.dataset.currentWidth) || 100;
                    const question = this.currentTest && this.currentTest.questions.find(q => q.id === qid);
                    if (question) {
                        question.imageWidth = finalWidth;
                        try { await db.updateTest(this.currentTest); } catch (_) {}
                    }
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    async openEditTestModal() {
        // Store available questions for filtering
        this.allAvailableQuestions = await db.getAllQuestions();
        
        // Populate filter dropdowns
        const subjects = await db.getUniqueSubjects();
        const editSubjectFilter = document.getElementById('editTestFilterSubject');
        editSubjectFilter.innerHTML = '<option value="">All Subjects</option>';
        subjects.forEach(subject => {
            editSubjectFilter.innerHTML += `<option value="${this.escapeHtml(subject)}">${this.escapeHtml(subject)}</option>`;
        });
        
        const classes = await db.getUniqueClasses();
        const editClassFilter = document.getElementById('editTestFilterClass');
        editClassFilter.innerHTML = '<option value="">All Classes</option>';
        classes.forEach(cls => {
            editClassFilter.innerHTML += `<option value="${this.escapeHtml(cls)}">${this.escapeHtml(cls)}</option>`;
        });

        const examPeriods = await db.getUniqueExamPeriods();
        const editExamPeriodFilter = document.getElementById('editTestFilterExamPeriod');
        editExamPeriodFilter.innerHTML = '<option value="">All Exam Periods</option>';
        examPeriods.forEach(ep => {
            editExamPeriodFilter.innerHTML += `<option value="${this.escapeHtml(ep)}">${this.escapeHtml(ep)}</option>`;
        });

        // Reset filters
        document.getElementById('editTestSearchInput').value = '';
        editSubjectFilter.value = '';
        editClassFilter.value = '';
        editExamPeriodFilter.value = '';
        document.getElementById('editTestFilterType').value = '';
        
        // Render both panels
        this.renderCurrentTestQuestions();
        this.filterAvailableQuestions();
        
        this.closeModal('testPreviewModal');
        this.openModal('editTestModal');
    }

    renderCurrentTestQuestions() {
        const container = document.getElementById('editTestContent');
        
        if (this.currentTest.questions.length === 0) {
            container.innerHTML = '<p class="empty-state">No questions in test yet.</p>';
            return;
        }
        
        let html = '';
        
        this.currentTest.questions.forEach((q, index) => {
            const typeLabel = {
                'multiple-choice': 'MC',
                'true-false': 'T/F',
                'short-answer': 'SA',
                'essay': 'Essay',
                'matching': 'Match',
                'table': 'Table'
            }[q.type];
            
            html += `
                <div class="edit-question-card">
                    <p><strong>${index + 1}. [${typeLabel}]</strong> ${this.escapeHtml(q.text)}</p>
                    ${q.subject ? `<small>Subject: ${this.escapeHtml(q.subject)}</small>` : ''}
                    ${q.class ? `<small> | Class: ${this.escapeHtml(q.class)}</small>` : ''}
                    ${q.examPeriod ? `<small> | Exam Period: ${this.escapeHtml(q.examPeriod)}</small>` : ''}
                    <div class="question-actions">
                        <button class="btn btn-danger btn-sm remove-test-question" data-index="${index}">Remove</button>
                        <button class="btn btn-secondary btn-sm replace-test-question" data-index="${index}">Replace</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.remove-test-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.currentTest.questions.splice(index, 1);
                this.renderCurrentTestQuestions();
                this.showToast('Question removed', 'success');
            });
        });
        
        container.querySelectorAll('.replace-test-question').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.dataset.index);
                await this.openReplaceQuestionModal(index);
            });
        });
    }

    filterAvailableQuestions() {
        const searchTerm = document.getElementById('editTestSearchInput').value.toLowerCase();
        const subjectFilter = document.getElementById('editTestFilterSubject').value;
        const classFilter = document.getElementById('editTestFilterClass').value;
        const examPeriodFilter = document.getElementById('editTestFilterExamPeriod').value;
        const typeFilter = document.getElementById('editTestFilterType').value;
        
        // Get IDs of questions already in test
        const currentQuestionIds = this.currentTest.questions.map(q => q.id);
        
        // Filter available questions
        const filtered = this.allAvailableQuestions.filter(q => {
            // Exclude questions already in test
            if (currentQuestionIds.includes(q.id)) return false;
            
            // Apply search
            if (searchTerm) {
                const haystack = [
                    q.text || '',
                    q.examPeriod || '',
                    q.answer != null ? String(q.answer) : '',
                    q.rubric || '',
                    ...(q.choices ? q.choices.map(c => c.text) : []),
                    ...(q.pairs ? q.pairs.flatMap(p => [p.left, p.right]) : []),
                    ...(q.tableData && q.tableData.cells
                        ? q.tableData.cells.flatMap(row => row.map(c => c.text || ''))
                        : [])
                ].join(' ').toLowerCase();
                if (!haystack.includes(searchTerm)) return false;
            }
            
            // Apply filters
            if (subjectFilter && q.subject !== subjectFilter) return false;
            if (classFilter && q.class !== classFilter) return false;
            if (examPeriodFilter && q.examPeriod !== examPeriodFilter) return false;
            if (typeFilter && q.type !== typeFilter) return false;
            
            return true;
        });
        
        this.renderAvailableQuestions(filtered);
    }

    renderAvailableQuestions(questions) {
        const container = document.getElementById('availableQuestionsContainer');
        
        if (questions.length === 0) {
            container.innerHTML = '<p class="empty-state">No questions available. All questions may already be in the test.</p>';
            return;
        }
        
        let html = '';
        
        questions.forEach(q => {
            const typeLabel = {
                'multiple-choice': 'Multiple Choice',
                'true-false': 'True/False',
                'short-answer': 'Short Answer',
                'essay': 'Essay',
                'matching': 'Matching',
                'table': 'Table'
            }[q.type];
            
            html += `
                <div class="edit-question-card">
                    <p><strong>[${typeLabel}]</strong> ${this.escapeHtml(q.text)}</p>
                    ${q.subject ? `<small>Subject: ${this.escapeHtml(q.subject)}</small>` : ''}
                    ${q.class ? `<small> | Class: ${this.escapeHtml(q.class)}</small>` : ''}
                    ${q.examPeriod ? `<small> | Exam Period: ${this.escapeHtml(q.examPeriod)}</small>` : ''}
                    <button class="btn btn-success btn-sm add-to-test" data-question-id="${q.id}">
                        + Add to Test
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.add-to-test').forEach(btn => {
            btn.addEventListener('click', () => {
                const questionId = parseInt(btn.dataset.questionId);
                const question = this.allAvailableQuestions.find(q => q.id === questionId);
                
                if (question) {
                    this.currentTest.questions.push(question);
                    this.renderCurrentTestQuestions();
                    this.filterAvailableQuestions(); // Refresh available list
                    this.showToast('Question added to test', 'success');
                }
            });
        });
    }

    async openReplaceQuestionModal(questionIndex) {
        const currentQuestion = this.currentTest.questions[questionIndex];
        const currentQuestionIds = this.currentTest.questions.map(q => q.id);
        
        // Get all questions from database
        const allQuestions = await db.getAllQuestions();
        
        // Filter out questions already in the test
        const availableQuestions = allQuestions.filter(q => !currentQuestionIds.includes(q.id));
        
        if (availableQuestions.length === 0) {
            this.showToast('No other questions available to replace with', 'error');
            return;
        }
        
        // Create a selection interface
        const container = document.getElementById('editTestContent');
        let html = `
            <p><strong>Replacing Question ${questionIndex + 1}:</strong> ${this.escapeHtml(currentQuestion.text)}</p>
            <hr>
            <p>Select a replacement question:</p>
            <div style="max-height: 400px; overflow-y: auto;">
        `;
        
        availableQuestions.forEach(q => {
            const typeLabel = {
                'multiple-choice': 'Multiple Choice',
                'true-false': 'True/False',
                'short-answer': 'Short Answer',
                'essay': 'Essay',
                'matching': 'Matching'
            }[q.type];
            
            html += `
                <div class="edit-question-card" style="cursor: pointer; border: 2px solid transparent;" 
                     class="replacement-option" data-question-id="${q.id}">
                    <p><strong>[${typeLabel}]</strong> ${this.escapeHtml(q.text)}</p>
                    ${q.subject ? `<small>Subject: ${this.escapeHtml(q.subject)}</small>` : ''}
                    ${q.class ? `<small> | Class: ${this.escapeHtml(q.class)}</small>` : ''}
                    <button class="btn btn-primary btn-sm select-replacement" data-question-id="${q.id}" data-index="${questionIndex}">
                        Select This Question
                    </button>
                </div>
            `;
        });
        
        html += `
            </div>
            <hr>
            <button class="btn btn-secondary" id="cancelReplaceBtn">Cancel</button>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.select-replacement').forEach(btn => {
            btn.addEventListener('click', () => {
                const questionId = parseInt(btn.dataset.questionId);
                const index = parseInt(btn.dataset.index);
                const newQuestion = availableQuestions.find(q => q.id === questionId);
                
                if (newQuestion) {
                    this.currentTest.questions[index] = newQuestion;
                    this.showToast('Question replaced successfully', 'success');
                    this.openEditTestModal();
                }
            });
        });
        
        document.getElementById('cancelReplaceBtn').addEventListener('click', () => {
            this.openEditTestModal();
        });
    }

    saveTestEdits() {
        this.closeModal('editTestModal');
        this.renderTestPreview(this.currentTest);
        this.openModal('testPreviewModal');
    }

    randomizeTestQuestions() {
        // Group questions by type
        const questionsByType = {
            'multiple-choice': [],
            'true-false': [],
            'short-answer': [],
            'matching': [],
            'table': [],
            'essay': []
        };

        this.currentTest.questions.forEach(q => {
            if (questionsByType[q.type]) {
                questionsByType[q.type].push(q);
            }
        });

        // Shuffle each group
        for (const type in questionsByType) {
            questionsByType[type] = this.shuffleArray(questionsByType[type]);
        }

        // Rebuild questions array
        this.currentTest.questions = [];
        for (const type in questionsByType) {
            this.currentTest.questions.push(...questionsByType[type]);
        }

        // Re-render the preview
        this.renderTestPreview(this.currentTest);
        this.showToast('Questions randomized within their sections', 'success');
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async saveTestToHistory() {
        try {
            // Ensure test has required metadata
            if (!this.currentTest.title) {
                this.currentTest.title = 'Untitled Test';
            }
            
            // Capture any manual edits made to the preview content
            const previewContent = document.getElementById('testPreviewContent');
            if (previewContent.contentEditable === 'true') {
                this.currentTest.editedHTML = previewContent.innerHTML;
            }
            
            // Add or update test in database
            if (this.currentTest.id) {
                await db.updateTest(this.currentTest);
                this.showToast('Test updated in history', 'success');
            } else {
                const id = await db.addTest(this.currentTest);
                this.currentTest.id = id;
                this.showToast('Test saved to history', 'success');
            }
            
            this.closeModal('testPreviewModal');
            
            // Switch to test history view and reload
            this.switchView('tests');
            await this.loadTestHistory();
        } catch (error) {
            console.error('Error saving test:', error);
            this.showToast('Error saving test', 'error');
        }
    }

    async loadTestHistory() {
        try {
            const tests = await db.getAllTests();
            const container = document.getElementById('testsContainer');
            
            if (tests.length === 0) {
                container.innerHTML = '<p class="empty-state">No tests saved yet. Generate and save a test to see it here.</p>';
                return;
            }
            
            this.renderTestHistoryList(tests);
        } catch (error) {
            console.error('Error loading test history:', error);
            this.showToast('Error loading test history', 'error');
        }
    }

    async searchTestHistory() {
        try {
            const searchTerm = document.getElementById('testSearchInput').value.toLowerCase();
            const tests = await db.getAllTests();
            
            const filtered = tests.filter(test => {
                const titleMatch = test.title && test.title.toLowerCase().includes(searchTerm);
                const subjectMatch = test.subject && test.subject.toLowerCase().includes(searchTerm);
                const classMatch = test.class && test.class.toLowerCase().includes(searchTerm);
                return titleMatch || subjectMatch || classMatch;
            });
            
            this.renderTestHistoryList(filtered);
        } catch (error) {
            console.error('Error searching test history:', error);
            this.showToast('Error searching tests', 'error');
        }
    }

    renderTestHistoryList(tests) {
        const container = document.getElementById('testsContainer');
        
        if (tests.length === 0) {
            container.innerHTML = '<p class="empty-state">No tests found matching your search.</p>';
            return;
        }
        
        let html = '<div class="tests-list">';
        
        tests.forEach(test => {
            const date = test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'Unknown date';
            const questionCount = test.questions ? test.questions.length : 0;
            
            html += `
                <div class="test-card">
                    <div class="test-card-header">
                        <h3>${this.escapeHtml(test.title || 'Untitled Test')}</h3>
                        <small>${date}</small>
                    </div>
                    <div class="test-card-body">
                        ${test.subject ? `<p><strong>Subject:</strong> ${this.escapeHtml(test.subject)}</p>` : ''}
                        ${test.class ? `<p><strong>Class:</strong> ${this.escapeHtml(test.class)}</p>` : ''}
                        ${test.version ? `<p><strong>Version:</strong> ${this.escapeHtml(test.version)}</p>` : ''}
                        <p><strong>Questions:</strong> ${questionCount}</p>
                    </div>
                    <div class="test-card-actions">
                        <button class="btn btn-primary btn-sm load-test" data-test-id="${test.id}">📂 Load</button>
                        <button class="btn btn-success btn-sm export-test-pdf" data-test-id="${test.id}">📄 PDF</button>
                        <button class="btn btn-success btn-sm export-test-docx" data-test-id="${test.id}">📝 DOCX</button>
                        <button class="btn btn-danger btn-sm delete-test" data-test-id="${test.id}">🗑️ Delete</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.load-test').forEach(btn => {
            btn.addEventListener('click', async () => {
                const testId = parseInt(btn.dataset.testId);
                await this.loadTestFromHistory(testId);
            });
        });
        
        container.querySelectorAll('.export-test-pdf').forEach(btn => {
            btn.addEventListener('click', async () => {
                const testId = parseInt(btn.dataset.testId);
                const test = await db.getTest(testId);
                if (test) {
                    await pdfGenerator.generateTestPDF(test, false);
                    this.showToast('PDF exported', 'success');
                }
            });
        });
        
        container.querySelectorAll('.export-test-docx').forEach(btn => {
            btn.addEventListener('click', async () => {
                const testId = parseInt(btn.dataset.testId);
                const test = await db.getTest(testId);
                if (test) {
                    await docxGenerator.generateTestDOCX(test, false);
                    this.showToast('DOCX exported', 'success');
                }
            });
        });
        
        container.querySelectorAll('.delete-test').forEach(btn => {
            btn.addEventListener('click', async () => {
                const testId = parseInt(btn.dataset.testId);
                await this.deleteTestFromHistory(testId);
            });
        });
    }

    async refreshTestQuestions() {
        if (!this.currentTest || !this.currentTest.questions) return;
        let updated = 0;
        let missing = 0;
        const refreshed = [];
        for (const q of this.currentTest.questions) {
            try {
                const latest = await db.getQuestion(q.id);
                if (latest) {
                    // Preserve imageWidth from test if question bank version has none
                    if (q.imageWidth && !latest.imageWidth) latest.imageWidth = q.imageWidth;
                    refreshed.push(latest);
                    // Count as updated if any key field differs
                    if (
                        latest.text !== q.text ||
                        latest.imageUrl !== q.imageUrl ||
                        latest.imageWidth !== q.imageWidth ||
                        JSON.stringify(latest.choices) !== JSON.stringify(q.choices)
                    ) updated++;
                } else {
                    refreshed.push(q); // question deleted from bank — keep snapshot
                    missing++;
                }
            } catch (e) {
                refreshed.push(q);
            }
        }
        this.currentTest.questions = refreshed;
        this.renderTestPreview(this.currentTest);
        let msg = `Questions refreshed — ${updated} updated from question bank.`;
        if (missing) msg += ` ${missing} no longer in bank (kept as-is).`;
        if (updated === 0 && missing === 0) msg = 'Questions refreshed — all already up to date.';
        this.showToast(msg, updated > 0 ? 'success' : 'info');
    }

    async loadTestFromHistory(testId) {
        try {
            const test = await db.getTest(testId);
            if (!test) {
                this.showToast('Test not found', 'error');
                return;
            }
            
            this.currentTest = test;
            this.renderTestPreview(this.currentTest);
            this.openModal('testPreviewModal');
        } catch (error) {
            console.error('Error loading test:', error);
            this.showToast('Error loading test', 'error');
        }
    }

    async deleteTestFromHistory(testId) {
        // Show confirmation dialog
        if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
            return;
        }
        
        try {
            await db.deleteTest(testId);
            this.showToast('Test deleted', 'success');
            await this.loadTestHistory();
        } catch (error) {
            console.error('Error deleting test:', error);
            this.showToast('Error deleting test', 'error');
        }
    }

    // Test Editor Functions
    toggleEditMode() {
        const previewContent = document.getElementById('testPreviewContent');
        const toggleBtn = document.getElementById('toggleEditModeBtn');
        const formatToolbar = document.getElementById('formatToolbar');
        const metadataToolbar = document.getElementById('metadataToolbar');
        
        const isEditable = previewContent.contentEditable === 'true';
        
        if (isEditable) {
            // Lock editing
            previewContent.contentEditable = 'false';
            previewContent.classList.remove('editable');
            toggleBtn.innerHTML = '🔒 Locked';
            toggleBtn.classList.remove('btn-success');
            toggleBtn.classList.add('btn-secondary');
            formatToolbar.style.display = 'none';
            metadataToolbar.style.display = 'none';
        } else {
            // Enable editing
            previewContent.contentEditable = 'true';
            previewContent.classList.add('editable');
            toggleBtn.innerHTML = '🔓 Unlocked';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-success');
            formatToolbar.style.display = 'flex';
            metadataToolbar.style.display = 'flex';
            previewContent.focus();
        }
    }

    applyFontSize(size) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.toString().length > 0) {
                document.execCommand('fontSize', false, '7');
                const fontElements = document.getElementsByTagName('font');
                for (let element of fontElements) {
                    if (element.size === '7') {
                        element.removeAttribute('size');
                        element.style.fontSize = size;
                    }
                }
            }
        }
    }

    applyTextColor(color) {
        document.execCommand('foreColor', false, color);
    }

    applyFormat(format) {
        switch (format) {
            case 'bold':
                document.execCommand('bold', false, null);
                document.getElementById('boldBtn').classList.toggle('active');
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                document.getElementById('italicBtn').classList.toggle('active');
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                document.getElementById('underlineBtn').classList.toggle('active');
                break;
        }
    }

    applyAlignment(align) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const container = selection.getRangeAt(0).commonAncestorContainer;
            let element = container.nodeType === 3 ? container.parentElement : container;
            
            // Find the closest block-level element
            while (element && element.id !== 'testPreviewContent') {
                const display = window.getComputedStyle(element).display;
                if (display === 'block' || element.tagName === 'DIV' || element.tagName === 'P' || 
                    element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3') {
                    element.style.textAlign = align;
                    break;
                }
                element = element.parentElement;
            }
        }
    }

    openEditMetadataModal() {
        const t = this.currentTest;
        // Populate the form with current test data
        document.getElementById('metaTitle').value = t.title || '';
        document.getElementById('metaDate').value = t.date || new Date().toLocaleDateString();
        document.getElementById('metaSubject').value = t.subject || '';
        document.getElementById('metaClass').value = t.class || '';
        document.getElementById('metaVersion').value = t.version || '';
        document.getElementById('metaInstructions').value = t.instructions || 'Instructions: Please answer all questions to the best of your ability. Show your work where applicable.';
        // Show toggles — defaults: showNameLine=true, showClass=true, everything else=false
        document.getElementById('metaShowNameLine').checked      = t.showNameLine      ?? true;
        document.getElementById('metaDoNotWrite').checked        = t.doNotWrite        ?? false;
        document.getElementById('metaShowDate').checked          = t.showDate          ?? false;
        document.getElementById('metaShowSubject').checked       = t.showSubject       ?? false;
        document.getElementById('metaShowClass').checked         = t.showClass         ?? true;
        document.getElementById('metaShowVersion').checked       = t.showVersion       ?? false;
        document.getElementById('metaShowTotalQuestions').checked = t.showTotalQuestions ?? false;
        document.getElementById('metaShowInstructions').checked      = t.showInstructions      ?? false;
        document.getElementById('metaShowAnswerLinesSA').checked    = t.showAnswerLinesSA    ?? t.showAnswerLines ?? false;
        document.getElementById('metaShowAnswerLinesEssay').checked = t.showAnswerLinesEssay ?? t.showAnswerLines ?? false;
        document.getElementById('metaShowSectionHr').checked        = t.showSectionHr        ?? true;
        document.getElementById('metaShowPageNumbers').checked       = t.showPageNumbers       ?? true;
        document.getElementById('metaShowCustomFields').checked      = t.showCustomFields      ?? false;
        
        // Load section instructions if they exist
        const sectionInstructions = this.currentTest.sectionInstructions || {};
        document.getElementById('metaInstrMultipleChoice').value = sectionInstructions['multiple-choice'] || '';
        document.getElementById('metaInstrTrueFalse').value = sectionInstructions['true-false'] || '';
        document.getElementById('metaInstrShortAnswer').value = sectionInstructions['short-answer'] || '';
        document.getElementById('metaInstrEssay').value = sectionInstructions['essay'] || '';
        document.getElementById('metaInstrMatching').value = sectionInstructions['matching'] || '';
        
        // Load custom fields if they exist
        document.getElementById('customFieldsContainer').innerHTML = '';
        if (this.currentTest.customFields) {
            this.currentTest.customFields.forEach((field, index) => {
                this.addCustomFieldToForm(field.label, field.value);
            });
        }
        
        this.openModal('editMetadataModal');
    }

    addCustomFieldToForm(label = '', value = '') {
        const container = document.getElementById('customFieldsContainer');
        const index = container.children.length;
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-row';
        fieldDiv.innerHTML = `
            <div class="form-group">
                <label>Field Label</label>
                <input type="text" class="custom-field-label" placeholder="e.g., Teacher Name" value="${this.escapeHtml(label)}">
            </div>
            <div class="form-group">
                <label>Field Value</label>
                <input type="text" class="custom-field-value" placeholder="Enter value" value="${this.escapeHtml(value)}">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-custom-field" style="margin-top: 1.5rem; height: 40px;">Remove</button>
        `;
        
        container.appendChild(fieldDiv);
        
        // Add remove button listener
        fieldDiv.querySelector('.remove-custom-field').addEventListener('click', () => {
            fieldDiv.remove();
        });
    }

    applyMetadataChanges() {
        // Update test data
        this.currentTest.title                = document.getElementById('metaTitle').value;
        this.currentTest.date                  = document.getElementById('metaDate').value;
        this.currentTest.subject               = document.getElementById('metaSubject').value;
        this.currentTest.class                 = document.getElementById('metaClass').value;
        this.currentTest.version               = document.getElementById('metaVersion').value;
        this.currentTest.instructions          = document.getElementById('metaInstructions').value;
        this.currentTest.showNameLine          = document.getElementById('metaShowNameLine').checked;
        this.currentTest.doNotWrite            = document.getElementById('metaDoNotWrite').checked;
        this.currentTest.showDate              = document.getElementById('metaShowDate').checked;
        this.currentTest.showSubject           = document.getElementById('metaShowSubject').checked;
        this.currentTest.showClass             = document.getElementById('metaShowClass').checked;
        this.currentTest.showVersion           = document.getElementById('metaShowVersion').checked;
        this.currentTest.showTotalQuestions    = document.getElementById('metaShowTotalQuestions').checked;
        this.currentTest.showInstructions      = document.getElementById('metaShowInstructions').checked;
        this.currentTest.showAnswerLinesSA    = document.getElementById('metaShowAnswerLinesSA').checked;
        this.currentTest.showAnswerLinesEssay = document.getElementById('metaShowAnswerLinesEssay').checked;
        this.currentTest.showSectionHr        = document.getElementById('metaShowSectionHr').checked;
        this.currentTest.showPageNumbers       = document.getElementById('metaShowPageNumbers').checked;
        this.currentTest.showCustomFields      = document.getElementById('metaShowCustomFields').checked;
        
        // Collect section instructions
        this.currentTest.sectionInstructions = {
            'multiple-choice': document.getElementById('metaInstrMultipleChoice').value.trim(),
            'true-false': document.getElementById('metaInstrTrueFalse').value.trim(),
            'short-answer': document.getElementById('metaInstrShortAnswer').value.trim(),
            'essay': document.getElementById('metaInstrEssay').value.trim(),
            'matching': document.getElementById('metaInstrMatching').value.trim()
        };
        
        // Collect custom fields
        this.currentTest.customFields = [];
        const customFieldLabels = document.querySelectorAll('.custom-field-label');
        const customFieldValues = document.querySelectorAll('.custom-field-value');
        
        customFieldLabels.forEach((labelInput, index) => {
            const label = labelInput.value.trim();
            const value = customFieldValues[index].value.trim();
            if (label && value) {
                this.currentTest.customFields.push({ label, value });
            }
        });
        
        // Re-render the preview with updated metadata
        this.renderTestPreview(this.currentTest);
        this.closeModal('editMetadataModal');
        this.showToast('Header information updated', 'success');
    }

    openExportModal() {
        this.openModal('exportModal');
    }

    async exportTest(format) {
        try {
            const includeAnswers = document.getElementById('includeAnswers').checked;
            
            // Capture any manual edits made to the preview content
            const previewContent = document.getElementById('testPreviewContent');
            if (previewContent.contentEditable === 'true') {
                // User made manual edits, capture them
                this.currentTest.editedHTML = previewContent.innerHTML;
            }
            
            if (format === 'pdf') {
                await pdfGenerator.generateTestPDF(this.currentTest, includeAnswers);
                this.showToast('PDF exported successfully', 'success');
            } else if (format === 'docx') {
                await docxGenerator.generateTestDOCX(this.currentTest, includeAnswers);
                this.showToast('DOCX exported successfully', 'success');
            }
            
            this.closeModal('exportModal');

            // Prompt to save
            const alreadySaved = !!this.currentTest.id;
            const msg = alreadySaved
                ? 'Would you like to save the current state of this test to history?'
                : 'Would you like to save this test to history?';
            if (confirm(msg)) {
                if (alreadySaved) {
                    await db.updateTest(this.currentTest);
                } else {
                    const id = await db.addTest(this.currentTest);
                    this.currentTest.id = id;
                }
                this.showToast('Test saved to history', 'success');
            }
        } catch (error) {
            console.error('Failed to export test:', error);
            this.showToast('Failed to export test', 'error');
        }
    }

    // Collections View
    async loadCollections() {
        const container = document.getElementById('collectionsContainer');
        
        // Get subjects from database
        const dbSubjects = await db.getAllSubjects();
        // Also get subjects from questions
        const questionSubjects = await db.getUniqueSubjects();
        
        // Combine both sources
        const allSubjectNames = new Set();
        dbSubjects.forEach(s => allSubjectNames.add(s.name));
        questionSubjects.forEach(s => allSubjectNames.add(s));
        
        if (allSubjectNames.size === 0) {
            container.innerHTML = '<p class="empty-state">No subjects yet. Add a subject or create questions with subject names.</p>';
            return;
        }

        let html = '';
        
        for (const subjectName of Array.from(allSubjectNames).sort()) {
            const questions = await db.getQuestionsBySubject(subjectName);
            
            // Get all classes from database for this subject
            const dbClasses = await db.getAllClasses();
            const subjectDbClasses = dbClasses.filter(c => c.subject === subjectName);
            
            // Get classes from questions
            const questionClassNames = [...new Set(questions.map(q => q.class).filter(c => c))];
            
            // Combine and deduplicate
            const allClassNames = new Set();
            subjectDbClasses.forEach(c => allClassNames.add(c.name));
            questionClassNames.forEach(c => allClassNames.add(c));
            
            const subjectObj = dbSubjects.find(s => s.name === subjectName);

            html += `
                <div class="collection-card">
                    <div class="collection-header">
                        <div class="collection-title">${this.escapeHtml(subjectName)}</div>
                    </div>
                    ${subjectObj && subjectObj.description ? `<div class="collection-description">${this.escapeHtml(subjectObj.description)}</div>` : ''}
                    <div class="collection-stats">
                        <span>📊 ${questions.length} question${questions.length !== 1 ? 's' : ''}</span>
                        ${allClassNames.size > 0 ? `<span>📚 ${allClassNames.size} class${allClassNames.size !== 1 ? 'es' : ''}</span>` : ''}
                    </div>
            `;
            
            // Display classes if any exist
            if (allClassNames.size > 0) {
                html += '<div class="collection-classes">';
                for (const className of Array.from(allClassNames).sort()) {
                    const classQuestions = questions.filter(q => q.class === className);
                    const classObj = subjectDbClasses.find(c => c.name === className);

                    // Get exam periods for this class
                    const dbExamPeriods = await db.getExamPeriodsByClass(subjectName, className);
                    const questionExamPeriodNames = [...new Set(classQuestions.map(q => q.examPeriod).filter(p => p))];
                    const allExamPeriodNames = new Set();
                    dbExamPeriods.forEach(p => allExamPeriodNames.add(p.name));
                    questionExamPeriodNames.forEach(p => allExamPeriodNames.add(p));

                    html += `<div class="class-item">`;
                    html += `<div class="class-item-header">`;
                    html += `<span class="class-name">📖 ${this.escapeHtml(className)}</span>`;
                    html += `<span class="class-count">${classQuestions.length} question${classQuestions.length !== 1 ? 's' : ''}</span>`;
                    html += `</div>`;
                    if (classObj && classObj.description) {
                        html += `<div class="collection-description sub">${this.escapeHtml(classObj.description)}</div>`;
                    }

                    if (allExamPeriodNames.size > 0) {
                        html += '<div class="exam-period-list">';
                        for (const periodName of Array.from(allExamPeriodNames).sort()) {
                            const periodQuestions = classQuestions.filter(q => q.examPeriod === periodName);
                            const periodObj = dbExamPeriods.find(p => p.name === periodName);
                            html += `
                                <div class="exam-period-item">
                                    <span class="exam-period-name">📋 ${this.escapeHtml(periodName)}</span>
                                    <span class="exam-period-count">${periodQuestions.length} question${periodQuestions.length !== 1 ? 's' : ''}</span>
                                    ${periodObj && periodObj.description ? `<span class="exam-period-desc">${this.escapeHtml(periodObj.description)}</span>` : ''}
                                </div>
                            `;
                        }
                        html += '</div>';
                    }
                    html += `</div>`;
                }
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        container.innerHTML = html;
    }

    // Subject Management
    openSubjectModal() {
        const modal = document.getElementById('subjectModal');
        document.getElementById('subjectForm').reset();
        this.openModal(modal.id);
    }

    async saveSubject() {
        try {
            const name = document.getElementById('subjectName').value.trim();
            const description = document.getElementById('subjectDescription').value.trim();

            if (!name) {
                alert('Please enter a subject name');
                return;
            }

            // Check if subject already exists in database
            const existingSubjects = await db.getAllSubjects();
            const subjectExists = existingSubjects.some(s => s.name === name);
            
            if (subjectExists) {
                alert('A subject with this name already exists');
                return;
            }

            // Save subject to database
            await db.addSubject({
                name: name,
                description: description
            });
            
            this.showToast(`Subject "${name}" created successfully!`, 'success');
            this.closeModal('subjectModal');
            await this.updateFilters();
            
            // Reload collections view if we're on that tab
            if (this.currentView === 'collections') {
                await this.loadCollections();
            }
        } catch (error) {
            console.error('Failed to save subject:', error);
            this.showToast('Failed to save subject', 'error');
        }
    }

    // Class Management
    async openClassModal() {
        const modal = document.getElementById('classModal');
        document.getElementById('classForm').reset();
        
        // Get subjects from both database and questions
        const dbSubjects = await db.getAllSubjects();
        const questionSubjects = await db.getUniqueSubjects();
        
        // Combine and deduplicate
        const allSubjects = new Set();
        dbSubjects.forEach(s => allSubjects.add(s.name));
        questionSubjects.forEach(s => allSubjects.add(s));
        
        const subjectArray = Array.from(allSubjects).sort();
        
        const select = document.getElementById('classSubject');
        select.innerHTML = '<option value="">Select Subject</option>';
        subjectArray.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
        });
        
        if (subjectArray.length === 0) {
            alert('Please add subjects first or create questions with subject names');
            return;
        }
        
        this.openModal(modal.id);
    }

    async saveClass() {
        try {
            const subject = document.getElementById('classSubject').value;
            const name = document.getElementById('className').value.trim();
            const description = document.getElementById('classDescription').value.trim();

            if (!subject || !name) {
                alert('Please enter both subject and class name');
                return;
            }

            // Get subject ID if it exists in database
            const dbSubjects = await db.getAllSubjects();
            const subjectObj = dbSubjects.find(s => s.name === subject);
            const subjectId = subjectObj ? subjectObj.id : null;

            // Check if class already exists
            const existingClasses = await db.getAllClasses();
            const classExists = existingClasses.some(c => c.name === name && c.subject === subject);
            
            if (classExists) {
                alert('A class with this name already exists for this subject');
                return;
            }

            // Save class to database
            await db.addClass({
                name: name,
                subject: subject,
                subjectId: subjectId,
                description: description
            });
            
            this.showToast(`Class "${name}" for ${subject} created successfully!`, 'success');
            this.closeModal('classModal');
            await this.updateFilters();
            
            // Reload collections view if we're on that tab
            if (this.currentView === 'collections') {
                await this.loadCollections();
            }
        } catch (error) {
            console.error('Failed to save class:', error);
            this.showToast('Failed to save class', 'error');
        }
    }

    // Exam Period Management
    async openExamPeriodModal() {
        const modal = document.getElementById('examPeriodModal');
        document.getElementById('examPeriodForm').reset();

        const dbSubjects = await db.getAllSubjects();
        const questionSubjects = await db.getUniqueSubjects();
        const allSubjects = new Set();
        dbSubjects.forEach(s => allSubjects.add(s.name));
        questionSubjects.forEach(s => allSubjects.add(s));
        const subjectArray = Array.from(allSubjects).sort();

        const subjectSelect = document.getElementById('examPeriodSubject');
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        subjectArray.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });

        if (subjectArray.length === 0) {
            alert('Please add subjects first or create questions with subject names');
            return;
        }

        document.getElementById('examPeriodClass').innerHTML = '<option value="">Select Class</option>';
        this.openModal(modal.id);
    }

    async updateExamPeriodClassOptions(subject) {
        const select = document.getElementById('examPeriodClass');
        select.innerHTML = '<option value="">Select Class</option>';
        if (!subject) return;

        const dbClasses = await db.getAllClasses();
        const subjectClasses = dbClasses.filter(c => c.subject === subject);
        const questions = await db.getQuestionsBySubject(subject);
        const questionClassNames = [...new Set(questions.map(q => q.class).filter(c => c))];

        const allClasses = new Set();
        subjectClasses.forEach(c => allClasses.add(c.name));
        questionClassNames.forEach(c => allClasses.add(c));

        Array.from(allClasses).sort().forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            select.appendChild(option);
        });
    }

    async saveExamPeriod() {
        try {
            const subject = document.getElementById('examPeriodSubject').value;
            const className = document.getElementById('examPeriodClass').value;
            const name = document.getElementById('examPeriodName').value.trim();
            const description = document.getElementById('examPeriodDescription').value.trim();

            if (!subject || !className || !name) {
                alert('Please fill in all required fields');
                return;
            }

            const existingPeriods = await db.getExamPeriodsByClass(subject, className);
            const periodExists = existingPeriods.some(p => p.name === name);
            if (periodExists) {
                alert('An exam period with this name already exists for this class');
                return;
            }

            await db.addExamPeriod({
                name: name,
                subject: subject,
                class: className,
                description: description
            });

            this.showToast(`Exam Period "${name}" created successfully!`, 'success');
            this.closeModal('examPeriodModal');
            await this.updateFilters();

            if (this.currentView === 'collections') {
                await this.loadCollections();
            }
        } catch (error) {
            console.error('Failed to save exam period:', error);
            this.showToast('Failed to save exam period', 'error');
        }
    }

    // Tests View
    async loadTests() {
        await this.loadTestHistory();
    }

    // Utility Methods
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Database Management
    toggleDatabaseMenu() {
        const menu = document.getElementById('databaseMenu');
        menu.classList.toggle('show');
    }

    closeDatabaseMenu() {
        const menu = document.getElementById('databaseMenu');
        menu.classList.remove('show');
    }

    async exportDatabase() {
        try {
            const data = await db.exportDatabase();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = `QuizKeeper_Backup_${new Date().toISOString().split('T')[0]}.json`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            this.showToast('Database exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting database:', error);
            this.showToast('Error exporting database', 'error');
        }
    }

    async importDatabase() {
        const fileInput = document.getElementById('importFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showToast('Please select a file', 'error');
            return;
        }

        try {
            const text = await file.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                this.showToast('Invalid file: could not parse JSON', 'error');
                return;
            }

            if (!data || typeof data !== 'object' ||
                (!Array.isArray(data.questions) && !Array.isArray(data.subjects))) {
                this.showToast('Invalid file: not a recognised database backup', 'error');
                return;
            }

            const result = await db.importDatabase(data);

            this.closeModal('importDatabaseModal');
            const total = result.questions + result.subjects + result.classes + result.examPeriods + result.tests;
            const msg = `Imported ${total} record${total !== 1 ? 's' : ''}` +
                (result.skipped ? ` (${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped)` : '');
            this.showToast(msg, 'success');

            // Reset filter UI then repopulate with the newly imported data
            this.currentFilters = { searchTerm: '', type: '', subject: '', class: '', examPeriod: '' };
            document.getElementById('searchInput').value = '';
            document.getElementById('filterSubject').value = '';
            document.getElementById('filterClass').value = '';
            document.getElementById('filterExamPeriod').value = '';
            document.getElementById('filterType').value = '';
            await this.updateFilters();

            // Reload current view to show new data
            this.loadQuestions();
            
            // Clear the file input
            fileInput.value = '';
        } catch (error) {
            console.error('Error importing database:', error);
            this.showToast(`Import failed: ${error.message || 'Unknown error'}`, 'error');
        }
    }

    async clearDatabase() {
        try {
            await db.clearAllData();
            this.closeModal('clearDatabaseModal');
            this.showToast('Database cleared successfully', 'success');

            // Reset filter UI then repopulate (all options should now be empty)
            this.currentFilters = { searchTerm: '', type: '', subject: '', class: '', examPeriod: '' };
            document.getElementById('searchInput').value = '';
            document.getElementById('filterSubject').value = '';
            document.getElementById('filterClass').value = '';
            document.getElementById('filterExamPeriod').value = '';
            document.getElementById('filterType').value = '';
            await this.updateFilters();
            
            // Reload current view to show empty state
            switch (this.currentView) {
                case 'questions':
                    this.loadQuestions();
                    break;
                case 'collections':
                    this.loadCollections();
                    break;
                case 'tests':
                    this.loadTestHistory();
                    break;
            }
        } catch (error) {
            console.error('Error clearing database:', error);
            this.showToast('Error clearing database', 'error');
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
            btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new QuizKeeperApp();
    await app.init();
    
    // Make app globally accessible for debugging
    window.app = app;
});
