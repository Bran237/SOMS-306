import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT, NOTEBOOK_CHAPTERS, DB } from '../data/database.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const repository = resolve(fileURLToPath(new URL('../', import.meta.url)));
const prefix = '/SOMS-306/';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

// A real project Pages prefix catches absolute asset paths and accidental HTML
// fallbacks. This runner starts and stops its own server and disposable browser.
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    let file = resolve(repository, pathname.slice(prefix.length) || 'index.html');
    if (!file.startsWith(repository + sep)) { response.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
const executable = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
let browser;
const checks = [], errors = [], external = [], httpErrors = [];

try {
  browser = await chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(base).origin) {
      external.push(`${url.origin}${url.pathname}`); return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400 && !pathname.endsWith('/favicon.ico')) httpErrors.push(`${response.status()} ${pathname}`);
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const step = async (name, run) => { await run(); checks.push(name); console.log(`PASS ${name}`); };
  const state = (target = page) => target.evaluate(async () => {
    const { store } = await import(new URL('js/core/store.js', document.baseURI).href);
    return structuredClone(store.state);
  });
  const route = async (section, chapter = 'ch3', view = '') => {
    const hash = `#/${section}/${chapter}${view ? `/${view}` : ''}`;
    if (await page.evaluate(value => location.hash === value, hash)) return;
    await page.evaluate(value => { location.hash = value; }, hash);
    await page.waitForFunction(({ section, chapter, view }) => document.querySelector('#chapter-select')?.value === chapter && document.querySelector(`#main-navigation [data-section="${section}"]`)?.getAttribute('aria-current') === 'page' && document.querySelector(`#module-tools [data-view="${view}"]`)?.getAttribute('aria-pressed') === 'true', { section, chapter, view });
  };
  const importFile = async raw => {
    const dialog = page.waitForEvent('dialog').then(dialog => dialog.accept());
    await page.locator('#backup-file').setInputFiles({ name: 'soms306-progress.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    await dialog;
    await page.waitForFunction(() => document.querySelector('#studio-message')?.textContent.includes('Backup imported'));
  };
  const answerCompanion = async (target = page) => {
    const prompt = await target.locator('#practiceContent .quiz-card h3').innerText();
    const question = await target.evaluate(async prompt => {
      const { CONTENT } = await import(new URL('data/database.js', document.baseURI).href);
      const text = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
      return CONTENT.quiz.find(item => text(item.prompt) === prompt.replace(/\s+/g, ' ').trim());
    }, prompt);
    assert.ok(question, `Visible question exists in central database: ${prompt}`);
    if (['multiple_choice', 'scenario', 'two_truths_trap'].includes(question.type)) await target.locator(`[data-action="quizAnswerMC"][data-idx="${question.correctIndex}"]`).click();
    else if (question.type === 'true_false') await target.locator(`[data-action="quizAnswerTF"][data-val="${question.correctAnswer}"]`).click();
    else if (question.type === 'fill_blank') { await target.locator('#quiz-fill-input').fill(String(question.acceptableAnswers?.[0] ?? question.correctAnswer)); await target.locator('[data-action="quizAnswerFill"]').click(); }
    else if (question.type === 'matching') { for (let i = 0; i < question.pairs.length; i++) await target.locator(`#quiz-match-${i}`).selectOption(String(i)); await target.locator('[data-action="quizAnswerMatch"]').click(); }
    else throw new Error(`Unsupported question type: ${question.type}`);
    assert.match(await target.locator('#quiz-feedback').innerText(), /Correct!/);
    await target.locator('#quiz-next-btn').click();
  };
  let backup, flashcardId;

  await step('GitHub project subpath starts six modules without backend requests', async () => {
    assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
    await page.locator('#modePanelDashboard h1').waitFor();
    assert.equal(await page.locator('#startup-error').isVisible(), false);
    assert.equal(await page.locator('#main-navigation [data-section]').count(), 6);
    assert.equal(await page.locator('#chapter-select option').count(), CONTENT.course.chapters.length);
    assert.equal((await page.request.get(`${base}missing-module.js`)).status(), 404);
  });

  await step('Shared navigation reads every original textbook chapter and concept search', async () => {
    await page.locator('#main-navigation [data-section="textbook"]').click();
    for (const chapter of CONTENT.course.chapters) {
      await page.locator('#chapter-select').selectOption(chapter);
      await page.locator(`#chapter-${chapter}`).waitFor({ state: 'visible' });
      assert.equal(await page.locator('#modePanelStudy .chapter-study:visible').count(), 1);
      for (const objective of CONTENT.learningObjectives.filter(item => item.chapterId === chapter)) {
        assert.ok(await page.locator(`[id="sec-${objective.id}"]`).isVisible());
        for (const prose of CONTENT.loProse[objective.code] || []) {
          const heading = await page.evaluate(html => {const d = document.createElement('div'); d.innerHTML = html; return d.textContent;}, prose.heading);
          assert.ok((await page.locator(`[id="sec-${objective.id}"]`).textContent()).includes(heading));
        }
      }
    }
    await page.locator('#course-search').fill('productivity');
    await page.locator('#search-results [data-concept]').first().click();
    await page.locator('#modalRoot .modal-box').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#course-search').fill('');
  });

  await step('All notebook sections retain the Write This Down and Related Homework structure', async () => {
    let total = 0;
    for (const chapter of NOTEBOOK_CHAPTERS) {
      await route('notebook', chapter.id);
      const notes = page.locator('#p-notebook [data-note-id]');
      assert.equal(await notes.count(), chapter.notebook.length);
      total += await notes.count();
      assert.equal(await notes.evaluateAll(elements => elements.every(element => {
        const write = element.querySelector('.nbwrite'), homework = element.querySelector('.nbapply');
        return write && homework && !!(write.compareDocumentPosition(homework) & Node.DOCUMENT_POSITION_FOLLOWING);
      })), true);
      for (const ids of await notes.evaluateAll(elements => elements.map(element => element.dataset.loIds))) assert.ok(ids && ids.split(' ').every(id => DB.learningObjectives.some(lo => lo.id === id)));
      assert.match(await notes.first().innerText(), /Write this down/i);
    }
    assert.equal(total, CONTENT.learningObjectives.length);

  });

  await step('Textbook excerpt controls show exactly the supplied substantial excerpts', async () => {
    for (const chapterId of CONTENT.course.chapters) {
      await route('textbook', chapterId);
      const expected = CONTENT.chapters[chapterId].sections.map(code => CONTENT.rawSections[code]).filter(Boolean).join('\n\n');
      const toggle = page.locator(`#chapter-${chapterId} button[aria-controls="excerpts-${chapterId}"]`);
      if (expected.length < 3000) {
        assert.equal(await toggle.count(), 0);
        continue;
      }
      assert.equal(await toggle.innerText(), 'Show textbook excerpts on file');
      await toggle.click();
      const excerpts = page.locator(`#excerpts-${chapterId}`);
      assert.equal(await excerpts.isVisible(), true);
      assert.equal(await excerpts.textContent(), expected);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      await toggle.click();
      assert.equal(await excerpts.isVisible(), false);
    }
  });

  await step('Notebook completion saves; homework honestly awaits uploaded assignments', async () => {
    await route('notebook', 'ch3');
    const note = page.locator('#p-notebook [data-nbdone]').first();
    await note.check();
    const noteKey = await note.getAttribute('data-nbdone');
    assert.equal((await state()).notebook.done[noteKey], true);
    await route('homework', 'ch3');
    assert.match(await page.locator('#p-homework').innerText(), /not been uploaded/i);
    assert.equal(await page.locator('#p-homework [data-hwdone]').count(), 0);
  });

  await step('Companion flashcards flip and persist mastery for the shared chapter', async () => {
    await route('practice', 'ch3');
    await page.locator('#practiceToggle [data-tab="flashcards"]').click();
    await page.locator('.fc-card').click();
    assert.equal(await page.locator('.fc-card.flipped').count(), 1);
    const mark = page.locator('[data-action="markFlashcard"][data-status="know"]').first();
    flashcardId = await mark.getAttribute('data-id');
    await mark.click();
    assert.equal((await state()).companion.flashcardStatus[flashcardId], 'know');
    await route('textbook', 'ch5');
    await route('practice', 'ch5');
    const cardId = await page.locator('[data-action="markFlashcard"]').first().getAttribute('data-id');
    assert.ok(CONTENT.concepts.some(c => c.chapterId === 'ch5' && c.id === cardId));
  });

  await step('Five-question companion quiz records correct feedback, score, and progress', async () => {
    await route('practice', 'ch3');
    await page.locator('#practiceToggle [data-tab="quiz"]').click();
    assert.equal(await page.locator('#qs-scope').inputValue(), 'chapter:ch3');
    await page.locator('#qs-count').selectOption('5');
    await page.locator('[data-action="quizBegin"]').click();
    for (let i = 0; i < 5; i++) await answerCompanion();
    assert.equal(await page.locator('#practiceContent h1').innerText(), 'Quiz Results');
    assert.equal(await page.locator('#practiceContent .stat-value').innerText(), '5/5');
    assert.equal((await state()).companion.quizAttempts.length, 5);
    assert.ok((await state()).companion.quizAttempts.every(attempt => attempt.lo.startsWith('3.')));
  });

  await step('Notebook formula cards and the complete chapter quiz retain their own progress', async () => {
    await route('practice', 'ch3', 'cards');
    await page.locator('#p-cards [data-filter="formula"]').click();
    await page.locator('#fcCard').click();
    assert.equal(await page.locator('#fcCard.back').count(), 1);
    await page.locator('#fcGot').click();
    assert.ok((await state()).notebook.flashcards.ch3.known.length > 0);
    await route('practice', 'ch3', 'quiz');
    const chapter = NOTEBOOK_CHAPTERS.find(item => item.id === 'ch3');
    for (const question of chapter.quiz) {
      await page.locator(`#p-quiz .opt[data-idx="${question.a}"]`).click();
      assert.match(await page.locator('#p-quiz .fb').innerText(), /Correct/);
      await page.locator('#qzNext').click();
    }
    assert.match(await page.locator('#p-quiz .score').innerText(), new RegExp(`${chapter.quiz.length}\\s*/\\s*${chapter.quiz.length}`));
    assert.equal((await state()).notebook.quizHistory.length, chapter.quiz.length);
  });

  await step('Reload and export retain study, notebook, homework, and both quiz collections', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const saved = await state();
    assert.equal(saved.companion.flashcardStatus[flashcardId], 'know');
    assert.equal(saved.companion.quizAttempts.length, 5);
    assert.ok(Object.values(saved.notebook.done).some(Boolean));
    assert.deepEqual(saved.notebook.homeworkDone, {});
    assert.ok(saved.notebook.quizHistory.length >= 10);
    const downloaded = page.waitForEvent('download');
    await page.locator('#export-backup').click();
    const download = await downloaded;
    backup = readFileSync(await download.path(), 'utf8');
    const parsed = JSON.parse(backup);
    assert.equal(parsed.format, 'soms306-course-mastery-studio');
    assert.equal(parsed.version, 1);
    assert.deepEqual(parsed.state.notebook.done, saved.notebook.done);
  });

  await step('Validated import restores all progress without changing the selected chapter', async () => {
    await route('notebook', 'ch3');
    await page.locator('#p-notebook [data-nbdone]').first().uncheck();
    await importFile(backup);
    assert.equal(await page.locator('#chapter-select').inputValue(), 'ch3');
    assert.equal(await page.locator('#p-notebook [data-nbdone]').first().isChecked(), true);
    const before = await state();
    await page.locator('#backup-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"wrong"}') });
    await page.waitForFunction(() => document.querySelector('#studio-message')?.textContent.includes('Import failed'));
    assert.deepEqual(await state(), before);
  });

  await step('Imported highlight text is displayed safely without executing HTML', async () => {
    const malicious = JSON.parse(backup);
    malicious.state.companion.highlights = [{ id: 'hostile', ts: Date.now(), text: '<img src=x onerror="window.__backupXss=1">', category: '<b>unsafe</b>', note: '', source: { type: 'lo', id: 'lo3.1', label: '<img src=x>' } }];
    await importFile(JSON.stringify(malicious));
    await route('dashboard', 'ch3', 'progress');
    await page.locator('[data-ptab="highlights"]').click();
    assert.match(await page.locator('#progressInner').innerText(), /<img src=x/);
    assert.equal(await page.locator('#progressInner img').count(), 0);
    assert.equal(await page.evaluate(() => window.__backupXss), undefined);
    await importFile(backup);
  });

  await step('Changes in another tab refresh shared notebook progress', async () => {
    await route('notebook', 'ch3');
    const input = page.locator('#p-notebook [data-nbdone]').first();
    const key = await input.getAttribute('data-nbdone');
    const second = await context.newPage();
    await second.goto(`${base}#/notebook/ch3`, { waitUntil: 'networkidle' });
    await second.evaluate(async key => { const { store } = await import(new URL('js/core/store.js', document.baseURI).href); store.state.notebook.done[key] = false; store.save('test-external'); }, key);
    await page.waitForFunction(key => document.querySelector(`#p-notebook [data-nbdone="${key}"]`)?.checked === false, key);
    assert.equal((await state()).notebook.done[key], false);
    await second.close();
  });

  await step('Mobile navigation, reading tables, and theme remain usable without overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#menu-toggle').click();
    assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.locator('#main-navigation [data-section="textbook"]').click();
    assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
    await route('textbook', 'ch3');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  });

  await step('Added chapters support flashcards, recall, quizzes, and existing saved progress', async () => {
    const added = await browser.newPage({ viewport:{width:1440,height:1000} });
    added.on('pageerror', error => errors.push(error.message));
    await added.addInitScript(() => {
      const key = 'soms306_mastery_studio_v1';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
        schemaVersion:1,
        companion:{xp:24,flashcardStatus:{competitiveness:'know'},quizAttempts:[{id:'q1',conceptId:'competitiveness',lo:'2.1',correct:true,ts:1}]},
        notebook:{done:{'ch1:1.1':true}},settings:{theme:'dark'},navigation:{section:'dashboard',chapterId:'ch1'}
      }));
    });
    const learned = [];
    for (const chapterId of ['ch6','ch9','ch14']) {
      await added.goto(`${base}#/practice/${chapterId}`);
      await added.locator('#practiceToggle [data-tab="flashcards"]').click();
      const mark = added.locator('[data-action="markFlashcard"][data-status="know"]').first();
      await mark.waitFor();
      const cardId = await mark.getAttribute('data-id');
      learned.push(cardId);
      const concept = CONTENT.concepts.find(c => c.id === cardId && c.chapterId === chapterId);
      assert.ok(concept);
      await added.locator('.fc-card').click();
      assert.ok((await added.locator('.fc-book-quote').textContent()).includes(concept.bookDefinition));
      await mark.click();
      await added.locator('#practiceToggle [data-tab="recall"]').click();
      await added.locator('[data-action="arReveal"]').click();
      const rating = added.locator('[data-action="arRate"][data-rating="easy"]');
      const recalledId = await rating.getAttribute('data-id');
      assert.ok(CONTENT.concepts.some(c => c.id === recalledId && c.chapterId === chapterId));
      await rating.click();
      await added.locator('#practiceToggle [data-tab="quiz"]').click();
      assert.equal(await added.locator('#qs-scope').inputValue(), `chapter:${chapterId}`);
      await added.locator('#qs-count').selectOption('5');
      await added.locator('[data-action="quizBegin"]').click();
      for (let n = 0; n < 5; n++) await answerCompanion(added);
      assert.equal(await added.locator('#practiceContent .stat-value').innerText(), '5/5');
    }
    await added.locator('#course-search').fill('Lean operations');
    await added.locator('#search-results [data-concept="lean-operations"]').click();
    const quoted = CONTENT.concepts.find(c => c.id === 'lean-operations').bookDefinition;
    assert.equal(await added.locator('#modalRoot .bq-text').textContent(), quoted);
    await added.keyboard.press('Escape');
    await added.reload();
    const progress = await state(added);
    assert.equal(progress.companion.flashcardStatus.competitiveness, 'know');
    assert.equal(progress.notebook.done['ch1:1.1'], true);
    assert.ok(progress.companion.quizAttempts.some(q => q.id === 'q1' && q.ts === 1));
    for (const id of learned) assert.equal(progress.companion.flashcardStatus[id], 'know');
    assert.equal(progress.companion.quizAttempts.length, 19);
    await added.close();
  });

  assert.deepEqual(errors, [], 'Unexpected JavaScript page errors');
  assert.deepEqual(external, [], 'Core learning must not require external backend resources');
  assert.deepEqual(httpErrors, [], 'Missing app assets or modules');
  console.log(JSON.stringify({ passed: checks.length, checks, pageErrors: errors, externalRequests: external, missingFiles: httpErrors }, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
