// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installExam(ctx) {
  ctx.examState = {
    phase: 'setup',
    questions: [],
    index: 0,
    answers: [],
    config: null,
    timerId: null,
    timeLeft: 0
  };
  ctx.viewExam = function viewExam() {
    if (ctx.examState.phase === 'setup') return ctx.examSetupHTML();
    if (ctx.examState.phase === 'active') return ctx.examActiveHTML();
    if (ctx.examState.phase === 'results') return ctx.examResultsHTML();
    return ctx.examSetupHTML();
  };
  ctx.examSetupHTML = function examSetupHTML() {
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    const los = ctx.CONTENT.learningObjectives;
    return `
    <div class="panel-header"><h1>Exam Prep</h1></div>
    <div class="card" style="max-width:560px;">
      <label>Exam Scope</label>
      <select id="ex-scope">
        ${chapters.map(ch => `<option value="chapter:${ch.id}"${ch.id === ctx.chapterId ? ' selected' : ''}>Chapter ${ch.number} Exam</option>`).join('')}
        ${los.map(l => `<option value="lo:${l.code}">Learning Objective Exam — LO ${l.code}</option>`).join('')}
        <option value="weak">Weak Areas Exam</option>
        <option value="cumulative">Cumulative Exam (all chapters)</option>
      </select>
      <div class="divider"></div>
      <label>Number of Questions</label>
      <select id="ex-count"><option value="10">10</option><option value="15" selected>15</option><option value="999">All</option></select>
      <div class="divider"></div>
      <label>Timer</label>
      <select id="ex-timer"><option value="0">Off</option><option value="30" selected>30 seconds / question</option><option value="60">60 seconds / question</option></select>
      <div class="divider"></div>
      <button class="btn" data-action="examBegin">Begin Exam</button>
      <p class="small-muted" style="margin-top:10px;">Answers are hidden until the exam is complete.</p>
    </div>
  `;
  };
  ctx.examActiveHTML = function examActiveHTML() {
    const q = ctx.examState.questions[ctx.examState.index];
    if (!q) {
      ctx.examState.phase = 'results';
      return ctx.examResultsHTML();
    }
    return `
    <div class="panel-header"><h1>Exam in Progress</h1>
      <span class="mono small-muted">Q ${ctx.examState.index + 1}/${ctx.examState.questions.length}${ctx.examState.config.timerSec ? ` &middot; <span id="ex-timer-display">${ctx.examState.timeLeft}s</span>` : ''}</span>
    </div>
    <div class="quiz-card">
      <span class="lo-chip" style="background:${ctx.loTint(q.lo)};color:${ctx.loColor(q.lo)};">LO ${q.lo}</span>
      <h3 style="margin-top:8px;">${q.prompt}</h3>
      <div id="exam-answer-zone">${ctx.examAnswerZoneHTML(q)}</div>
    </div>
  `;
  };
  ctx.examAnswerZoneHTML = function examAnswerZoneHTML(q) {
    if (q.type === 'true_false') return `<button class="opt-btn" data-action="examAnswer" data-question-id="${q.id}" data-val="true">True</button><button class="opt-btn" data-action="examAnswer" data-question-id="${q.id}" data-val="false">False</button>`;
    if (q.type === 'fill_blank') return `<input type="text" id="exam-fill-input" placeholder="Type your answer..."><button class="btn small" style="margin-top:10px;" data-action="examAnswerFill" data-question-id="${q.id}">Submit</button>`;
    if (q.type === 'matching') return q.pairs.map((pair, index) => `<div class="match-row"><label for="exam-match-${index}">${pair.left}</label><select id="exam-match-${index}"><option value="">— choose —</option>${ctx.shuffleArr(q.pairs.map((_,i) => i)).map(i => `<option value="${i}">${q.pairs[i].right}</option>`).join('')}</select></div>`).join('') + `<button class="btn small" data-action="examAnswerMatch" data-question-id="${q.id}">Submit Matches</button>`;
    return (q.options || []).map((o, i) => `<button class="opt-btn" data-action="examAnswer" data-question-id="${q.id}" data-idx="${i}">${o}</button>`).join('');
  };
  ctx.recordExamAnswer = function recordExamAnswer(question, correct) {
    if (ctx.examState.phase !== 'active' || ctx.examState.questions[ctx.examState.index] !== question || ctx.examState.answers.length !== ctx.examState.index) return false;
    ctx.examState.answers.push({ correct });
    ctx.PROGRESS.quizAttempts.push({ ts: Date.now(), conceptId: question.concept, correct, difficulty: question.difficulty, lo: question.lo, mode: 'exam' });
    ctx.saveProgress();
    ctx.examNextQuestion();
    return true;
  };
  ctx.examResultsHTML = function examResultsHTML() {
    const answers = ctx.examState.answers;
    const total = answers.length;
    const correct = answers.filter(a => a.correct).length;
    const byLO = {};
    ctx.examState.questions.forEach((q, i) => {
      byLO[q.lo] = byLO[q.lo] || {
        correct: 0,
        total: 0
      };
      byLO[q.lo].total++;
      if (answers[i] && answers[i].correct) byLO[q.lo].correct++;
    });
    const strong = Object.keys(byLO).filter(lo => byLO[lo].correct / byLO[lo].total >= 0.8);
    const weakLOs = Object.keys(byLO).filter(lo => byLO[lo].correct / byLO[lo].total < 0.6);
    return `
    <div class="panel-header"><h1>Exam Results</h1></div>
    <div class="card" style="text-align:center; margin-bottom:20px;">
      <div class="stat-value" style="font-size:2.6rem;">${correct}/${total}</div>
      <div class="small-muted">${total ? Math.round(100 * correct / total) : 0}%</div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h3>Performance by LO</h3>
        ${Object.keys(byLO).sort().map(lo => `<div class="flex-between" style="padding:5px 0;border-bottom:1px solid var(--rule);"><span>LO ${lo}</span><b>${byLO[lo].correct}/${byLO[lo].total}</b></div>`).join('')}
      </div>
      <div class="card">
        <h3>Strong / Weak Areas</h3>
        <div><b>Strong:</b> ${strong.length ? strong.map(l => 'LO ' + l).join(', ') : '—'}</div>
        <div><b>Weak:</b> ${weakLOs.length ? weakLOs.map(l => 'LO ' + l).join(', ') : '—'}</div>
      </div>
    </div>
    <div class="wrap-row" style="margin-top:16px;">
      <button class="btn" data-action="examReviewMistakes">Personalized Review of Mistakes</button>
      <button class="btn secondary" data-action="examRestart">New Exam</button>
    </div>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    examBegin() {
      if (ctx.examState && ctx.examState.timerId) clearInterval(ctx.examState.timerId);
      const scope = ctx.dom.getElementById('ex-scope').value;
      const count = parseInt(ctx.dom.getElementById('ex-count').value, 10);
      const timerSec = parseInt(ctx.dom.getElementById('ex-timer').value, 10);
      let cfg = ctx.readScopedConfig(scope, {
        difficulty: ['easy', 'medium', 'hard', 'exam']
      });
      cfg.timerSec = timerSec;
      const qs = ctx.shuffleArr(ctx.quizForScope(cfg)).slice(0, count);
      ctx.examState = {
        phase: 'active',
        questions: qs,
        index: 0,
        answers: [],
        config: cfg,
        timeLeft: timerSec || 0
      };
      ctx.navigate('exam');
    },
    examAnswer(el) {
      const q = ctx.examState.questions[ctx.examState.index];
      if (!q || el.dataset.questionId !== q.id) return;
      let correct;
      if (el.dataset.val !== undefined && q.type === 'true_false') correct = el.dataset.val === 'true' === q.correctAnswer;else correct = parseInt(el.dataset.idx, 10) === q.correctIndex;
      ctx.recordExamAnswer(q, correct);
    },
    examAnswerFill(el) {
      const q = ctx.examState.questions[ctx.examState.index];
      if (!q || el.dataset.questionId !== q.id) return;
      const val = (ctx.dom.getElementById('exam-fill-input').value || '').trim().toLowerCase();
      const accepted = (q.acceptableAnswers || [q.correctAnswer]).map(a => a.toLowerCase());
      const correct = accepted.includes(val);
      ctx.recordExamAnswer(q, correct);
    },
    examAnswerMatch(el) {
      const q = ctx.examState.questions[ctx.examState.index];
      if (!q || q.type !== 'matching' || el.dataset.questionId !== q.id) return;
      const correct = q.pairs.every((_, index) => Number(ctx.dom.getElementById(`exam-match-${index}`).value) === index && ctx.dom.getElementById(`exam-match-${index}`).value !== '');
      ctx.recordExamAnswer(q, correct);
    },
    examReviewMistakes() {
      const missedConceptIds = ctx.examState.questions.filter((q, i) => ctx.examState.answers[i] && !ctx.examState.answers[i].correct).map(q => q.concept).filter(Boolean);
      ctx.PROGRESS.examHistory.push({
        ts: Date.now(),
        score: ctx.examState.answers.filter(a => a.correct).length,
        total: ctx.examState.answers.length
      });
      ctx.saveProgress();
      if (!missedConceptIds.length) {
        ctx.toast('No mistakes to review — great job!');
        return;
      }
      ctx.startQuiz({
        conceptIds: missedConceptIds,
        count: 999,
        difficulty: ['easy', 'medium', 'hard', 'exam']
      });
    },
    examRestart() {
      if (ctx.examState && ctx.examState.timerId) clearInterval(ctx.examState.timerId);
      ctx.examState = {
        phase: 'setup',
        questions: [],
        index: 0,
        answers: [],
        config: null
      };
      ctx.render();
    }
  });
}
