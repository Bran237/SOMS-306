// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installGames(ctx) {
  ctx.GAME_DEFS = [{
    id: 'matching',
    title: 'Matching Game',
    desc: 'Match terms with their definitions.'
  }, {
    id: 'speed',
    title: 'Speed Round',
    desc: 'Answer quick questions against a timer.'
  }, {
    id: 'whoami',
    title: 'Who Am I?',
    desc: 'Read the clues, guess the concept.'
  }, {
    id: 'fillgap',
    title: 'Fill the Gap',
    desc: 'Complete the key statement or formula.'
  }, {
    id: 'orderit',
    title: 'Order It',
    desc: 'Place steps or stages in the correct order.'
  }, {
    id: 'twotruths',
    title: 'Two Truths and a Trap',
    desc: 'Spot the one incorrect statement.'
  }, {
    id: 'sort',
    title: 'Concept Sort',
    desc: 'Sort each concept into the chapter it belongs to.'
  }, {
    id: 'connections',
    title: 'Concept Connections',
    desc: 'Connect each concept to its most closely related idea.'
  }, {
    id: 'scenario',
    title: 'Scenario Challenge',
    desc: 'Apply concepts to realistic operations-management scenarios.'
  }, {
    id: 'boss',
    title: 'Boss Battle',
    desc: 'A hard, mixed-question final test covering the whole course.'
  }];
  ctx.gameState = {
    type: null
  };
  ctx.viewGames = function viewGames() {
    return `
    <div class="panel-header"><h1>Mini Games</h1></div>
    <div class="grid grid-3">
      ${ctx.GAME_DEFS.map(g => `
        <div class="card clickable" data-action="startGame" data-game="${g.id}">
          <h4>${g.title}</h4>
          <p class="small-muted">${g.desc}</p>
        </div>`).join('')}
    </div>
  `;
  };
  ctx.startGame = function startGame(id) {
    if (ctx.gameState && ctx.gameState.timerId) {
      clearInterval(ctx.gameState.timerId);
    }
    const pool = ctx.allConcepts().filter(c => c.tier === 'must_know');
    if (id === 'matching') {
      const picks = ctx.shuffleArr(pool).slice(0, 6);
      const terms = ctx.shuffleArr(picks.map(c => ({
        id: c.id,
        text: c.term
      })));
      const defs = ctx.shuffleArr(picks.map(c => ({
        id: c.id,
        text: c.definition
      })));
      ctx.gameState = {
        type: 'matching',
        picks,
        terms,
        defs,
        selectedTerm: null,
        matched: [],
        wrong: null
      };
    } else if (id === 'speed') {
      const qs = ctx.shuffleArr(ctx.CONTENT.quiz.filter(q => ['easy', 'medium'].includes(q.difficulty) && (q.type === 'multiple_choice' || q.type === 'true_false'))).slice(0, 10);
      ctx.gameState = {
        type: 'speed',
        qs,
        index: 0,
        score: 0,
        timeLeft: 60,
        timerId: null,
        answered: false
      };
    } else if (id === 'whoami') {
      const items = ctx.shuffleArr(ctx.CONTENT.miniGames.whoAmI.slice());
      ctx.gameState = {
        type: 'whoami',
        items,
        index: 0,
        clueIdx: 0,
        score: 0,
        done: false
      };
    } else if (id === 'fillgap') {
      const items = ctx.shuffleArr(ctx.CONTENT.miniGames.fillTheGap.slice());
      ctx.gameState = {
        type: 'fillgap',
        items,
        index: 0,
        score: 0,
        revealed: false
      };
    } else if (id === 'orderit') {
      const items = ctx.shuffleArr(ctx.CONTENT.miniGames.orderIt.slice());
      ctx.gameState = {
        type: 'orderit',
        items,
        index: 0,
        score: 0,
        current: null,
        built: []
      };
      ctx.setupOrderItRound();
    } else if (id === 'twotruths') {
      const items = ctx.shuffleArr(ctx.CONTENT.quiz.filter(q => q.type === 'two_truths_trap'));
      ctx.gameState = {
        type: 'twotruths',
        items,
        index: 0,
        score: 0,
        answered: false
      };
    } else if (id === 'sort') {
      const items = ctx.shuffleArr(ctx.allConcepts()).slice(0, 10);
      ctx.gameState = {
        type: 'sort',
        items,
        index: 0,
        score: 0,
        answered: false
      };
    } else if (id === 'connections') {
      const pairs = ctx.buildConceptConnections();
      ctx.gameState = {
        type: 'connections',
        pairs,
        index: 0,
        score: 0,
        answered: false
      };
    } else if (id === 'scenario') {
      const items = ctx.shuffleArr(ctx.CONTENT.quiz.filter(q => q.type === 'scenario' || q.type === 'multiple_choice'));
      ctx.gameState = {
        type: 'scenario',
        items: items.slice(0, 8),
        index: 0,
        score: 0,
        answered: false
      };
    } else if (id === 'boss') {
      ctx.startQuiz({
        difficulty: ['hard', 'exam'],
        count: 999
      });
      return;
    }
    ctx.setPracticeTab('games');
  };
  ctx.buildConceptConnections = function buildConceptConnections() {
    const CURATED = ctx.CONTENT.miniGames.connections || [];
    const all = ctx.allConcepts();
    return CURATED.map(([aId, bId]) => {
      const a = ctx.getConcept(aId),
        b = ctx.getConcept(bId);
      if (!a || !b) return null;
      const distractors = ctx.shuffleArr(all.filter(c => c.id !== aId && c.id !== bId)).slice(0, 3).map(c => c.term);
      return {
        a,
        correct: b.term,
        options: ctx.shuffleArr([b.term, ...distractors])
      };
    }).filter(Boolean);
  };
  ctx.setupOrderItRound = function setupOrderItRound() {
    const item = ctx.gameState.items[ctx.gameState.index];
    if (!item) return;
    ctx.gameState.current = {
      correct: item.steps,
      shuffled: ctx.shuffleArr(item.steps)
    };
    ctx.gameState.built = [];
  };
  ctx.viewGamePlay = function viewGamePlay(id) {
    const g = ctx.gameState;
    if (!g || g.type !== id) return `<div class="empty-state">Game session not found. <button class="btn small" data-action="nav" data-route="games">Back to Games</button></div>`;
    switch (id) {
      case 'matching':
        return ctx.gameMatchingHTML();
      case 'speed':
        return ctx.gameSpeedHTML();
      case 'whoami':
        return ctx.gameWhoAmIHTML();
      case 'fillgap':
        return ctx.gameFillGapHTML();
      case 'orderit':
        return ctx.gameOrderItHTML();
      case 'twotruths':
        return ctx.gameTwoTruthsHTML();
      case 'sort':
        return ctx.gameSortHTML();
      case 'connections':
        return ctx.gameConnectionsHTML();
      case 'scenario':
        return ctx.gameScenarioHTML();
      default:
        return `<div class="empty-state">Unknown game.</div>`;
    }
  };
  ctx.gameHeader = function gameHeader(title) {
    return `<div class="panel-header"><h1>${title}</h1><button class="icon-btn" data-action="nav" data-route="games">&larr; Games</button></div>`;
  };
  ctx.gameMatchingHTML = function gameMatchingHTML() {
    const g = ctx.gameState;
    const allMatched = g.matched.length === g.picks.length;
    return ctx.gameHeader('Matching Game') + `
    <p class="small-muted">Click a term, then click its matching definition.</p>
    <div class="grid grid-2">
      <div>${g.terms.map(t => `<button class="opt-btn ${g.matched.includes(t.id) ? 'correct' : ''} ${g.selectedTerm === t.id ? 'incorrect' : ''}" ${g.matched.includes(t.id) ? 'disabled' : ''} data-action="matchSelectTerm" data-id="${t.id}">${t.text}</button>`).join('')}</div>
      <div>${g.defs.map(d => `<button class="opt-btn ${g.matched.includes(d.id) ? 'correct' : ''}" ${g.matched.includes(d.id) ? 'disabled' : ''} data-action="matchSelectDef" data-id="${d.id}">${d.text}</button>`).join('')}</div>
    </div>
    ${allMatched ? `<div class="card" style="margin-top:14px; background:var(--good-bg);"><b>All matched! Nice work.</b></div>` : ''}
    <div class="small-muted" style="margin-top:10px;">Matched ${g.matched.length}/${g.picks.length}</div>
  `;
  };
  ctx.gameSpeedHTML = function gameSpeedHTML() {
    const g = ctx.gameState;
    const q = g.qs[g.index];
    if (!q) return ctx.gameHeader('Speed Round') + `<div class="card"><b>Final score: ${g.score}/${g.qs.length}</b></div>`;
    return ctx.gameHeader('Speed Round') + `
    <div class="flex-between"><span class="timer-display">&#9203; ${g.timeLeft}s</span><span class="mono small-muted">${g.index + 1}/${g.qs.length} &middot; Score ${g.score}</span></div>
    <div class="quiz-card" style="margin-top:12px;">
      <h3>${q.prompt}</h3>
      <div id="speed-answer-zone">
        ${q.type === 'true_false' ? `<button class="opt-btn" data-action="speedAnswer" data-val="true">True</button><button class="opt-btn" data-action="speedAnswer" data-val="false">False</button>` : q.options.map((o, i) => `<button class="opt-btn" data-action="speedAnswer" data-idx="${i}">${o}</button>`).join('')}
      </div>
    </div>
  `;
  };
  ctx.gameWhoAmIHTML = function gameWhoAmIHTML() {
    const g = ctx.gameState;
    const item = g.items[g.index];
    if (!item) return ctx.gameHeader('Who Am I?') + `<div class="card"><b>Final score: ${g.score}/${g.items.length}</b></div>`;
    return ctx.gameHeader('Who Am I?') + `
    <div class="mono small-muted">${g.index + 1}/${g.items.length} &middot; Score ${g.score}</div>
    <div class="card" style="max-width:560px;">
      ${item.clues.slice(0, g.clueIdx + 1).map((c, i) => `<p>Clue ${i + 1}: ${c}</p>`).join('')}
      ${g.clueIdx < item.clues.length - 1 ? `<button class="btn small secondary" data-action="waiNextClue">Next Clue</button>` : ''}
      <input type="text" id="wai-guess" placeholder="Your guess..." style="margin-top:10px;">
      <button class="btn small" style="margin-top:8px;" data-action="waiGuess">Submit Guess</button>
      <div id="wai-feedback"></div>
    </div>
  `;
  };
  ctx.gameFillGapHTML = function gameFillGapHTML() {
    const g = ctx.gameState;
    const item = g.items[g.index];
    if (!item) return ctx.gameHeader('Fill the Gap') + `<div class="card"><b>Final score: ${g.score}/${g.items.length}</b></div>`;
    return ctx.gameHeader('Fill the Gap') + `
    <div class="mono small-muted">${g.index + 1}/${g.items.length} &middot; Score ${g.score}</div>
    <div class="card" style="max-width:560px;">
      <p style="font-size:1.05rem;">${item.text}</p>
      <input type="text" id="ftg-guess" placeholder="Fill in the blank...">
      <button class="btn small" style="margin-top:8px;" data-action="ftgGuess">Submit</button>
      <div id="ftg-feedback"></div>
    </div>
  `;
  };
  ctx.gameOrderItHTML = function gameOrderItHTML() {
    const g = ctx.gameState;
    const item = g.items[g.index];
    if (!item) return ctx.gameHeader('Order It') + `<div class="card"><b>Final score: ${g.score}/${g.items.length}</b></div>`;
    const remaining = g.current.shuffled.filter(s => !g.built.includes(s));
    return ctx.gameHeader('Order It') + `
    <div class="mono small-muted">${g.index + 1}/${g.items.length} &middot; Score ${g.score}</div>
    <div class="card" style="max-width:560px;">
      <p><b>${item.title}</b></p>
      <div class="small-muted">Your sequence:</div>
      <ol>${g.built.map(s => `<li>${s}</li>`).join('')}</ol>
      <div class="wrap-row">${remaining.map(s => `<button class="btn small secondary" data-action="oiPick" data-step="${encodeURIComponent(s)}">${s}</button>`).join('')}</div>
      ${g.built.length === item.steps.length ? `<button class="btn small" style="margin-top:10px;" data-action="oiCheck">Check Order</button>` : ''}
      <div id="oi-feedback"></div>
    </div>
  `;
  };
  ctx.gameTwoTruthsHTML = function gameTwoTruthsHTML() {
    const g = ctx.gameState;
    const q = g.items[g.index];
    if (!q) return ctx.gameHeader('Two Truths and a Trap') + `<div class="card"><b>Final score: ${g.score}/${g.items.length}</b></div>`;
    return ctx.gameHeader('Two Truths and a Trap') + `
    <div class="mono small-muted">${g.index + 1}/${g.items.length} &middot; Score ${g.score}</div>
    <div class="quiz-card">
      <p>${q.prompt}</p>
      ${q.options.map((o, i) => `<button class="opt-btn" data-action="ttAnswer" data-idx="${i}">${o}</button>`).join('')}
      <div id="tt-feedback"></div>
    </div>
  `;
  };
  ctx.gameSortHTML = function gameSortHTML() {
    const g = ctx.gameState;
    const item = g.items[g.index];
    if (!item) return ctx.gameHeader('Concept Sort') + `<div class="card"><b>Final score: ${g.score}/${g.items.length}</b></div>`;
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    return ctx.gameHeader('Concept Sort') + `
    <div class="mono small-muted">${g.index + 1}/${g.items.length} &middot; Score ${g.score}</div>
    <div class="card" style="max-width:560px;">
      <p>Which chapter does <b>${item.term}</b> belong to?</p>
      <div class="wrap-row">${chapters.map(ch => `<button class="btn small secondary" data-action="sortPick" data-val="${ch.id}">Ch. ${ch.number}: ${ch.title}</button>`).join('')}</div>
      <div id="sort-feedback"></div>
    </div>
  `;
  };
  ctx.gameConnectionsHTML = function gameConnectionsHTML() {
    const g = ctx.gameState;
    const p = g.pairs[g.index];
    if (!p) return ctx.gameHeader('Concept Connections') + `<div class="card"><b>Final score: ${g.score}/${g.pairs.length}</b></div>`;
    return ctx.gameHeader('Concept Connections') + `
    <div class="mono small-muted">${g.index + 1}/${g.pairs.length} &middot; Score ${g.score}</div>
    <div class="card" style="max-width:560px;">
      <p>Which concept is most closely connected to <b>${p.a.term}</b>?</p>
      ${p.options.map((o, i) => `<button class="opt-btn" data-action="connAnswer" data-idx="${i}">${o}</button>`).join('')}
      <div id="conn-feedback"></div>
    </div>
  `;
  };
  ctx.gameScenarioHTML = function gameScenarioHTML() {
    const g = ctx.gameState;
    const q = g.items[g.index];
    if (!q) return ctx.gameHeader('Scenario Challenge') + `<div class="card"><b>Final score: ${g.score}/${g.items.length}</b></div>`;
    return ctx.gameHeader('Scenario Challenge') + `
    <div class="mono small-muted">${g.index + 1}/${g.items.length} &middot; Score ${g.score}</div>
    <div class="quiz-card">
      <p>${q.prompt}</p>
      ${q.options.map((o, i) => `<button class="opt-btn" data-action="scenAnswer" data-idx="${i}">${o}</button>`).join('')}
      <div id="scen-feedback"></div>
    </div>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    startGame(el) {
      ctx.startGame(el.dataset.game);
    },
    matchSelectTerm(el) {
      const g = ctx.gameState;
      const id = el.dataset.id;
      if (g.matched.includes(id)) return;
      g.selectedTerm = id;
      ctx.render();
    },
    matchSelectDef(el) {
      const g = ctx.gameState;
      const id = el.dataset.id;
      if (!g.selectedTerm || g.matched.includes(id)) return;
      if (g.selectedTerm === id) {
        g.matched.push(id);
        ctx.addXP(5);
      }
      g.selectedTerm = null;
      ctx.render();
      if (g.matched.length === g.picks.length) ctx.toast('Matching game complete!');
    },
    speedAnswer(el) {
      const g = ctx.gameState;
      const q = g.qs[g.index];
      let correct;
      if (q.type === 'true_false') correct = el.dataset.val === 'true' === q.correctAnswer;else correct = parseInt(el.dataset.idx, 10) === q.correctIndex;
      if (correct) g.score++;
      g.index++;
      ctx.render();
      if (!g.qs[g.index]) ctx.stopSpeedTimer();
    },
    waiNextClue() {
      ctx.gameState.clueIdx++;
      ctx.render();
    },
    waiGuess() {
      const g = ctx.gameState;
      const item = g.items[g.index];
      const val = (ctx.dom.getElementById('wai-guess').value || '').trim().toLowerCase();
      const correct = val === item.answer.toLowerCase();
      ctx.dom.getElementById('wai-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${correct ? 'Correct!' : 'Not quite — it was: ' + item.answer}</p>`;
      if (correct) g.score++;
      g.index++;
      g.clueIdx = 0;
      setTimeout(ctx.render, 900);
    },
    ftgGuess() {
      const g = ctx.gameState;
      const item = g.items[g.index];
      const val = (ctx.dom.getElementById('ftg-guess').value || '').trim().toLowerCase();
      const correct = val === item.answer.toLowerCase();
      ctx.dom.getElementById('ftg-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${correct ? 'Correct!' : 'Answer: ' + item.answer}</p>`;
      if (correct) g.score++;
      g.index++;
      setTimeout(ctx.render, 900);
    },
    oiPick(el) {
      ctx.gameState.built.push(decodeURIComponent(el.dataset.step));
      ctx.render();
    },
    oiCheck() {
      const g = ctx.gameState;
      const item = g.items[g.index];
      const correct = JSON.stringify(g.built) === JSON.stringify(item.steps);
      ctx.dom.getElementById('oi-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${correct ? 'Correct order!' : 'Not quite — correct order: ' + item.steps.join(' → ')}</p>`;
      if (correct) g.score++;
      g.index++;
      setTimeout(() => {
        ctx.setupOrderItRound();
        ctx.render();
      }, 1200);
    },
    ttAnswer(el) {
      const g = ctx.gameState;
      const q = g.items[g.index];
      const correct = parseInt(el.dataset.idx, 10) === q.correctIndex;
      ctx.dom.getElementById('tt-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${q.explanation}</p>`;
      if (correct) g.score++;
      g.index++;
      setTimeout(ctx.render, 1400);
    },
    sortPick(el) {
      const g = ctx.gameState;
      const item = g.items[g.index];
      const correct = el.dataset.val === item.chapterId;
      ctx.dom.getElementById('sort-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${correct ? 'Correct!' : 'It belongs to ' + ctx.CONTENT.chapters[item.chapterId].title}</p>`;
      if (correct) g.score++;
      g.index++;
      setTimeout(ctx.render, 900);
    },
    connAnswer(el) {
      const g = ctx.gameState;
      const p = g.pairs[g.index];
      const correct = p.options[parseInt(el.dataset.idx, 10)] === p.correct;
      ctx.dom.getElementById('conn-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${correct ? 'Correct!' : 'Best connection: ' + p.correct}</p>`;
      if (correct) g.score++;
      g.index++;
      setTimeout(ctx.render, 1100);
    },
    scenAnswer(el) {
      const g = ctx.gameState;
      const q = g.items[g.index];
      const correct = parseInt(el.dataset.idx, 10) === q.correctIndex;
      ctx.dom.getElementById('scen-feedback').innerHTML = `<p style="color:${correct ? 'var(--good)' : 'var(--bad)'};">${q.explanation}</p>`;
      if (correct) g.score++;
      g.index++;
      setTimeout(ctx.render, 1600);
    }
  });
}
