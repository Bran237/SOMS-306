import { CONTENT as COURSE_CONTENT } from './content.js';
import { NOTEBOOK_CHAPTERS } from './notebook-source.js';

export { COURSE_CONTENT as CONTENT, NOTEBOOK_CHAPTERS };

const SOURCE_COMPANION = 'SOMS-306 original index.html';
const SOURCE_NOTEBOOK = 'Notebook derived from SOMS-306 course content';
const NOTEBOOK_OBJECTIVE_MAP = {};
const supplementalObjectives = [];
const learningObjectives = [...COURSE_CONTENT.learningObjectives, ...supplementalObjectives];
const objectiveById = new Map(learningObjectives.map(objective => [objective.id, objective]));
const normalizeChapter = value => {
  const raw = value && typeof value === 'object' ? value.chapterId ?? value.id ?? value.number : value;
  const match = String(raw ?? '').match(/^(?:ch)?(\d+)$/);
  return match ? `ch${Number(match[1])}` : String(raw ?? '');
};

export function chapterNumber(chapter) { return COURSE_CONTENT.chapters[normalizeChapter(chapter)]?.number ?? Number(String(chapter).replace(/^ch/, '')); }

/** Numeric labels default to notebook numbering; explicit loX.Y is canonical. */
export function learningObjectiveIds(chapter, section, source = 'notebook') {
  const chapterId = normalizeChapter(chapter);
  if (section && typeof section === 'object') {
    if (Array.isArray(section.learningObjectiveIds)) return section.learningObjectiveIds.filter(id => objectiveById.get(id)?.chapterId === chapterId);
    if (section.lo && !section.num) source = 'companion';
    section = section.num ?? section.lo ?? section.code ?? section.section ?? '';
  }
  const text = String(section ?? '');
  const explicit = text.match(/lo\d+\.\d+(?:-notebook)?/g);
  if (explicit?.length) return [...new Set(explicit.filter(id => objectiveById.get(id)?.chapterId === chapterId))];
  const labels = text.match(/\d+\.\d+[a-z]?/g) || [];
  return [...new Set(labels.flatMap(label => {
    const code = label.match(/^\d+\.\d+/)[0];
    if (source === 'notebook' && NOTEBOOK_OBJECTIVE_MAP[chapterId]?.[code]) return NOTEBOOK_OBJECTIVE_MAP[chapterId][code];
    const objective = COURSE_CONTENT.learningObjectives.find(item => item.chapterId === chapterId && item.code === code);
    return objective ? [objective.id] : [];
  }))];
}

const chapterObjectives = id => learningObjectives.filter(objective => objective.chapterId === id).map(objective => objective.id);
const provenance = (source, path) => ({ source, path });
const link = (ids, linkStatus = 'section') => ({ learningObjectiveIds: [...new Set(ids)], linkStatus: ids.length ? linkStatus : 'unmapped' });
const parseHomework = value => String(value).split('|')[0];

const chapters = Object.fromEntries(Object.entries(COURSE_CONTENT.chapters).map(([id, chapter]) => [id, {
  ...chapter, learningObjectiveIds: chapterObjectives(id),
  notebookChapterId: NOTEBOOK_CHAPTERS.some(item => item.id === id) ? id : null,
}]));

const notebooks = NOTEBOOK_CHAPTERS.flatMap(chapter => chapter.notebook.map((note, index) => ({
  ...note, id: `note:${chapter.id}:${note.num}`, chapterId: chapter.id, sourceId: note.num, index,
  ...link(learningObjectiveIds(chapter.id, note.num)),
  homeworkIds: [...new Set((note.hw || []).map(value => `homework:${chapter.id}:${parseHomework(value)}`))],
  provenance: provenance(SOURCE_NOTEBOOK, `${chapter.id}.notebook[${index}]`),
})));

const homework = NOTEBOOK_CHAPTERS.flatMap(chapter => {
  const records = [...chapter.homework.map(item => ({ ...item, kind: 'worked' })), ...chapter.homeworkConcept.map(item => ({ ...item, kind: 'conceptual' }))];
  if (chapter.st1?.length) records.push({ id: 'st1', title: chapter.st1Title || 'ST-1 Key terms', terms: chapter.st1, questions: chapter.st1q || {}, kind: 'key-terms' });
  return records.map(item => {
    const notes = notebooks.filter(note => note.chapterId === chapter.id && note.homeworkIds.includes(`homework:${chapter.id}:${item.id}`));
    const ids = [...new Set(notes.flatMap(note => note.learningObjectiveIds))];
    return { ...item, id: `homework:${chapter.id}:${item.id}`, sourceId: item.id, chapterId: chapter.id,
      ...link(ids.length ? ids : chapterObjectives(chapter.id), ids.length ? 'section' : 'chapter'),
      notebookSectionIds: notes.map(note => note.id), notebookIds: notes.map(note => note.id),
      provenance: provenance(SOURCE_NOTEBOOK, `${chapter.id}.${item.kind}.${item.id}`),
    };
  });
});

function notebookLinks(chapter, text) {
  const plain = String(text).replace(/<[^>]*>/g, ' ').toLowerCase();
  const notes = notebooks.filter(note => note.chapterId === chapter.id && [note.title, ...(note.terms || []).map(term => term[0])]
    .some(label => {
      const token = String(label).replace(/<[^>]*>/g, ' ').toLowerCase().trim();
      return token.length >= 5 && plain.includes(token);
    }));
  const ids = [...new Set(notes.flatMap(note => note.learningObjectiveIds))];
  return link(ids.length ? ids : chapterObjectives(chapter.id), ids.length ? 'topic' : 'chapter');
}

