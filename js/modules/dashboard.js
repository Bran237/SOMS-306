// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installDashboard(ctx) {
  ctx.renderWeeklyGoalCard = function renderWeeklyGoalCard() {
    const goal = ctx.ensureWeeklyGoal();
    const ch = ctx.CONTENT.chapters[goal.chapterId];
    const p = ctx.chapterFlowProgress(goal.chapterId);
    const daysLeft = ctx.daysLeftInWeek();
    const onTrack = p.complete;
    const notifOn = 'Notification' in window && Notification.permission === 'granted';
    const stageLabel = onTrack ? 'Chapter complete' : {
      reading: 'Reading & Terms',
      flashcards: 'Flashcards',
      quiz: 'Chapter Quiz',
      review: 'Missed Questions',
      complete: 'Chapter complete'
    }[ctx.nextFlowStage(goal.chapterId)];
    return `<div class="card" style="margin-bottom:20px;border-left:4px solid ${onTrack ? 'var(--good)' : 'var(--lo2)'};">
    <div class="flex-between">
      <b>${onTrack ? "This week's goal: done!" : "This week's goal"}</b>
      <span class="mono small-muted">${daysLeft > 0 ? daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left' : 'last day this week'}</span>
    </div>
    <p class="small-muted" style="margin:6px 0 10px;">${onTrack ? `Chapter ${ch.number}: ${ch.title} is 100% complete \u2014 nice work. A new chapter goal will lock in Monday.` : `Finish Chapter ${ch.number}: ${ch.title} before Sunday. Currently at ${p.pct}% \u2014 next up: ${stageLabel}.`}</p>
    <div class="progress-bar"><div style="width:${p.pct}%"></div></div>
    <div class="wrap-row" style="margin-top:12px;">
      <button class="btn secondary small" data-action="nav" data-route="flow" data-param="${ch.id}">${onTrack ? 'Review Chapter' : 'Continue Study Session'} \u2192</button>
      ${!notifOn ? `<button class="btn ghost small" data-action="enableReminders">Enable Daily Reminders</button>` : `<span class="small-muted">&#128276; Daily reminders on</span>`}
    </div>
  </div>`;
  };
  ctx.renderDashboardPanel = function renderDashboardPanel() {
    const panel = ctx.dom.getElementById('modePanelDashboard');
    if (!panel) return;
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    const overall = chapters.length ? Math.round(chapters.reduce((s, ch) => s + ctx.chapterMastery(ch.id), 0) / chapters.length) : 0;
    const allLOs = ctx.CONTENT.learningObjectives;
    const masteredLOs = allLOs.filter(l => ctx.loStats(l.id).status === 'Mastered').length;
    const weak = ctx.weakConceptsList(1).slice(0, 4);
    const totalQ = ctx.PROGRESS.quizAttempts.length;
    const acc = totalQ ? Math.round(100 * ctx.PROGRESS.quizAttempts.filter(a => a.correct).length / totalQ) : null;
    panel.innerHTML = `
    <p class="chapter-kicker">Course overview</p>
    <h1 class="chapter-title">${ctx.CONTENT.course.name} Dashboard</h1>
    <div class="grid grid-4" style="margin-bottom:20px;">
      <div class="card stat-card"><div class="stat-value">${overall}%</div><div class="stat-label">COURSE MASTERY</div></div>
      <div class="card stat-card"><div class="stat-value">${masteredLOs}/${allLOs.length}</div><div class="stat-label">LOS MASTERED</div></div>
      <div class="card stat-card"><div class="stat-value">${acc === null ? '&mdash;' : acc + '%'}</div><div class="stat-label">QUIZ ACCURACY</div></div>
      <div class="card stat-card"><div class="stat-value">${ctx.PROGRESS.streakDays || 0}</div><div class="stat-label">DAY STREAK</div></div>
    </div>
    ${ctx.renderWeeklyGoalCard()}
    <h3 style="margin-bottom:10px;">Chapters</h3>
    <div class="grid grid-2" style="margin-bottom:20px;">
      ${chapters.map(ch => {
      const cp = ctx.chapterFlowProgress(ch.id);
      return `<div class="card clickable" data-action="nav" data-route="flow" data-param="${ch.id}">
          <div class="flex-between"><b>Chapter ${ch.number} &middot; ${ch.title}</b>${cp.complete ? '<span>&#10003;</span>' : ''}</div>
          <div class="progress-bar" style="margin-top:10px;"><div style="width:${cp.pct}%"></div></div>
          <div class="small-muted" style="margin-top:6px;">${cp.complete ? '100% complete' : cp.pct + '% through the study session'} &middot; ${ctx.conceptsForChapter(ch.id).length} concepts &middot; ${ctx.CONTENT.learningObjectives.filter(l => l.chapterId === ch.id).length} LOs</div>
        </div>`;
    }).join('')}
      <div class="card clickable" style="display:flex;align-items:center;justify-content:center;border-style:dashed;" data-action="nav" data-route="settings">
        <span class="small-muted">+ Add the next chapter</span>
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h3>Weakest Concepts</h3>
        ${weak.length ? weak.map(w => `<div class="flex-between" style="padding:7px 0;border-bottom:1px solid var(--rule);"><span>${w.c.term}</span><span class="mono small-muted">${w.stat.accuracy}%</span></div>`).join('') : '<p class="small-muted">No quiz data yet &mdash; take a quiz to see weak spots here.</p>'}
        <button class="btn small" style="margin-top:12px;" data-action="nav" data-route="weak-areas">View all weak areas &rarr;</button>
      </div>
      <div class="card">
        <h3>Recommended Next</h3>
        <ul style="padding-left:18px;font-size:.88rem;line-height:1.6;">${ctx.recommendedSessionItems().map(r => `<li>${r}</li>`).join('')}</ul>
        <button class="btn small" style="margin-top:8px;" data-action="nav" data-route="study-session">Build a study session &rarr;</button>
      </div>
    </div>
    <h3 style="margin:22px 0 10px;">Learning Objectives</h3>
    <div class="grid grid-2">
      ${allLOs.map(lo => {
      const s = ctx.loStats(lo.id);
      return `<div class="card clickable" data-action="jumpLO" data-lo="${lo.id}">
          <div class="flex-between"><span class="mono small-muted">LO ${lo.code}</span><span class="badge badge-status-${ctx.statusClass(s.status)}">${s.status}</span></div>
          <div style="margin:6px 0;font-size:.88rem;">${lo.text}</div>
          <div class="progress-bar"><div style="width:${s.accuracy || 0}%"></div></div>
        </div>`;
    }).join('')}
    </div>
  `;
  };
  ctx.recommendedSessionItems = function recommendedSessionItems() {
    const items = [];
    const weak = ctx.weakConceptsList(1);
    if (weak.length) items.push(`Practice weak areas: ${weak.slice(0, 2).map(w => w.c.term).join(', ')}`);
    const due = ctx.dueConcepts();
    if (due.length) items.push(`${due.length} flashcards due for spaced review`);
    const notStarted = ctx.CONTENT.learningObjectives.filter(l => ctx.loStats(l.id).status === 'Not Started');
    if (notStarted.length) items.push(`Start LO ${notStarted[0].code}: ${notStarted[0].text}`);
    if (!items.length) items.push('Great progress &mdash; try a Boss Battle to test full-course mastery.');
    return items;
  };
}
