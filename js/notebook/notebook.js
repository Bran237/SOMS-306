// Preserved original Notebook renderers, with instance-scoped dependencies.
export function installNotebook(ctx) {
  ctx.renderNotebook = function renderNotebook() {
    const NB = ctx.ch.notebook;
    if (!NB) {
      ctx.$('#p-notebook').innerHTML = '<h2>Notebook</h2><p class="hint">No notebook outline for this chapter yet.</p>';
      return;
    }
    const notes = {};
    let h = '<h2>' + ctx.ch.title + '</h2>';
    h += '<div class="nbactions"><button class="btn primary" type="button" data-act="print">Print notebook</button><button class="btn" type="button" data-act="expand">Show all solutions</button><button class="btn" type="button" data-act="collapse">Hide all solutions</button></div>';
    h += '<div class="progress" id="nbProg"></div>';
    h += '<p class="hint">For each section: <b>A. Write this down</b> (copy into your notebook), then <b>B. Related homework</b> (try it, then open the solution). <i>Explain it to me</i> is optional reading and is not for copying.</p>';
    if (notes[ctx.ch.id]) h += '<div class="callout">' + notes[ctx.ch.id] + '</div>';
    (ctx.ch.missingHw || []).forEach(m => {
      h += '<div class="callout"><b>Unavailable:</b> ' + m + '</div>';
    });
    h += '<div class="nbtoc">' + NB.map((s, i) => '<a href="#" class="chip" data-nbjump="' + i + '">' + s.num + '</a>').join('') + '<a href="#" class="chip" data-nbjump="exam">Exam review</a></div>';
    NB.forEach((sec, i) => {
      const key = ctx.ch.id + ':' + sec.num;
      h += '<div class="card nb" id="nb-' + ctx.ch.id + '-' + i + '">';
      h += '<div class="nbhead"><span class="slnum">' + sec.num + '</span><h3>' + sec.title + '</h3><label class="nbchk"><input type="checkbox" data-nbdone="' + key + '" ' + (ctx.NBDONE[key] ? 'checked' : '') + '> Written in notebook</label><button type="button" class="flag' + (ctx.REVIEW['sec:' + key] ? ' on' : '') + '" data-flag="sec:' + key + '" aria-label="Mark for review" title="Mark for review">⚑</button></div>';
      h += '<div class="nbwrite"><div class="nbtitle">A. Write this down</div><ul>';
      sec.notes.forEach(n => {
        h += '<li>' + n + '</li>';
      });
      h += '</ul>';
      if (sec.terms && sec.terms.length) {
        h += '<div class="nbsub">★ Key terms</div><ul>' + sec.terms.map(t => '<li><b>' + t[0] + ':</b> ' + t[1] + '</li>').join('') + '</ul>';
      }
      if (sec.formulas && sec.formulas.length) {
        h += '<div class="nbsub">▭ Formulas (box these)</div>' + sec.formulas.map(f => '<div class="formula">' + f + '</div>').join('');
      }
      if (sec.tip) h += '<div class="slhow"><b>Exam reminder:</b> ' + sec.tip + '</div>';
      h += '</div>';
      if (sec.explain) h += '<details class="explain"><summary>Explain it to me <span class="hint">(optional, no need to copy)</span></summary><div class="explbody">' + sec.explain + '</div></details>';
      h += '<div class="nbapply"><div class="nbtitle">B. Related homework</div>';
      if (sec.hw && sec.hw.length) {
        sec.hw.forEach(x => {
          h += ctx.itemHTML(x, sec.num, {});
        });
      } else h += '<p class="hint">Homework has not been uploaded for this section yet.</p>';
      h += '</div></div>';
    });
    h += '<div class="card nb" id="nb-' + ctx.ch.id + '-exam"><div class="nbhead"><span class="slnum">Exam</span><h3>Exam review: ' + ctx.ch.title.split(':')[0] + '</h3></div><div class="nbapply">' + ctx.examHTML(ctx.ch, {}) + '</div></div>';
    ctx.$('#p-notebook').innerHTML = h;
    ctx.updateProgress();
  };
  ctx.buildPrint = function buildPrint() {
    const c = ctx.ch;
    let h = '<div class="pn"><h1>SOMS 306 · ' + c.title + '</h1><p class="pnsub">Notebook: essential notes followed by related worked homework</p>';
    (c.notebook || []).forEach(sec => {
      h += '<div class="pn-sec"><h2>Section ' + sec.num + ' — ' + sec.title + '</h2><h3>A. Write this down</h3><ul>';
      sec.notes.forEach(n => {
        h += '<li>' + n + '</li>';
      });
      h += '</ul>';
      if (sec.terms && sec.terms.length) h += '<p><b>★ Key terms</b></p><ul>' + sec.terms.map(t => '<li><b>' + t[0] + ':</b> ' + t[1] + '</li>').join('') + '</ul>';
      if (sec.formulas && sec.formulas.length) h += '<p><b>▭ Formulas</b></p>' + sec.formulas.map(f => '<div class="pformula">' + f + '</div>').join('');
      if (sec.tip) h += '<p class="pntip"><b>Exam reminder:</b> ' + sec.tip + '</p>';
      h += '<h3>B. Related homework</h3>';
      if (sec.hw && sec.hw.length) sec.hw.forEach(x => {
        h += ctx.itemHTML(x, sec.num, {
          print: true
        });
      });else h += '<p><i>No homework for this section.</i></p>';
      h += '</div>';
    });
    if (c.exam) h += '<div class="pn-sec"><h2>Exam review</h2>' + ctx.examHTML(c, {
      print: true
    }) + '</div>';
    h += '</div>';
    ctx.$('#printArea').innerHTML = h;
  };
}
