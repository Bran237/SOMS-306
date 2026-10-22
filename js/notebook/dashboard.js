// Preserved original Notebook renderers, with instance-scoped dependencies.
export function installDashboard(ctx) {
  ctx.chapterStats = function chapterStats(c) {
    const secs = c.notebook || [];
    const secD = secs.filter(s => ctx.NBDONE[c.id + ':' + s.num]).length;
    const keys = [];
    c.homework.forEach(p => keys.push(c.id + ':' + p.id));
    c.homeworkConcept.filter(x => x.id !== 'qst3c').forEach(x => keys.push(c.id + ':' + x.id));
    secs.forEach(s => (s.hw || []).forEach(x => {
      if (ctx.parseHw(x).id === 'st1') keys.push(c.id + ':st1@' + s.num);
    }));
    const hwD = keys.filter(k => ctx.HWDONE[k]).length;
    const exT = c.exam ? c.exam.checklist.length : 0;
    const exD = c.exam ? c.exam.checklist.filter((_, i) => ctx.EXCHK['ex:' + c.id + ':' + i]).length : 0;
    const flags = Object.keys(ctx.REVIEW).filter(k => ctx.REVIEW[k] && (k.indexOf('sec:' + c.id + ':') === 0 || k.indexOf('hw:' + c.id + ':') === 0)).length;
    return {
      secT: secs.length,
      secD,
      hwT: keys.length,
      hwD,
      exT,
      exD,
      flags
    };
  };
  ctx.bar = function bar(d, t) {
    return '<div class="bar"><i style="width:' + (t ? Math.round(d / t * 100) : 0) + '%"></i></div>';
  };
  ctx.updateProgress = function updateProgress() {
    const el = ctx.$('#nbProg');
    if (el) {
      const s = ctx.chapterStats(ctx.ch);
      el.innerHTML = 'Notebook: <b>' + s.secD + '/' + s.secT + '</b> sections written · Homework: <b>' + s.hwD + '/' + s.hwT + '</b> solved' + ctx.bar(s.secD, s.secT);
    }
    ctx.renderDashboard();
  };
  ctx.renderDashboard = function renderDashboard() {
    const st = ctx.CHAPTERS.map(ctx.chapterStats);
    const T = st.reduce((a, s) => ({
      secT: a.secT + s.secT,
      secD: a.secD + s.secD,
      hwT: a.hwT + s.hwT,
      hwD: a.hwD + s.hwD
    }), {
      secT: 0,
      secD: 0,
      hwT: 0,
      hwD: 0
    });
    let h = '<h2>Dashboard</h2>';
    h += '<div class="card"><div class="progress">Overall notebook: <b>' + T.secD + '/' + T.secT + '</b> sections written' + ctx.bar(T.secD, T.secT) + '</div><div class="progress">Overall homework: <b>' + T.hwD + '/' + T.hwT + '</b> items solved' + ctx.bar(T.hwD, T.hwT) + '</div></div>';
    let next = null;
    for (const c of ctx.CHAPTERS) {
      const i = (c.notebook || []).findIndex(s => !ctx.NBDONE[c.id + ':' + s.num]);
      if (i >= 0) {
        next = {
          c,
          i,
          sec: c.notebook[i]
        };
        break;
      }
    }
    if (next) h += '<div class="card"><b>Continue where you left off</b><p style="margin:4px 0 8px">' + next.c.title.split(':')[0] + ' · Section ' + next.sec.num + ': ' + next.sec.title + '</p><button class="btn primary" data-go="' + next.c.id + '|notebook|nb-' + next.c.id + '-' + next.i + '">Open this section</button></div>';
    h += '<h3>Chapters</h3><div class="dgrid">';
    ctx.CHAPTERS.forEach((c, i) => {
      const s = st[i];
      h += '<div class="card dch"><h4>' + c.title.split(':')[0] + '</h4><div class="hint">' + c.title.split(':').slice(1).join(':').trim() + '</div>';
      h += '<div class="progress">Notebook <b>' + s.secD + '/' + s.secT + '</b> sections written' + ctx.bar(s.secD, s.secT) + '</div>';
      h += '<div class="progress">Homework <b>' + s.hwD + '/' + s.hwT + '</b> solved' + ctx.bar(s.hwD, s.hwT) + '</div>';
      h += '<div class="progress">Exam checklist <b>' + s.exD + '/' + s.exT + '</b>' + ctx.bar(s.exD, s.exT) + '</div>';
      h += '<div class="hint">' + (s.flags ? '⚑ ' + s.flags + ' topic' + (s.flags > 1 ? 's' : '') + ' marked for review' : 'No topics marked for review') + '</div>';
      (c.missingHw || []).forEach(m => {
        h += '<div class="miss">Unavailable: ' + m + '</div>';
      });
      h += '<div class="dbtns"><button class="btn primary" data-go="' + c.id + '|notebook">Open notebook</button><button class="btn" data-go="' + c.id + '|examreview">Exam prep</button></div></div>';
    });
    h += '</div>';
    h += '<h3>Topics requiring review</h3>';
    const items = [];
    ctx.CHAPTERS.forEach(c => {
      (c.notebook || []).forEach((s, i) => {
        if (ctx.REVIEW['sec:' + c.id + ':' + s.num]) items.push('<li><a href="#" data-go="' + c.id + '|notebook|nb-' + c.id + '-' + i + '">' + c.title.split(':')[0] + ' · ' + s.num + ' ' + s.title + '</a></li>');
      });
      const all = [...c.homework, ...c.homeworkConcept];
      all.forEach(p => {
        if (!ctx.REVIEW['hw:' + c.id + ':' + p.id]) return;
        let idx = -1;
        (c.notebook || []).forEach((s, i) => {
          if (idx < 0 && (s.hw || []).some(x => ctx.parseHw(x).id === p.id)) idx = i;
        });
        items.push('<li><a href="#" data-go="' + c.id + '|notebook' + (idx >= 0 ? '|nb-' + c.id + '-' + idx : '') + '">' + c.title.split(':')[0] + ' · ' + p.title + '</a></li>');
      });
    });
    h += items.length ? '<div class="card"><ul>' + items.join('') + '</ul></div>' : '<p class="hint">Nothing marked yet. Tap the ⚑ button on any section or homework problem to add it here.</p>';
    ctx.$('#p-dashboard').innerHTML = h;
  };
}
