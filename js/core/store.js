/** One browser-local progress record for every SOMS 306 feature. */
export const STORAGE_KEY = 'soms306_mastery_studio_v1';
export const BACKUP_FORMAT = 'soms306-course-mastery-studio';
export const SCHEMA_VERSION = 1;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const THEMES = new Set(['auto', 'light', 'dark']);
const SECTIONS = new Set(['dashboard', 'textbook', 'notebook', 'homework', 'study', 'practice', 'progress']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const assert = (condition, message) => { if (!condition) throw new Error(`Invalid backup: ${message}`); };

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    companion: {
      xp: 0, streakDays: 0, lastStudyDate: null, studyLog: [], quizAttempts: [],
      flashcardStatus: {}, srs: {}, highlights: [], examHistory: [], badges: [],
      settings: { dark: false }, weeklyGoal: null, lastReminderDate: null, chapterFlow: {},
    },
    notebook: { done: {}, homeworkDone: {}, review: {}, examCheck: {}, flashcards: {}, quizHistory: [] },
    settings: { theme: 'auto' }, navigation: { chapterId: 'ch1', section: 'dashboard' },
  };
}

function safeJson(value, depth = 0) {
  assert(depth < 80, 'data is nested too deeply.');
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number') { assert(Number.isFinite(value), 'numbers must be finite.'); return; }
  assert(typeof value === 'object', 'only JSON data is supported.');
  if (Array.isArray(value)) { value.forEach(item => safeJson(item, depth + 1)); return; }
  for (const [key, item] of Object.entries(value)) {
    assert(!UNSAFE_KEYS.has(key), `unsafe property "${key}".`);
    safeJson(item, depth + 1);
  }
}
function merge(defaults, incoming) {
  const result = clone(defaults);
  for (const [key, value] of Object.entries(incoming)) {
    result[key] = object(value) && object(defaults[key]) ? merge(defaults[key], value) : clone(value);
  }
  return result;
}
function maps(value, names, label) { for (const key of names) if (key in value) assert(object(value[key]), `${label}.${key} must be an object.`); }
function arrays(value, names, label) { for (const key of names) if (key in value) assert(Array.isArray(value[key]), `${label}.${key} must be an array.`); }
function optionalString(value, key, label, nullable = false) { if (key in value) assert(typeof value[key] === 'string' || nullable && value[key] === null, `${label}.${key} must be text.`); }
function optionalNumber(value, key, label) { if (key in value) assert(typeof value[key] === 'number' && value[key] >= 0, `${label}.${key} must be a nonnegative number.`); }
function stringArray(value, label) { assert(Array.isArray(value) && value.every(item => typeof item === 'string'), `${label} must contain text identifiers.`); }

