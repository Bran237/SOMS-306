# Course content and future uploads

- `course.js`: the exact original SOMS-306 content object, preserved from the source commit.
- `content.js`: runtime normalization of a repeated source concept identifier. Chapter 1 and Chapter 2 each retain their own supply-chain-management definition and progress.
- `notebook-source.js`: Notebook outlines, cards, quizzes, summaries, and exam review derived from the course; future homework and resource records belong here.
- `database.js`: canonical chapter/objective registry and links between all modules.
- `provenance.json`: original content fingerprint and source repository commits.

The current chapters are `ch1`–`ch5`. Add future chapters to `course.chapters` and
`chapters`, together with objectives, concepts, readings, and questions. The shell
and chapter selector derive their options from those records; storage accepts
future positive chapter numbers.

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
