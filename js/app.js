import { CONTENT, DB, getNotebookChapter } from '../data/database.js';
import { store, createStore } from './core/store.js';
import { mountCompanion, escapeHTML } from './companion/index.js';
import { mountNotebookSuite } from './notebook/index.js';
import { bindSourceTracing } from './core/source-tracing.js';
const $ = s => document.querySelector(s);
const sections = ['dashboard', 'textbook', 'notebook', 'homework', 'study', 'practice'];
const tools = {
  dashboard: [['', 'Course dashboard'], ['progress', 'Study progress & highlights']],
  textbook: [['', 'Textbook & glossary'], ['summary', 'Notebook source summary']],
  notebook: [['', 'Write This Down']],
  homework: [['', 'Problems & worked solutions']],
  study: [['', 'Guided study'], ['examreview', 'Exam review'], ['slides', 'Lecture slides'], ['video', 'Videos']],
  practice: [['', 'Study Companion tools'], ['cards', 'Notebook flashcards'], ['quiz', 'Notebook quiz']]
};
let current = {
    section: 'dashboard',
    chapterId: 'ch1',
    view: ''
  },
  rendering = false,
  companion,
  notebook,
  messageTimer;
function notify(message, persist = false) {
  clearTimeout(messageTimer);
  $('#studio-message').textContent = message;
  $('#studio-message').hidden = false;
  if (!persist) messageTimer = setTimeout(() => {
    $('#studio-message').hidden = true;
  }, 6500);
}
function hash(route) {
  return `#/${route.section}/${route.chapterId}${route.view ? '/' + route.view : ''}`;
}
function readRoute() {
  const [section, id, view] = location.hash.replace(/^#\/?/, '').split('/').map(x => {
    try {
      return decodeURIComponent(x);
    } catch {
      return '';
    }
  });
  const saved = store.state.navigation;
  const name = sections.includes(section) ? section : sections.includes(saved.section) ? saved.section : 'dashboard';
  return {
    section: name,
    chapterId: CONTENT.chapters[id] ? id : CONTENT.chapters[saved.chapterId] ? saved.chapterId : 'ch1',
    view: tools[name].some(([key]) => key === view) ? view : ''
  };
}
function applyTheme() {
  const theme = store.state.settings.theme;
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme = theme;
  $('#theme-toggle').textContent = 'Theme: ' + theme[0].toUpperCase() + theme.slice(1);
}
function status() {
  const s = store.state,
    stat = notebook?.stats(current.chapterId) || {
      secD: 0,
      secT: 0,
      hwD: 0,
      hwT: 0
    };
  const answered = s.companion.quizAttempts.length + s.notebook.quizHistory.length;
  $('#chapter-progress').innerHTML = `<b>Chapter ${CONTENT.chapters[current.chapterId].number}</b><br>Notebook ${stat.secD}/${stat.secT} · Homework ${stat.hwD}/${stat.hwT}<br>${answered} course questions answered · ${s.companion.xp} XP`;
  $('#storage-status').textContent = store.status.persistent ? 'Progress saved in this browser. Export a backup for another device.' : store.status.message || 'Browser storage is unavailable. Export a backup before leaving.';
}
function sidebar() {
  $('#chapter-select').value = current.chapterId;
  $('#main-navigation').querySelectorAll('[data-section]').forEach(b => {
    if (b.dataset.section === current.section) b.setAttribute('aria-current', 'page');else b.removeAttribute('aria-current');
  });
  $('#objective-links').innerHTML = DB.learningObjectives.filter(x => x.chapterId === current.chapterId).map(lo => `<button data-objective="${escapeHTML(lo.id)}" title="${escapeHTML(lo.text)}">${lo.supplemental ? 'Notebook topic' : 'LO ' + escapeHTML(lo.code)} · ${escapeHTML(lo.text)}</button>`).join('');
  status();
}
function syncChapter(id) {
  if (rendering || !CONTENT.chapters[id] || id === current.chapterId) return;
  current.chapterId = id;
  store.setNavigation(id, current.section);
  history.replaceState(null, '', hash(current));
  sidebar();
}
function notebookNavigate(section, id, anchor) {
  const mapped = {
    notebook: ['notebook', ''],
    homework: ['homework', ''],
    summary: ['textbook', 'summary'],
    textbook: ['textbook', ''],
    dashboard: ['dashboard', ''],
    examreview: ['study', 'examreview'],
    slides: ['study', 'slides'],
    video: ['study', 'video'],
    cards: ['practice', 'cards'],
    quiz: ['practice', 'quiz']
  }[section] || ['notebook', ''];
  const lo = anchor && DB.learningObjectives.find(x => x.id === anchor);
  if (section === 'textbook' && lo?.supplemental) {
    navigate('notebook', id, '', anchor);
    return;
  }
  navigate(mapped[0], id, mapped[1], anchor);
  if (section === 'textbook' && anchor) companion.jumpToLO(anchor);
}
function decorateDashboard(panel) {
  if (!notebook) return;
  const stats = CONTENT.course.chapters.map(id => ({
    id,
    ...notebook.stats(id)
  }));
  const total = stats.reduce((a, s) => ({
    secD: a.secD + s.secD,
    secT: a.secT + s.secT,
    hwD: a.hwD + s.hwD,
    hwT: a.hwT + s.hwT
  }), {
    secD: 0,
    secT: 0,
    hwD: 0,
    hwT: 0
  });
  const attempts = [...store.state.companion.quizAttempts, ...store.state.notebook.quizHistory];
  const block = document.createElement('section');
  block.className = 'shared-dashboard';
  block.innerHTML = `<h2>Notebook, homework &amp; practice</h2><div class="shared-stats"><div class="shared-stat"><strong>${total.secD}/${total.secT}</strong>Notebook sections written</div><div class="shared-stat"><strong>${total.hwD}/${total.hwT}</strong>Related homework items solved</div><div class="shared-stat"><strong>${attempts.length ? Math.round(100 * attempts.filter(x => x.correct).length / attempts.length) + '%' : '—'}</strong>Accuracy across both practice collections</div></div><div class="grid grid-2">${stats.map(s => `<div class="card"><b>Chapter ${CONTENT.chapters[s.id].number}</b><p class="small-muted">${s.secT ? `Notebook ${s.secD}/${s.secT} · Homework ${s.hwD}/${s.hwT}` : 'Textbook and study tools available. No notebook source was supplied for this chapter.'}</p><button class="btn small" data-open-section="textbook" data-chapter="${s.id}">Read textbook</button>${s.secT ? `<button class="btn secondary small" data-open-section="notebook" data-chapter="${s.id}">Open notebook</button>` : ''}</div>`).join('')}</div>`;
  panel.append(block);
}
function closeMenu() {
  $('#studio-sidebar').classList.remove('open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
  setMenuAccess();
}
function setMenuAccess() {
  $('#studio-sidebar').inert = matchMedia('(max-width:860px)').matches && !$('#studio-sidebar').classList.contains('open');
}
function renderRoute(anchor) {
  rendering = true;
  try {
    $('#module-tools').innerHTML = tools[current.section].map(([view, label]) => `<button data-view="${view}" aria-pressed="${view === current.view}">${label}</button>`).join('');
    sidebar();
    const nb = ['notebook', 'homework'].includes(current.section) || ['summary', 'examreview', 'slides', 'video', 'cards', 'quiz'].includes(current.view);
    if (nb) {
      companion.hide();
      $('#notebook-suite').hidden = false;
      notebook.show(current.view || current.section, current.chapterId, anchor);
    } else {
      $('#notebook-suite').hidden = true;
      companion.show(current.section, current.chapterId, current.view);
    }
    document.title = `SOMS 306 · ${current.section[0].toUpperCase() + current.section.slice(1)} · Chapter ${CONTENT.chapters[current.chapterId].number}`;
    closeMenu();
  } finally {
    rendering = false;
  }
}
function navigate(section, id = current.chapterId, view = '', anchor) {
  if (!sections.includes(section)) section = 'dashboard';
  if (!CONTENT.chapters[id]) id = current.chapterId;
  if (!tools[section].some(([key]) => key === (view || ''))) view = '';
  current = {
    section,
    chapterId: id,
    view: view || ''
  };
  store.setNavigation(id, section);
  if (location.hash !== hash(current)) history.pushState(null, '', hash(current));
  renderRoute(anchor);
  if (!anchor) window.scrollTo(0, 0);
}
function exportBackup() {
  const url = URL.createObjectURL(new Blob([store.exportBackup()], {
      type: 'application/json'
    })),
    a = document.createElement('a');
  a.href = url;
  a.download = `soms306-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Backup exported. It includes study, notebook, homework, and quiz progress.');
}
try {
  bindSourceTracing($('#main-content'));
  $('#chapter-select').innerHTML = CONTENT.course.chapters.map(id => `<option value="${id}">Chapter ${CONTENT.chapters[id].number}: ${escapeHTML(CONTENT.chapters[id].title)}</option>`).join('');
  notebook = mountNotebookSuite($('#notebook-suite'), {
    store,
    onNavigate: notebookNavigate,
    onChapterChange: syncChapter,
    onProgress: status
  });
  companion = mountCompanion($('#companion-suite'), {
    store,
    onNavigate: (s, id, v) => {
      if (!rendering) navigate(s, id, v);
    },
    onChapterChange: syncChapter,
    onExport: exportBackup,
    onImport: () => $('#backup-file').click(),
    onProgress: status,
    decorateDashboard
  });
  current = readRoute();
  applyTheme();
  renderRoute();
  history.replaceState(null, '', hash(current));
  $('#main-navigation').addEventListener('click', e => {
    const b = e.target.closest('[data-section]');
    if (b) navigate(b.dataset.section);
  });
  $('#module-tools').addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (b) navigate(current.section, current.chapterId, b.dataset.view);
  });
  $('#chapter-select').addEventListener('change', e => navigate(current.section, e.target.value, current.view));
  $('#objective-links').addEventListener('click', e => {
    const b = e.target.closest('[data-objective]');
    if (!b) return;
    const lo = DB.learningObjectives.find(x => x.id === b.dataset.objective);
    if (lo?.supplemental) navigate('notebook', lo.chapterId, '', lo.id);else {
      navigate('textbook');
      companion.jumpToLO(b.dataset.objective);
    }
  });
  $('#companion-suite').addEventListener('click', e => {
    const b = e.target.closest('[data-open-section]');
    if (b) navigate(b.dataset.openSection, b.dataset.chapter);
  });
  $('#course-search').addEventListener('input', e => {
    const results = companion.search(e.target.value);
    $('#search-results').innerHTML = results.map(x => `<button data-concept="${x.id}" data-chapter="${x.chapterId}">${escapeHTML(x.term)}<small>Chapter ${CONTENT.chapters[x.chapterId].number} · LO ${x.lo}</small></button>`).join('');
    if (e.target.value.trim().length >= 2 && !results.length) $('#search-results').textContent = 'No matching concepts.';
  });
  $('#search-results').addEventListener('click', e => {
    const b = e.target.closest('[data-concept]');
    if (b) {
      navigate('textbook', b.dataset.chapter);
      companion.openConcept(b.dataset.concept);
      $('#search-results').replaceChildren();
    }
  });
  $('#menu-toggle').addEventListener('click', () => {
    const open = $('#studio-sidebar').classList.toggle('open');
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
    setMenuAccess();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#studio-sidebar,#menu-toggle')) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      companion.context.closeModal();
      closeMenu();
    }
  });
  matchMedia('(max-width:860px)').addEventListener('change', setMenuAccess);
  $('#theme-toggle').addEventListener('click', () => {
    store.setTheme({
      auto: 'light',
      light: 'dark',
      dark: 'auto'
    }[store.state.settings.theme]);
    applyTheme();
  });
  $('#settings-button').addEventListener('click', () => {
    if ($('#companion-suite').hidden) navigate('dashboard');
    companion.settings();
  });
  $('#export-backup').addEventListener('click', exportBackup);
  $('#import-backup').addEventListener('click', () => $('#backup-file').click());
  $('#backup-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 20 MB.');
      const raw = await file.text();
      createStore({
        storage: null,
        listenForStorage: false
      }).importBackup(raw);
      if (!confirm('Replace this browser’s progress with the selected backup? Export your current progress first if you need to keep both.')) return;
      store.importBackup(raw);
      companion.refresh();
      notebook.refresh();
      applyTheme();
      renderRoute();
      notify('Backup imported. All sections now use the restored progress.');
    } catch (err) {
      notify('Import failed: ' + err.message, true);
    } finally {
      e.target.value = '';
    }
  });
  store.subscribe((state, detail) => {
    status();
    if (['external', 'storage'].includes(detail.reason)) {
      applyTheme();
      companion.refresh();
      notebook.refresh();
      renderRoute();
    }
  });
  window.addEventListener('hashchange', () => {
    current = readRoute();
    renderRoute();
  });
  window.addEventListener('pagehide', () => store.save('pagehide'));
} catch (error) {
  console.error(error);
  $('#startup-error').textContent = `The Studio could not start: ${error.message}. Serve this project over HTTP or GitHub Pages; modules do not run from file:// URLs.`;
  $('#startup-error').hidden = false;
}
