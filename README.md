# SOMS 306 · Course Mastery Studio

An operations-management studio using the same shell, section structure, styles,
and feature modules as [FIN 303 Studio](https://github.com/Bran237/FIN-303).
The source reference commit is recorded in `data/provenance.json`.

## Run

```sh
python3 -m http.server 8000
```

Serve the repository over HTTP. Browser ES modules do not work by double-clicking
`index.html`. No backend, API keys, bundler, or production build is required.
For GitHub Pages, publish `main` from the repository root with all asset directories
alongside `index.html`. Relative asset paths and hash navigation support project
subpaths. `.nojekyll` is included.

## Sections and tools

| Section | Features |
| --- | --- |
| Dashboard | Chapter mastery, learning objectives, weekly goals, reminders, shared Notebook/homework totals, study progress and highlights |
| Textbook | Original readings, worked examples, glossary, concept popups, persistent highlights, formula walkthroughs, source tracing, chapter summaries |
| Notebook | Write This Down, key terms, formulas, optional explanations, written-state checks, review flags, adjacent related homework, printable notes |
| Homework | Original problems, assignment labels, worked solutions, calculator steps, related notes, solved-state tracking |
| Study | Guided reading and complete term review, gated flashcards, chapter quizzes, missed-answer correction, exam review and checklists, slide and video tools |
| Practice | Flashcards, quiz, matching, crossword, active recall, concept cards, ten mini games, timed exams, weak areas, study sessions, Notebook cards and quizzes |

The full original course content is preserved: five chapters, 55 objectives,
155 concepts, 64 questions, ten case studies, and all readings and examples.
Notebook outlines, summaries, cards, and review material derive from that existing
operations-management content. No FIN-303 educational data is included.

Homework, slides, video references, and remaining chapters have not been supplied.
Their tools are implemented, with absence notices in place of invented material.
When those sources arrive, integrate them through the shared content registry; see
`data/README.md`.

## Progress and backups

Progress, Notebook completion, solved homework, review flags, exam checklists,
study activity, theme, and navigation share one browser-local record:
`soms306_mastery_studio_v1`. Data remains specific to this browser profile and
origin. Export a backup before clearing site data or switching devices.
Use **Export backup** / **Import backup** to transfer progress. Imports validate
before replacing state and cannot replace course content. Original Companion
`{content, progress}` exports are supported. An existing `soms306.progress.v1`
record is migrated on first load without deleting the original key.

Browser storage errors leave the session usable and backups available. The
sidebar reports when persistent storage is unavailable. Accounts and automatic
cloud sync are not required. Reminders depend on browser permission and run while
the application is open; the service worker does not provide offline caching.

## Development

Node.js and Playwright are needed only for development checks:

```sh
npm ci
npm test
npm run test:browser
npm run test:advanced
```

Browser tests use `/usr/bin/chromium` when available; otherwise set
`CHROMIUM_PATH` or run `npx playwright install chromium`. The browser runners
start and stop their own static servers and use disposable browser contexts.
They cover project-subpath deployment, all six sections, study activities,
storage, backups, annotations, responsive layout, and homework/resource rendering
with explicit test-only fixtures. No sample assignments ship in the course.

See `docs/ARCHITECTURE.md` for module boundaries and maintenance details.
