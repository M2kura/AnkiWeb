# AnkiWeb Flashcard App

## Project Overview
AnkiWeb is a modern web-based flashcard application that allows users to create, import, and practice flashcards using spaced repetition. It supports JSON deck import/export, offline usage, and a beautiful, responsive UI.

---

## Features & Requirements Mapping

### Documentation
- **Project goal, steps, function descriptions, code comments**: See this README and code comments throughout the codebase.

### HTML5
- **Valid HTML5 doctype**: `index.html` (line 1)
- **HTML5 validation**: `index.html` (meta tags, doctype)
- **Works in modern browsers**: React + Tailwind, tested in Chrome, Firefox, Edge, Opera
- **Semantic tags**: `<header>` in `Header.jsx`, `<main>`/`<section>` in `HomePage.jsx`, `<footer>` in `App.jsx`
- **SVG/Canvas**: SVG icons and progress bar in `PracticePage.jsx`, SVG icon in `DeckEditorPage.jsx`
- **Media (Audio/Video)**: Audio API in `soundEffects.js` (card flip sound)
- **Form elements**: Inputs, textarea, file input in `DeckEditorPage.jsx` and `HomePage.jsx`
- **Offline application**: Service worker in `index.html`, online/offline status in `ConnectionStatus.jsx`

### CSS
- **Advanced selectors**: `src/styles/advanced-selectors.css` (e.g., `:nth-child`, combinators)
- **Vendor prefixes**: Handled by Tailwind/PostCSS
- **CSS3 2D/3D transforms**: Card flip in `PracticePage.jsx` (inline style)
- **CSS3 transitions/animations**: Tailwind classes and custom styles (e.g., `.transition-all`)
- **Media queries**: Tailwind responsive classes (e.g., `lg:`)
- **SVG in CSS**: SVG icons and progress bar

### JavaScript
- **OOP approach**: `src/utils/DeckStats.js` (class-based stats utility, used in `DeckEditorPage.jsx`)
- **JS framework/library**: React (all components)
- **Advanced JS API**: File API (`HomePage.jsx`), LocalStorage (`DeckEditorPage.jsx`, `PracticePage.jsx`), Service Worker (`index.html`), Media API (`soundEffects.js`), History API (React Router)
- **History API**: React Router navigation in `App.jsx`, `HomePage.jsx`, etc.
- **Media API**: `soundEffects.js` (audio)
- **JS API for state**: LocalStorage, Service Worker, React state
- **JS with SVG**: Progress bar color manipulation in `PracticePage.jsx` (button to change SVG color)

### Other
- **Complete solution**: Full flashcard app with create/import/practice/export
- **Aesthetic design**: Modern, responsive UI with Tailwind CSS

---

## File/Feature Map
- `index.html`: HTML5 doctype, meta, service worker
- `src/App.jsx`: Routing, `<footer>`
- `src/components/layout/Header.jsx`: `<header>`
- `src/pages/HomePage.jsx`: `<main>`, `<section>`, file import, semantic structure
- `src/pages/DeckEditorPage.jsx`: Forms, OOP class usage, advanced selectors (see CSS), export, LocalStorage
- `src/pages/PracticePage.jsx`: SVG, 3D transforms, transitions, SVG color manipulation, keyboard events
- `src/components/ConnectionStatus.jsx`: Offline/online detection
- `src/utils/soundEffects.js`: Media API (audio)
- `src/utils/DeckStats.js`: OOP class
- `src/styles/advanced-selectors.css`: Advanced CSS selectors

---

## How to Run
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open in browser: [http://localhost:5173/AnkiWeb/](http://localhost:5173/AnkiWeb/)

---

## Notes
- All requirements from the grading table are implemented and mapped above.
- For any questions, see code comments or ask the author. 