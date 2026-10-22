import { CONTENT } from '../../data/database.js';
import { installShared } from './shared.js';
import { installModals } from './modals.js';
import { installProgress } from './progress.js';
import { installEvents } from './events.js';
import { installLifecycle } from './lifecycle.js';
import { installDashboard } from '../modules/dashboard.js';
import { installTextbook } from '../modules/textbook.js';
import { installStudy } from '../modules/study.js';
import { installPractice } from '../modules/practice.js';
import { installMatching } from '../practice/matching.js';
import { installCrossword } from '../practice/crossword.js';
import { installFlashcards } from '../practice/flashcards.js';
import { installQuiz } from '../practice/quiz.js';
import { installRecall } from '../practice/recall.js';
import { installGames } from '../practice/games.js';
import { installExam } from '../practice/exam.js';
import { installSessions } from '../practice/sessions.js';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
const sections = {
  dashboard: 'dashboard',
  study: 'textbook',
  flow: 'study',
  practice: 'practice',
  progress: 'dashboard'
};

/** Each feature uses one scoped instance; shared services are explicit on ctx. */
export function mountCompanion(root, options) {
  const abort = new AbortController(),
    {
      store
    } = options;
  root.classList.add('companion-suite');
  root.innerHTML = ['Dashboard', 'Study', 'Practice', 'Progress', 'Flow'].map(name => `<div id="modePanel${name}" class="mode-panel"></div>`).join('') + '<div id="modalRoot"></div><div id="toast" role="status"></div>';
  const dom = {
    getElementById: id => root.querySelector(`[id="${CSS.escape(String(id))}"]`),
    querySelector: s => root.querySelector(s),
    querySelectorAll: s => root.querySelectorAll(s),
    createElement: t => document.createElement(t),
    addEventListener: (name, fn) => root.addEventListener(name, fn, {
      signal: abort.signal
    })
  };
  const ctx = {
    root,
    dom,
    CONTENT,
    PROGRESS: store.state.companion,
    ACTIONS: {},
    chapterId: 'ch1',
    escapeHTML,
    todayStr: () => new Date().toISOString().slice(0, 10),
    uid: p => `${p}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    saveProgress: () => {
      store.save('study');
      options.onProgress?.();
    }
  };
  [installShared, installModals, installProgress, installDashboard, installTextbook, installStudy, installPractice, installMatching, installCrossword, installFlashcards, installQuiz, installRecall, installGames, installExam, installSessions, installEvents, installLifecycle].forEach(fn => fn(ctx));
  function stopActivities() {
    clearInterval(ctx.examState.timerId);
    clearInterval(ctx.gameState.timerId);
    ctx.gameState.timerId = null;
    ctx.flowSectionObserver?.disconnect();
  }
  function selectChapter(id, emit = true) {
    if (!CONTENT.chapters[id]) return;
    ctx.chapterId = id;
    root.querySelectorAll('.chapter-study').forEach(el => {
      el.hidden = el.id !== `chapter-${id}`;
    });
    if (emit) options.onChapterChange?.(id);
  }
  const scroll = ctx.scrollToChapterTop,
    jump = ctx.jumpToLO;
  ctx.scrollToChapterTop = id => {
    selectChapter(id);
    scroll(id);
  };
  ctx.jumpToLO = id => {
    const lo = CONTENT.learningObjectives.find(x => x.id === id);
    if (lo) selectChapter(lo.chapterId);
    jump(id);
  };
  ctx.render = () => {
    ['Dashboard', 'Study', 'Practice', 'Progress', 'Flow'].forEach(name => {
      const p = dom.getElementById(`modePanel${name}`);
      p.classList.toggle('active', name.toLowerCase() === ctx.MAIN_MODE);
      p.hidden = name.toLowerCase() !== ctx.MAIN_MODE;
    });
    if (ctx.MAIN_MODE === 'dashboard') {
      ctx.renderDashboardPanel();
      options.decorateDashboard?.(dom.getElementById('modePanelDashboard'));
    } else if (ctx.MAIN_MODE === 'practice') ctx.renderPracticeContent();else if (ctx.MAIN_MODE === 'progress') ctx.renderProgressPanel();else if (ctx.MAIN_MODE === 'flow') ctx.renderFlowPanel();
    if (ctx.ACTIVE_MODAL) ctx.renderModal();
  };
  ctx.setMainMode = mode => {
    if (ctx.MAIN_MODE !== mode) stopActivities();
    ctx.MAIN_MODE = mode;
    ctx.render();
    options.onNavigate?.(sections[mode] || 'dashboard', ctx.chapterId, mode === 'progress' ? 'progress' : undefined);
  };
  const setTab = ctx.setPracticeTab;
  ctx.setPracticeTab = tab => {
    if (ctx.PRACTICE_TAB !== tab) stopActivities();
    setTab(tab);
  };
  ctx.navigate = (route, param) => {
    if (route === 'concept') {
      ctx.openConceptModal(param);
      return;
    }
    if (route === 'settings') {
      ctx.openModal({
        type: 'settings'
      });
      return;
    }
    if (route === 'lo') {
      ctx.setMainMode('study');
      ctx.jumpToLO(param);
      return;
    }
    if (['chapter', 'study'].includes(route)) {
      if (CONTENT.chapters[param]) selectChapter(param);
      ctx.setMainMode('study');
      ctx.scrollToChapterTop(ctx.chapterId);
      return;
    }
    if (route === 'flow') {
      ctx.FLOW_CHAPTER = param || ctx.chapterId;
      selectChapter(ctx.FLOW_CHAPTER);
      ctx.FLOW_STAGE = null;
      ctx.FLOW_QUIZ_FEEDBACK = null;
      ctx.setMainMode('flow');
      return;
    }
    const tabs = {
      flashcards: 'flashcards',
      quiz: 'quiz',
      'active-recall': 'recall',
      games: 'games',
      exam: 'exam',
      'weak-areas': 'weak',
      'study-session': 'session'
    };
    if (tabs[route]) {
      if (route === 'games') {
        stopActivities();
        ctx.gameState = {
          type: null
        };
      }
      ctx.PRACTICE_TAB = tabs[route];
      ctx.setMainMode('practice');
      return;
    }
    if (['highlights', 'progress'].includes(route)) {
      ctx.PROGRESS_TAB = route === 'highlights' ? 'highlights' : 'stats';
      ctx.setMainMode('progress');
      return;
    }
    ctx.setMainMode('dashboard');
  };
  ctx.settingsModalHTML = () => `<div class="modal-backdrop"><div class="modal-box" role="dialog" aria-modal="true" aria-label="Settings"><button class="modal-close" aria-label="Close">&times;</button><h2>Settings &amp; backups</h2><p>Study, notebook, and homework progress are saved together in this browser. Export a backup to move progress to another device.</p><div class="wrap-row"><button class="btn" data-action="exportData">Export progress</button><button class="btn secondary" data-action="importData">Import backup</button></div><div class="divider"></div><p>Daily reminders: <b>${escapeHTML(ctx.notifPermissionLabel())}</b>. Reminders run when you open the app, with your permission.</p><button class="btn secondary small" data-action="enableReminders">Enable reminders</button><div class="divider"></div><button class="btn danger small" data-action="resetProgress">Reset progress</button></div></div>`;
  ctx.ACTIONS.exportData = () => options.onExport?.();
  ctx.ACTIONS.importData = () => options.onImport?.();
  ctx.ACTIONS.resetProgress = () => {
    if (confirm('Erase all study, notebook, homework, and quiz progress? Export a backup first if needed.')) {
      store.reset();
      location.reload();
    }
  };
  const fcChapter = ctx.ACTIONS.fcChapter,
    flowChapter = ctx.ACTIONS.flowSwitchChapter;
  ctx.ACTIONS.fcChapter = el => {
    if (CONTENT.chapters[el.dataset.val]) {
      selectChapter(el.dataset.val);
      ctx.practiceChapterId = el.dataset.val;
    }
    fcChapter(el);
  };
  ctx.ACTIONS.flowSwitchChapter = el => {
    selectChapter(el.dataset.val);
    flowChapter(el);
  };
  dom.addEventListener('change', e => {
    if (!['qs-scope', 'ex-scope'].includes(e.target.id)) return;
    if (e.target.value.startsWith('chapter:')) selectChapter(e.target.value.slice(8));
    if (e.target.value.startsWith('lo:')) {
      const lo = ctx.loByCode(e.target.value.slice(3));
      if (lo) selectChapter(lo.chapterId);
    }
  });
  ctx.renderStudyPanel();
  ctx.renderPracticeShell();
  ctx.requestDailyReminderSetupIfNeeded();
  return {
    show(section, chapterId, view) {
      root.hidden = false;
      if (CONTENT.chapters[chapterId]) selectChapter(chapterId);
      const mode = section === 'textbook' ? 'study' : section === 'study' ? 'flow' : section === 'dashboard' && view === 'progress' ? 'progress' : section;
      if (ctx.MAIN_MODE !== mode) stopActivities();
      ctx.MAIN_MODE = mode;
      if (mode === 'flow' && ctx.FLOW_CHAPTER !== ctx.chapterId) {
        ctx.FLOW_CHAPTER = ctx.chapterId;
        ctx.FLOW_STAGE = null;
        ctx.FLOW_QUIZ_FEEDBACK = null;
      }
      if (mode === 'practice' && ctx.practiceChapterId !== ctx.chapterId) {
        ctx.practiceChapterId = ctx.chapterId;
        ctx.initFlashcardDeck(undefined, ctx.chapterId);
        ctx.xwChapter = ctx.chapterId;
        ctx.xwState = null;
        ctx.cardsFilter.chapter = ctx.chapterId;
        for (const kind of ['quizState', 'examState']) {
          const c = ctx[kind].config;
          const id = c?.chapterId || ctx.loByCode(c?.loCode)?.chapterId;
          if (id && id !== ctx.chapterId) {
            clearInterval(ctx[kind].timerId);
            ctx[kind] = {
              phase: 'setup',
              questions: [],
              index: 0,
              answers: [],
              answered: false,
              config: null,
              timerId: null
            };
          }
        }
      }
      ctx.render();
      if (mode === 'practice') for (const id of ['qs-scope', 'ex-scope']) {
        const el = dom.getElementById(id);
        if (el) el.value = `chapter:${ctx.chapterId}`;
      }
    },
    hide() {
      root.hidden = true;
      stopActivities();
    },
    search(query) {
      const q = query.trim().toLowerCase();
      return q.length < 2 ? [] : CONTENT.concepts.filter(c => [c.term, c.definition, c.plain, c.example].join(' ').toLowerCase().includes(q)).slice(0, 20);
    },
    openConcept: id => ctx.openConceptModal(id),
    jumpToLO: id => ctx.jumpToLO(id),
    settings: () => ctx.openModal({
      type: 'settings'
    }),
    stats: id => ({
      mastery: ctx.chapterMastery(id),
      flow: ctx.chapterFlowProgress(id)
    }),
    refresh() {
      ctx.renderStudyPanel();
      if (ctx.fcState.initialized) ctx.initFlashcardDeck(ctx.fcState.filter, ctx.fcState.chapter);
      selectChapter(ctx.chapterId, false);
      ctx.render();
    },
    destroy() {
      stopActivities();
      ctx.highlightEvents?.abort();
      clearTimeout(ctx.srcTraceTimer);
      abort.abort();
      root.replaceChildren();
    },
    context: ctx
  };
}
