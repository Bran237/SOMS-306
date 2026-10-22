// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installShared(ctx) {
  ctx.logStudyMinutes = function logStudyMinutes(mins) {
    const day = ctx.todayStr();
    let entry = ctx.PROGRESS.studyLog.find(l => l.date === day);
    if (!entry) {
      entry = {
        date: day,
        minutes: 0
      };
      ctx.PROGRESS.studyLog.push(entry);
    }
    entry.minutes += mins;
    ctx.bumpStreak(day);
    ctx.saveProgress();
  };
  ctx.bumpStreak = function bumpStreak(day) {
    if (ctx.PROGRESS.lastStudyDate === day) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (ctx.PROGRESS.lastStudyDate === y || !ctx.PROGRESS.lastStudyDate) ctx.PROGRESS.streakDays = (ctx.PROGRESS.streakDays || 0) + 1;else ctx.PROGRESS.streakDays = 1;
    ctx.PROGRESS.lastStudyDate = day;
  };
  ctx.addXP = function addXP(n) {
    ctx.PROGRESS.xp = (ctx.PROGRESS.xp || 0) + n;
    ctx.saveProgress();
  };
  ctx.getConcept = function getConcept(id) {
    return ctx.CONTENT.concepts.find(c => c.id === id);
  };
  ctx.allConcepts = function allConcepts() {
    return ctx.CONTENT.concepts;
  };
  ctx.conceptsForChapter = function conceptsForChapter(chapterId) {
    return ctx.CONTENT.concepts.filter(c => c.chapterId === chapterId);
  };
  ctx.conceptsForLO = function conceptsForLO(loId) {
    const lo = ctx.CONTENT.learningObjectives.find(l => l.id === loId);
    if (!lo) return [];
    return ctx.CONTENT.concepts.filter(c => (lo.keyConcepts || []).includes(c.id) || c.lo === lo.code);
  };
  ctx.loByCode = function loByCode(code) {
    return ctx.CONTENT.learningObjectives.find(l => l.code === code);
  };
  ctx.quizForScope = function quizForScope(scope) {
    let qs = ctx.CONTENT.quiz.slice();
    if (scope.chapterId) qs = qs.filter(q => q.chapterId === scope.chapterId);
    if (scope.loCode) qs = qs.filter(q => q.lo === scope.loCode);
    if (scope.conceptIds) qs = qs.filter(q => scope.conceptIds.includes(q.concept));
    if (scope.difficulty && scope.difficulty.length) qs = qs.filter(q => scope.difficulty.includes(q.difficulty));
    if (scope.types && scope.types.length) qs = qs.filter(q => scope.types.includes(q.type));
    return qs;
  };
  ctx.conceptAccuracy = function conceptAccuracy(conceptId) {
    const attempts = ctx.PROGRESS.quizAttempts.filter(a => a.conceptId === conceptId);
    if (!attempts.length) return null;
    const correct = attempts.filter(a => a.correct).length;
    return {
      attempts: attempts.length,
      correct,
      accuracy: Math.round(100 * correct / attempts.length)
    };
  };
  ctx.loStats = function loStats(loId) {
    const lo = ctx.CONTENT.learningObjectives.find(l => l.id === loId);
    const concepts = ctx.conceptsForLO(loId);
    const conceptIds = concepts.map(c => c.id);
    const attempts = ctx.PROGRESS.quizAttempts.filter(a => conceptIds.includes(a.conceptId));
    const total = attempts.length;
    const correct = attempts.filter(a => a.correct).length;
    const accuracy = total ? Math.round(100 * correct / total) : null;
    let status = 'Not Started';
    if (total >= 1 && total < 4) status = 'Learning';else if (total >= 4 && accuracy !== null && accuracy < 80) status = 'Improving';else if (total >= 4 && accuracy !== null && accuracy >= 80) status = 'Mastered';
    const weak = concepts.map(c => ({
      id: c.id,
      term: c.term,
      stat: ctx.conceptAccuracy(c.id)
    })).filter(c => c.stat && c.stat.accuracy < 70).sort((a, b) => a.stat.accuracy - b.stat.accuracy);
    return {
      lo,
      total,
      correct,
      accuracy,
      status,
      weak,
      concepts
    };
  };
  ctx.statusClass = function statusClass(status) {
    return {
      'Not Started': 'notstarted',
      'Learning': 'learning',
      'Improving': 'improving',
      'Mastered': 'mastered'
    }[status] || 'notstarted';
  };
  ctx.chapterMastery = function chapterMastery(chapterId) {
    const los = ctx.CONTENT.learningObjectives.filter(l => l.chapterId === chapterId);
    if (!los.length) return 0;
    const accs = los.map(l => {
      const s = ctx.loStats(l.id);
      return s.accuracy === null ? 0 : s.accuracy;
    });
    return Math.round(accs.reduce((a, b) => a + b, 0) / los.length);
  };
  ctx.getFlow = function getFlow(chapterId) {
    if (!ctx.PROGRESS.chapterFlow) ctx.PROGRESS.chapterFlow = {};
    if (!ctx.PROGRESS.chapterFlow[chapterId]) {
      ctx.PROGRESS.chapterFlow[chapterId] = {
        termsOpened: [],
        sectionsViewed: [],
        flashcardsReviewed: [],
        quiz: {
          pool: [],
          attempted: [],
          missedEver: [],
          missQueue: [],
          round: 0,
          completed: false,
          topicMisses: {}
        }
      };
    }
    const f = ctx.PROGRESS.chapterFlow[chapterId];
    if (!f.quiz.topicMisses) f.quiz.topicMisses = {};
    return f;
  };
  ctx.markTermOpened = function markTermOpened(chapterId, conceptId) {
    const flow = ctx.getFlow(chapterId);
    if (!flow.termsOpened.includes(conceptId)) {
      flow.termsOpened.push(conceptId);
      ctx.saveProgress();
      if (ctx.MAIN_MODE === 'flow') ctx.renderFlowPanel();
    }
  };
  ctx.markFlashcardReviewed = function markFlashcardReviewed(chapterId, conceptId) {
    if (!chapterId) return;
    const flow = ctx.getFlow(chapterId);
    if (!flow.flashcardsReviewed.includes(conceptId)) {
      flow.flashcardsReviewed.push(conceptId);
      ctx.saveProgress();
    }
  };
  ctx.chapterSectionList = function chapterSectionList(chapterId) {
    const los = ctx.CONTENT.learningObjectives.filter(l => l.chapterId === chapterId);
    const list = [];
    los.forEach(lo => {
      const secs = ctx.CONTENT.loProse[lo.code] || [];
      secs.forEach((s, idx) => list.push({
        key: lo.code + '::' + idx,
        loCode: lo.code,
        idx,
        heading: s.heading,
        html: s.html
      }));
    });
    return list;
  };
  ctx.markSectionViewed = function markSectionViewed(chapterId, key) {
    const flow = ctx.getFlow(chapterId);
    if (!flow.sectionsViewed.includes(key)) {
      flow.sectionsViewed.push(key);
      ctx.saveProgress();
      ctx.renderFlowStageBarOnly();
      ctx.refreshReadingStatus?.();
    }
  };
  ctx.chapterQuizPool = function chapterQuizPool(chapterId) {
    return ctx.CONTENT.quiz.filter(q => q.chapterId === chapterId).map(q => q.id);
  };
  ctx.chapterFlowProgress = function chapterFlowProgress(chapterId) {
    const flow = ctx.getFlow(chapterId);
    const sections = ctx.chapterSectionList(chapterId);
    const terms = ctx.conceptsForChapter(chapterId);
    const termIds = terms.map(t => t.id);
    const pool = ctx.chapterQuizPool(chapterId);
    const sectionsViewedN = flow.sectionsViewed.filter(k => sections.some(s => s.key === k)).length;
    const termsOpenedN = flow.termsOpened.filter(id => termIds.includes(id)).length;
    const flashReviewedN = flow.flashcardsReviewed.filter(id => termIds.includes(id)).length;
    const quizAttemptedN = flow.quiz.attempted.filter(id => pool.includes(id)).length;
    const readingPct = sections.length ? sectionsViewedN / sections.length : 1;
    const termsPct = terms.length ? termsOpenedN / terms.length : 1;
    const flashPct = terms.length ? flashReviewedN / terms.length : 1;
    const quizPct = pool.length ? quizAttemptedN / pool.length : 1;
    const missedTotal = flow.quiz.missedEver.length;
    const correctedCount = Math.max(0, missedTotal - flow.quiz.missQueue.length);
    const masteryPct = missedTotal ? correctedCount / missedTotal : flow.quiz.completed ? 1 : 0;
    const pctTotal = Math.round(15 * readingPct + 25 * termsPct + 25 * flashPct + 25 * quizPct + 10 * masteryPct);
    const readingDone = sections.length === 0 || sectionsViewedN >= sections.length;
    const termsDone = terms.length === 0 || termsOpenedN >= terms.length;
    const flashDone = terms.length === 0 || flashReviewedN >= terms.length;
    const quizDone = pool.length === 0 || quizAttemptedN >= pool.length;
    const masteryDone = quizDone && flow.quiz.missQueue.length === 0;
    return {
      pct: Math.max(0, Math.min(100, pctTotal)),
      sections,
      terms,
      pool,
      readingDone,
      termsDone,
      flashDone,
      quizDone,
      masteryDone,
      sectionsViewedN,
      sectionsTotal: sections.length,
      termsOpenedN,
      termsTotal: terms.length,
      flashReviewedN,
      flashTotal: terms.length,
      quizAttemptedN,
      quizTotal: pool.length,
      missedTotal,
      correctedCount,
      complete: readingDone && termsDone && flashDone && quizDone && masteryDone
    };
  };
  ctx.nextFlowStage = function nextFlowStage(chapterId) {
    const p = ctx.chapterFlowProgress(chapterId);
    if (!p.readingDone || !p.termsDone) return 'reading';
    if (!p.flashDone) return 'flashcards';
    if (!p.quizDone) return 'quiz';
    if (!p.masteryDone) return 'review';
    return 'complete';
  };
  ctx.pickTargetChapterGated = function pickTargetChapterGated() {
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    const notDone = chapters.filter(ch => !ctx.chapterFlowProgress(ch.id).complete);
    return (notDone[0] || chapters[chapters.length - 1]).id;
  };
  ctx.mondayOf = function mondayOf(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  };
  ctx.daysLeftInWeek = function daysLeftInWeek() {
    const day = new Date().getDay(); // 0 = Sun
    return day === 0 ? 0 : 7 - day;
  };
  ctx.pickTargetChapter = function pickTargetChapter() {
    return ctx.pickTargetChapterGated();
  };
  ctx.ensureWeeklyGoal = function ensureWeeklyGoal() {
    const thisMonday = ctx.mondayOf(ctx.todayStr());
    if (!ctx.PROGRESS.weeklyGoal || ctx.PROGRESS.weeklyGoal.weekStart !== thisMonday) {
      ctx.PROGRESS.weeklyGoal = {
        weekStart: thisMonday,
        chapterId: ctx.pickTargetChapter()
      };
      ctx.saveProgress();
    }
    return ctx.PROGRESS.weeklyGoal;
  };
  ctx.notifPermissionLabel = function notifPermissionLabel() {
    if (!('Notification' in window)) return 'Not supported on this device';
    if (Notification.permission === 'granted') return 'On';
    if (Notification.permission === 'denied') return 'Blocked \u2014 check your browser/OS notification settings';
    return 'Not enabled yet';
  };
  ctx.requestNotificationPermission = async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch (e) {
      return false;
    }
  };
  ctx.registerServiceWorkerForNotifications = function registerServiceWorkerForNotifications() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {/* fine if sw.js isn't hosted alongside this file */});
    }
  };
  ctx.showLocalNotification = async function showLocalNotification(title, body) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return false;
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, {
            body
          });
          return true;
        }
      }
      new Notification(title, {
        body
      });
      return true;
    } catch (e) {
      return false;
    }
  };
  ctx.requestDailyReminderSetupIfNeeded = async function requestDailyReminderSetupIfNeeded() {
    ctx.registerServiceWorkerForNotifications();
    const goal = ctx.ensureWeeklyGoal();
    const today = ctx.todayStr();
    if (ctx.PROGRESS.lastReminderDate === today) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const ch = ctx.CONTENT.chapters[goal.chapterId];
    const mastery = ctx.chapterMastery(goal.chapterId);
    const daysLeft = ctx.daysLeftInWeek();
    if (mastery >= 90) return;
    const shown = await ctx.showLocalNotification(daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left this week` : 'Last day of the week', `Chapter ${ch.number}: ${ch.title} is at ${mastery}% mastery. Let's close the gap before Sunday.`);
    if (shown) {
      ctx.PROGRESS.lastReminderDate = today;
      ctx.saveProgress();
    }
  };
  ctx.weakConceptsList = function weakConceptsList(minAttempts) {
    minAttempts = minAttempts || 1;
    return ctx.CONTENT.concepts.map(c => ({
      c,
      stat: ctx.conceptAccuracy(c.id)
    })).filter(x => x.stat && x.stat.attempts >= minAttempts).sort((a, b) => a.stat.accuracy - b.stat.accuracy).slice(0, 12);
  };
  ctx.flashcardsMasteredCount = function flashcardsMasteredCount() {
    return Object.values(ctx.PROGRESS.flashcardStatus || {}).filter(v => v === 'know').length;
  };
  ctx.SRS_INTERVALS = {
    didnt: 0,
    almost: 1,
    knew: 3,
    easy: 7
  };
  ctx.rateRecall = function rateRecall(conceptId, rating) {
    const now = new Date();
    const cur = ctx.PROGRESS.srs[conceptId] || {
      interval: 0,
      dueDate: ctx.todayStr(),
      lastRating: null,
      streak: 0
    };
    let interval = ctx.SRS_INTERVALS[rating] ?? 1;
    if (rating === 'easy' && cur.lastRating === 'easy') interval = Math.min((cur.interval || 1) * 2, 30);
    const due = new Date(now.getTime() + interval * 86400000).toISOString().slice(0, 10);
    ctx.PROGRESS.srs[conceptId] = {
      interval,
      dueDate: due,
      lastRating: rating,
      streak: rating === 'didnt' ? 0 : (cur.streak || 0) + 1
    };
    ctx.saveProgress();
  };
  ctx.dueConcepts = function dueConcepts(chapterId) {
    const today = ctx.todayStr();
    const all = chapterId ? ctx.conceptsForChapter(chapterId) : ctx.allConcepts();
    const due = all.filter(c => {
      const s = ctx.PROGRESS.srs[c.id];
      return !s || s.dueDate <= today;
    });
    due.sort((a, b) => (a.tier === 'must_know' ? 0 : 1) - (b.tier === 'must_know' ? 0 : 1));
    return due.length ? due : all;
  };
  ctx.MAIN_MODE = 'dashboard';
  ctx.PRACTICE_TAB = 'flashcards';
  ctx.PROGRESS_TAB = 'stats';
  ctx.ACTIVE_MODAL = null;
  ctx.sectionToLoId = function sectionToLoId(section, chapterId) {
    const lo = ctx.CONTENT.learningObjectives.find(l => l.code === section && (!chapterId || l.chapterId === chapterId));
    return lo ? lo.id : null;
  };
  ctx.setPracticeTab = function setPracticeTab(tab) {
    ctx.PRACTICE_TAB = tab;
    ctx.render();
  };
  ctx.setProgressTab = function setProgressTab(tab) {
    ctx.PROGRESS_TAB = tab;
    ctx.render();
  };
  ctx.openModal = function openModal(m) {
    ctx.ACTIVE_MODAL = m;
    ctx.renderModal();
  };
  ctx.closeModal = function closeModal() {
    ctx.ACTIVE_MODAL = null;
    ctx.renderModal();
  };
  ctx.openConceptModal = function openConceptModal(conceptId) {
    ctx.ACTIVE_MODAL = {
      type: 'concept',
      id: conceptId
    };
    const c = ctx.getConcept(conceptId);
    if (c) {
      ctx.markTermOpened(c.chapterId, conceptId);
    }
    ctx.renderModal();
  };
  ctx.scrollToChapterTop = function scrollToChapterTop(chapterId) {
    const el = ctx.dom.getElementById('chapter-' + chapterId);
    if (el) el.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };
  ctx.jumpToLO = function jumpToLO(loId) {
    const target = ctx.dom.getElementById('sec-' + loId);
    if (!target) return;
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1400);
  };
  ctx.jumpToGlossaryTerm = function jumpToGlossaryTerm(conceptId) {
    const c = ctx.getConcept(conceptId);
    if (!c) return;
    const loId = ctx.sectionToLoId(c.section, c.chapterId);
    if (!loId) return;
    ctx.jumpToLO(loId);
  };
  ctx.toast = function toast(msg) {
    const t = ctx.dom.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(ctx.toast._t);
    ctx.toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  };
  ctx.expandedChapters = {};
  ctx.hlCategory = null;
  ctx.HL_CATS = [{
    key: 'important',
    label: 'Important',
    color: '#F5D949'
  }, {
    key: 'exam',
    label: 'Exam',
    color: '#F0A8A0'
  }, {
    key: 'definition',
    label: 'Definition',
    color: '#8FB8E8'
  }, {
    key: 'confusing',
    label: 'Confusing',
    color: '#D8A8F0'
  }, {
    key: 'askprof',
    label: 'Ask Prof',
    color: '#8FCB8A'
  }];
  ctx.hlCatColor = function hlCatColor(key) {
    const c = ctx.HL_CATS.find(c => c.key === key);
    return c ? c.color : '#F5D949';
  };
  ctx.el = function el(html) {
    const d = ctx.dom.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  };
  ctx.LO_COLOR_MAP = {
    '1': 'var(--lo1)',
    '2': 'var(--lo2)',
    '3': 'var(--lo3)',
    '4': 'var(--lo4)',
    '5': 'var(--lo5)'
  };
  ctx.LO_TINT_MAP = {
    '1': 'var(--lo1-tint)',
    '2': 'var(--lo2-tint)',
    '3': 'var(--lo3-tint)',
    '4': 'var(--lo4-tint)',
    '5': 'var(--lo5-tint)'
  };
  ctx.loSuffix = function loSuffix(section) {
    const n = parseInt(section.split('.')[1], 10) || 1;
    return String((n - 1) % 5 + 1);
  };
  ctx.loColor = function loColor(section) {
    return ctx.LO_COLOR_MAP[ctx.loSuffix(section)] || 'var(--ink)';
  };
  ctx.loTint = function loTint(section) {
    return ctx.LO_TINT_MAP[ctx.loSuffix(section)] || 'var(--paper-2)';
  };
  ctx.loColorHex = function loColorHex(section) {
    return {
      '1': '#4FC3AC',
      '2': '#E3924F',
      '3': '#7DA6F0',
      '4': '#C48EDA',
      '5': '#E5C15C'
    }[ctx.loSuffix(section)] || '#888';
  };
}