function validateAttempts(attempts, label) {
  for (const attempt of attempts) {
    assert(object(attempt), `${label} entries must be objects.`);
    if ('correct' in attempt) assert(typeof attempt.correct === 'boolean', `${label}.correct must be true or false.`);
    optionalNumber(attempt, 'ts', label);
    for (const key of ['id', 'conceptId', 'chapterId', 'prompt', 'difficulty', 'lo', 'mode']) optionalString(attempt, key, label);
    if ('learningObjectiveIds' in attempt) stringArray(attempt.learningObjectiveIds, label);
  }
}
function normalizeCompanion(input) {
  assert(object(input), 'study progress must be an object.');
  maps(input, ['flashcardStatus', 'srs', 'settings', 'chapterFlow'], 'companion');
  arrays(input, ['studyLog', 'quizAttempts', 'highlights', 'examHistory', 'badges'], 'companion');
  optionalNumber(input, 'xp', 'companion'); optionalNumber(input, 'streakDays', 'companion');
  optionalString(input, 'lastStudyDate', 'companion', true); optionalString(input, 'lastReminderDate', 'companion', true);
  if ('weeklyGoal' in input && input.weeklyGoal !== null) {
    assert(object(input.weeklyGoal), 'weeklyGoal must be an object or null.');
    optionalString(input.weeklyGoal, 'weekStart', 'weeklyGoal'); optionalString(input.weeklyGoal, 'chapterId', 'weeklyGoal');
  }
  for (const [key, status] of Object.entries(input.flashcardStatus || {})) assert(typeof status === 'string' || status === null, `flashcardStatus.${key} must be text.`);
  for (const entry of input.studyLog || []) {
    assert(object(entry), 'studyLog entries must be objects.');
    optionalString(entry, 'date', 'studyLog'); optionalNumber(entry, 'minutes', 'studyLog');
  }
  validateAttempts(input.quizAttempts || [], 'quizAttempts');
  for (const entry of input.examHistory || []) {
    assert(object(entry), 'examHistory entries must be objects.');
    optionalNumber(entry, 'ts', 'examHistory'); optionalNumber(entry, 'score', 'examHistory'); optionalNumber(entry, 'total', 'examHistory');
  }
  for (const entry of input.highlights || []) {
    assert(object(entry), 'highlights must contain objects.');
    for (const key of ['id', 'text', 'category', 'note']) optionalString(entry, key, 'highlights');
    optionalNumber(entry, 'ts', 'highlights');
    if ('source' in entry) {
      assert(object(entry.source), 'highlight source must be an object.');
      for (const key of ['id', 'type', 'label']) optionalString(entry.source, key, 'highlight source');
    }
    if ('anchor' in entry) {
      assert(object(entry.anchor), 'highlight anchor must be an object.');
      optionalNumber(entry.anchor, 'start', 'anchor'); optionalNumber(entry.anchor, 'end', 'anchor');
      assert(Number.isInteger(entry.anchor.start) && Number.isInteger(entry.anchor.end) && entry.anchor.end >= entry.anchor.start, 'highlight offsets must be ordered integers.');
    }
  }
  for (const entry of Object.values(input.srs || {})) {
    assert(object(entry), 'recall entries must be objects.');
    optionalNumber(entry, 'interval', 'srs'); optionalNumber(entry, 'streak', 'srs');
    optionalString(entry, 'dueDate', 'srs'); optionalString(entry, 'lastRating', 'srs', true);
  }
  const result = merge(defaultState().companion, input);
  for (const [key, status] of Object.entries(result.flashcardStatus)) if (status === 'known') result.flashcardStatus[key] = 'know';
  const flowDefault = { termsOpened: [], sectionsViewed: [], flashcardsReviewed: [], quiz: { pool: [], attempted: [], missedEver: [], missQueue: [], round: 0, completed: false, topicMisses: {} } };
  for (const [id, entry] of Object.entries(result.chapterFlow)) {
    assert(object(entry), 'chapterFlow entries must be objects.');
    for (const key of ['termsOpened', 'sectionsViewed', 'flashcardsReviewed']) if (key in entry) stringArray(entry[key], `chapterFlow.${key}`);
    if ('quiz' in entry) {
      assert(object(entry.quiz), 'chapterFlow.quiz must be an object.');
      for (const key of ['pool', 'attempted', 'missedEver', 'missQueue']) if (key in entry.quiz) stringArray(entry.quiz[key], `chapterFlow.quiz.${key}`);
      optionalNumber(entry.quiz, 'round', 'chapterFlow.quiz');
      if ('completed' in entry.quiz) assert(typeof entry.quiz.completed === 'boolean', 'chapterFlow.quiz.completed must be true or false.');
      if ('topicMisses' in entry.quiz) {
        assert(object(entry.quiz.topicMisses), 'topicMisses must be an object.');
        for (const count of Object.values(entry.quiz.topicMisses)) assert(typeof count === 'number' && count >= 0, 'topicMisses must contain counts.');
      }
    }
    result.chapterFlow[id] = merge(flowDefault, entry);
  }
  return result;
}

function normalizeState(input) {
  safeJson(input);
  assert(object(input), 'state must be an object.');
  assert(input.schemaVersion === undefined || input.schemaVersion === SCHEMA_VERSION, 'unsupported state version.');
  maps(input, ['companion', 'notebook', 'settings', 'navigation'], 'state');
  const result = merge(defaultState(), input);
  result.schemaVersion = SCHEMA_VERSION;
  result.companion = normalizeCompanion(result.companion);
  const notebook = result.notebook;
  maps(notebook, ['done', 'homeworkDone', 'review', 'examCheck', 'flashcards'], 'notebook');
  arrays(notebook, ['quizHistory'], 'notebook');
  for (const key of ['done', 'homeworkDone', 'review', 'examCheck']) {
    for (const flag of Object.values(notebook[key])) assert(typeof flag === 'boolean', `notebook.${key} must contain true or false values.`);
  }
  for (const saved of Object.values(notebook.flashcards)) {
    assert(object(saved), 'notebook flashcards must contain objects.');
    for (const key of ['known', 'seen']) if (key in saved) assert(Array.isArray(saved[key]) && saved[key].every(n => Number.isInteger(n) && n >= 0), 'notebook flashcard indexes must be nonnegative integers.');
  }
  validateAttempts(notebook.quizHistory, 'notebook quiz history');
  assert(THEMES.has(result.settings.theme), 'unsupported theme.');
  assert(/^ch[1-9]\d*$/.test(result.navigation.chapterId), 'unsupported chapter.');
  assert(SECTIONS.has(result.navigation.section), 'unsupported section.');
  return result;
}

