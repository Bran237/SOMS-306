// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installPractice(ctx) {
  ctx.PRACTICE_TABS = [{
    key: 'flashcards',
    label: 'Flashcards'
  }, {
    key: 'quiz',
    label: 'Quiz'
  }, {
    key: 'match',
    label: 'Match Game'
  }, {
    key: 'crossword',
    label: 'Crossword'
  }, {
    key: 'recall',
    label: 'Active Recall'
  }, {
    key: 'cards',
    label: 'Concept Cards'
  }, {
    key: 'games',
    label: 'Mini Games'
  }, {
    key: 'exam',
    label: 'Exam Prep'
  }, {
    key: 'weak',
    label: 'Weak Areas'
  }, {
    key: 'session',
    label: 'Study Session'
  }];
  ctx.renderPracticeShell = function renderPracticeShell() {
    const panel = ctx.dom.getElementById('modePanelPractice');
    if (!panel) return;
    panel.innerHTML = `
    <p class="chapter-kicker">Practice</p>
    <h1 class="chapter-title">Practice Tools</h1>
    <div class="practice-toggle" id="practiceToggle">
      ${ctx.PRACTICE_TABS.map(t => `<button data-tab="${t.key}" class="${ctx.PRACTICE_TAB === t.key ? 'active' : ''}">${t.label}</button>`).join('')}
    </div>
    <div id="practiceContent"></div>
  `;
    ctx.dom.querySelectorAll('#practiceToggle button').forEach(b => b.addEventListener('click', () => ctx.setPracticeTab(b.dataset.tab)));
  };
  ctx.renderPracticeContent = function renderPracticeContent() {
    const bar = ctx.dom.getElementById('practiceToggle');
    if (bar) bar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === ctx.PRACTICE_TAB));
    const c = ctx.dom.getElementById('practiceContent');
    if (!c) return;
    if (ctx.PRACTICE_TAB === 'flashcards') c.innerHTML = ctx.viewFlashcards();else if (ctx.PRACTICE_TAB === 'quiz') c.innerHTML = ctx.viewQuiz();else if (ctx.PRACTICE_TAB === 'match') c.innerHTML = ctx.viewMatchGame();else if (ctx.PRACTICE_TAB === 'crossword') c.innerHTML = ctx.viewCrosswordGame();else if (ctx.PRACTICE_TAB === 'recall') c.innerHTML = ctx.viewActiveRecall();else if (ctx.PRACTICE_TAB === 'cards') c.innerHTML = ctx.viewConceptCards();else if (ctx.PRACTICE_TAB === 'games') c.innerHTML = ctx.gameState && ctx.gameState.type ? ctx.viewGamePlay(ctx.gameState.type) : ctx.viewGames();else if (ctx.PRACTICE_TAB === 'exam') c.innerHTML = ctx.viewExam();else if (ctx.PRACTICE_TAB === 'weak') c.innerHTML = ctx.viewWeakAreas();else if (ctx.PRACTICE_TAB === 'session') c.innerHTML = ctx.viewStudySession();
    ctx.afterRender();
  };
  ctx.cardsFilter = {
    tier: 'all',
    chapter: 'all'
  };
  ctx.viewConceptCards = function viewConceptCards() {
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    let pool = ctx.cardsFilter.chapter === 'all' ? ctx.allConcepts() : ctx.conceptsForChapter(ctx.cardsFilter.chapter);
    if (ctx.cardsFilter.tier !== 'all') pool = pool.filter(c => c.tier === ctx.cardsFilter.tier);
    return `
    <div class="wrap-row" style="margin-bottom:8px;">
      <button class="pill-btn ${ctx.cardsFilter.tier === 'all' ? 'active' : ''}" data-action="cardsFilter" data-key="tier" data-val="all">All Tiers</button>
      <button class="pill-btn ${ctx.cardsFilter.tier === 'must_know' ? 'active' : ''}" data-action="cardsFilter" data-key="tier" data-val="must_know">Must Know</button>
      <button class="pill-btn ${ctx.cardsFilter.tier === 'supporting' ? 'active' : ''}" data-action="cardsFilter" data-key="tier" data-val="supporting">Supporting</button>
    </div>
    <div class="wrap-row" style="margin-bottom:16px;">
      <button class="pill-btn ${ctx.cardsFilter.chapter === 'all' ? 'active' : ''}" data-action="cardsFilter" data-key="chapter" data-val="all">All Chapters</button>
      ${chapters.map(ch => `<button class="pill-btn ${ctx.cardsFilter.chapter === ch.id ? 'active' : ''}" data-action="cardsFilter" data-key="chapter" data-val="${ch.id}">Ch. ${ch.number}</button>`).join('')}
    </div>
    <div class="grid grid-2">
      ${pool.map(c => `<div class="card clickable" style="border-left:4px solid ${ctx.loColorHex(c.section)};" data-action="openConcept" data-id="${c.id}">
        <div class="flex-between"><span class="badge badge-tier-${c.tier}">${c.tier === 'must_know' ? 'Must Know' : 'Supporting'}</span><span class="mono small-muted">LO ${c.section}</span></div>
        <div style="margin-top:8px;font-weight:700;font-family:var(--font-head);font-size:1.02rem;">${c.term}</div>
        <p style="font-size:.85rem;margin-top:4px;">${c.definition}</p>
      </div>`).join('')}
    </div>
    ${pool.length === 0 ? '<p class="empty-state">No concepts match this filter.</p>' : ''}
  `;
  };
}
