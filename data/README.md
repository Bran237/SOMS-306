# Course content and future uploads

- `course.js`: the exact content object extracted from the uploaded Operations Management Study Companion.html.
- `content.js`: combines the companion content with Chapter 12 and normalizes a repeated source concept identifier. Chapter 1 and Chapter 2 each retain their own supply-chain-management definition and progress.
- `chapter12.js`: structured study explanations, learning objectives, definitions, formulas, and practice questions derived from the screenshot upload.
- `chapter12-examples.js`: optional worked textbook Examples 1–14 and links to their Notebook objectives.
- `chapter12-sources.json`: original ZIP and image fingerprints; all 36 original PNGs are under `assets/ch12/`.
- `notebook-source.js`: Notebook outlines, cards, quizzes, summaries, and exam review derived from the course; future homework and resource records belong here.
- `database.js`: canonical chapter/objective registry and links between all modules.
- `provenance.json`: uploaded file and extracted-content fingerprints, original content provenance, and source repository commits.

The current chapters are `ch1`–`ch6`, `ch9`, `ch12`, and `ch14`. Add future chapters to `course.chapters` and
`chapters`, together with objectives, concepts, readings, and questions. The shell
and chapter selector derive their options from those records; storage accepts
future positive chapter numbers.

The latest upload preserves the existing concept and question identifiers, adds
Chapters 6, 9, and 14, and revises the Chapter 5 outsourcing explanation. Preserve
these stable identifiers so old quizzes, flashcards, and Notebook progress keep
their meaning. `noMiniGames: true` on Chapter 14 excludes matching, crossword, and
mini-games; its quizzes, cards, recall, exams, and study sessions remain available.

Chapter 12 is added through the content registry without altering the preceding
HTML upload's `course.js` object or its fingerprint. Screenshot text is organized
into study explanations rather than presented as an unverified OCR transcript.
Original screenshots preserve full source wording and graphics. Textbook examples
are tagged as optional practice, not as assigned homework. Example 11 explicitly
documents the source arithmetic discrepancy; its image remains unchanged.

Keep each original homework question and label. A worked problem uses:

```js
{
  id: 'assignment-problem-id', title: 'Original problem label', tag: 'Assigned',
  q: 'Original question HTML', given: 'Original given values',
  parts: [{l: 'a', ask: 'What to find', f: 'Formula HTML',
    rows: [['Explanation of a step', 'Calculation']],
    ans: ['Answer label', 'Answer value'], calc: 'Calculator instructions'}]
}
```

Put it in the matching chapter's `homework` array, then add its ID to the relevant
Notebook section's `hw` array. A reference may be `id|display label|a,b` to show
only selected parts next to a note. Conceptual questions use `homeworkConcept`
records with `id`, `title`, `q`, and `body`. The same solved-state key appears in
Notebook and Homework. Calculator steps are source-dependent; do not invent them.

For supplied slides, use `slides` records with `n`, `t`, `k`, optional `ex` / `how`,
and `hw` references. A `video` record uses a YouTube `id`, `caution`, `missing`,
and `rows` containing `hw`, `why`, and `clips` as `[seconds,label,explanation]`.
The original FIN Studio renderers support these structures.

Educational strings may contain trusted source HTML. Browser progress and
imported user strings must remain escaped. Update provenance and preservation
tests deliberately when adding educational material, then validate routes and
cross-links for the new chapter.
