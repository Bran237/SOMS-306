import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONTENT, NOTEBOOK_CHAPTERS, DB, getChapter } from '../data/database.js';
import { COURSE_CONTENT } from '../data/course.js';

const provenance = JSON.parse(readFileSync(new URL('../data/provenance.json', import.meta.url)));
test('the entire original operations-management course is preserved', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(COURSE_CONTENT)).digest('hex'), provenance.course.sha256);
  assert.equal(CONTENT.course.chapters.length, 5);
  assert.equal(CONTENT.learningObjectives.length, 55);
  assert.equal(CONTENT.concepts.length, 155);
  assert.equal(CONTENT.quiz.length, 64);
  assert.equal(CONTENT.caseStudies.length, 10);
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
  assert.equal(DB.notebooks.length, 55);
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
