# 📚 Quiz Keeper

A browser-based question bank and test generation tool for educators. Build a reusable library of questions, compose tests with control over question distribution, preview and edit the result, then export to PDF or docx formats.

---

## Features

### Question Bank
- Add, edit, and delete questions with 6 question types: Multiple Choice, True/False, Short Answer, Matching, Table, and Essay.
- Multiple-choice questions support 2–10 choices with a configurable correct answer.
- Table questions feature an interactive grid editor with per-cell **Q** (question cell) and **B** (bold) toggles.
- Matching questions support 2–10 term/definition pairs.
- Short Answer and Essay questions support sample answers and grading rubrics to print on the answer key.

### Collections (Subjects, Classes & Exam Periods)
- Organize questions using a three-level hierarchy: **Subject → Class → Exam Period**.
- Subjects are top-level categories (e.g., *Biology*, *World History*).
- Classes represent student groups and belong to a Subject (e.g., *Grade 10A*, *AP*).
- Exam Periods belong to a Subject and Class (e.g., *Midterm*, *Q2*) and enable proportional question mixing across syllabus coverage areas.

### Search & Filtering
- Full-text search across question content.
- Filter the question bank by Subject, Class, Exam Period, and question type — independently or in combination.

### Test Generation
- Select subject, class, and exam period scope, then set per-type question counts using **range slider controls** that reflect real-time availability.
- **Cumulative Exam / Exam Period Mix**: when no specific exam period is selected, assign percentage weights to each period so questions are drawn proportionately.
- A fallback dialog resolves shortfalls when a weighted allocation cannot be exactly satisfied based on amount of each type of question configured.

### Test Preview & Editor
- Full **rich-text editor** for test content: bold, italic, underline, text alignment, font size, and text color.
- Toggle between edit mode and read-only preview mode.
- **Metadata editor** for customizing the test header (title, name line, date line, class, score field) with support for custom fields.
- Manually **add or remove individual questions** from the generated test via a searchable, filterable question picker.
- **Randomize** question order at any point.

### Export
- Export to **PDF** (A4, via jsPDF) or **Word DOCX** — both include smart page-break avoidance so questions never split across pages.
- Export options include a student version (no answers) or an answer key version.

### Test History
- Save generated tests for later reference.
- Reopen, re-export, edit, or re-randomize any saved test from the Test History tab.

### Database Management
- **Export** the full question bank and test history to a `.json` backup data file (timestamped).
- **Import** a `.json` backup data file to restore or merge data.
- **Clear database** with confirmation dialog.

### UI & Accessibility
- **Dark mode** toggle, persisted across sessions via `localStorage`.
- Runs entirely in the browser — no build step, no server, no sign-in.

---

## Getting Started

1. Open `index.html` in a modern browser (Chrome, Edge, or Firefox recommended).
2. Create at least one **Subject** in the Collections tab before adding questions.
3. Add questions via **+ New Question**.
4. Click **Generate Test** to compose and export a test.

> **Important:** All data is stored in your browser's IndexedDB local data file. Use **⚙️ Database → Export Database** regularly to back up your question bank. Clearing browser site data will permanently erase all questions and test history.

---

## Technologies

| Technology | Purpose |
|---|---|
| HTML5 / CSS3 / Vanilla JavaScript | UI, styling, and all application logic — no frameworks |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Client-side persistent storage for questions, collections, and test history |
| [jsPDF](https://github.com/parallax/jsPDF) v4.2.0 | PDF export generation |
| [docx](https://github.com/dolanmiu/docx) v7.8.2 | Word (DOCX) export generation |

---

## License

Quiz Keeper is free software released under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).  
© 2026 Mark Bryant
