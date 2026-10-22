// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installMatching(ctx) {
  ctx.shuffleArr = function shuffleArr(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  ctx.matchGame = {
    round: 0,
    matched: 0,
    selectedKey: null,
    rounds: []
  };
  ctx.initMatchGame = function initMatchGame() {
    const pool = ctx.pickSpreadConcepts(18);
    const rounds = [];
    for (let i = 0; i < pool.length; i += 6) rounds.push(pool.slice(i, i + 6));
    ctx.matchGame = {
      round: 0,
      matched: 0,
      selectedKey: null,
      rounds
    };
    ctx._matchedKeys = [];
  };
  ctx.pickSpreadConcepts = function pickSpreadConcepts(max) {
    const bySection = {};
    const order = [];
    ctx.allConcepts().forEach(c => {
      if (!bySection[c.section]) {
        bySection[c.section] = [];
        order.push(c.section);
      }
      bySection[c.section].push(c);
    });
    const pool = [];
    let idx = 0,
      more = true;
    while (pool.length < max && more) {
      more = false;
      for (const sec of order) {
        const arr = bySection[sec];
        if (arr[idx]) {
          pool.push(arr[idx]);
          more = true;
          if (pool.length >= max) break;
        }
      }
      idx++;
    }
    return ctx.shuffleArr(pool).slice(0, max);
  };
  ctx.viewMatchGame = function viewMatchGame() {
    if (!ctx.matchGame.rounds.length) ctx.initMatchGame();
    const roundConcepts = ctx.matchGame.rounds[ctx.matchGame.round];
    if (!roundConcepts) return '<div class="empty-state">Round data missing. <button class="btn small" data-action="matchRestart">Restart</button></div>';
    if (!ctx.matchGame._terms || ctx.matchGame._roundKey !== ctx.matchGame.round) {
      ctx._matchedKeys = [];
      const terms = roundConcepts.map((c, i) => ({
        key: 't' + i,
        text: c.term
      }));
      const defs = roundConcepts.map((c, i) => ({
        key: 't' + i,
        text: c.definition
      }));
      ctx.matchGame._terms = ctx.shuffleArr(terms);
      ctx.matchGame._defs = ctx.shuffleArr(defs);
      ctx.matchGame._roundKey = ctx.matchGame.round;
      ctx.matchGame.matched = 0;
      ctx.matchGame.selectedKey = null;
    }
    return `
    <div class="match-head"><span>Round ${ctx.matchGame.round + 1} of ${ctx.matchGame.rounds.length}</span><span>Matched ${ctx.matchGame.matched} / ${roundConcepts.length}</span></div>
    <div class="match-grid">
      <div>${ctx.matchGame._terms.map(t => `<button class="match-cell term-cell ${ctx._matchedKeys.includes(t.key) ? 'correct' : ''} ${ctx.matchGame.selectedKey === t.key ? 'selected' : ''}" ${ctx._matchedKeys.includes(t.key) ? 'disabled' : ''} data-action="matchTerm" data-key="${t.key}">${t.text}</button>`).join('')}</div>
      <div>${ctx.matchGame._defs.map(d => `<button class="match-cell ${ctx._matchedKeys.includes(d.key) ? 'correct' : ''}" ${ctx._matchedKeys.includes(d.key) ? 'disabled' : ''} data-action="matchDef" data-key="${d.key}">${d.text}</button>`).join('')}</div>
    </div>
    <div id="matchFooter" style="text-align:center;margin-top:16px;"></div>
  `;
  };
  ctx._matchedKeys = [];
  Object.assign(ctx.ACTIONS, {
    matchTerm(el) {
      if (ctx._matchedKeys.includes(el.dataset.key)) return;
      ctx.matchGame.selectedKey = el.dataset.key;
      ctx.render();
    },
    matchDef(el) {
      if (!ctx.matchGame.selectedKey || ctx._matchedKeys.includes(el.dataset.key)) return;
      if (ctx.matchGame.selectedKey === el.dataset.key) {
        ctx._matchedKeys.push(el.dataset.key);
        ctx.matchGame.matched++;
        ctx.addXP(5);
        ctx.matchGame.selectedKey = null;
        ctx.render();
        const total = ctx.matchGame.rounds[ctx.matchGame.round].length;
        if (ctx.matchGame.matched === total) {
          const isLast = ctx.matchGame.round === ctx.matchGame.rounds.length - 1;
          setTimeout(() => {
            const footer = ctx.dom.getElementById('matchFooter');
            if (footer) footer.innerHTML = `<p style="font-family:var(--font-head);font-weight:700;font-size:16px;">${isLast ? 'All terms matched!' : 'Round complete!'}</p>
            <button class="btn small" data-action="matchNext" data-last="${isLast ? 1 : 0}">${isLast ? 'Play again' : 'Continue'}</button>`;
          }, 50);
        }
      } else {
        ctx.matchGame.selectedKey = null;
        ctx.render();
      }
    },
    matchNext(el) {
      if (el.dataset.last === '1') {
        ctx.initMatchGame();
      } else {
        ctx.matchGame.round++;
        ctx.matchGame._terms = null;
        ctx._matchedKeys = [];
      }
      ctx.render();
    },
    matchRestart() {
      ctx.initMatchGame();
      ctx.render();
    }
  });
}
