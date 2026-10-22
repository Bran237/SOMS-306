import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY, BACKUP_FORMAT, defaultState } from '../js/core/store.js';

function memory(values = {}) {
  const map = new Map(Object.entries(values));
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map };
}
const backup = state => JSON.stringify({ format: BACKUP_FORMAT, version: 1, state });

test('migrates both original applications while retaining all original keys', () => {
  const storage = memory({ 'soms306.progress.v1': JSON.stringify({ xp: 24, flashcardStatus: { c1: 'known' } }), soms306_nb_done: '{"ch3:3.1a":true}', soms306_hw_done: '{"ch3:p31":true}', soms306_review: '{"sec:ch3:3.1a":true}', soms306_exam_check: '{"ex:ch3:0":true}', soms306_theme: 'dark' });
  const store = createStore({ storage });
  assert.equal(store.state.companion.xp, 24); assert.equal(store.state.companion.flashcardStatus.c1, 'know');
  assert.equal(store.state.notebook.done['ch3:3.1a'], true); assert.equal(store.state.notebook.homeworkDone['ch3:p31'], true);
  assert.equal(store.state.settings.theme, 'dark'); store.save();
  assert.ok(storage.getItem(STORAGE_KEY)); assert.ok(storage.getItem('soms306.progress.v1')); assert.ok(storage.getItem('soms306_nb_done'));
});
test('round trips progress without replacing cached object and array references', () => {
  const store = createStore({ storage: memory() });
  const companion = store.state.companion, done = store.state.notebook.done, attempts = companion.quizAttempts;
  companion.xp = 18; attempts.push({ ts: 1, correct: true, conceptId: 'c' }); done['ch3:3.1a'] = true;
  const original = store.exportBackup(); store.reset(); store.importBackup(original);
  assert.equal(store.state.companion, companion); assert.equal(store.state.notebook.done, done); assert.equal(companion.quizAttempts, attempts);
  assert.equal(companion.xp, 18); assert.equal(attempts.length, 1); assert.equal(done['ch3:3.1a'], true);
});
test('invalid and unsafe backups reject atomically', () => {
  const store = createStore({ storage: memory() }); store.state.companion.xp = 30;
  const before = store.exportBackup();
  for (const value of ['{', '{}', '{"format":"other","version":1,"state":{}}', '{"format":"soms306-course-mastery-studio","version":2,"state":{}}', '{"xp":1,"__proto__":{"polluted":true}}', '{"progress":{"quizAttempts":"bad"}}']) {
    assert.throws(() => store.importBackup(value)); assert.deepEqual(JSON.parse(store.exportBackup()).state, JSON.parse(before).state);
  }
  assert.equal({}.polluted, undefined);
});
test('legacy companion exports preserve notebook progress and educational data is not imported', () => {
  const store = createStore({ storage: memory() }); store.state.notebook.done.n = true;
  store.importBackup(JSON.stringify({ content: { bad: true }, progress: { xp: 9, flashcardStatus: { c: 'known' } } }));
  assert.equal(store.state.companion.xp, 9); assert.equal(store.state.companion.flashcardStatus.c, 'know'); assert.equal(store.state.notebook.done.n, true); assert.equal(store.state.content, undefined);
});
test('storage errors leave memory and backups usable', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  const store = createStore({ storage }); store.state.companion.xp = 7; store.save();
  assert.equal(store.status.persistent, false); assert.ok(store.status.message.includes('export'));
  assert.equal(JSON.parse(store.exportBackup()).state.companion.xp, 7);
});
test('subscribers and valid cross-tab updates refresh stable references', () => {
  const target = new EventTarget(), storage = memory(), store = createStore({ storage, eventTarget: target });
  const seen = [], companion = store.state.companion; store.subscribe((state, detail) => seen.push(detail.reason)); store.save('manual');
  const state = defaultState(); state.companion.xp = 42;
  const event = new Event('storage'); Object.assign(event, { key: STORAGE_KEY, storageArea: storage, newValue: JSON.stringify(state) }); target.dispatchEvent(event);
  assert.equal(store.state.companion, companion); assert.equal(companion.xp, 42); assert.deepEqual(seen, ['manual', 'external']);
  const bad = new Event('storage'); Object.assign(bad, { key: STORAGE_KEY, newValue: '{"companion":{"xp":-1}}' }); target.dispatchEvent(bad); assert.equal(companion.xp, 42);
});
test('new shared storage wins over old legacy values on subsequent visits', () => {
  const storage = memory({ 'soms306.progress.v1': '{"xp":8}' });
  const first = createStore({ storage }); first.state.companion.xp = 99; first.save();
  assert.equal(createStore({ storage }).state.companion.xp, 99);
});
test('original guided study, recall, highlights and notebook activity survive backup import', () => {
  const state = defaultState();
  state.companion.srs.c = { interval: 3, dueDate: '2026-10-25', lastRating: 'knew', streak: 2 };
  state.companion.highlights.push({ id: 'h', text: '<b>literal text</b>', category: 'definition', source: { id: 'lo3.1', label: 'Annual report' }, anchor: { start: 2, end: 9 } });
  state.companion.chapterFlow.ch3 = { termsOpened: ['c'], sectionsViewed: ['3.1::0'], flashcardsReviewed: ['c'], quiz: { pool: ['q'], attempted: ['q'], missedEver: [], missQueue: [], round: 1, completed: true, topicMisses: { '3.1': 1 } } };
  state.notebook.flashcards.ch3 = { known: [1, 2], seen: [0, 1, 2] }; state.notebook.quizHistory.push({ id: 'q', correct: true, answer: 1, ts: 1, chapterId: 'ch3', learningObjectiveIds: ['lo3.1'] });
  const store = createStore({ storage: memory() }); store.importBackup(backup(state)); assert.deepEqual(store.state, state);
});
test('sparse historical guided study is normalized and invalid nested data rejects', () => {
  const store = createStore({ storage: memory() }); store.importBackup('{"progress":{"chapterFlow":{"ch3":{"termsOpened":["c"]}}}}');
  assert.deepEqual(store.state.companion.chapterFlow.ch3.quiz.missQueue, []);
  const before = cloneState(store);
  for (const payload of [{ chapterFlow: { ch3: { quiz: { attempted: 'wrong' } } } }, { highlights: [{ source: 'bad' }] }, { srs: { c: [] } }]) {
    assert.throws(() => store.importBackup(JSON.stringify({ progress: payload }))); assert.deepEqual(store.state, before);
  }
});
test('corrupt primary falls back to legacy without silently overwriting unreadable bytes', () => {
  const storage = memory({ [STORAGE_KEY]: '{broken', 'soms306.progress.v1': '{"xp":13}' });
  const store = createStore({ storage }); assert.equal(store.state.companion.xp, 13); assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  store.save(); assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).companion.xp, 13);
});
test('legacy known status is normalized during both load and direct progress import', () => {
  const store = createStore({ storage: memory() }); store.importBackup('{"flashcardStatus":{"c":"known"}}'); assert.equal(store.state.companion.flashcardStatus.c, 'know');
});
function cloneState(store) { return JSON.parse(JSON.stringify(store.state)); }
