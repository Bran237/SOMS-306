# Architecture

`index.html` loads `js/app.js` as a browser ES module. The application is served as ordinary static files, including from a GitHub Pages project subpath. Relative imports and hash routes avoid backend and bundler requirements.

## Shared shell

`js/app.js` owns the six main sections, selected chapter, theme, search, progress backups, and browser history. It mounts the Companion and Notebook tools into scoped hosts within that shell. Those hosts are implementation boundaries; they share the same course data, chapter selector, progress store, and origin.

The module hosts keep event delegation and queries local. Feature controls must not add document-wide click handlers that respond to another module’s buttons. Timers and observers should pause or disconnect when their feature becomes inactive and clean up when the host is destroyed.

## Content registry

`data/course.js` preserves the complete original SOMS-306 content object. `data/notebook-source.js` derives Notebook sections, cards, quizzes, summaries, and exam review from those operations-management readings and concepts. It carries no FIN-303 educational material. The Notebook uses objective labels and the shared registry maps those labels to canonical objectives without finance-specific numbering exceptions.

Homework arrays are empty until assignments are supplied. The original FIN-303 problem, solution, calculator-step, assignment-label, and completion renderers are retained. To add homework, fill `homework` / `homeworkConcept` and link each problem from the relevant section's `hw` array. Keep original question statements, worked steps, and source labels. Slides and video renderers show absence notices until source material exists. Do not invent missing source material.

The provenance manifest fingerprints the original course and records the source app commits. Content-preservation tests verify the full original object, including all readings and examples. Add future chapters to `course.chapters` and `chapters`, then supply objectives, prose, concepts, and questions. No layout rewrite is needed.

## Progress store

`js/core/store.js` owns the versioned browser state under `soms306_mastery_studio_v1`:

- `companion`: study time, streaks, XP, quizzes, cards, recall scheduling, highlights, badges, and guided chapter flow.
- `notebook`: note completion, solved homework, review flags, exam checks, Notebook cards, and quiz history.
- `settings` and `navigation`: common theme and selected section/chapter.

The store migrates original local-storage keys without removing them. Versioned exports contain all shared progress and settings. Imports validate before mutation and never replace course content. Stable object references let mounted modules keep their state bindings across imports. Storage errors leave in-memory progress and backup export usable. Cross-tab changes notify mounted views.

The old Firebase integration is intentionally absent: a static course needs no shared remote account or backend. Cross-device transfer uses backup files.

## Feature boundaries

- `js/modules/dashboard.js`: Companion overview and mastery UI; the shell adds shared Notebook/homework totals.
- `js/modules/textbook.js`: readings, glossary, concept links, highlighting, and source tracing.
- `js/modules/study.js`: guided reading, complete term review, gated cards, quizzes, and missed-answer review.
- `js/modules/practice.js` and `js/practice/`: independent Companion practice activities.
- `js/companion/`: instance-local services, navigation adapters, modals, progress views, action dispatch, and lifecycle.
- `js/notebook/notebook.js`: Write This Down and adjacent homework.
- `js/notebook/homework.js`: shared problem, answer, and solution rendering.
- `js/notebook/resources.js`: summaries, slides, videos, and printing resources.
- `js/notebook/exam.js`, `practice.js`, and `dashboard.js`: preserved Notebook drills, review, and completion metrics.

Each suite receives the shared store and outer navigation callbacks. Neither suite creates another website, iframe, origin, or copy of the course state. Internal context objects preserve the original feature functions while making their dependencies explicit.

## Safe changes

For a UI-only change, leave source data and provenance untouched. Keep new styles scoped to the appropriate host. Add or extend the meaningful functional check for the behavior being changed, then run relevant source/store tests and browser regression checks. For a new chapter, update the shared content and identifier mapping first, then verify its routes and references across all six modules.

Browser-local progress and imported backup text are user data: render text through text nodes or escape it before inserting into HTML. Keep educational source markup separate from user-entered progress strings.
