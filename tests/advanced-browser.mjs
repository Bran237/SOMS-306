// Standalone advanced UI regression; all test progress stays in an isolated browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { CONTENT } from '../data/database.js';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const repository = resolve(fileURLToPath(new URL('../', import.meta.url)));
let server;
let base = process.env.SOMS306_BASE_URL;
if (!base) {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml'
  };
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let target = resolve(repository, '.' + pathname);
      if (target !== repository && !target.startsWith(repository + sep)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
      response.writeHead(200, {
        'Content-Type': types[extname(target)] || 'application/octet-stream'
      }).end(await readFile(target));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
}
const require = createRequire(import.meta.url),
  {
    chromium
  } = require('playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox']
});
const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1000
    }
  }),
  errors = [],
  checks = [];
page.setDefaultTimeout(12000);
page.on('pageerror', e => errors.push(e.message));
async function step(name, run) {
  await run();
  checks.push(name);
  console.log('PASS ' + name);
}
async function go(section, chapter = 'ch1') {
  await page.goto(base + `#/${section}/${chapter}`);
  await page.locator('#main-navigation').waitFor();
  await page.locator(`#main-navigation [data-section="${section}"][aria-current="page"]`).waitFor();
}
async function tab(name) {
  await page.locator(`#practiceToggle [data-tab="${name}"]`).click();
}
async function saved() {
  return page.evaluate(async () => structuredClone((await import(new URL('js/core/store.js', document.baseURI))).store.state));
}
try {
  await go('practice');
  await step('All ten Practice tools render', async () => {
    for (const name of ['flashcards', 'quiz', 'match', 'crossword', 'recall', 'cards', 'games', 'exam', 'weak', 'session']) {
      await tab(name);
      assert.ok((await page.locator('#practiceContent').innerText()).trim());
    }
  });
  await step('Empty flashcard filters retain selected chapter and can recover', async () => {
    await tab('flashcards');
    await page.locator('[data-action="fcFilter"][data-val="starred"]').click();
    assert.match(await page.locator('#practiceContent').innerText(), /No cards match/);
    assert.ok(await page.locator('[data-action="fcFilter"][data-val="starred"].active').isVisible());
    await page.locator('[data-action="fcFilter"][data-val="all"]').click();
    assert.ok(await page.locator('.fc-card').isVisible());
  });
  await step('Matching advances into a playable second round', async () => {
    await tab('match');
    for (const key of ['t0', 't1', 't2', 't3', 't4', 't5']) {
      await page.locator(`[data-action="matchTerm"][data-key="${key}"]`).click();
      await page.locator(`[data-action="matchDef"][data-key="${key}"]`).click();
    }
    await page.locator('[data-action="matchNext"]').click();
    assert.match(await page.locator('.match-head').innerText(), /Round 2/);
    assert.equal(await page.locator('.match-cell:disabled').count(), 0);
    await page.locator('[data-action="matchTerm"][data-key="t0"]').click();
    await page.locator('[data-action="matchDef"][data-key="t0"]').click();
    assert.equal(await page.locator('.match-cell:disabled').count(), 2);
  });
  await step('Crossword, spaced recall, concept popup and session controls respond', async () => {
    await tab('crossword');
    await page.locator('[data-action="xwReveal"]').click();
    await page.locator('[data-action="xwCheck"]').click();
    assert.ok((await page.locator('.xw-cell input.ok').count()) > 0);
    await tab('recall');
    await page.locator('[data-action="arReveal"]').click();
    const rate = page.locator('[data-action="arRate"][data-rating="easy"]');
    const id = await rate.getAttribute('data-id');
    await rate.click();
    assert.ok((await saved()).companion.srs[id]);
    await tab('cards');
    await page.locator('#practiceContent [data-action="openConcept"]').first().click();
    assert.ok(await page.locator('.modal-box').isVisible());
    await page.keyboard.press('Escape');
    await tab('session');
    await page.locator('[data-action="buildSession"]').first().click();
    assert.ok(await page.locator('[data-action="sessionGo"]').isVisible());
  });
  await step('All ten mini-games start and accept an interaction', async () => {
    await tab('games');
    for (const game of ['matching', 'speed', 'whoami', 'fillgap', 'orderit', 'twotruths', 'sort', 'connections', 'scenario', 'boss']) {
      await page.locator(`[data-action="startGame"][data-game="${game}"]`).click();
      if (game === 'matching') {
        const id = await page.locator('[data-action="matchSelectTerm"]').first().getAttribute('data-id');
        await page.locator(`[data-action="matchSelectTerm"][data-id="${id}"]`).click();
        await page.locator(`[data-action="matchSelectDef"][data-id="${id}"]`).click();
      } else if (game === 'speed') await page.locator('[data-action="speedAnswer"]').first().click();else if (game === 'whoami') await page.locator('[data-action="waiNextClue"]').click();else if (game === 'fillgap') {
        await page.locator('#ftg-guess').fill('test');
        await page.locator('[data-action="ftgGuess"]').click();
      } else if (game === 'orderit') await page.locator('[data-action="oiPick"]').first().click();else if (game === 'twotruths') await page.locator('[data-action="ttAnswer"]').first().click();else if (game === 'sort') await page.locator('[data-action="sortPick"]').first().click();else if (game === 'connections') await page.locator('[data-action="connAnswer"]').first().click();else if (game === 'scenario') await page.locator('[data-action="scenAnswer"]').first().click();else assert.ok(await page.locator('#quiz-answer-zone').isVisible());
      if (game !== 'boss') await page.locator('#practiceContent [data-action="nav"][data-route="games"]').first().click();
    }
  });
  await step('Timed exam includes matching questions and records answers once', async () => {
    await go('practice', 'ch2');
    await tab('exam');
    await page.locator('#ex-count').selectOption('999');
    await page.locator('#ex-timer').selectOption('60');
    await page.locator('[data-action="examBegin"]').click();
    let matching = 0;
    for (let n = 0; n < CONTENT.quiz.filter(q => q.chapterId === 'ch2').length; n++) {
      const question = await page.evaluate(async () => {
        const {
          CONTENT
        } = await import(new URL('data/database.js', document.baseURI));
        const id = document.querySelector('#exam-answer-zone [data-question-id]')?.dataset.questionId;
        return CONTENT.quiz.find(question => question.id === id);
      });
      assert.ok(question);
      if (question.type === 'matching') {
        matching++;
        for (let i = 0; i < question.pairs.length; i++) await page.locator(`#exam-match-${i}`).selectOption(String(i));
        await page.locator('[data-action="examAnswerMatch"]').click();
      } else if (question.type === 'fill_blank') {
        await page.locator('#exam-fill-input').fill(String(question.acceptableAnswers?.[0] ?? question.correctAnswer));
        await page.locator('[data-action="examAnswerFill"]').click();
      } else if (question.type === 'true_false') await page.locator(`[data-action="examAnswer"][data-val="${question.correctAnswer}"]`).click();else await page.locator(`[data-action="examAnswer"][data-idx="${question.correctIndex}"]`).click();
      assert.equal((await saved()).companion.quizAttempts.at(-1).correct, true, `Expected correct response for ${question.id}`);
    }
    assert.ok(matching > 0);
    assert.match(await page.locator('#practiceContent h1').innerText(), /Exam Results/);
    assert.equal(await page.locator('#practiceContent .stat-value').innerText(), `${CONTENT.quiz.filter(q => q.chapterId === 'ch2').length}/${CONTENT.quiz.filter(q => q.chapterId === 'ch2').length}`);
  });
  await step('Timer expiry saves progress and pauses outside Exam tab', async () => {
    await page.clock.install();
    await page.locator('[data-action="examRestart"]').click();
    await page.locator('#ex-timer').selectOption('30');
    await page.locator('[data-action="examBegin"]').click();
    const before = (await saved()).companion.quizAttempts.length;
    await page.clock.runFor(31000);
    assert.equal((await saved()).companion.quizAttempts.length, before + 1);
    assert.match(await page.locator('#practiceContent .panel-header').innerText(), /Q 2\//);
    await tab('flashcards');
    const paused = (await saved()).companion.quizAttempts.length;
    await page.clock.fastForward(65000);
    assert.equal((await saved()).companion.quizAttempts.length, paused);
    await page.clock.resume();
  });
  await step('Text selection creates a persistent annotation without changing prose', async () => {
    await go('textbook', 'ch3');
    await page.locator('.swatch').first().click();
    const result = await page.evaluate(() => {
      const section = document.querySelector('[id="sec-lo3.1"]'),
        before = section.textContent;
      const walker = document.createTreeWalker(section.querySelector('.lo-card'), NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        if (node.data.trim().length > 35 && node.parentElement.tagName !== 'H3') break;
      }
      const text = node.data.slice(0, 30).trim();
      const start = node.data.indexOf(text),
        range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + text.length);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      node.parentElement.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true
      }));
      return {
        before,
        text,
        mark: section.querySelector('mark.uhl')?.textContent
      };
    });
    assert.equal(result.mark, result.text);
    await page.reload();
    await page.locator('[id="sec-lo3.1"] mark.uhl').waitFor();
    assert.equal(await page.locator('[id="sec-lo3.1"]').textContent(), result.before);
  });
  await step('Every required chapter term is reachable and reading unlocks flashcards', async () => {
    await go('study', 'ch1');
    const total = CONTENT.concepts.filter(c => c.chapterId === 'ch1').length;
    for (let i = 0; i < total; i++) {
      const next = page.locator('[data-action="flowReviewRemainingTerms"]');
      if (!(await next.count())) break;
      await next.click();
      await page.locator('.modal-box').waitFor();
      await page.keyboard.press('Escape');
    }
    const keys = await page.locator('[data-action="flowMarkSectionRead"]').evaluateAll(nodes => nodes.map(n => n.dataset.key));
    for (const key of keys) await page.locator(`[data-action="flowMarkSectionRead"][data-key="${key}"]`).click();
    const flow = (await saved()).companion.chapterFlow.ch1;
    assert.equal(flow.termsOpened.length, total);
    assert.equal(flow.sectionsViewed.length, keys.length);
    await page.locator('[data-action="flowGoStage"][data-val="flashcards"]').last().click();
    assert.ok(await page.locator('#flowFcCard').isVisible());
    await page.locator('[data-action="flowFcMark"][data-val="know"]').click();
    const progress = (await saved()).companion;
    assert.ok(progress.chapterFlow.ch1.flashcardsReviewed.length > 0);
    assert.ok(Object.values(progress.flashcardStatus).includes('know'));
  });
  await step('Future homework, slides, video links, and printing work with isolated test fixtures', async () => {
    // These records exist only in this disposable page, never in shipped course data.
    const fixture = await browser.newPage();
    fixture.on('pageerror', error => errors.push(error.message));
    await fixture.goto(base);
    await fixture.locator('#modePanelDashboard h1').waitFor();
    await fixture.evaluate(async () => {
      const { getNotebookChapter, DB } = await import(new URL('data/database.js', document.baseURI));
      const ch = getNotebookChapter('ch3');
      ch.notebook[0].hw.push('fixture|Test fixture');
      ch.homework.push({id:'fixture',title:'Test-only worked problem',q:'Two units at three dollars each. What is the total?',given:'2 units; $3 per unit',tag:'Assigned',parts:[{l:'a',ask:'Total cost',f:'Total = quantity × unit cost',rows:[['Multiply 2 × 3','$6']],ans:['Cost','$6'],calc:'2 × 3 = 6'}]});
      DB.homework.push({id:'homework:ch3:fixture',chapterId:'ch3',learningObjectiveIds:['lo3.1']});
      ch.slides = [{n:1,t:'Test-only slide',k:'Quantity times unit cost',ex:'Multiply units by cost per unit.',hw:['fixture']}];
      ch.video = {id:'test-only-video',caution:'Test fixture',missing:'No other clips.',rows:[{hw:'Test-only worked problem',why:'Solution steps',clips:[[12,'Calculation at 0:12','Multiply the inputs.']]}]};
      window.__printCount = 0;
      window.print = () => window.__printCount++;
      location.hash = '#/notebook/ch3';
    });
    const solved = fixture.locator('#p-notebook [data-hwdone="ch3:fixture"]');
    await solved.check();
    await fixture.locator('#p-notebook .prob2 details.sol summary').first().click();
    assert.match(await fixture.locator('#p-notebook .prob2 details.sol[open]').first().innerText(), /Final Answer: Cost: \$6/);
    await fixture.locator('#p-notebook [data-act="print"]').click();
    assert.equal(await fixture.evaluate(() => window.__printCount), 1);
    assert.match(await fixture.locator('#printArea').textContent(), /Test-only worked problem/);
    await fixture.locator('#main-navigation [data-section="homework"]').click();
    assert.equal(await fixture.locator('#p-homework [data-hwdone="ch3:fixture"]').isChecked(), true);
    await fixture.evaluate(() => { location.hash = '#/study/ch3/slides'; });
    await fixture.locator('#p-slides #slide-1').waitFor();
    await fixture.locator('#p-slides details.hwd summary').first().click();
    assert.match(await fixture.locator('#p-slides').innerText(), /Final Answer: Cost: \$6/);
    await fixture.evaluate(() => { location.hash = '#/study/ch3/video'; });
    const video = fixture.locator('#p-video a').first();
    await video.waitFor();
    assert.ok((await video.getAttribute('href')).endsWith('&t=12s'));
    await fixture.close();
  });
  await step('Original operations formula walkthroughs and source tracing respond', async () => {
    await go('textbook', 'ch3');
    const walk = page.locator('#chapter-ch3 [data-tbaction="walkNext"]').first();
    const listId = await walk.getAttribute('data-list');
    const hidden = page.locator(`#chapter-ch3 [id="${listId}"] li[hidden]`);
    const before = await hidden.count();
    assert.ok(before > 0);
    await walk.click();
    assert.equal(await hidden.count(), before - 1);
    const source = page.locator('#chapter-ch3 details.source-box').first();
    await source.locator('summary').click();
    const badge = source.locator('[data-tbaction="flashSrc"]').first();
    await badge.click();
    assert.ok(await page.locator('#chapter-ch3 [data-src].flash').count() > 0);
  });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    passed: checks.length,
    checks,
    pageErrors: errors
  }, null, 2));
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