const quizzes = [
  ...COURSE_CONTENT.quiz.map(question => ({ ...question, sourceId: question.id, ...link(learningObjectiveIds(question.chapterId, question.lo, 'companion')), provenance: provenance(SOURCE_COMPANION, `quiz.${question.id}`) })),
  ...NOTEBOOK_CHAPTERS.flatMap(chapter => chapter.quiz.map((question, index) => ({ ...question,
    id: `quiz:notebook:${chapter.id}:${index}`, sourceId: index, chapterId: chapter.id,
    type: 'multiple_choice', prompt: question.q, options: question.o, correctIndex: question.a, explanation: question.e,
    ...notebookLinks(chapter, question.q), provenance: provenance(SOURCE_NOTEBOOK, `${chapter.id}.quiz[${index}]`),
  }))),
];
const flashcards = [
  ...COURSE_CONTENT.concepts.map(concept => ({ ...concept, id: `card:${concept.id}`, sourceId: concept.id,
    front: concept.term, back: concept.definition, ...link(learningObjectiveIds(concept.chapterId, concept.lo, 'companion')), provenance: provenance(SOURCE_COMPANION, `concepts.${concept.id}`) })),
  ...NOTEBOOK_CHAPTERS.flatMap(chapter => chapter.cards.map((card, index) => ({ ...card,
    id: `card:notebook:${chapter.id}:${index}`, sourceId: index, chapterId: chapter.id, front: card.f, back: card.b,
    ...notebookLinks(chapter, `${card.f} ${card.b}`), provenance: provenance(SOURCE_NOTEBOOK, `${chapter.id}.cards[${index}]`),
  }))),
];
const summaries = [
  ...Object.entries(COURSE_CONTENT.loProse).flatMap(([code, blocks]) => blocks.map((block, index) => {
    const objective = COURSE_CONTENT.learningObjectives.find(item => item.code === code);
    return { ...block, id: `summary:companion:${code}:${index}`, chapterId: objective.chapterId, ...link([objective.id]), provenance: provenance(SOURCE_COMPANION, `loProse.${code}[${index}]`) };
  })),
  ...NOTEBOOK_CHAPTERS.map(chapter => ({ id: `summary:notebook:${chapter.id}`, chapterId: chapter.id,
    heading: chapter.title, html: chapter.summary, ...link(chapterObjectives(chapter.id), 'chapter'), provenance: provenance(SOURCE_NOTEBOOK, `${chapter.id}.summary`) })),
];

const formulas = [];
function addFormula(chapterId, html, ids, source, path, label = '') {
  if (typeof html !== 'string' || !html.trim()) return;
  formulas.push({ id: `formula:${formulas.length + 1}`, chapterId, html, formula: html, label,
    ...link(ids.length ? ids : chapterObjectives(chapterId), ids.length ? 'section' : 'chapter'), provenance: provenance(source, path) });
}
COURSE_CONTENT.concepts.forEach(concept => { if (concept.formula) addFormula(concept.chapterId, concept.formula, learningObjectiveIds(concept.chapterId, concept.lo, 'companion'), SOURCE_COMPANION, `concepts.${concept.id}.formula`, concept.term); });
for (const [code, blocks] of Object.entries(COURSE_CONTENT.loProse)) {
  const objective = COURSE_CONTENT.learningObjectives.find(item => item.code === code);
  blocks.forEach((block, index) => {
    [...block.html.matchAll(/<div[^>]*class=["']formula-eq["'][^>]*>([\s\S]*?)<\/div>/g)].forEach((match, equation) => addFormula(objective.chapterId, match[1], [objective.id], SOURCE_COMPANION, `loProse.${code}[${index}].formula[${equation}]`, block.heading));
  });
}
NOTEBOOK_CHAPTERS.forEach(chapter => {
  chapter.notebook.forEach((note, index) => (note.formulas || []).forEach((formula, i) => addFormula(chapter.id, formula, learningObjectiveIds(chapter.id, note.num), SOURCE_NOTEBOOK, `${chapter.id}.notebook[${index}].formulas[${i}]`, note.title)));
  chapter.homework.forEach(problem => {
    const record = homework.find(item => item.id === `homework:${chapter.id}:${problem.id}`);
    (problem.parts || []).forEach((part, i) => { if (part.f) addFormula(chapter.id, part.f, record.learningObjectiveIds, SOURCE_NOTEBOOK, `${chapter.id}.homework.${problem.id}.parts[${i}].f`, problem.title); });
  });
  (chapter.exam?.formulas || []).forEach((formula, i) => addFormula(chapter.id, Array.isArray(formula) ? formula[0] : formula, chapterObjectives(chapter.id), SOURCE_NOTEBOOK, `${chapter.id}.exam.formulas[${i}]`, Array.isArray(formula) ? formula[1] : ''));
  chapter.cards.forEach((card, index) => { if (card.k === 'formula') addFormula(chapter.id, card.b, notebookLinks(chapter, `${card.f} ${card.b}`).learningObjectiveIds, SOURCE_NOTEBOOK, `${chapter.id}.cards[${index}].b`, card.f); });
});

export const DB = {
  course: COURSE_CONTENT.course, chapters, learningObjectives, notebooks, homework,
  quizzes, flashcards, formulas, summaries, textbookSummaries: summaries,
  concepts: COURSE_CONTENT.concepts, caseStudies: COURSE_CONTENT.caseStudies,
  notebookObjectiveMap: NOTEBOOK_OBJECTIVE_MAP,
};
export function getChapter(id) { return chapters[normalizeChapter(id)] || null; }
export function getNotebookChapter(id) { return NOTEBOOK_CHAPTERS.find(chapter => chapter.id === normalizeChapter(id)) || null; }
