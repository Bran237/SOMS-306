// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installRecall(ctx) {
  ctx.arState = {
    queue: [],
    index: 0,
    revealed: false
  };
  ctx.initActiveRecall = function initActiveRecall() {
    ctx.arState = {
      queue: ctx.shuffleArr(ctx.dueConcepts()),
      index: 0,
      revealed: false
    };
  };
  ctx.viewActiveRecall = function viewActiveRecall() {
    if (!ctx.arState.queue.length) ctx.initActiveRecall();
    const c = ctx.arState.queue[ctx.arState.index];
    if (!c) return `<div class="panel-header"><h1>Active Recall</h1></div><div class="empty-state">Session complete — nice work! <br><button class="btn small" style="margin-top:10px;" data-action="arRestart">Start Another Round</button></div>`;
    return `
    <div class="panel-header"><h1>Active Recall</h1><span class="mono small-muted">${ctx.arState.index + 1}/${ctx.arState.queue.length}</span></div>
    <div class="card" style="max-width:600px; margin:0 auto;">
      <span class="lo-chip" style="background:${ctx.loTint(c.section)};color:${ctx.loColor(c.section)};">LO ${c.section}</span>
      <h3 style="margin-top:12px;">What is: <i>${c.term}</i>?</h3>
      <p class="small-muted">Try to recall the definition before revealing.</p>
      <textarea id="ar-answer" placeholder="Type what you remember (optional)..." ${ctx.arState.revealed ? 'disabled' : ''}></textarea>
      ${!ctx.arState.revealed ? `<button class="btn small" style="margin-top:10px;" data-action="arReveal">Reveal Answer</button>` : `
        <div class="card" style="margin-top:12px;">
          <b>${c.definition}</b>
          ${c.plain ? `<p class="small-muted" style="margin-top:6px;">${c.plain}</p>` : ''}
        </div>
        <p style="margin-top:10px;">How did you do?</p>
        <div class="wrap-row">
          <button class="btn small secondary" data-action="arRate" data-rating="didnt" data-id="${c.id}">Didn't Know</button>
          <button class="btn small secondary" data-action="arRate" data-rating="almost" data-id="${c.id}">Almost Knew</button>
          <button class="btn small secondary" data-action="arRate" data-rating="knew" data-id="${c.id}">Knew It</button>
          <button class="btn small secondary" data-action="arRate" data-rating="easy" data-id="${c.id}">Easy</button>
        </div>
      `}
    </div>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    arReveal() {
      ctx.arState.revealed = true;
      ctx.render();
    },
    arRate(el) {
      ctx.rateRecall(el.dataset.id, el.dataset.rating);
      ctx.addXP(el.dataset.rating === 'easy' ? 8 : 4);
      ctx.PROGRESS.quizAttempts.push({
        ts: Date.now(),
        conceptId: el.dataset.id,
        correct: el.dataset.rating !== 'didnt',
        difficulty: 'medium',
        lo: (ctx.getConcept(el.dataset.id) || {}).section,
        mode: 'recall'
      });
      ctx.saveProgress();
      ctx.arState.index++;
      ctx.arState.revealed = false;
      ctx.render();
    },
    arRestart() {
      ctx.initActiveRecall();
      ctx.render();
    }
  });
}
