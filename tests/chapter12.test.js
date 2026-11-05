import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {CONTENT,DB,getNotebookChapter} from '../data/database.js';
import {CH12_EXAMPLES} from '../data/chapter12-examples.js';
import {CHAPTER_12} from '../data/chapter12.js';

test('Chapter 12 appears in order with all 13 source learning objectives and complete study records', () => {
  assert.deepEqual(CONTENT.course.chapters, ['ch1','ch2','ch3','ch4','ch5','ch6','ch9','ch12','ch14']);
  assert.equal(CONTENT.learningObjectives.length, 101);
  assert.equal(CONTENT.concepts.length, 401);
  assert.equal(CONTENT.quiz.length, 201);
  const objectives = CONTENT.learningObjectives.filter(lo => lo.chapterId === 'ch12');
  assert.equal(objectives.length, 13);
  for (const lo of objectives){
    assert.ok(CONTENT.loProse[lo.code]?.length);
    assert.ok(lo.keyConcepts.length);
    assert.ok(CONTENT.quiz.some(q => q.chapterId === 'ch12' && q.lo === lo.code));
  }
  for (const question of CONTENT.quiz.filter(q => q.chapterId === 'ch12')){
    assert.ok(CONTENT.concepts.some(c => c.chapterId === 'ch12' && c.id === question.concept));
  }
});

test('all 36 original screenshots retain their original bytes and recorded provenance', () => {
  const provenance = JSON.parse(readFileSync(new URL('../data/provenance.json',import.meta.url)));
  assert.equal(createHash('sha256').update(JSON.stringify({chapter:CHAPTER_12,examples:CH12_EXAMPLES})).digest('hex'),provenance.chapter12.studyDataSha256);
  const sources = JSON.parse(readFileSync(new URL('../data/chapter12-sources.json',import.meta.url)));
  assert.equal(sources.screenshots.length, 36);
  assert.match(sources.coverage, /12.9.*not supplied/);
  for (const source of sources.screenshots){
    const bytes = readFileSync(new URL('../'+source.asset,import.meta.url));
    assert.equal(bytes.length, source.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  }
});

test('all 14 worked examples resolve from notebook sections to the same homework records', () => {
  const chapter = getNotebookChapter('ch12');
  const linked = new Set();
  for (const note of DB.notebooks.filter(note => note.chapterId === 'ch12')){
    for (const id of note.homeworkIds){
      const problem = DB.homework.find(p => p.id === id);
      assert.ok(problem, id);
      assert.ok(problem.notebookIds.includes(note.id));
      assert.ok(problem.learningObjectiveIds.includes(`lo${note.num}`));
      linked.add(problem.sourceId);
    }
  }
  assert.equal(linked.size, 14);
  assert.equal(chapter.homework.length,14);
  assert.match(chapter.coverageNote, /12.9/);
});

test('EOQ, EPQ, reorder, discount, and single-period results match independently recomputed values', () => {
  const ex = n => CH12_EXAMPLES.find(p => p.id === `ch12-example-${String(n).padStart(2,'0')}`);
  assert.equal(Math.sqrt(2*9600*75/16),300);
  assert.equal(ex(2).parts[0].ans[1],'300 tires');
  assert.equal((300/2)*16+(9600/300)*75,4800);
  assert.equal(ex(2).parts[3].ans[1],'$4,800');
  assert.equal(Math.sqrt(2*48000*45*800/(800-200)),2400);
  assert.equal(ex(4).parts[0].ans[1],'2,400 wheels');
  assert.equal((1000/2)*.32+(4000/1000)*30+.8*4000,3480);
  assert.match(ex(6).parts[0].ans[1], /3,480/);
  assert.equal(Math.ceil(50*2+1.28*3*Math.sqrt(2)),106);
  assert.equal(ex(9).parts[1].ans[1],'106 jars');
  assert.equal(Math.ceil(30*9+2.33*3*Math.sqrt(9)-71),220);
  assert.equal(ex(10).parts[0].ans[1],'220 units');
  assert.equal((171-10*16+43)/(2*Math.sqrt(16)),6.75);
  assert.match(ex(11).parts[1].ans[1],/6.75/);
  assert.match(ex(11).parts[1].note,/16.75/);
  assert.equal(300+(2.4/(2.4+.8))*(500-300),450);
  assert.match(ex(12).parts[1].ans[1],/450 liters/);
  const target=4200/(4200+800);
  assert.ok(.6<target && .9>=target);
  assert.equal(ex(14).parts[0].ans[1],'2 spares');
});
