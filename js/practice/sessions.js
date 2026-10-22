// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installSessions(ctx) {
  ctx.viewWeakAreas = function viewWeakAreas() {
    const weak = ctx.weakConceptsList(1);
    return `
    <div class="panel-header"><h1>Weak Areas</h1></div>
    ${weak.length ? `
      <div class="grid grid-2">
        ${weak.map((w, i) => `
          <div class="card">
            <div class="flex-between"><b>${i + 1}. ${w.c.term}</b><span class="mono" style="color:var(--bad);">${w.stat.accuracy}%</span></div>
            <div class="small-muted">${w.stat.correct}/${w.stat.attempts} correct &middot; LO ${w.c.section}</div>
          </div>`).join('')}
      </div>
      <button class="btn" style="margin-top:18px;" data-action="practiceWeak">Practice My Weak Areas &rarr;</button>
    ` : '<p class="empty-state">No weak areas detected yet — take some quizzes first!</p>'}
  `;
  };
  ctx.sessionState = {
    phase: 'setup',
    plan: [],
    index: 0,
    minutes: 0
  };
  ctx.viewStudySession = function viewStudySession() {
    if (ctx.sessionState.phase === 'setup') return ctx.sessionSetupHTML();
    if (ctx.sessionState.phase === 'running') return ctx.sessionRunningHTML();
    return ctx.sessionSetupHTML();
  };
  ctx.sessionSetupHTML = function sessionSetupHTML() {
    return `
    <div class="panel-header"><h1>Study Session Generator</h1></div>
    <div class="card" style="max-width:500px;">
      <p>Choose how much time you have — we'll build a mixed session for you.</p>
      <div class="wrap-row">
        ${[10, 20, 30, 45, 60].map(m => `<button class="pill-btn" data-action="buildSession" data-min="${m}">${m} min</button>`).join('')}
      </div>
    </div>
  `;
  };
  ctx.buildSessionPlan = function buildSessionPlan(minutes) {
    const plan = [];
    const alloc = pct => Math.max(2, Math.round(minutes * pct));
    plan.push({
      label: 'Review weak concepts',
      minutes: alloc(0.2),
      action: 'weak'
    });
    plan.push({
      label: 'Flashcards',
      minutes: alloc(0.2),
      action: 'flash'
    });
    plan.push({
      label: 'Quiz questions',
      minutes: alloc(0.3),
      action: 'quiz'
    });
    plan.push({
      label: 'Mini-game',
      minutes: alloc(0.15),
      action: 'game'
    });
    plan.push({
      label: 'Active recall',
      minutes: alloc(0.15),
      action: 'recall'
    });
    return plan;
  };
  ctx.sessionRunningHTML = function sessionRunningHTML() {
    const step = ctx.sessionState.plan[ctx.sessionState.index];
    if (!step) {
      return `<div class="panel-header"><h1>Session Complete</h1></div><div class="card"><b>Nice work — you completed your ${ctx.sessionState.minutes}-minute study session!</b></div>
      <button class="btn" style="margin-top:14px;" data-action="nav" data-route="dashboard">Back to Dashboard</button>`;
    }
    return `
    <div class="panel-header"><h1>${ctx.sessionState.minutes}-Minute Study Session</h1></div>
    <div class="card" style="max-width:520px;">
      <div class="mono small-muted">STEP ${ctx.sessionState.index + 1} / ${ctx.sessionState.plan.length}</div>
      <h3>${step.label} <span class="small-muted">(~${step.minutes} min)</span></h3>
      <p class="small-muted">Go complete this activity, then come back and click "Done, Next Step."</p>
      <div class="wrap-row" style="margin-top:10px;">
        <button class="btn small" data-action="sessionGo" data-target="${step.action}">Go to Activity</button>
        <button class="btn small secondary" data-action="sessionNextStep">Done, Next Step &rarr;</button>
      </div>
    </div>
    <ol style="margin-top:16px;">
      ${ctx.sessionState.plan.map((s, i) => `<li style="${i === ctx.sessionState.index ? 'font-weight:700;' : i < ctx.sessionState.index ? 'color:var(--ink-soft);text-decoration:line-through;' : ''}">${s.label} (~${s.minutes} min)</li>`).join('')}
    </ol>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    buildSession(el) {
      const min = parseInt(el.dataset.min, 10);
      ctx.sessionState = {
        phase: 'running',
        plan: ctx.buildSessionPlan(min),
        index: 0,
        minutes: min
      };
      ctx.render();
    },
    sessionGo(el) {
      const map = {
        weak: 'weak-areas',
        flash: 'flashcards',
        quiz: 'quiz',
        game: 'games',
        recall: 'active-recall'
      };
      ctx.navigate(map[el.dataset.target] || 'dashboard');
    },
    sessionNextStep() {
      ctx.logStudyMinutes(ctx.sessionState.plan[ctx.sessionState.index].minutes);
      ctx.sessionState.index++;
      ctx.navigate('study-session');
    }
  });
}
