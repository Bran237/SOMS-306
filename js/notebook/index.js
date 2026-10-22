import { NOTEBOOK_CHAPTERS, DB, learningObjectiveIds, getChapter, getNotebookChapter } from '../../data/database.js';
import { qBox, st1QBox } from '../../data/notebook-source.js';
import { installHomework } from './homework.js';
import { installDashboard } from './dashboard.js';
import { installNotebook } from './notebook.js';
import { installResources } from './resources.js';
import { installExam } from './exam.js';
import { installPractice } from './practice.js';
const PANELS = ['dashboard', 'notebook', 'examreview', 'cards', 'quiz', 'summary', 'slides', 'video', 'homework'];
const LABELS = {
  dashboard: 'Notebook progress',
  notebook: 'Notebook',
  examreview: 'Chapter review',
  cards: 'Notebook flashcards',
  quiz: 'Notebook quiz',
  summary: 'Full chapter summary',
  slides: 'Lecture slides',
  video: 'Video guide',
  homework: 'All homework'
};
const EMPTY = {
  secT: 0,
  secD: 0,
  hwT: 0,
  hwD: 0,
  exT: 0,
  exD: 0,
  flags: 0
};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);

/** Original notebook tools, sharing one data registry, route, and browser store. */
export function mountNotebookSuite(host, {
  store,
  onNavigate,
  onChapterChange,
  onProgress
} = {}) {
  if (!host || !store?.state) throw new TypeError('A host and shared progress store are required.');
  const root = host;
  root.id = 'notebook-suite';
  root.classList.add('notebook-suite');
  root.innerHTML = '<nav class="suite-subnav" aria-label="Related chapter tools"></nav>' + PANELS.map(name => `<section class="panel" id="p-${name}" data-suite-section="${name}" hidden></section>`).join('') + '<div id="printArea" aria-hidden="true"></div>';
  const abort = new AbortController();
  const listen = (element, name, fn) => element.addEventListener(name, fn, {
    signal: abort.signal
  });
  const ctx = {
    root,
    CHAPTERS: NOTEBOOK_CHAPTERS,
    ch: null,
    chapterId: null,
    curTab: 'notebook',
    SM: {},
    SECOF: {},
    sm: {
      only: false
    },
    NBDONE: store.state.notebook.done,
    HWDONE: store.state.notebook.homeworkDone,
    REVIEW: store.state.notebook.review,
    EXCHK: store.state.notebook.examCheck,
    fc: {
      deck: [],
      i: 0,
      flipped: false,
      got: new Set(),
      seen: new Set(),
      filter: 'all'
    },
    qz: {
      i: 0,
      picked: null,
      score: 0,
      missed: [],
      done: false
    },
    $: selector => root.querySelector(selector),
    qBox,
    st1QBox: want => st1QBox(want, ctx.ch),
    saveJ: () => save(),
    homeworkAttributes(id) {
      const record = DB.homework.find(item => item.id === `homework:${ctx.chapterId}:${id}`);
      return ` data-homework-id="homework:${ctx.chapterId}:${id}" data-chapter-id="${ctx.chapterId}" data-lo-ids="${record?.learningObjectiveIds?.join(' ') || ''}"`;
    },
    persistCards() {
      if (!ctx.ch) return;
      const value = {
        known: [...ctx.fc.got],
        seen: [...ctx.fc.seen]
      };
      const prior = store.state.notebook.flashcards[ctx.chapterId];
      if (JSON.stringify(prior) !== JSON.stringify(value)) {
        store.state.notebook.flashcards[ctx.chapterId] = value;
        save();
      }
      const element = ctx.$('#fcCard');
      const card = ctx.fc.deck[ctx.fc.i];
      if (element && card) {
        const id = `card:notebook:${ctx.chapterId}:${card.id}`;
        element.dataset.cardId = id;
        element.dataset.chapterId = ctx.chapterId;
        element.dataset.loIds = DB.flashcards.find(x => x.id === id)?.learningObjectiveIds?.join(' ') || '';
      }
    },
    recordNotebookQuiz(question, answer, index) {
      const id = `quiz:notebook:${ctx.chapterId}:${index}`;
      store.state.notebook.quizHistory.push({
        id,
        chapterId: ctx.chapterId,
        learningObjectiveIds: DB.quizzes.find(x => x.id === id)?.learningObjectiveIds || [],
        prompt: question.q,
        correct: answer === question.a,
        answer,
        ts: Date.now()
      });
      save();
    }
  };
  ctx.dom = {
    getElementById: id => root.querySelector(`[id="${CSS.escape(String(id))}"]`),
    querySelector: s => root.querySelector(s),
    querySelectorAll: s => root.querySelectorAll(s),
    createElement: t => document.createElement(t)
  };
  const flash = element => {
    if (element) {
      element.classList.add('hl');
      setTimeout(() => element.classList.remove('hl'), 1800);
    }
  };
  const navigate = (section, chapterId = ctx.chapterId, anchor) => {
    if (chapterId !== ctx.chapterId) onChapterChange?.(chapterId);
    if (onNavigate) onNavigate(section, chapterId, anchor);else show(section, chapterId, anchor);
  };
  ctx.showTab = section => navigate(section);
  ctx.goTo = (chapterId, section, anchor) => navigate(section, chapterId, anchor);
  ctx.flash = flash;
  ctx.printChapter = () => {
    if (!ctx.ch) return;
    ctx.buildPrint();
    document.body.classList.add('notebook-printing');
    try {
      window.print();
    } finally {
      document.body.classList.remove('notebook-printing');
    }
  };
  for (const install of [installHomework, installDashboard, installNotebook, installResources, installExam, installPractice]) install(ctx);
  function save() {
    store.save('notebook');
    onProgress?.({
      chapterId: ctx.chapterId,
      ...stats(ctx.chapterId)
    });
  }
  function restoreCards() {
    const value = store.state.notebook.flashcards[ctx.chapterId] || {};
    const valid = items => (Array.isArray(items) ? items : []).filter(index => Number.isInteger(index) && index >= 0 && index < (ctx.ch?.cards.length || 0));
    ctx.fc.got = new Set(valid(value.known));
    ctx.fc.seen = new Set(valid(value.seen));
    ctx.fc.filter = 'all';
  }
  function annotate() {
    root.querySelectorAll('[data-suite-section]').forEach(panel => {
      panel.dataset.chapterId = ctx.chapterId;
      panel.dataset.loIds = getChapter(ctx.chapterId)?.learningObjectiveIds?.join(' ') || '';
    });
    (ctx.ch?.notebook || []).forEach((section, index) => {
      const note = ctx.dom.getElementById(`nb-${ctx.chapterId}-${index}`);
      if (!note) return;
      const ids = learningObjectiveIds(ctx.chapterId, section.num);
      note.dataset.noteId = `note:${ctx.chapterId}:${section.num}`;
      note.dataset.chapterId = ctx.chapterId;
      note.dataset.loIds = ids.join(' ');
      const links = document.createElement('div');
      links.className = 'suite-objectives';
      links.innerHTML = ids.length ? 'Related course topics: ' + ids.map(id => {
        const lo = DB.learningObjectives.find(x => x.id === id);
        return `<a href="#/textbook/${ctx.chapterId}" data-course-lo="${id}" data-chapter="${ctx.chapterId}">${lo?.supplemental ? 'Notebook topic' : 'LO'} ${escapeHTML(lo?.code || id)}</a>`;
      }).join(' ') : '';
      note.querySelector('.nbhead')?.after(links);
    });
  }
  function renderAll() {
    if (!ctx.ch) return;
    ctx.SM = ctx.buildSlideMap();
    ctx.SECOF = ctx.buildSecOf();
    ctx.renderSummary();
    ctx.renderSlides();
    ctx.renderHomework();
    ctx.renderNotebook();
    ctx.renderExamReview();
    ctx.renderDashboard();
    ctx.fcBuild();
    ctx.fcRender();
    ctx.qzReset();
    ctx.qzRender();
    ctx.renderVideo();
    annotate();
  }
  ctx.renderAll = renderAll;
  function setChapter(chapterId) {
    const chapter = getNotebookChapter(chapterId);
    if (ctx.chapterId === chapterId && ctx.ch === chapter) return;
    ctx.chapterId = chapterId;
    ctx.ch = chapter || null;
    restoreCards();
    if (chapter) renderAll();
  }
  ctx.setChapter = setChapter;
  function renderSubnav() {
    let destinations = ctx.curTab === 'notebook' ? ['examreview', 'slides', 'video'] : ['cards', 'quiz'].includes(ctx.curTab) ? ['examreview'] : ['summary', 'slides', 'video', 'homework'].includes(ctx.curTab) ? ['notebook'] : ['notebook', 'cards', 'quiz'];
    if (!onNavigate) destinations = PANELS.filter(x => x !== ctx.curTab && x !== 'dashboard');
    ctx.$('.suite-subnav').innerHTML = destinations.map(name => `<button type="button" class="btn" data-suite-tab="${name}">${LABELS[name]}</button>`).join('');
  }
  function show(section = 'notebook', chapterId = ctx.chapterId || 'ch3', anchor) {
    setChapter(chapterId);
    ctx.curTab = PANELS.includes(section) ? section : 'notebook';
    PANELS.forEach(name => {
      ctx.$(`#p-${name}`).hidden = name !== ctx.curTab;
    });
    renderSubnav();
    const panel = ctx.$(`#p-${ctx.curTab}`);
    if (!ctx.ch) {
      panel.innerHTML = `<div class="suite-empty"><h2>${LABELS[ctx.curTab]}</h2><p>No notebook or homework source material was supplied for ${escapeHTML(getChapter(chapterId)?.title || chapterId)}. Its supplied textbook content and study tools remain available.</p><button type="button" class="btn primary" data-empty-textbook="${escapeHTML(chapterId)}">Read this chapter in Textbook</button></div>`;
      panel.dataset.chapterId = chapterId;
    } else if (ctx.curTab === 'cards') ctx.fcRender();
    if (anchor) {
      const note = DB.notebooks.find(item => item.chapterId === chapterId && item.learningObjectiveIds.includes(anchor));
      const id = note && ctx.curTab === 'notebook' ? `nb-${chapterId}-${ctx.ch.notebook.findIndex(item => item.num === note.num)}` : anchor;
      const element = ctx.dom.getElementById(id);
      if (element) {
        element.scrollIntoView({
          block: 'start'
        });
        flash(element);
      }
    }
  }
  function stats(chapterId) {
    const chapter = getNotebookChapter(chapterId);
    return chapter ? ctx.chapterStats(chapter) : {
      ...EMPTY
    };
  }
  listen(root, 'click', event => {
    const target = event.target.closest?.('button,a');
    if (!target) return;
    const tab = target.closest('[data-suite-tab]');
    if (tab) {
      navigate(tab.dataset.suiteTab);
      return;
    }
    const lo = target.closest('[data-course-lo]');
    if (lo) {
      event.preventDefault();
      navigate('textbook', lo.dataset.chapter, lo.dataset.courseLo);
      return;
    }
    const empty = target.closest('[data-empty-textbook]');
    if (empty) {
      navigate('textbook', empty.dataset.emptyTextbook);
      return;
    }
    const go = target.closest('[data-go]');
    if (go) {
      event.preventDefault();
      const [chapter, section, anchor] = go.dataset.go.split('|');
      navigate(section, chapter, anchor);
      return;
    }
    const slide = target.closest('[data-slide]');
    if (slide) {
      event.preventDefault();
      ctx.goSlide(Number(slide.dataset.slide));
      return;
    }
    const jump = target.closest('[data-nbjump]');
    if (jump) {
      event.preventDefault();
      const element = ctx.dom.getElementById(`nb-${ctx.chapterId}-${jump.dataset.nbjump}`);
      if (element) {
        element.scrollIntoView();
        flash(element);
      }
      return;
    }
    const flag = target.closest('[data-flag]');
    if (flag) {
      const key = flag.dataset.flag;
      if (ctx.REVIEW[key]) delete ctx.REVIEW[key];else ctx.REVIEW[key] = true;
      root.querySelectorAll('[data-flag]').forEach(button => {
        if (button.dataset.flag === key) button.classList.toggle('on', !!ctx.REVIEW[key]);
      });
      save();
      ctx.renderDashboard();
      ctx.renderExamReview();
      return;
    }
    const action = target.closest('[data-act]')?.dataset.act;
    if (action === 'print') {
      ctx.printChapter();
      return;
    }
    if (action === 'expand' || action === 'collapse') {
      root.querySelectorAll('#p-notebook details.sol').forEach(element => {
        element.open = action === 'expand';
      });
      return;
    }
    if (target.id === 'slOpen' || target.id === 'slClose') root.querySelectorAll('#p-slides details.hwd').forEach(element => {
      element.open = target.id === 'slOpen';
    });
  });
  listen(root, 'change', event => {
    const target = event.target;
    if (target.id === 'slOnly') {
      ctx.sm.only = target.checked;
      ctx.renderSlides();
      return;
    }
    for (const [attr, map] of [['nbdone', ctx.NBDONE], ['hwdone', ctx.HWDONE], ['exchk', ctx.EXCHK]]) {
      if (!target.dataset[attr]) continue;
      const key = target.dataset[attr];
      map[key] = target.checked;
      root.querySelectorAll(`[data-${attr}]`).forEach(input => {
        if (input.dataset[attr] === key) input.checked = target.checked;
      });
      save();
      ctx.updateProgress();
      return;
    }
  });
  listen(root, 'input', event => {
    if (event.target.id === 'slJump') {
      const element = ctx.dom.getElementById(`slide-${Number(event.target.value)}`);
      if (element) {
        element.scrollIntoView();
        flash(element);
      }
    }
  });
  listen(document, 'keydown', event => {
    if (root.closest('[hidden]') || ctx.$('#p-cards').hidden || !ctx.fc.deck.length || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    ctx.fc.i = (ctx.fc.i + direction + ctx.fc.deck.length) % ctx.fc.deck.length;
    ctx.fc.flipped = false;
    ctx.fcRender();
  });
  listen(window, 'beforeprint', () => {
    if (ctx.ch && !root.hidden) {
      ctx.buildPrint();
      document.body.classList.add('notebook-printing');
    }
  });
  listen(window, 'afterprint', () => document.body.classList.remove('notebook-printing'));
  return {
    show,
    stats,
    root,
    refresh() {
      restoreCards();
      renderAll();
      show(ctx.curTab, ctx.chapterId || 'ch3');
    },
    destroy() {
      abort.abort();
      root.replaceChildren();
    }
  };
}
