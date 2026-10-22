# Validation

The development suites run locally without external services:

```sh
npm test
npm run test:browser
npm run test:advanced
```

Source tests fingerprint the full original course and check every canonical
record's chapter/objective links. Storage tests exercise migration, backup
validation, stable state references, unavailable storage, and cross-tab updates.
Practice regressions cover empty decks, matching round transitions, and duplicate
exam submissions. Highlight tests use a real browser DOM.

The main browser runner serves the app under `/SOMS-306/` to detect asset paths
that would fail on GitHub Pages. It exercises all supplied chapters, Notebook
completion, empty Homework states, flashcards, quizzes, portable backups, safe
annotation text, cross-tab updates, themes, and mobile navigation. Core validation
blocks external requests and rejects missing assets and JavaScript errors.

The advanced browser runner exercises all ten Practice tabs, all ten mini games,
timed exam scoring/expiry, reading highlights, guided term review, flashcard
unlocking, and original operations formula walkthroughs. Disposable in-memory
fixtures validate future worked homework, solved-state synchronization, slides,
timestamped video links, and printable notebooks. Fixtures never enter production
content files.

Notification permission and actual delivery remain browser-dependent. Video
playback requires supplied video references and network access. Those cannot be
validated as real course content before the material is uploaded.
