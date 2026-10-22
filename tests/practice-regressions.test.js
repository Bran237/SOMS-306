import test from 'node:test';
import assert from 'node:assert/strict';
import { installFlashcards } from '../js/practice/flashcards.js';
import { installMatching } from '../js/practice/matching.js';
import { installExam } from '../js/practice/exam.js';

test('an empty flashcard filter stays empty and retains recovery controls', () => {
  const concepts = [{ id: 'c1', chapterId: 'ch3', tier: 'must_know' }];
  const ctx = { ACTIONS: {}, PROGRESS: { flashcardStatus: {} }, CONTENT: { course: { chapters: ['ch3'] }, chapters: { ch3: { id: 'ch3', number: 3 } } }, allConcepts: () => concepts, conceptsForChapter: () => concepts };
  installFlashcards(ctx);
  ctx.initFlashcardDeck('starred', 'ch3');
  const html = ctx.viewFlashcards();
  assert.equal(ctx.fcState.filter, 'starred');
  assert.equal(ctx.fcState.chapter, 'ch3');
  assert.equal(ctx.fcState.deck.length, 0);
  assert.match(html, /No cards match/);
  assert.match(html, /data-action="fcFilter" data-val="all"/);
});

test('matching round changes clear prior round keys without disabling new cards', () => {
  const concepts = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, term: `Term ${i}`, definition: `Definition ${i}`, section: '3.1' }));
  const ctx = { ACTIONS: {}, allConcepts: () => concepts, render() { ctx.viewMatchGame(); } };
  installMatching(ctx);
  ctx.initMatchGame();
  ctx.viewMatchGame();
  ctx._matchedKeys = ['t0', 't1', 't2', 't3', 't4', 't5'];
  ctx.ACTIONS.matchNext({ dataset: { last: '0' } });
  assert.equal(ctx.matchGame.round, 1);
  assert.deepEqual(ctx._matchedKeys, []);
  assert.equal(ctx.matchGame.matched, 0);
  assert.doesNotMatch(ctx.viewMatchGame(), / disabled /);
});

test('exam matching questions render choices and record one answer per question', () => {
  const first = { id: 'match1', type: 'matching', concept: 'c1', lo: '3.1', difficulty: 'medium', pairs: [{ left: 'A', right: 'One' }, { left: 'B', right: 'Two' }] };
  const second = { ...first, id: 'match2' };
  let saves = 0;
  const ctx = { ACTIONS: {}, PROGRESS: { quizAttempts: [] }, shuffleArr: values => values, dom: { getElementById: id => ({ value: id.endsWith('-0') ? '0' : '1' }) }, saveProgress() { saves++; }, examNextQuestion() { ctx.examState.index++; } };
  installExam(ctx);
  ctx.examState = { phase: 'active', questions: [first, second], index: 0, answers: [] };
  assert.match(ctx.examAnswerZoneHTML(first), /data-action="examAnswerMatch"/);
  assert.match(ctx.examAnswerZoneHTML(first), /exam-match-1/);
  const button = { dataset: { questionId: 'match1' } };
  ctx.ACTIONS.examAnswerMatch(button);
  ctx.ACTIONS.examAnswerMatch(button);
  assert.equal(ctx.examState.answers.length, 1);
  assert.equal(ctx.examState.answers[0].correct, true);
  assert.equal(ctx.PROGRESS.quizAttempts.length, 1);
  assert.equal(saves, 1);
});
