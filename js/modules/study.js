// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installStudy(ctx) {
  ctx.FLOW_CHAPTER = null;
  ctx.FLOW_STAGE = null;
  ctx.FLOW_QUIZ_FEEDBACK = null;
  ctx.flowFcIndex = 0;
  ctx.flowSectionObserver = null;
  ctx.currentFlowQuizQuestionId = function currentFlowQuizQuestionId(chapterId, phase) {
    const flow = ctx.getFlow(chapterId);
    if (phase === 'quiz') return flow.quiz.pool.find(id => !flow.quiz.attempted.includes(id));
    return flow.quiz.missQueue[0];
  };
  ctx.buildAnswerUI = function buildAnswerUI(q) {
    if (q.type === 'multiple_choice' || q.type === 'two_truths_trap') {
      return `<div class="flow-quiz-options">${q.options.map((opt, i) => `<button class="flow-quiz-opt" data-action="flowQuizPick" data-val="${i}">${opt}</button>`).join('')}</div>`;
    }
    if (q.type === 'true_false') {
      return `<div class="flow-quiz-options">
      <button class="flow-quiz-opt" data-action="flowQuizPick" data-val="true">True</button>
      <button class="flow-quiz-opt" data-action="flowQuizPick" data-val="false">False</button>
    </div>`;
    }
    if (q.type === 'fill_blank') {
      return `<div class="wrap-row"><input type="text" id="flowFillInput" placeholder="Type your answer" style="flex:1;padding:9px 11px;border-radius:8px;border:1.5px solid var(--rule);background:var(--paper-2);color:var(--ink);">
      <button class="btn primary small" data-action="flowQuizSubmitFill">Submit</button></div>`;
    }
    if (q.type === 'matching') {
      const shuffledRights = ctx.shuffleArr(q.pairs.map(p => p.right));
      return `<div id="flowMatchWrap">${q.pairs.map((p, i) => `
      <div class="flex-between" style="margin-bottom:8px;">
        <span>${p.left}</span>
        <select id="flowMatchSel${i}" style="padding:6px 8px;border-radius:6px;background:var(--paper-2);color:var(--ink);border:1px solid var(--rule);">
          <option value="">Select match...</option>
          ${shuffledRights.map(r => `<option value="${r.replace(/"/g, '&quot;')}">${r}</option>`).join('')}
        </select>
      </div>`).join('')}
      <button class="btn primary small" data-action="flowQuizSubmitMatch" style="margin-top:8px;">Submit</button></div>`;
    }
    return '';
  };
  ctx.checkFlowAnswer = function checkFlowAnswer(q, response) {
    if (q.type === 'multiple_choice' || q.type === 'two_truths_trap') return parseInt(response, 10) === q.correctIndex;
    if (q.type === 'true_false') return response === 'true' === q.correctAnswer;
    if (q.type === 'fill_blank') {
      const norm = (response || '').trim().toLowerCase();
      const accepted = (q.acceptableAnswers || [q.correctAnswer]).map(a => String(a).toLowerCase());
      return accepted.includes(norm);
    }
    if (q.type === 'matching') return q.pairs.every((p, i) => response[i] === p.right);
    return false;
  };
  ctx.flowCorrectAnswerLabel = function flowCorrectAnswerLabel(q) {
    if (q.type === 'multiple_choice' || q.type === 'two_truths_trap') return q.options[q.correctIndex];
    if (q.type === 'true_false') return q.correctAnswer ? 'True' : 'False';
    if (q.type === 'fill_blank') return q.correctAnswer;
    if (q.type === 'matching') return q.pairs.map(p => `${p.left} \u2192 ${p.right}`).join('; ');
    return '';
  };
  ctx.submitFlowQuizAnswer = function submitFlowQuizAnswer(response) {
    const chapterId = ctx.FLOW_CHAPTER;
    const phase = ctx.FLOW_STAGE;
    const flow = ctx.getFlow(chapterId);
    const qid = ctx.currentFlowQuizQuestionId(chapterId, phase);
    if (!qid) return;
    const q = ctx.CONTENT.quiz.find(x => x.id === qid);
    const correct = ctx.checkFlowAnswer(q, response);
    let yourAnswerLabel = '';
    if (q.type === 'multiple_choice' || q.type === 'two_truths_trap') yourAnswerLabel = q.options[parseInt(response, 10)] ?? '(no answer)';else if (q.type === 'true_false') yourAnswerLabel = response === 'true' ? 'True' : 'False';else if (q.type === 'fill_blank') yourAnswerLabel = response || '(blank)';else if (q.type === 'matching') yourAnswerLabel = 'See correct pairing below';
    ctx.PROGRESS.quizAttempts.push({
      id: ctx.uid('qa'),
      qid: q.id,
      concept: q.concept,
      correct,
      ts: Date.now()
    });
    if (phase === 'quiz') {
      if (!flow.quiz.attempted.includes(qid)) flow.quiz.attempted.push(qid);
      if (!correct && !flow.quiz.missedEver.includes(qid)) {
        flow.quiz.missedEver.push(qid);
        flow.quiz.missQueue.push(qid);
        if (q.concept) flow.quiz.topicMisses[q.concept] = (flow.quiz.topicMisses[q.concept] || 0) + 1;
      }
    } else {
      flow.quiz.missQueue.shift();
      if (!correct) {
        flow.quiz.missQueue.push(qid);
        flow.quiz.round++;
        if (q.concept) flow.quiz.topicMisses[q.concept] = (flow.quiz.topicMisses[q.concept] || 0) + 1;
      }
    }
    if (flow.quiz.attempted.length >= flow.quiz.pool.length && flow.quiz.missQueue.length === 0) flow.quiz.completed = true;
    ctx.saveProgress();
    ctx.FLOW_QUIZ_FEEDBACK = {
      qid,
      correct,
      yourAnswerLabel
    };
    ctx.renderFlowPanel();
  };
  ctx.renderFlowTopicBreakdown = function renderFlowTopicBreakdown(chapterId) {
    const flow = ctx.getFlow(chapterId);
    const entries = Object.entries(flow.quiz.topicMisses || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '';
    return `<div style="text-align:left;max-width:360px;margin:0 auto;">
    <p class="small-muted" style="margin-bottom:6px;"><b>Topics That Needed Additional Practice:</b></p>
    <ol style="padding-left:20px;">
    ${entries.map(([cid, count]) => {
      const c = ctx.getConcept(cid);
      return `<li>${c ? c.term : cid} \u2014 ${count} mistake${count === 1 ? '' : 's'}</li>`;
    }).join('')}
    </ol>
  </div>`;
  };
  ctx.renderFlowQuizStage = function renderFlowQuizStage(chapterId, phase) {
    const flow = ctx.getFlow(chapterId);
    if (!flow.quiz.pool.length) {
      flow.quiz.pool = ctx.shuffleArr(ctx.chapterQuizPool(chapterId));
      ctx.saveProgress();
    }
    const qid = ctx.currentFlowQuizQuestionId(chapterId, phase);
    if (!qid) {
      if (phase === 'quiz') {
        const total = flow.quiz.attempted.length;
        const correct = total - flow.quiz.missedEver.length;
        const missedNow = flow.quiz.missedEver.length;
        return `<div class="card" style="text-align:center;padding:36px 20px;">
        <p style="font-size:20px;margin-bottom:10px;"><b>Chapter Quiz Complete</b></p>
        <p class="small-muted" style="margin-bottom:16px;">Original Score: ${correct} / ${total}</p>
        ${missedNow ? `<p style="margin-bottom:16px;">You answered ${missedNow} question${missedNow === 1 ? '' : 's'} incorrectly. Let's review ${missedNow === 1 ? 'it' : 'them'} before completing the chapter.</p>
        <button class="btn primary" data-action="flowGoStage" data-val="review">Review Missed Questions \u2192</button>` : `<p style="margin-bottom:16px;">\u2713 All questions answered correctly on the first pass!</p>
        <button class="btn primary" data-action="flowGoStage" data-val="complete">Continue \u2192</button>`}
      </div>`;
      }
      const missedTotal = flow.quiz.missedEver.length;
      return `<div class="card" style="text-align:center;padding:36px 20px;">
      <p style="font-size:22px;">\uD83C\uDF89 Chapter Quiz Fully Mastered</p>
      <p class="small-muted" style="margin:10px 0 16px;">${missedTotal} / ${missedTotal} previously missed concepts successfully corrected.</p>
      ${ctx.renderFlowTopicBreakdown(chapterId)}
      <button class="btn primary" style="margin-top:16px;" data-action="flowGoStage" data-val="complete">Finish Chapter \u2192</button>
    </div>`;
    }
    const q = ctx.CONTENT.quiz.find(x => x.id === qid);
    if (ctx.FLOW_QUIZ_FEEDBACK && ctx.FLOW_QUIZ_FEEDBACK.qid === qid) {
      const fb = ctx.FLOW_QUIZ_FEEDBACK;
      return `<div class="card">
      <div class="small-muted" style="margin-bottom:6px;">${phase === 'review' ? 'Reviewing a missed question' : 'Question ' + flow.quiz.attempted.length + ' of ' + flow.quiz.pool.length}</div>
      <p style="font-size:16px;margin-bottom:14px;"><b>${q.prompt}</b></p>
      <div class="callout ${fb.correct ? 'good' : 'bad'}" style="margin-bottom:10px;padding:10px 14px;border-radius:8px;background:${fb.correct ? 'var(--good-tint,rgba(90,200,120,.12))' : 'var(--bad-tint,rgba(220,90,90,.12))'};">
        <b>${fb.correct ? '\u2713 Correct' : '\u2717 Incorrect'}</b>
        ${!fb.correct ? `<div style="margin-top:6px;">Your Answer: ${fb.yourAnswerLabel}<br>Correct Answer: ${ctx.flowCorrectAnswerLabel(q)}</div>` : ''}
      </div>
      <p class="small-muted" style="margin-bottom:14px;">${q.explanation}</p>
      <button class="btn primary" data-action="flowQuizNext">Continue \u2192</button>
    </div>`;
    }
    return `<div class="card">
    <div class="small-muted" style="margin-bottom:6px;">${phase === 'review' ? `Missed questions remaining: ${flow.quiz.missQueue.length}` : 'Question ' + (flow.quiz.attempted.length + 1) + ' of ' + flow.quiz.pool.length}</div>
    <p style="font-size:16px;margin-bottom:14px;"><b>${q.prompt}</b></p>
    ${ctx.buildAnswerUI(q)}
  </div>`;
  };
  ctx.renderFlowFlashcardsStage = function renderFlowFlashcardsStage(chapterId) {
    const terms = ctx.conceptsForChapter(chapterId);
    const flow = ctx.getFlow(chapterId);
    const reviewedN = flow.flashcardsReviewed.filter(id => terms.some(t => t.id === id)).length;
    const remaining = terms.filter(t => !flow.flashcardsReviewed.includes(t.id));
    if (terms.length && remaining.length === 0) {
      return `<div class="card" style="text-align:center;padding:40px 20px;">
      <p style="font-size:20px;margin-bottom:6px;">\u2713 Flashcards Complete</p>
      <p class="small-muted" style="margin-bottom:20px;">${terms.length} / ${terms.length} Reviewed</p>
      <button class="btn primary" data-action="flowGoStage" data-val="quiz">Take Chapter Quiz \u2192</button>
    </div>`;
    }
    if (ctx.flowFcIndex >= remaining.length) ctx.flowFcIndex = 0;
    const card = remaining[ctx.flowFcIndex] || remaining[0];
    return `
    <div class="small-muted" style="text-align:center;margin-bottom:8px;">${reviewedN} / ${terms.length} Reviewed</div>
    <div class="progress-bar" style="margin-bottom:16px;"><div style="width:${terms.length ? Math.round(100 * reviewedN / terms.length) : 0}%"></div></div>
    <div class="fc-scene">
      <div class="fc-card" id="flowFcCard" data-cid="${card.id}" data-action="flowFcFlip">
        <div class="fc-face front">
          <span class="lo-chip" style="background:${ctx.loTint(card.section)};color:${ctx.loColor(card.section)};margin-bottom:10px;">LO ${card.section}</span>
          <div class="fc-term">${card.term}</div>
          <div class="small-muted" style="margin-top:12px;">tap to flip</div>
        </div>
        <div class="fc-face back"><div class="fc-def">${card.definition}</div></div>
      </div>
    </div>
    <div class="wrap-row" style="justify-content:center;margin-top:18px;">
      <button class="btn secondary small" data-action="flowFcMark" data-val="difficult">Need Practice</button>
      <button class="btn primary small" data-action="flowFcMark" data-val="know">Know It \u2192 Next</button>
    </div>
  `;
  };
  ctx.renderFlowReadingStage = function renderFlowReadingStage(chapterId) {
    const p = ctx.chapterFlowProgress(chapterId);
    const flow = ctx.getFlow(chapterId);
    const remainingTerms = p.terms.filter(t => !flow.termsOpened.includes(t.id));
    return `
    <div class="card" style="margin-bottom:16px;">
      <div class="flex-between"><b>Important Terms</b><span class="mono small-muted">${p.termsOpenedN} / ${p.termsTotal} Reviewed</span></div>
      <div class="progress-bar" style="margin:8px 0;"><div style="width:${p.termsTotal ? Math.round(100 * p.termsOpenedN / p.termsTotal) : 100}%"></div></div>
      ${remainingTerms.length ? `<button class="btn secondary small" data-action="flowReviewRemainingTerms">Review Remaining Terms (${remainingTerms.length})</button>` : `<span class="small-muted">All terms reviewed \u2713</span>`}
      <details class="flow-all-terms"><summary>All ${p.termsTotal} chapter terms</summary><div class="wrap-row" style="margin-top:10px;">
        ${p.terms.map(term => `<button class="pill-btn ${flow.termsOpened.includes(term.id) ? 'active' : ''}" data-action="openConcept" data-id="${term.id}" data-lo-ids="${ctx.sectionToLoId(term.lo, chapterId) || ''}">${flow.termsOpened.includes(term.id) ? '✓ ' : ''}${term.term}</button>`).join('')}
      </div></details>
    </div>
    <div id="flowReadingSections">
      ${p.sections.map(s => `<div class="flow-reading-section" id="flowsec-${s.key}" data-key="${s.key}"><h3 style="margin-bottom:8px;">${s.heading}</h3>${s.html}<div class="flow-section-end" data-key="${s.key}"><button class="btn small ghost" data-action="flowMarkSectionRead" data-key="${s.key}">${flow.sectionsViewed.includes(s.key) ? '✓ Section read' : 'Mark section read'}</button></div></div>`).join('<div class="divider" style="margin:20px 0;"></div>')}
    </div>
    <div id="flow-reading-status" class="card" style="margin-top:20px;text-align:center;">
      ${ctx.flowReadingStatusHTML(chapterId)}
    </div>
  `;
  };
  ctx.flowReadingStatusHTML = function flowReadingStatusHTML(chapterId) {
    const p = ctx.chapterFlowProgress(chapterId);
    return p.readingDone && p.termsDone
      ? `<p><b>✓ Chapter Reading Complete</b></p><p class="small-muted">You've reviewed all ${p.sectionsTotal} sections and all ${p.termsTotal} important concepts.</p><button class="btn primary" data-action="flowGoStage" data-val="flashcards">Continue to Flashcard Practice →</button>`
      : `<p class="small-muted">Read each section and review its terms to unlock Flashcard Practice. The complete term list above includes every required concept.</p>`;
  };
  ctx.refreshReadingStatus = function refreshReadingStatus() {
    const status = ctx.dom.getElementById('flow-reading-status');
    if (status && ctx.FLOW_CHAPTER) status.innerHTML = ctx.flowReadingStatusHTML(ctx.FLOW_CHAPTER);
  };
  ctx.renderFlowCompleteStage = function renderFlowCompleteStage(chapterId) {
    const p = ctx.chapterFlowProgress(chapterId);
    const ch = ctx.CONTENT.chapters[chapterId];
    const chapters = ctx.CONTENT.course.chapters;
    const idx = chapters.indexOf(chapterId);
    const nextCh = chapters[idx + 1];
    return `<div class="card" style="text-align:center;padding:40px 20px;">
    <p style="font-size:26px;margin-bottom:6px;">\uD83C\uDF89 CHAPTER ${ch.number} COMPLETE</p>
    <p style="font-size:34px;font-weight:700;margin-bottom:20px;">100%</p>
    <div style="text-align:left;max-width:320px;margin:0 auto 20px;line-height:1.8;">
      <p>\u2713 Reading Complete</p>
      <p>\u2713 ${p.termsTotal} / ${p.termsTotal} Important Terms Reviewed</p>
      <p>\u2713 ${p.flashTotal} / ${p.flashTotal} Flashcards Reviewed</p>
      <p>\u2713 Chapter Quiz Completed</p>
      <p>\u2713 All Missed Questions Corrected</p>
    </div>
    <p style="margin-bottom:20px;"><b>Chapter Mastery Achieved</b></p>
    <div class="wrap-row" style="justify-content:center;">
      <button class="btn secondary small" data-action="flowGoStage" data-val="reading">Review Chapter</button>
      <button class="btn secondary small" data-action="nav" data-route="weak-areas">Practice Weak Areas</button>
      ${nextCh ? `<button class="btn primary small" data-action="flowSwitchChapter" data-val="${nextCh}">Continue to Next Chapter</button>` : ''}
      <button class="btn ghost small" data-action="nav" data-route="dashboard">Return to Dashboard</button>
    </div>
  </div>`;
  };
  ctx.renderFlowStageContent = function renderFlowStageContent(chapterId, stage) {
    if (stage === 'reading') return ctx.renderFlowReadingStage(chapterId);
    if (stage === 'flashcards') return ctx.renderFlowFlashcardsStage(chapterId);
    if (stage === 'quiz') return ctx.renderFlowQuizStage(chapterId, 'quiz');
    if (stage === 'review') return ctx.renderFlowQuizStage(chapterId, 'review');
    return ctx.renderFlowCompleteStage(chapterId);
  };
  ctx.renderFlowStageBarHTML = function renderFlowStageBarHTML(chapterId) {
    const p = ctx.chapterFlowProgress(chapterId);
    const filled = Math.round(p.pct / 5);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);
    const rows = [{
      key: 'reading',
      label: 'Chapter Reading & Terms',
      done: p.readingDone && p.termsDone,
      detail: p.termsTotal ? `${p.termsOpenedN}/${p.termsTotal} terms reviewed` : '',
      locked: false
    }, {
      key: 'flashcards',
      label: 'Flashcard Practice',
      done: p.flashDone,
      detail: `${p.flashReviewedN}/${p.flashTotal} reviewed`,
      locked: !(p.readingDone && p.termsDone)
    }, {
      key: 'quiz',
      label: 'Chapter Quiz',
      done: p.quizDone,
      detail: `${p.quizAttemptedN}/${p.quizTotal} attempted`,
      locked: !p.flashDone
    }, {
      key: 'review',
      label: 'Missed Questions',
      done: p.masteryDone,
      detail: p.missedTotal ? `${p.correctedCount}/${p.missedTotal} corrected` : p.quizDone ? 'None missed' : '',
      locked: !p.quizDone
    }];
    return `
    <div class="flex-between"><b>Overall Progress</b><span class="mono">${p.pct}%</span></div>
    <div class="progress-bar" style="margin:8px 0 10px;"><div style="width:${p.pct}%"></div></div>
    <div class="mono small-muted" style="letter-spacing:1px;margin-bottom:14px;word-break:break-all;">${bar}</div>
    <div class="flow-checklist">
      ${rows.map(r => `<div class="flow-check-row ${r.locked ? 'locked' : ''}" ${!r.locked ? `data-action="flowGoStage" data-val="${r.key}"` : ''}>
          <span class="flow-check-icon">${r.done ? '\u2713' : r.locked ? '\uD83D\uDD12' : '\u25CB'}</span>
          <span class="flow-check-label">${r.label}</span>
          <span class="flow-check-detail small-muted">${r.detail}</span>
        </div>`).join('')}
    </div>
    ${p.complete ? `<div class="small-muted" style="margin-top:12px;">\uD83C\uDF89 <b>Chapter Complete \u2014 100%</b></div>` : ''}
  `;
  };
  ctx.renderFlowStageBarOnly = function renderFlowStageBarOnly() {
    const el = ctx.dom.getElementById('flowStageBar');
    if (el && ctx.FLOW_CHAPTER) el.innerHTML = ctx.renderFlowStageBarHTML(ctx.FLOW_CHAPTER);
  };
  ctx.wireFlowReading = function wireFlowReading(chapterId) {
    const container = ctx.dom.getElementById('flowReadingSections');
    if (!container) return;
    container.querySelectorAll("span.term[data-cid]").forEach(span => {
      span.addEventListener('click', e => {
        e.stopPropagation();
        ctx.openConceptModal(span.dataset.cid);
      });
    });
    if (ctx.flowSectionObserver) ctx.flowSectionObserver.disconnect();
    ctx.flowSectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ctx.markSectionViewed(chapterId, entry.target.dataset.key);
        }
      });
    }, {
      threshold: [0.01]
    });
    container.querySelectorAll('.flow-section-end').forEach(el => ctx.flowSectionObserver.observe(el));
  };
  ctx.renderFlowPanel = function renderFlowPanel() {
    const panel = ctx.dom.getElementById('modePanelFlow');
    if (!panel) return;
    if (!ctx.FLOW_CHAPTER) ctx.FLOW_CHAPTER = ctx.pickTargetChapterGated();
    const ch = ctx.CONTENT.chapters[ctx.FLOW_CHAPTER];
    if (!ctx.FLOW_STAGE) ctx.FLOW_STAGE = ctx.nextFlowStage(ctx.FLOW_CHAPTER);
    const stage = ctx.FLOW_STAGE;
    const chapters = ctx.CONTENT.course.chapters;
    panel.innerHTML = `
    <div class="panel-header">
      <p class="chapter-kicker">Weekly Study Session</p>
      <h1 class="chapter-title">Chapter ${ch.number}: ${ch.title}</h1>
    </div>
    <div class="card" style="margin-bottom:20px;"><div id="flowStageBar">${ctx.renderFlowStageBarHTML(ctx.FLOW_CHAPTER)}</div></div>
    <div class="wrap-row" style="margin-bottom:16px;">
      ${chapters.map(id => {
      const c = ctx.CONTENT.chapters[id];
      const cp = ctx.chapterFlowProgress(id);
      return `<button class="pill-btn ${ctx.FLOW_CHAPTER === id ? 'active' : ''}" data-action="flowSwitchChapter" data-val="${id}">Ch.${c.number} ${cp.complete ? '\u2713' : cp.pct + '%'}</button>`;
    }).join('')}
    </div>
    <div id="flowStageContent">${ctx.renderFlowStageContent(ctx.FLOW_CHAPTER, stage)}</div>
  `;
    if (stage === 'reading') ctx.wireFlowReading(ctx.FLOW_CHAPTER);
  };
  Object.assign(ctx.ACTIONS, {
    flowGoStage(el) {
      const stage = el.dataset.val;
      const p = ctx.chapterFlowProgress(ctx.FLOW_CHAPTER);
      const locked = {
        reading: false,
        flashcards: !(p.readingDone && p.termsDone),
        quiz: !p.flashDone,
        review: !p.quizDone,
        complete: !p.complete
      };
      if (locked[stage]) {
        ctx.toast('Finish the current step first.');
        return;
      }
      ctx.FLOW_STAGE = stage;
      ctx.FLOW_QUIZ_FEEDBACK = null;
      ctx.flowFcIndex = 0;
      ctx.render();
    },
    flowSwitchChapter(el) {
      ctx.FLOW_CHAPTER = el.dataset.val;
      ctx.FLOW_STAGE = ctx.nextFlowStage(ctx.FLOW_CHAPTER);
      ctx.FLOW_QUIZ_FEEDBACK = null;
      ctx.flowFcIndex = 0;
      ctx.render();
    },
    flowReviewRemainingTerms() {
      const flow = ctx.getFlow(ctx.FLOW_CHAPTER);
      const remaining = ctx.conceptsForChapter(ctx.FLOW_CHAPTER).find(t => !flow.termsOpened.includes(t.id));
      if (!remaining) return;
      const el = ctx.dom.querySelector(`#flowReadingSections span[data-cid='${remaining.id}']`);
      if (el) el.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      ctx.openConceptModal(remaining.id);
    },
    flowMarkSectionRead(el) {
      ctx.markSectionViewed(ctx.FLOW_CHAPTER, el.dataset.key);
      el.textContent = '✓ Section read';
    },
    flowFcFlip() {
      const el = ctx.dom.getElementById('flowFcCard');
      if (!el) return;
      el.classList.toggle('flipped');
      const cid = el.dataset.cid;
      if (cid) ctx.markFlashcardReviewed(ctx.FLOW_CHAPTER, cid);
    },
    flowFcMark(el) {
      const cardEl = ctx.dom.getElementById('flowFcCard');
      const cid = cardEl ? cardEl.dataset.cid : null;
      if (cid) {
        ctx.markFlashcardReviewed(ctx.FLOW_CHAPTER, cid);
        ctx.PROGRESS.flashcardStatus[cid] = el.dataset.val === 'difficult' ? 'difficult' : 'know';
        ctx.saveProgress();
      }
      ctx.flowFcIndex++;
      ctx.render();
    },
    flowQuizPick(el) {
      ctx.submitFlowQuizAnswer(el.dataset.val);
    },
    flowQuizSubmitFill() {
      const input = ctx.dom.getElementById('flowFillInput');
      ctx.submitFlowQuizAnswer(input ? input.value : '');
    },
    flowQuizSubmitMatch() {
      const qid = ctx.currentFlowQuizQuestionId(ctx.FLOW_CHAPTER, ctx.FLOW_STAGE);
      const q = ctx.CONTENT.quiz.find(x => x.id === qid);
      if (!q) return;
      const response = q.pairs.map((p, i) => {
        const sel = ctx.dom.getElementById('flowMatchSel' + i);
        return sel ? sel.value : '';
      });
      ctx.submitFlowQuizAnswer(response);
    },
    flowQuizNext() {
      ctx.FLOW_QUIZ_FEEDBACK = null;
      ctx.render();
    }
  });
}