/** Replace values without breaking references cached by feature modules. */
function replaceInPlace(target, incoming) {
  if (Array.isArray(target) && Array.isArray(incoming)) {
    for (let index = 0; index < incoming.length; index++) {
      const value = incoming[index];
      if (object(value) && object(target[index]) || Array.isArray(value) && Array.isArray(target[index])) replaceInPlace(target[index], value);
      else target[index] = clone(value);
    }
    target.splice(incoming.length); return;
  }
  for (const key of Object.keys(target)) if (!(key in incoming)) delete target[key];
  for (const [key, value] of Object.entries(incoming)) {
    if (object(value) && object(target[key]) || Array.isArray(value) && Array.isArray(target[key])) replaceInPlace(target[key], value);
    else target[key] = clone(value);
  }
}

export function createStore(options = {}) {
  let storage;
  try { storage = 'storage' in options ? options.storage : globalThis.localStorage; } catch { storage = null; }
  const listeners = new Set();
  const state = defaultState();
  const status = { persistent: !!storage, error: null, message: '', lastSavedAt: null };
  const fail = error => {
    status.persistent = false; status.error = error;
    status.message = 'Browser storage is unavailable. Progress is kept for this session; export a backup before leaving.';
  };
  function read(key) { try { return storage?.getItem(key) ?? null; } catch (error) { fail(error); return null; } }
  const parseLegacy = key => { const raw = read(key); if (!raw) return null; try { const value = JSON.parse(raw); safeJson(value); return value; } catch { return null; } };
  function legacyState() {
    const fallback = defaultState();
    const progress = parseLegacy('soms306.progress.v1');
    if (progress) { try { fallback.companion = normalizeCompanion(progress); } catch {} }
    for (const [legacy, key] of [['soms306_nb_done', 'done'], ['soms306_hw_done', 'homeworkDone'], ['soms306_review', 'review'], ['soms306_exam_check', 'examCheck']]) {
      const value = parseLegacy(legacy);
      if (object(value) && Object.values(value).every(flag => typeof flag === 'boolean')) fallback.notebook[key] = value;
    }
    const theme = read('soms306_theme'); if (THEMES.has(theme)) fallback.settings.theme = theme;
    return normalizeState(fallback);
  }
  const existing = read(STORAGE_KEY);
  let initial;
  if (existing) { try { initial = normalizeState(JSON.parse(existing)); } catch { initial = legacyState(); } }
  else initial = legacyState();
  replaceInPlace(state, initial);
  function notify(reason) { for (const listener of [...listeners]) listener(state, { reason, status }); }
  function save(reason = 'change') {
    try {
      if (!storage) throw new Error('No browser storage.');
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      status.persistent = true; status.error = null; status.message = ''; status.lastSavedAt = new Date().toISOString();
    } catch (error) { fail(error); }
    notify(reason); return state;
  }
  function importBackup(raw) {
    let payload;
    try { payload = typeof raw === 'string' ? JSON.parse(raw) : clone(raw); } catch { throw new Error('Invalid backup: choose a valid JSON file.'); }
    safeJson(payload); assert(object(payload), 'backup must be an object.');
    let candidate;
    if ('format' in payload) {
      assert(payload.format === BACKUP_FORMAT, 'unknown backup format.');
      assert(payload.version === SCHEMA_VERSION, 'unsupported backup version.');
      candidate = normalizeState(payload.state);
    } else if ('progress' in payload) {
      candidate = normalizeState({ ...clone(state), companion: normalizeCompanion(payload.progress) });
    } else if ('companion' in payload || 'schemaVersion' in payload) {
      candidate = normalizeState(payload);
    } else {
      assert(['xp', 'quizAttempts', 'flashcardStatus', 'studyLog', 'chapterFlow'].some(key => key in payload), 'unrecognized progress data.');
      candidate = normalizeState({ ...clone(state), companion: normalizeCompanion(payload) });
    }
    replaceInPlace(state, candidate); save('import'); return state;
  }
  const eventTarget = options.eventTarget || globalThis.window;
  const onStorage = event => {
    if (event.key !== STORAGE_KEY || event.storageArea && storage && event.storageArea !== storage) return;
    try {
      const candidate = event.newValue ? normalizeState(JSON.parse(event.newValue)) : defaultState();
      replaceInPlace(state, candidate); notify('external');
    } catch { /* A malformed external record never replaces usable progress. */ }
  };
  if (options.listenForStorage !== false) eventTarget?.addEventListener?.('storage', onStorage);
  return {
    state, status, save,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    exportBackup() { return JSON.stringify({ format: BACKUP_FORMAT, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state }, null, 2); },
    importBackup,
    reset() { replaceInPlace(state, defaultState()); save('reset'); return state; },
    setNavigation(chapterId, section) {
      assert(/^ch[1-9]\d*$/.test(chapterId) && SECTIONS.has(section), 'unsupported navigation.');
      state.navigation.chapterId = chapterId; state.navigation.section = section; save('navigation');
    },
    setTheme(theme) { assert(THEMES.has(theme), 'unsupported theme.'); state.settings.theme = theme; save('theme'); },
    destroy() { eventTarget?.removeEventListener?.('storage', onStorage); listeners.clear(); },
  };
}

export const store = createStore();
