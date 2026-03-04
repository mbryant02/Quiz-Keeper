/*     This file is part of Quiz Keeper, a test generation and question bank tool. (C) 2026 by Mark Bryant.

    Quiz Keeper is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

    Quiz Keeper is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with Quiz Keeper. If not, see <https://www.gnu.org/licenses/>. */

// Database Management for Quiz Keeper
// Uses IndexedDB for local storage

class Database {
    constructor() {
        this.dbName = 'TestGeneratorDB';
        this.version = 2;
        this.db = null;
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create Questions store
                if (!db.objectStoreNames.contains('questions')) {
                    const questionsStore = db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
                    questionsStore.createIndex('type', 'type', { unique: false });
                    questionsStore.createIndex('subject', 'subject', { unique: false });
                    questionsStore.createIndex('class', 'class', { unique: false });
                    questionsStore.createIndex('examPeriod', 'examPeriod', { unique: false });
                    questionsStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (event.oldVersion < 2) {
                    // Migrate v1 → v2: add examPeriod index to existing questions store
                    const questionsStore = event.target.transaction.objectStore('questions');
                    if (!questionsStore.indexNames.contains('examPeriod')) {
                        questionsStore.createIndex('examPeriod', 'examPeriod', { unique: false });
                    }
                }

                // Create Collections store (Subjects)
                if (!db.objectStoreNames.contains('subjects')) {
                    const subjectsStore = db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
                    subjectsStore.createIndex('name', 'name', { unique: true });
                }

                // Create Classes store
                if (!db.objectStoreNames.contains('classes')) {
                    const classesStore = db.createObjectStore('classes', { keyPath: 'id', autoIncrement: true });
                    classesStore.createIndex('name', 'name', { unique: false });
                    classesStore.createIndex('subjectId', 'subjectId', { unique: false });
                }

                // Create Exam Periods store
                if (!db.objectStoreNames.contains('examPeriods')) {
                    const examPeriodsStore = db.createObjectStore('examPeriods', { keyPath: 'id', autoIncrement: true });
                    examPeriodsStore.createIndex('name', 'name', { unique: false });
                    examPeriodsStore.createIndex('subject', 'subject', { unique: false });
                    examPeriodsStore.createIndex('class', 'class', { unique: false });
                }

                // Create Tests store
                if (!db.objectStoreNames.contains('tests')) {
                    const testsStore = db.createObjectStore('tests', { keyPath: 'id', autoIncrement: true });
                    testsStore.createIndex('title', 'title', { unique: false });
                    testsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    testsStore.createIndex('subject', 'subject', { unique: false });
                }
            };
        });
    }

    // Generic method to add data to a store
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Generic method to get data by ID
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Generic method to get all data from a store
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Generic method to update data
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Generic method to delete data
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Get data by index
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // QUESTIONS Methods
    async addQuestion(question) {
        question.createdAt = new Date().toISOString();
        return await this.add('questions', question);
    }

    async getQuestion(id) {
        return await this.get('questions', id);
    }

    async getAllQuestions() {
        return await this.getAll('questions');
    }

    async updateQuestion(question) {
        question.updatedAt = new Date().toISOString();
        return await this.update('questions', question);
    }

    async deleteQuestion(id) {
        return await this.delete('questions', id);
    }

    async getQuestionsByType(type) {
        return await this.getByIndex('questions', 'type', type);
    }

    async getQuestionsBySubject(subject) {
        return await this.getByIndex('questions', 'subject', subject);
    }

    async getQuestionsByClass(className) {
        return await this.getByIndex('questions', 'class', className);
    }

    async getQuestionsByExamPeriod(examPeriod) {
        return await this.getByIndex('questions', 'examPeriod', examPeriod);
    }

    // Search questions by text
    // Returns all searchable text for a question including answers/choices/pairs
    getQuestionSearchText(q) {
        const parts = [q.text || ''];
        if (q.subject) parts.push(q.subject);
        if (q.class) parts.push(q.class);
        if (q.examPeriod) parts.push(q.examPeriod);
        if (q.answer) parts.push(String(q.answer));
        if (q.rubric) parts.push(q.rubric);
        if (q.choices) q.choices.forEach(c => parts.push(c.text));
        if (q.pairs) q.pairs.forEach(p => { parts.push(p.left); parts.push(p.right); });
        if (q.tableData && q.tableData.cells) {
            q.tableData.cells.forEach(row => row.forEach(cell => { if (cell.text) parts.push(cell.text); }));
        }
        return parts.join(' ').toLowerCase();
    }

    async searchQuestions(searchTerm) {
        const allQuestions = await this.getAllQuestions();
        const lowerSearch = searchTerm.toLowerCase();
        return allQuestions.filter(q =>
            this.getQuestionSearchText(q).includes(lowerSearch)
        );
    }

    // Filter questions with multiple criteria
    async filterQuestions(filters) {
        let questions = await this.getAllQuestions();

        if (filters.type) {
            questions = questions.filter(q => q.type === filters.type);
        }

        if (filters.subject) {
            questions = questions.filter(q => q.subject === filters.subject);
        }

        if (filters.class) {
            questions = questions.filter(q => q.class === filters.class);
        }

        if (filters.examPeriod) {
            questions = questions.filter(q => q.examPeriod === filters.examPeriod);
        }

        if (filters.searchTerm) {
            const lowerSearch = filters.searchTerm.toLowerCase();
            questions = questions.filter(q =>
                this.getQuestionSearchText(q).includes(lowerSearch)
            );
        }

        return questions;
    }

    // SUBJECTS Methods
    async addSubject(subject) {
        subject.createdAt = new Date().toISOString();
        return await this.add('subjects', subject);
    }

    async getAllSubjects() {
        return await this.getAll('subjects');
    }

    async getSubject(id) {
        return await this.get('subjects', id);
    }

    async updateSubject(subject) {
        return await this.update('subjects', subject);
    }

    async deleteSubject(id) {
        return await this.delete('subjects', id);
    }

    // CLASSES Methods
    async addClass(classData) {
        classData.createdAt = new Date().toISOString();
        return await this.add('classes', classData);
    }

    async getAllClasses() {
        return await this.getAll('classes');
    }

    async getClass(id) {
        return await this.get('classes', id);
    }

    async getClassesBySubject(subjectId) {
        return await this.getByIndex('classes', 'subjectId', subjectId);
    }

    async updateClass(classData) {
        return await this.update('classes', classData);
    }

    async deleteClass(id) {
        return await this.delete('classes', id);
    }

    // EXAM PERIODS Methods
    async addExamPeriod(periodData) {
        periodData.createdAt = new Date().toISOString();
        return await this.add('examPeriods', periodData);
    }

    async getAllExamPeriods() {
        return await this.getAll('examPeriods');
    }

    async getExamPeriod(id) {
        return await this.get('examPeriods', id);
    }

    async getExamPeriodsByClass(subject, className) {
        const all = await this.getAllExamPeriods();
        return all.filter(p => p.subject === subject && p.class === className);
    }

    async updateExamPeriod(periodData) {
        return await this.update('examPeriods', periodData);
    }

    async deleteExamPeriod(id) {
        return await this.delete('examPeriods', id);
    }

    // TESTS Methods
    async addTest(test) {
        test.createdAt = new Date().toISOString();
        return await this.add('tests', test);
    }

    async getAllTests() {
        const tests = await this.getAll('tests');
        // Sort by creation date, newest first
        return tests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async getTest(id) {
        return await this.get('tests', id);
    }

    async updateTest(test) {
        test.updatedAt = new Date().toISOString();
        return await this.update('tests', test);
    }

    async deleteTest(id) {
        return await this.delete('tests', id);
    }

    // Get unique values for filters
    async getUniqueSubjects() {
        const questions = await this.getAllQuestions();
        const subjects = [...new Set(questions.map(q => q.subject).filter(s => s))];
        return subjects.sort();
    }

    async getUniqueClasses() {
        const questions = await this.getAllQuestions();
        const classes = [...new Set(questions.map(q => q.class).filter(c => c))];
        return classes.sort();
    }

    async getUniqueExamPeriods() {
        const questions = await this.getAllQuestions();
        const periods = [...new Set(questions.map(q => q.examPeriod).filter(p => p))];
        return periods.sort();
    }

    // Get statistics
    async getStatistics() {
        const questions = await this.getAllQuestions();
        const subjects = await this.getAllSubjects();
        const classes = await this.getAllClasses();
        const examPeriods = await this.getAllExamPeriods();
        const tests = await this.getAllTests();

        const questionsByType = {
            'multiple-choice': questions.filter(q => q.type === 'multiple-choice').length,
            'true-false': questions.filter(q => q.type === 'true-false').length,
            'short-answer': questions.filter(q => q.type === 'short-answer').length,
            'essay': questions.filter(q => q.type === 'essay').length,
            'matching': questions.filter(q => q.type === 'matching').length
        };

        return {
            totalQuestions: questions.length,
            totalSubjects: subjects.length,
            totalClasses: classes.length,
            totalExamPeriods: examPeriods.length,
            totalTests: tests.length,
            questionsByType
        };
    }

    // Clear all data (for testing/reset purposes)
    async clearAllData() {
        const stores = ['questions', 'subjects', 'classes', 'examPeriods', 'tests'];
        for (const storeName of stores) {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    // Export all database data to JSON
    async exportDatabase() {
        const data = {
            version: this.version,
            exportDate: new Date().toISOString(),
            questions: await this.getAllQuestions(),
            subjects: await this.getAll('subjects'),
            classes: await this.getAll('classes'),
            examPeriods: await this.getAll('examPeriods'),
            tests: await this.getAllTests()
        };
        return data;
    }

    // Import data from JSON
    async importDatabase(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid file format');
        }

        let imported = { subjects: 0, classes: 0, examPeriods: 0, questions: 0, tests: 0, skipped: 0 };

        // Import subjects first (they don't depend on anything).
        // The subjects store has a unique index on 'name', so duplicates are skipped.
        if (data.subjects && Array.isArray(data.subjects)) {
            for (const subject of data.subjects) {
                try {
                    const subjectData = { ...subject };
                    delete subjectData.id;
                    await this.addSubject(subjectData);
                    imported.subjects++;
                } catch (e) {
                    imported.skipped++; // duplicate name — skip silently
                }
            }
        }

        // Import classes
        if (data.classes && Array.isArray(data.classes)) {
            for (const cls of data.classes) {
                try {
                    const classData = { ...cls };
                    delete classData.id;
                    await this.addClass(classData);
                    imported.classes++;
                } catch (e) {
                    imported.skipped++;
                }
            }
        }

        // Import exam periods
        if (data.examPeriods && Array.isArray(data.examPeriods)) {
            for (const period of data.examPeriods) {
                try {
                    const periodData = { ...period };
                    delete periodData.id;
                    await this.addExamPeriod(periodData);
                    imported.examPeriods++;
                } catch (e) {
                    imported.skipped++;
                }
            }
        }

        // Import questions
        if (data.questions && Array.isArray(data.questions)) {
            for (const question of data.questions) {
                try {
                    const questionData = { ...question };
                    delete questionData.id;
                    await this.addQuestion(questionData);
                    imported.questions++;
                } catch (e) {
                    imported.skipped++;
                }
            }
        }

        // Import tests
        if (data.tests && Array.isArray(data.tests)) {
            for (const test of data.tests) {
                try {
                    const testData = { ...test };
                    delete testData.id;
                    await this.addTest(testData);
                    imported.tests++;
                } catch (e) {
                    imported.skipped++;
                }
            }
        }

        return imported;
    }
}

// Create and export a singleton instance
const db = new Database();
