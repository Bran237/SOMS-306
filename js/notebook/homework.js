// Preserved original Notebook renderers, with instance-scoped dependencies.
export function installHomework(ctx) {
  ctx.parseHw = function parseHw(x) {
    const p = x.split('|');
    return {
      id: p[0],
      label: p[1] || p[0],
      parts: p[2] ? p[2].split(',').map(t => t.trim()) : null
    };
  };
  ctx.buildSlideMap = function buildSlideMap() {
    const m = {};
    (ctx.ch.slides || []).forEach(sl => (sl.hw || []).forEach(x => {
      const id = ctx.parseHw(x).id;
      m[id] = m[id] || [];
      if (m[id].indexOf(sl.n) < 0) m[id].push(sl.n);
    }));
    return m;
  };
  ctx.buildSecOf = function buildSecOf() {
    const m = {};
    (ctx.ch.notebook || []).forEach((s, i) => (s.hw || []).forEach(x => {
      const e = ctx.parseHw(x);
      (m[e.id] = m[e.id] || []).push({
        num: s.num,
        idx: i,
        parts: e.parts
      });
    }));
    return m;
  };
  ctx.firstSlide = function firstSlide(id) {
    const m = ctx.SM[id];
    return m ? Math.min.apply(null, m) : 999;
  };
  ctx.slideBadge = function slideBadge(id) {
    if (!ctx.ch.slides) return '';
    const m = ctx.SM[id];
    if (!m) return '<div class="hint" style="margin:-2px 0 8px">Slides: none (textbook only)</div>';
    return '<div class="hint" style="margin:-2px 0 8px">Slides: ' + m.slice().sort((a, b) => a - b).map(n => '<a href="#" data-slide="' + n + '">' + n + '</a>').join(', ') + '</div>';
  };
  ctx.tagLabel = function tagLabel(t) {
    if (!t) return '';
    if (/^Recommended/i.test(t)) return 'Assigned (recommended)';
    if (/^Extra practice/i.test(t)) return 'Optional practice';
    return t;
  };
  ctx.tagClass = function tagClass(t) {
    return /^(Assigned|Recommended)/i.test(t || '') ? 'asg' : 'opt';
  };
  ctx.ctl = function ctl(key) {
    return '<label class="chk"><input type="checkbox" data-hwdone="' + key + '" ' + (ctx.HWDONE[key] ? 'checked' : '') + '> Solved</label>' + '<button type="button" class="flag' + (ctx.REVIEW['hw:' + key] ? ' on' : '') + '" data-flag="hw:' + key + '" aria-label="Mark for review" title="Mark for review">⚑</button>';
  };
  ctx.stepsHTML = function stepsHTML(rows) {
    return '<ol class="steps">' + rows.map(r => '<li><span class="sl">' + r[0] + '</span>' + (r[1] ? '<span class="amt">' + r[1] + '</span>' : '') + '</li>').join('') + '</ol>';
  };
  ctx.solBody = function solBody(p) {
    let h = '';
    if (p.f) h += '<div class="fline"><b>Formula:</b> ' + p.f + '</div>';
    h += '<div class="stlabel"><b>Steps:</b></div>' + ctx.stepsHTML(p.rows);
    h += '<div class="finalans"><b>Final Answer:</b> ' + p.ans[0] + ': <span class="ansv">' + p.ans[1] + '</span></div>';
    if (p.calc) h += '<div class="calc"><b>Calculator:</b> ' + p.calc + '</div>';
    if (p.note) h += '<div class="note"><b>Note:</b> ' + p.note + '</div>';
    return h;
  };
  ctx.probHTML = function probHTML(pr, want, o, secNum) {
    o = o || {};
    const parts = want ? pr.parts.filter(p => want.indexOf(p.l) >= 0 || want.indexOf(p.ask) >= 0) : pr.parts;
    const key = ctx.ch.id + ':' + pr.id;
    let h = '<div class="prob2"' + ctx.homeworkAttributes(pr.id) + (o.idp ? ' id="' + o.idp + '-' + ctx.ch.id + '-' + pr.id + '"' : '') + '><div class="p2head"><h4>' + pr.title + '</h4>' + (pr.tag ? '<span class="badge ' + ctx.tagClass(pr.tag) + '">' + ctx.tagLabel(pr.tag) + '</span>' : '') + (o.noctl || o.print ? '' : '<span class="p2ctl">' + ctx.ctl(key) + '</span>') + '</div>';
    h += ctx.qBox(pr);
    h += '<div class="given"><b>Given:</b> ' + pr.given + '</div>';
    if (want && pr.parts.length > parts.length) {
      h += '<div class="hint"><b>This section:</b> ' + parts.map(p => p.l ? 'part ' + p.l : p.ask).join(', ') + '.';
      if (!o.print && !o.noxref) {
        const others = (ctx.SECOF[pr.id] || []).filter(s => s.num !== secNum);
        if (others.length) h += ' Other parts: ' + others.map(s => 'section ' + s.num + (s.parts ? ' (' + s.parts.join(', ') + ')' : '')).join('; ') + '.';
      }
      h += '</div>';
    }
    parts.forEach(p => {
      h += '<div class="part2"><div class="find"><b>Find:</b> ' + (p.l ? '(' + p.l + ') ' : '') + p.ask + '</div>';
      if (o.print) h += '<div class="solp">' + ctx.solBody(p) + '</div>';else h += '<details class="sol"' + (o.open ? ' open' : '') + '><summary>Show solution</summary>' + ctx.solBody(p) + '</details>';
      h += '</div>';
    });
    if (pr.why || pr.tip) {
      const inner = (pr.why ? '<div><b>Why it works:</b> ' + pr.why + '</div>' : '') + (pr.tip ? '<div class="extip"><b>Exam tip:</b> ' + pr.tip + '</div>' : '');
      if (o.print) h += '<div class="whyp">' + inner + '</div>';else h += '<details class="sol why"' + (o.open ? ' open' : '') + '><summary>Why it works</summary>' + inner + '</details>';
    }
    return h + '</div>';
  };
  ctx.conceptHTML = function conceptHTML(c, o) {
    o = o || {};
    const key = ctx.ch.id + ':' + c.id;
    let h = '<div class="prob2"' + ctx.homeworkAttributes(c.id) + (o.idp ? ' id="' + o.idp + '-' + ctx.ch.id + '-' + c.id + '"' : '') + '><div class="p2head"><h4>' + c.title + '</h4>' + (c.tag ? '<span class="badge ' + ctx.tagClass(c.tag) + '">' + ctx.tagLabel(c.tag) + '</span>' : '') + (o.noctl || o.print ? '' : '<span class="p2ctl">' + ctx.ctl(key) + '</span>') + '</div>';
    if (c.q) h += ctx.qBox(c);
    if (o.print) h += '<div class="solp"><b>Answer:</b>' + c.body + '</div>';else h += '<details class="sol"' + (o.open ? ' open' : '') + '><summary>Show answer</summary>' + c.body + '</details>';
    if (c.tip) {
      h += o.print ? '<div class="whyp"><div class="extip"><b>Exam tip:</b> ' + c.tip + '</div></div>' : '<div class="extip"><b>Exam tip:</b> ' + c.tip + '</div>';
    }
    return h + '</div>';
  };
  ctx.st1HTML = function st1HTML(want, secNum, o) {
    o = o || {};
    const rows = (ctx.ch.st1 || []).filter(r => !want || want.indexOf(r[0].charAt(0)) >= 0);
    const key = ctx.ch.id + ':st1@' + (secNum || 'all');
    let h = '<div class="prob2"' + ctx.homeworkAttributes('st1') + (o.idp && !secNum ? ' id="' + o.idp + '-' + ctx.ch.id + '-st1"' : '') + '><div class="p2head"><h4>ST-1 key terms</h4><span class="badge asg">Assigned</span>' + (o.noctl || o.print || !secNum ? '' : '<span class="p2ctl">' + ctx.ctl(key) + '</span>') + '</div>' + ctx.st1QBox(want);
    const tbl = '<div class="scroll"><table><tbody>' + rows.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></div>';
    if (o.print) h += '<div class="solp">' + tbl + '</div>';else h += '<details class="sol"' + (o.open ? ' open' : '') + '><summary>Show definitions</summary>' + tbl + '</details>';
    return h + '</div>';
  };
  ctx.itemHTML = function itemHTML(x, secNum, o) {
    const e = ctx.parseHw(x);
    if (e.id === 'st1') return ctx.st1HTML(e.parts, secNum, o);
    const pr = ctx.ch.homework.find(q => q.id === e.id);
    if (pr) return ctx.probHTML(pr, e.parts, o, secNum);
    const c = ctx.ch.homeworkConcept.find(q => q.id === e.id);
    if (c) return ctx.conceptHTML(c, o);
    return '';
  };
  ctx.examHTML = function examHTML(c, o) {
    o = o || {};
    const x = c.exam;
    if (!x) return '<p class="hint">Exam review is not available for this chapter yet.</p>';
    let h = '';
    h += '<div class="exblock"><h4>1. Most important concepts to understand</h4><ul>' + x.concepts.map(t => '<li>' + t + '</li>').join('') + '</ul></div>';
    h += '<div class="exblock"><h4>2. Essential formulas and when to use them</h4><div class="scroll"><table><thead><tr><th>Formula</th><th>Use it when</th></tr></thead><tbody>' + x.formulas.map(f => '<tr><td>' + f[0] + '</td><td>' + f[1] + '</td></tr>').join('') + '</tbody></table></div></div>';
    h += '<div class="exblock"><h4>3. Common mistakes</h4><ul>' + x.mistakes.map(t => '<li>' + t + '</li>').join('') + '</ul></div>';
    h += '<div class="exblock"><h4>4. Important differences between similar terms</h4><div class="scroll"><table><tbody>' + x.diffs.map(d => '<tr><td><b>' + d[0] + '</b></td><td>' + d[1] + '</td></tr>').join('') + '</tbody></table></div></div>';
    if (!o.print) {
      h += '<div class="exblock"><h4>5. Short self-test</h4><p class="hint">Try each question before opening the answer. The full quiz is under Exam prep.</p>';
      x.selftest.forEach((qi, n) => {
        const q = c.quiz && c.quiz[qi];
        if (!q) return;
        h += '<div class="stq"><b>' + (n + 1) + '.</b> ' + q.q + '<ol type="a">' + q.o.map(t => '<li>' + t + '</li>').join('') + '</ol><details class="sol"><summary>Show answer</summary><b>' + String.fromCharCode(97 + q.a) + '. ' + q.o[q.a] + '</b><br>' + q.e + '</details></div>';
      });
      h += '</div>';
    }
    h += '<div class="exblock"><h4>' + (o.print ? '5' : '6') + '. Checklist: I can confidently explain or calculate...</h4><ul class="chklist">' + x.checklist.map((t, i) => {
      const k = 'ex:' + c.id + ':' + i;
      return o.print ? '<li>☐ ' + t + '</li>' : '<li><label><input type="checkbox" data-exchk="' + k + '" ' + (ctx.EXCHK[k] ? 'checked' : '') + '> ' + t + '</label></li>';
    }).join('') + '</ul></div>';
    return h;
  };
  ctx.renderHomework = function renderHomework() {
    let h = '<h2>All homework (reference)</h2>';
    const calc = ctx.ch.calcNote || 'Calculator steps will be supplied alongside the original homework problems.';
    h += '<div class="callout">' + calc + '</div>';
    if (ctx.ch.slides) h += '<p class="hint">Listed in the order each problem first appears in your slides. For the study flow, use the Notebook tab, which puts each problem right after its concept.</p>';
    (ctx.ch.missingHw || []).forEach(m => {
      h += '<div class="callout"><b>Unavailable:</b> ' + m + '</div>';
    });
    ctx.ch.homework.slice().sort((a, b) => ctx.firstSlide(a.id) - ctx.firstSlide(b.id)).forEach(pr => {
      h += '<div class="card">' + ctx.slideBadge(pr.id) + ctx.probHTML(pr, null, {
        open: true,
        idp: 'hw'
      }) + '</div>';
    });
    h += '<h3>Conceptual questions</h3>';
    ctx.ch.homeworkConcept.slice().sort((a, b) => ctx.firstSlide(a.id) - ctx.firstSlide(b.id)).forEach(c => {
      h += '<div class="card">' + ctx.slideBadge(c.id) + ctx.conceptHTML(c, {
        open: true,
        idp: 'hw'
      }) + '</div>';
    });
    if (ctx.ch.st1 && ctx.ch.st1.length) {
      h += '<div class="card">' + ctx.slideBadge('st1') + ctx.st1HTML(null, null, {
        open: true,
        idp: 'hw',
        noctl: true
      }) + '</div>';
    }
    ctx.$('#p-homework').innerHTML = h;
  };
}
