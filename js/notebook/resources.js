// Preserved original Notebook renderers, with instance-scoped dependencies.
export function installResources(ctx) {
  ctx.renderSummary = function renderSummary() {
    ctx.$('#p-summary').innerHTML = '<p class="hint">Full chapter summary for reading. The Notebook tab has the short version to copy.</p>' + ctx.ch.summary;
  };
  ctx.hwSummaryLabels = function hwSummaryLabels(sl) {
    return sl.hw.map(x => ctx.parseHw(x).label).join(' · ');
  };
  ctx.renderSlides = function renderSlides() {
    const S = ctx.ch.slides;
    if (!S) {
      ctx.$('#p-slides').innerHTML = '<h2>Lecture slides</h2><p class="hint">No slide map for this chapter yet.</p>';
      return;
    }
    let h = '<h2>Lecture slides and homework</h2>';
    h += '<p>Follow your professor\'s slides in order. Each card has the slide\'s content, a plain-language explanation, and a collapsible window with the related homework and its full solutions.</p>';
    const last = S[S.length - 1].n;
    h += '<div class="sltools"><label>Jump to slide <input type="number" id="slJump" min="1" max="' + last + '" inputmode="numeric"></label><label><input type="checkbox" id="slOnly" ' + (ctx.sm.only ? 'checked' : '') + '> Only slides with homework</label><button class="btn" id="slOpen" type="button">Open all homework</button><button class="btn" id="slClose" type="button">Close all</button></div>';
    S.forEach(sl => {
      if (ctx.sm.only && !(sl.hw && sl.hw.length)) return;
      h += '<div class="card slide" id="slide-' + sl.n + '"><div class="slhead"><span class="slnum">Slide ' + sl.n + '</span><b>' + sl.t + '</b></div>';
      h += '<div class="slk"><b>On the slide:</b> ' + sl.k + '</div>';
      if (sl.ex) h += '<div class="slex"><b>Explained:</b> ' + sl.ex + '</div>';
      if (sl.how) h += '<div class="slhow"><b>Compare:</b> ' + sl.how + '</div>';
      if (sl.hw && sl.hw.length) {
        h += '<details class="hwd" id="slhw-' + sl.n + '"><summary>Homework for this slide (' + sl.hw.length + '): ' + ctx.hwSummaryLabels(sl) + '</summary><div class="hwin">';
        sl.hw.forEach(x => {
          h += ctx.itemHTML(x, null, {
            open: true,
            noctl: true,
            noxref: true
          });
        });
        h += '</div></details>';
      } else h += '<div class="hint" style="margin-top:8px">No homework for this slide.</div>';
      h += '</div>';
    });
    const items = [...ctx.ch.homework, ...ctx.ch.homeworkConcept.filter(c => c.id !== 'qst3c')];
    const unmapped = items.filter(x => !ctx.SM[x.id]);
    if (unmapped.length) {
      h += '<h3>Not on any slide</h3><div class="callout">These are in the textbook and the assigned list but not on your slides. Ask your professor whether they will be tested.</div>';
      h += '<details class="hwd"><summary>Homework not tied to a slide (' + unmapped.length + '): ' + unmapped.map(x => x.title.replace(/\s*\(.*$/, '').replace(/:.*$/, '')).join(' · ') + '</summary><div class="hwin">';
      unmapped.forEach(x => {
        h += ctx.itemHTML(x.id, null, {
          open: true,
          noctl: true
        });
      });
      h += '</div></details>';
    }
    h += '<h3>Homework to slides</h3><div class="scroll"><table><thead><tr><th>Homework</th><th>Slides</th></tr></thead><tbody>';
    const ids = [...ctx.ch.homework.map(x => x.id), ...ctx.ch.homeworkConcept.filter(c => c.id !== 'qst3c').map(x => x.id)];
    if (ctx.ch.st1 && ctx.ch.st1.length) ids.push('st1');
    ids.sort((a, b) => ctx.firstSlide(a) - ctx.firstSlide(b));
    ids.forEach(id => {
      const m = ctx.SM[id];
      const it = ctx.ch.homework.find(x => x.id === id) || ctx.ch.homeworkConcept.find(x => x.id === id);
      const label = id === 'st1' ? 'ST-1 key terms' : it.title.replace(/\s*\(.*$/, '');
      h += '<tr><td>' + label + '</td><td>' + (m ? m.slice().sort((a, b) => a - b).map(n => '<a href="#" data-slide="' + n + '">' + n + '</a>').join(', ') : '<span class="hint">none (textbook only)</span>') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    ctx.$('#p-slides').innerHTML = h;
  };
  ctx.goSlide = function goSlide(n) {
    ctx.showTab('slides');
    let el = ctx.dom.getElementById('slide-' + n);
    if (!el && ctx.sm.only) {
      ctx.sm.only = false;
      ctx.renderSlides();
      el = ctx.dom.getElementById('slide-' + n);
    }
    const d = ctx.dom.getElementById('slhw-' + n);
    if (d) d.open = true;
    if (el) {
      el.scrollIntoView();
      ctx.flash(el);
    }
  };
  ctx.renderVideo = function renderVideo() {
    const v = ctx.ch.video;
    if (!v || !v.id) {
      ctx.$('#p-video').innerHTML = '<h2>Video guide</h2><p class="hint">No video references have been uploaded for this chapter yet.</p>';
      return;
    }
    const base = 'https://www.youtube.com/watch?v=' + v.id + '&t=';
    let h = '<h2>Video guide</h2>';
    h += '<div class="callout"><b>Heads up:</b> ' + v.caution + '</div>';
    h += '<p class="hint">Times are linked, so tapping one opens the video at that spot.</p>';
    if (v.rows && v.rows.length) {
      h += '<div class="scroll"><table><thead><tr><th>Homework</th><th>Watch</th></tr></thead><tbody>';
      v.rows.forEach(r => {
        h += '<tr><td><b>' + r.hw + '</b><br><span class="hint">' + r.why + '</span></td><td>';
        r.clips.forEach(c => {
          h += '<div style="margin-bottom:6px"><a href="' + base + c[0] + 's" target="_blank" rel="noopener">' + c[1] + '</a><br><span class="hint">' + c[2] + '</span></div>';
        });
        h += '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '<p class="note">' + v.missing + '</p>';
    if (v.later && v.later.length) {
      h += '<h3>Save for Chapter 5</h3><ul>';
      v.later.forEach(c => {
        h += '<li><a href="' + base + c[0] + 's" target="_blank" rel="noopener">' + c[1] + '</a>: ' + c[2] + '</li>';
      });
      h += '</ul>';
    }
    ctx.$('#p-video').innerHTML = h;
  };
}
