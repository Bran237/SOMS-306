import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONTENT, NOTEBOOK_CHAPTERS, DB, getChapter } from '../data/database.js';
import { COURSE_CONTENT } from '../data/course.js';

const provenance = JSON.parse(readFileSync(new URL('../data/provenance.json', import.meta.url)));
test('the entire uploaded operations-management course is preserved', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(COURSE_CONTENT)).digest('hex'), provenance.course.sha256);
  assert.deepEqual(CONTENT.course.chapters, ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch9', 'ch14']);
  assert.equal(CONTENT.learningObjectives.length, 88);
  assert.equal(CONTENT.concepts.length, 339);
  assert.equal(CONTENT.quiz.length, 159);
  assert.equal(CONTENT.caseStudies.length, 18);
});

test('repeated source concepts have distinct runtime identities and retain chapter definitions', () => {
  assert.equal(new Set(CONTENT.concepts.map(c => c.id)).size, CONTENT.concepts.length);
  for (const original of COURSE_CONTENT.concepts){
    const actual = CONTENT.concepts.find(c => c.chapterId === original.chapterId && c.term === original.term);
    assert.equal(actual.definition, original.definition);
  }
  assert.ok(CONTENT.loProse['1.1'].some(block => block.html.includes('data-cid="ch1:supply-chain-management"')));
});

test('notebook covers every supplied objective without inventing homework or lecture sources', () => {
  assert.equal(DB.notebooks.length, 88);
  assert.equal(DB.homework.length, 0);
  for (const chapter of NOTEBOOK_CHAPTERS){
    assert.equal(chapter.homework.length, 0);
    assert.equal(chapter.homeworkConcept.length, 0);
    assert.ok(chapter.missingHw.length);
    assert.ok(chapter.notebook.every(note => note.hw.length === 0 && note.notes.length > 0));
    assert.ok(chapter.cards.length && chapter.quiz.length && chapter.exam.checklist.length);
    assert.equal(chapter.video, undefined);
    assert.equal(chapter.slides, undefined);
  }
});

test('notebook, quiz, card, formula, and summary records resolve to course objectives', () => {
  const objectives = new Map(DB.learningObjectives.map(lo => [lo.id,lo]));
  for (const collection of ['notebooks','quizzes','flashcards','formulas','summaries']){
    assert.equal(new Set(DB[collection].map(record => record.id)).size, DB[collection].length);
    for (const record of DB[collection]){
      assert.ok(getChapter(record.chapterId), record.id);
      assert.ok(record.learningObjectiveIds.length, record.id);
      for (const id of record.learningObjectiveIds) assert.equal(objectives.get(id)?.chapterId, record.chapterId, record.id);
    }
  }
});

test('concept connections use supplied operations-management pairs', () => {
  for (const pair of CONTENT.miniGames.connections){
    assert.equal(pair.length, 2);
    for (const id of pair) assert.ok(CONTENT.concepts.some(c => c.id === id), id);
  }
});

test('new chapter reading formulas are available in notebooks, formula cards, and exam review', () => {
  for (const [id,code,formula] of [
    ['ch6','6.8','Output rate = Operating time per day &divide; Cycle time'],
    ['ch9','9.13','Cumulative % = (running total of defects &divide; total defects) &times; 100'],
    ['ch14','14.8','N = D(T)(1 + X) &divide; C'],
  ]) {
    const chapter = NOTEBOOK_CHAPTERS.find(ch => ch.id === id);
    assert.ok(chapter.notebook.find(note => note.num === code).formulas.includes(formula));
    assert.ok(chapter.cards.some(card => card.k === 'formula' && card.b === formula));
    assert.ok(chapter.exam.formulas.some(item => item[0] === formula));
  }
});
