// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installProgress(ctx) {
  ctx.renderProgressPanel = function renderProgressPanel() {
    const panel = ctx.dom.getElementById('modePanelProgress');
    if (!panel) return;
    const totalMin = ctx.PROGRESS.studyLog.reduce((s, l) => s + l.minutes, 0);
    const totalQ = ctx.PROGRESS.quizAttempts.length;
    const acc = totalQ ? Math.round(100 * ctx.PROGRESS.quizAttempts.filter(a => a.correct).length / totalQ) : null;
    const masteredLOs = ctx.CONTENT.learningObjectives.filter(l => ctx.loStats(l.id).status === 'Mastered').length;
    const badges = ctx.computeBadges();
    const recent = ctx.PROGRESS.quizAttempts.slice(-8).reverse();
    const hs = ctx.PROGRESS.highlights.slice().reverse();
    panel.innerHTML = `
    <p class="chapter-kicker">Progress</p>
    <h1 class="chapter-title">Your Progress</h1>
    <div class="practice-toggle">
      <button data-ptab="stats" class="${ctx.PROGRESS_TAB === 'stats' ? 'active' : ''}">Stats & Badges</button>
      <button data-ptab="highlights" class="${ctx.PROGRESS_TAB === 'highlights' ? 'active' : ''}">My Highlights</button>
    </div>
    <div id="progressInner"></div>
  `;
    panel.querySelectorAll('[data-ptab]').forEach(b => b.addEventListener('click', () => ctx.setProgressTab(b.dataset.ptab)));
    const inner = ctx.dom.getElementById('progressInner');
    if (ctx.PROGRESS_TAB === 'stats') {
      inner.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="card stat-card"><div class="stat-value">${totalMin}</div><div class="stat-label">MINUTES STUDIED</div></div>
        <div class="card stat-card"><div class="stat-value">${totalQ}</div><div class="stat-label">QUESTIONS ANSWERED</div></div>
        <div class="card stat-card"><div class="stat-value">${acc === null ? '&mdash;' : acc + '%'}</div><div class="stat-label">QUIZ ACCURACY</div></div>
        <div class="card stat-card"><div class="stat-value">${ctx.PROGRESS.streakDays || 0}</div><div class="stat-label">STUDY STREAK</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Mastery Snapshot</h3>
          <div>Learning Objectives Mastered: <b>${masteredLOs}/${ctx.CONTENT.learningObjectives.length}</b></div>
          <div>Flashcards Mastered: <b>${ctx.flashcardsMasteredCount()}/${ctx.allConcepts().length}</b></div>
          <div>XP: <b>${ctx.PROGRESS.xp || 0}</b></div>
          <h4 style="margin-top:14px;">Badges</h4>
          <div class="wrap-row">${badges.length ? badges.map(b => `<span class="badge badge-status-mastered">${b}</span>`).join('') : '<span class="small-muted">None yet &mdash; keep studying!</span>'}</div>
        </div>
        <div class="card">
          <h3>Recent Activity</h3>
          ${recent.length ? recent.map(a => `<div class="flex-between" style="padding:5px 0;border-bottom:1px solid var(--rule);font-size:.85rem;">
              <span>${ctx.getConcept(a.conceptId) ? ctx.getConcept(a.conceptId).term : '&mdash;'}</span>
              <span class="mono" style="color:${a.correct ? 'var(--good)' : 'var(--bad)'};">${a.correct ? 'correct' : 'missed'}</span></div>`).join('') : '<p class="small-muted">No activity yet.</p>'}
        </div>
      </div>`;
    } else {
      inner.innerHTML = hs.length ? hs.map(h => `
      <div class="card" style="margin-bottom:10px;border-left:5px solid ${ctx.hlCatColor(h.category)};">
        <div class="flex-between"><span class="badge" style="background:${ctx.hlCatColor(h.category)};color:#111;">${ctx.escapeHTML(h.category)}</span><span class="small-muted">${ctx.escapeHTML(h.source?.label)}</span></div>
        <p style="margin:8px 0;">"${ctx.escapeHTML(h.text)}"</p>
        <div class="wrap-row">
          <button class="btn small ghost" data-action="highlightGo" data-id="${ctx.escapeHTML(h.source?.id)}">Go to source &rarr;</button>
          <button class="btn small ghost" data-action="deleteHighlight" data-id="${ctx.escapeHTML(h.id)}">Delete</button>
        </div>
      </div>`).join('') : '<p class="empty-state">No highlights yet. Select text in Study mode and choose a category to create one.</p>';
    }
  };
  ctx.computeBadges = function computeBadges() {
    const b = [];
    if (ctx.PROGRESS.streakDays >= 3) b.push('3-Day Streak');
    if (ctx.PROGRESS.streakDays >= 7) b.push('7-Day Streak');
    if (ctx.flashcardsMasteredCount() >= ctx.allConcepts().length && ctx.allConcepts().length > 0) b.push('All Flashcards Mastered');
    if (ctx.CONTENT.learningObjectives.every(l => ctx.loStats(l.id).status === 'Mastered')) b.push('Course Complete');
    const perfectQuiz = ctx.PROGRESS.examHistory.find(e => e.score === e.total && e.total > 0);
    if (perfectQuiz) b.push('Perfect Exam');
    return b;
  };
}
