# 📚 Quiz Keeper

A browser-based question bank and test generation tool for educators. Build a reusable library of questions, compose tests with control over question distribution, preview and edit the result, then export to PDF or docx formats.

Thanks for checking out Quiz Keeper, I made this tool at the request of my amazingly hardworking wife who works as a university professor and found the tools provided by the university system and the book publisher's online platform to be frustrating. I put a lot of thought into the implementation of this tool and also of course had my wife's suggestions and feedback, so hopefully you will find it usefull too. This tool is provided free and open source under the GNU GPLv3 License, and while I have done my best to make sure it works correctly, a robust amount of testing has not yet been performed. Use it at your own risk and always have a backup of your database saved. In that same vein, if you encounter bugs or have suggestions I cannot promise a response or action but feel free to contact me. 

---

## Features

### Question Bank
- Add, edit, and delete questions with 6 question types: Multiple Choice, True/False, Short Answer, Matching, Table, and Essay.
- Multiple-choice questions support 2–10 choices with a configurable correct answer.
- Table questions feature an interactive grid editor with per-cell **Q** (question cell) and **B** (bold) toggles.
- Matching questions support 2–10 term/definition pairs.
- Short Answer and Essay questions support sample answers and grading rubrics to print on the answer key.
- Resizable Image support

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
- Reopen, duplicate, re-export, edit, or re-randomize any saved test from the Test History tab.
- Save over the archive copy or just use it to print a one off change. Duplicate any test in history with a new name to use it as a working template.

### Database Management
- **Export** the full question bank and test history to a `.json` backup data file (timestamped).
- **Import** a `.json` backup data file to restore or merge data.
- **Clear database** with confirmation dialog.

### UI & Accessibility
- **Dark mode** toggle, persisted across sessions via `localStorage`.
- Runs entirely in the browser — no install needed, no server needed to run from your device, no accounts. If all images are saved on your device no internet connection necessary at all.

---

## Getting Started

1. Download the zip file from releases and unzip, then open `index.html` in a modern browser (Firefox, Chrome, Opera, and Edge were tested to a limited degree).
2. OR go to https://mbryant02.github.io/Quiz-Keeper/ to use the version hosted here. **Be warned that no promises will be made to keep this version up forever or compatible forever.** I suggest using step 1 to make a local copy on your machine.
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
| [jsPDF](https://github.com/parallax/jsPDF) v4.2.0 | PDF export generation | MIT Licensed | Created by Parallax
| [docx](https://github.com/dolanmiu/docx) v9.6.0 | Word (DOCX) export generation | MIT Licensed | Created by Dolan Miu

---

## License

Quiz Keeper is free software released under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).  
© 2026 Mark Bryant
