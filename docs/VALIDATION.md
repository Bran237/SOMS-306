# Validation

The development suites run locally without external services:

```sh
npm test
npm run test:browser
npm run test:advanced
```

Source tests fingerprint the full uploaded course and check every canonical
record's chapter/objective links. Storage tests exercise migration, backup
validation, stable state references, unavailable storage, and cross-tab updates.
Practice regressions cover empty decks, matching round transitions, and duplicate
exam submissions. Highlight tests use a real browser DOM.

The main browser runner serves the app under `/SOMS-306/` to detect asset paths
that would fail on GitHub Pages. It exercises all supplied chapters, Notebook
completion, empty Homework states, flashcards, quizzes, portable backups, safe
annotation text, cross-tab updates, themes, and mobile navigation. Core validation
blocks external requests and rejects missing assets and JavaScript errors. It
also checks source excerpt controls and exercises cards, quoted definitions,
recall, and five-question quizzes for Chapters 6, 9, and 14 while retaining a
previous-version progress record.

The advanced browser runner exercises all ten Practice tabs, all ten mini games,
timed exam scoring/expiry, reading highlights, guided term review, flashcard
unlocking, and original operations formula walkthroughs. Disposable in-memory
fixtures validate future worked homework, solved-state synchronization, slides,
timestamped video links, and printable notebooks. Fixtures never enter production
content files. Chapter 14's restricted tools, chapter switching, newly supplied
crosswords, and mobile readings/Notebook layouts are also covered. A timer
regression verifies that pending game callbacks cannot reset an exam or another
game.

Notification permission and actual delivery remain browser-dependent. Video
playback requires supplied video references and network access. Those cannot be
validated as real course content before the material is uploaded.

Chapter 12 checks verify all 36 source image fingerprints, all 13 objectives,
the concept/question registry, and all 14 Notebook-to-Homework links. Independent
arithmetic checks cover EOQ, EPQ, quantity discounts, reorder points, FOI,
single-period stocking, and the noted source error in Example 11. Browser checks
open original images under the GitHub Pages subpath, solve a chapter quiz, and
verify that written/solved state survives reload and backup export. Mobile checks
include Chapter 12 Textbook, Notebook, and Homework.
