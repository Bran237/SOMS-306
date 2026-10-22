import { CONTENT } from './content.js';

// Notebook material is derived only from the existing operations-management course.
// Add supplied assignments, slides, and video references here when they arrive.
// Source labels are learning-objective labels, not inferred textbook page numbers.
const text = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);

function readingNotes(blocks, fallback){
  // Prefer the source's enumerated facts to copying an objective as its answer.
  // The complete readings remain under Explain it to me and Textbook.
  const bullets = blocks.flatMap(block => [...block.html.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/g)].map(match => match[1]));
  if (bullets.length) return bullets.slice(0, 8);
  const paragraphs = blocks.flatMap(block => [...block.html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(match => match[1]));
  return paragraphs.length ? paragraphs.slice(0, 3) : [text(fallback)];
}

export const NOTEBOOK_CHAPTERS = CONTENT.course.chapters.map(id => {
  const chapter = CONTENT.chapters[id];
  const objectives = CONTENT.learningObjectives.filter(lo => lo.chapterId === id);
  const concepts = CONTENT.concepts.filter(concept => concept.chapterId === id);
  const questions = CONTENT.quiz.filter(q => q.chapterId === id);
  const quiz = questions.flatMap(q => {
    if (Array.isArray(q.options) && Number.isInteger(q.correctIndex)) return [{q:q.prompt, o:q.options, a:q.correctIndex, e:q.explanation}];
    if (q.type === 'true_false') return [{q:q.prompt, o:['True','False'], a:q.correctAnswer ? 0 : 1, e:q.explanation}];
    return [];
  });
  return {
    id,
    title: `Chapter ${chapter.number}: ${chapter.title}`,
    source: 'Derived from the existing SOMS-306 learning objectives, concepts, and readings.',
    summary: `<div class="callout">Based on your existing SOMS-306 course content. Homework, slides, and video references can be added when supplied.</div>` + objectives.map(lo => `<h2>${text(lo.code)} ${text(lo.text)}</h2>` + (CONTENT.loProse[lo.code] || []).map(block => `<h3>${block.heading}</h3>${block.html}`).join('')).join(''),
    notebook: objectives.map(lo => {
      const terms = concepts.filter(c => (lo.keyConcepts || []).includes(c.id) || c.lo === lo.code);
      const blocks = CONTENT.loProse[lo.code] || [];
      return {
        num:lo.code,
        title:text(lo.text),
        notes:terms.length ? terms.map(c => text(c.plain || c.definition)) : readingNotes(blocks, lo.text),
        terms:terms.map(c => [text(c.term), text(c.definition)]),
        formulas:terms.filter(c => c.formula).map(c => c.formula),
        explain:blocks.map(block => `<h4>${block.heading}</h4>${block.html}`).join(''),
        hw:[],
      };
    }),
    homework:[],
    homeworkConcept:[],
    missingHw:['Homework problems and worked solutions have not been uploaded yet. They will appear here and beside their related notebook sections once supplied.'],
    calcNote:'Calculator instructions will be included with your homework when the original problems are supplied.',
    cards:concepts.map(c => ({f:text(c.term), b:text(c.definition), k:'term'})).concat(concepts.filter(c => c.formula).map(c => ({f:text(c.term), b:c.formula, k:'formula'}))),
    quiz,
    exam:{
      concepts:concepts.filter(c => c.tier === 'must_know').map(c => text(c.term) + ': ' + text(c.definition)),
      formulas:concepts.filter(c => c.formula).map(c => [c.formula, text(c.term)]),
      mistakes:concepts.filter(c => c.commonMistake).map(c => text(c.commonMistake)),
      diffs:[],
      selftest:quiz.slice(0,5).map((_,i) => i),
      checklist:objectives.map(lo => text(lo.text)),
    },
  };
});

// Homework renderers accept source HTML, following the FIN-303 data contract.
export function qBox(item){
  return `<div class="qbox"><b>Question</b> ${item.q || ('<b>Given:</b> ' + (item.given || ''))}</div>`;
}
export function st1QBox(want, chapter){
  const q = chapter.st1q;
  if (!q) return '';
  const letters = 'abcdefghij'.split('').filter(letter => q[letter] && (!want || want.includes(letter)));
  return '<div class="qbox"><b>ST-1 KEY TERMS</b> Define each of the following terms:<div class="qparts">' + letters.map(letter => `<div><b>${letter}.</b> ${q[letter]}</div>`).join('') + '</div></div>';
}
