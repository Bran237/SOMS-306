// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installQuiz(ctx) {
  ctx.quizState = {
    phase: 'setup',
    questions: [],
    index: 0,
    answers: [],
    answered: false,
    config: null,
    startTs: null
  };
  ctx.startQuiz = function startQuiz(config) {
    let qs = ctx.quizForScope(config);
    qs = ctx.shuffleArr(qs).slice(0, config.count || qs.length);
    ctx.quizState = {
      phase: 'active',
      questions: qs,
      index: 0,
      answers: [],
      answered: false,
      config,
      startTs: Date.now()
    };
    ctx.navigate('quiz');
  };
  ctx.viewQuiz = function viewQuiz() {
    if (ctx.quizState.phase === 'setup') return ctx.quizSetupHTML();
    if (ctx.quizState.phase === 'active') return ctx.quizActiveHTML();
    if (ctx.quizState.phase === 'results') return ctx.quizResultsHTML();
    return ctx.quizSetupHTML();
  };
  ctx.quizSetupHTML = function quizSetupHTML() {
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    const los = ctx.CONTENT.learningObjectives;
    return `
    <div class="panel-header"><h1>Quiz Mode</h1></div>
    <div class="card" style="max-width:560px;">
      <label>Scope</label>
      <select id="qs-scope">
        ${chapters.map(ch => `<option value="chapter:${ch.id}"${ch.id === ctx.chapterId ? ' selected' : ''}>Chapter ${ch.number} Test</option>`).join('')}
        ${los.map(l => `<option value="lo:${l.code}">Learning Objective Test — LO ${l.code}</option>`).join('')}
        <option value="weak">Weak Areas Test</option>
        <option value="cumulative">Cumulative Exam (all chapters)</option>
      </select>
      <div class="divider"></div>
      <label>Number of Questions</label>
      <select id="qs-count">
        <option value="5">5 Questions</option>
        <option value="10" selected>10 Questions</option>
        <option value="20">20 Questions</option>
        <option value="999">Full Set</option>
      </select>
      <div class="divider"></div>
      <label>Difficulty</label>
      <div class="wrap-row" id="qs-diff">
        ${['easy', 'medium', 'hard', 'exam'].map(d => `<label class="pill-btn" style="cursor:pointer;"><input type="checkbox" value="${d}" checked style="margin-right:5px;">${d}</label>`).join('')}
      </div>
      <div class="divider"></div>
      <button class="btn" data-action="quizBegin">Start Quiz &rarr;</button>
    </div>
  `;
  };
  ctx.readScopedConfig = function readScopedConfig(scopeVal, extra) {
    let config = Object.assign({}, extra);
    if (scopeVal.startsWith('chapter:')) config.chapterId = scopeVal.split(':')[1];else if (scopeVal.startsWith('lo:')) config.loCode = scopeVal.split(':')[1];else if (scopeVal === 'weak') config.conceptIds = ctx.weakConceptsList(1).map(w => w.c.id);
    return config;
  };
  ctx.readQuizConfigFromForm = function readQuizConfigFromForm() {
    const scope = ctx.dom.getElementById('qs-scope').value;
    const count = parseInt(ctx.dom.getElementById('qs-count').value, 10);
    const diffs = Array.from(ctx.dom.querySelectorAll('#qs-diff input:checked')).map(i => i.value);
    return ctx.readScopedConfig(scope, {
      count,
      difficulty: diffs
    });
  };
  ctx.quizActiveHTML = function quizActiveHTML() {
    const q = ctx.quizState.questions[ctx.quizState.index];
    if (!q) {
      ctx.quizState.phase = 'results';
      return ctx.quizResultsHTML();
    }
    const progressPct = Math.round(100 * ctx.quizState.index / ctx.quizState.questions.length);
    return `
    <div class="panel-header"><h1>Quiz</h1><span class="mono small-muted">Q ${ctx.quizState.index + 1}/${ctx.quizState.questions.length} &middot; Score ${ctx.quizState.answers.filter(a => a.correct).length}/${ctx.quizState.answers.length}</span></div>
    <div class="progress-bar" style="margin-bottom:16px;"><div style="width:${progressPct}%"></div></div>
    <div class="quiz-card">
      <div class="wrap-row" style="margin-bottom:10px;">
        <span class="lo-chip" style="background:${ctx.loTint(q.lo)};color:${ctx.loColor(q.lo)};">LO ${q.lo}</span>
        <span class="badge badge-status-notstarted">${q.difficulty}</span>
        <span class="badge badge-status-notstarted">${q.type.replace('_', ' ')}</span>
      </div>
      <h3 style="font-size:1.15rem;">${q.prompt}</h3>
      <div id="quiz-answer-zone">${ctx.quizAnswerZoneHTML(q)}</div>
      <div id="quiz-feedback"></div>
      <div class="flex-between" style="margin-top:16px;">
        <button class="btn ghost small" id="quiz-next-btn" style="display:none;" data-action="quizNext">Next Question &rarr;</button>
      </div>
    </div>
  `;
  };
  ctx.quizAnswerZoneHTML = function quizAnswerZoneHTML(q) {
    if (q.type === 'multiple_choice' || q.type === 'scenario' || q.type === 'two_truths_trap') {
      return q.options.map((opt, i) => `<button class="opt-btn" data-action="quizAnswerMC" data-idx="${i}">${opt}</button>`).join('');
    }
    if (q.type === 'true_false') {
      return `<button class="opt-btn" data-action="quizAnswerTF" data-val="true">True</button>
            <button class="opt-btn" data-action="quizAnswerTF" data-val="false">False</button>`;
    }
    if (q.type === 'fill_blank') {
      return `<input type="text" id="quiz-fill-input" placeholder="Type your answer...">
            <button class="btn small" style="margin-top:10px;" data-action="quizAnswerFill">Submit</button>`;
    }
    if (q.type === 'matching') {
      return q.pairs.map((p, i) => `
      <div class="match-row">
        <span style="min-width:180px;">${p.left}</span>
        <select id="quiz-match-${i}">
          <option value="">— choose —</option>
          ${ctx.shuffleArr(q.pairs.map((pp, pi) => pi)).map(pi => `<option value="${pi}">${q.pairs[pi].right}</option>`).join('')}
        </select>
      </div>`).join('') + `<button class="btn small" style="margin-top:6px;" data-action="quizAnswerMatch">Submit Matches</button>`;
    }
    return '<p class="small-muted">Unsupported question type.</p>';
  };
  ctx.recordQuizAnswer = function recordQuizAnswer(q, correct) {
    ctx.quizState.answers.push({
      qId: q.id,
      correct
    });
    ctx.PROGRESS.quizAttempts.push({
      ts: Date.now(),
      conceptId: q.concept,
      correct,
      difficulty: q.difficulty,
      lo: q.lo,
      mode: 'quiz'
    });
    ctx.saveProgress();
    ctx.addXP(correct ? 10 : 2);
    ctx.quizState.answered = true;
    ctx.renderQuizFeedback(q, correct);
  };
  ctx.renderQuizFeedback = function renderQuizFeedback(q, correct) {
    const fb = ctx.dom.getElementById('quiz-feedback');
    if (fb) {
      fb.innerHTML = `
      <div class="card" style="margin-top:14px; background:${correct ? 'var(--good-bg)' : 'var(--bad-bg)'};">
        <b>${correct ? 'Correct!' : 'Incorrect.'}</b>
        <p style="margin:8px 0 4px;">${q.explanation}</p>
        <p class="small-muted">Concept: ${ctx.getConcept(q.concept) ? ctx.getConcept(q.concept).term : '—'} &middot; LO ${q.lo} &middot; Difficulty: ${q.difficulty}</p>
      </div>`;
    }
    ctx.dom.getElementById('quiz-next-btn').style.display = 'inline-block';
    ctx.dom.querySelectorAll('#quiz-answer-zone .opt-btn').forEach(b => b.disabled = true);
  };
  ctx.quizResultsHTML = function quizResultsHTML() {
    const answers = ctx.quizState.answers;
    const total = answers.length;
    const correct = answers.filter(a => a.correct).length;
    const byLO = {};
    ctx.quizState.questions.forEach((q, i) => {
      byLO[q.lo] = byLO[q.lo] || {
        correct: 0,
        total: 0
      };
      byLO[q.lo].total++;
      if (answers[i] && answers[i].correct) byLO[q.lo].correct++;
    });
    return `
    <div class="panel-header"><h1>Quiz Results</h1></div>
    <div class="card" style="text-align:center; margin-bottom:20px;">
      <div class="stat-value" style="font-size:2.6rem;">${correct}/${total}</div>
      <div class="small-muted">${total ? Math.round(100 * correct / total) : 0}% correct</div>
    </div>
    <h3>Performance by Learning Objective</h3>
    <div class="grid grid-3" style="margin-bottom:20px;">
      ${Object.keys(byLO).sort().map(lo => `
        <div class="card" style="border-color:${ctx.loColor(lo)};">
          <div class="mono small-muted">LO ${lo}</div>
          <b>${byLO[lo].correct}/${byLO[lo].total}</b>
        </div>`).join('')}
    </div>
    <div class="wrap-row">
      <button class="btn" data-action="quizRestart">New Quiz</button>
      <button class="btn secondary" data-action="nav" data-route="weak-areas">Review Weak Areas</button>
      <button class="btn ghost" data-action="nav" data-route="dashboard">Back to Dashboard</button>
    </div>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    quizBegin() {
      ctx.startQuiz(ctx.readQuizConfigFromForm());
    },
    quizAnswerMC(el) {
      if (ctx.quizState.answered) return;
      const q = ctx.quizState.questions[ctx.quizState.index];
      const idx = parseInt(el.dataset.idx, 10);
      const correct = idx === q.correctIndex;
      ctx.dom.querySelectorAll('#quiz-answer-zone .opt-btn').forEach((b, i) => {
        if (i === q.correctIndex) b.classList.add('correct');else if (i === idx) b.classList.add('incorrect');
      });
      ctx.recordQuizAnswer(q, correct);
    },
    quizAnswerTF(el) {
      if (ctx.quizState.answered) return;
      const q = ctx.quizState.questions[ctx.quizState.index];
      const val = el.dataset.val === 'true';
      const correct = val === q.correctAnswer;
      el.classList.add(correct ? 'correct' : 'incorrect');
      ctx.recordQuizAnswer(q, correct);
    },
    quizAnswerFill() {
      if (ctx.quizState.answered) return;
      const q = ctx.quizState.questions[ctx.quizState.index];
      const input = ctx.dom.getElementById('quiz-fill-input');
      const val = (input.value || '').trim().toLowerCase();
      const accepted = (q.acceptableAnswers || [q.correctAnswer]).map(a => a.toLowerCase());
      const correct = accepted.includes(val);
      input.disabled = true;
      ctx.recordQuizAnswer(q, correct);
    },
    quizAnswerMatch() {
      if (ctx.quizState.answered) return;
      const q = ctx.quizState.questions[ctx.quizState.index];
      let allCorrect = true;
      q.pairs.forEach((p, i) => {
        const sel = ctx.dom.getElementById('quiz-match-' + i);
        if (parseInt(sel.value, 10) !== i) allCorrect = false;
        sel.disabled = true;
      });
      ctx.recordQuizAnswer(q, allCorrect);
    },
    quizNext() {
      ctx.quizState.index++;
      ctx.quizState.answered = false;
      if (ctx.quizState.index >= ctx.quizState.questions.length) ctx.quizState.phase = 'results';
      ctx.render();
    },
    quizRestart() {
      ctx.quizState = {
        phase: 'setup',
        questions: [],
        index: 0,
        answers: [],
        answered: false,
        config: null
      };
      ctx.render();
    }
  });
}
