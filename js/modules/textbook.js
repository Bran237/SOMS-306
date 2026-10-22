import { restoreHighlights, selectionOffsets } from '../core/highlights.js';

// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installTextbook(ctx) {
  ctx.renderStudyPanel = function renderStudyPanel() {
    const panel = ctx.dom.getElementById('modePanelStudy');
    if (!panel) return;
    panel.innerHTML = '';
    const toolbar = ctx.el(`<div class="hl-toolbar">
      <span class="lbl">Highlight:</span>
      ${ctx.HL_CATS.map(c => `<span class="swatch" data-cat="${c.key}" style="background:${c.color}">${c.label}</span>`).join('')}
      <button class="hl-clear" id="hlClearBtn">Clear highlights</button>
    </div>`);
    panel.appendChild(toolbar);
    ctx.CONTENT.course.chapters.forEach(chId => {
      const ch = ctx.CONTENT.chapters[chId];
      const los = ctx.CONTENT.learningObjectives.filter(l => l.chapterId === chId);
      const chWrap = ctx.el(`<div class="chapter-study" id="chapter-${ch.id}" data-chapter-id="${ch.id}"></div>`);
      chWrap.appendChild(ctx.el(`<p class="chapter-kicker">${los.length} learning objectives</p>`));
      chWrap.appendChild(ctx.el(`<h1 class="chapter-title">Chapter ${ch.number}: ${ch.title}</h1>`));
      los.forEach(lo => {
        const sec = ctx.el(`<section class="lo" id="sec-${lo.id}" data-chapter-id="${chId}" data-lo-ids="${lo.id}"></section>`);
        sec.appendChild(ctx.el(`<div class="lo-banner" style="background:${ctx.loColor(lo.code)}"><span class="lo-num">${lo.code}</span><h2>${lo.text}</h2></div>`));
        const card = ctx.el('<div class="lo-card"></div>');
        const proseSections = ctx.CONTENT.loProse && ctx.CONTENT.loProse[lo.code] || [];
        proseSections.forEach(s => {
          const block = ctx.el('<div class="lo-section"></div>');
          block.appendChild(ctx.el(`<h3 class="section-heading" style="color:${ctx.loColor(lo.code)}">${s.heading}</h3>`));
          const body = ctx.dom.createElement('div');
          body.innerHTML = s.html;
          while (body.firstChild) block.appendChild(body.firstChild);
          card.appendChild(block);
        });
        sec.appendChild(card);
        chWrap.appendChild(sec);
      });
      const wrap = ctx.CONTENT.chapterWrapUp && ctx.CONTENT.chapterWrapUp[chId] || null;
      if (wrap && wrap.title) {
        chWrap.appendChild(ctx.el(`<div class="wrapup-banner"><h3>${wrap.title}</h3></div>`));
        const wc = ctx.el('<div class="wrapup-card"></div>');
        wc.innerHTML = wrap.html;
        chWrap.appendChild(wc);
      }
      const cases = ctx.CONTENT.caseStudies.filter(cs => cs.chapterId === chId);
      if (cases.length) {
        chWrap.appendChild(ctx.el(`<div class="wrapup-banner"><h3>Case Studies &amp; Worked Examples</h3></div>`));
        const cwrap = ctx.el('<div class="wrapup-card" style="margin-bottom:26px;"></div>');
        cwrap.innerHTML = cases.map(cs => `
        <div class="card clickable" style="margin-bottom:10px;" data-action="jumpLO" data-lo="${ctx.sectionToLoId(cs.lo, chId) || ''}">
          <div class="flex-between"><b>${cs.title}</b><span class="lo-chip" style="background:${ctx.loTint(cs.lo)};color:${ctx.loColor(cs.lo)};">LO ${cs.lo}</span></div>
          <p style="font-size:13px;margin:8px 0;">${cs.summary}</p>
          <p class="small-muted"><i>${cs.whyItMatters}</i></p>
        </div>`).join('');
        chWrap.appendChild(cwrap);
      }
      chWrap.appendChild(ctx.el(`<div class="gloss-banner"><h3>Glossary <span class="gloss-note">(click a term to jump to it &middot; red dot = must-know)</span></h3></div>`));
      const table = ctx.el('<table class="gloss"><thead><tr><th>Term</th><th>Definition</th></tr></thead><tbody></tbody></table>');
      const tbody = table.querySelector('tbody');
      const glossConcepts = ctx.conceptsForChapter(chId).slice().sort((a, b) => a.term.localeCompare(b.term));
      tbody.innerHTML = glossConcepts.map(c => `
      <tr><td class="term-cell" data-cid="${c.id}" style="border-left-color:${ctx.loColor(c.section)};background:${ctx.loTint(c.section)};">${c.term}${c.tier === 'must_know' ? ' <span class="tier-mk">&#9679;</span>' : ''}</td>
      <td>${c.definition}</td></tr>`).join('');
      chWrap.appendChild(table);
      panel.appendChild(chWrap);
    });
    panel.querySelectorAll('table.gloss td.term-cell').forEach(cell => {
      cell.addEventListener('click', () => ctx.jumpToGlossaryTerm(cell.dataset.cid));
    });
    panel.querySelectorAll("span.term[data-cid]").forEach(span => {
      span.addEventListener('click', e => {
        e.stopPropagation();
        ctx.openConceptModal(span.dataset.cid);
      });
    });
    restoreHighlights(panel, ctx.PROGRESS.highlights, ctx.hlCatColor);
    ctx.attachHighlightHandlers(panel);
  };
  ctx.attachHighlightHandlers = function attachHighlightHandlers(panel) {
    ctx.highlightEvents?.abort();
    ctx.highlightEvents = new AbortController();
    panel.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        if (ctx.hlCategory === sw.dataset.cat) {
          ctx.hlCategory = null;
          panel.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        } else {
          ctx.hlCategory = sw.dataset.cat;
          panel.querySelectorAll('.swatch').forEach(s => s.classList.toggle('selected', s === sw));
        }
      });
    });
    const clearBtn = panel.querySelector('#hlClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      panel.querySelectorAll('mark.uhl').forEach(ctx.unwrapMark);
      ctx.PROGRESS.highlights.splice(0);
      ctx.saveProgress();
    });
    panel.addEventListener('mouseup', e => {
      if (e.target.tagName === 'MARK' && e.target.classList.contains('uhl')) {
        const id = e.target.dataset.hid;
        panel.querySelectorAll('mark.uhl').forEach(mark => {
          if (mark.dataset.hid === id) ctx.unwrapMark(mark);
        });
        if (id) {
          const index = ctx.PROGRESS.highlights.findIndex(h => h.id === id);
          if (index !== -1) ctx.PROGRESS.highlights.splice(index, 1);
          ctx.saveProgress();
        }
        return;
      }
      if (!ctx.hlCategory) return;
      if (e.target.closest('.hl-toolbar') || e.target.closest('table.gloss')) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      if (!panel.contains(sel.anchorNode)) return;
      const text = sel.toString().trim();
      if (!text || text.length < 2) return;
      try {
        const range = sel.getRangeAt(0);
        const sourceSec = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest('section.lo');
        const anchor = sourceSec ? selectionOffsets(sourceSec, range) : null;
        const mark = ctx.dom.createElement('mark');
        const hid = ctx.uid('hl');
        mark.className = 'uhl';
        mark.dataset.hid = hid;
        mark.style.background = ctx.hlCatColor(ctx.hlCategory);
        if (!anchor) range.surroundContents(mark);
        sel.removeAllRanges();
        ctx.PROGRESS.highlights.push({
          id: hid,
          ts: Date.now(),
          text,
          category: ctx.hlCategory,
          note: '',
          ...(anchor ? { anchor } : {}),
          source: {
            type: 'lo',
            id: sourceSec ? sourceSec.id.replace('sec-', '') : '',
            label: sourceSec ? sourceSec.querySelector('h2').textContent : 'Study text'
          }
        });
        if (anchor) restoreHighlights(panel, ctx.PROGRESS.highlights, ctx.hlCatColor);
        ctx.saveProgress();
        ctx.addXP(1);
        ctx.toast('Highlight saved (' + ctx.hlCategory + ')');
      } catch (err) {
        sel.removeAllRanges();
      }
    }, { signal: ctx.highlightEvents.signal });
  };
  ctx.unwrapMark = function unwrapMark(m) {
    const parent = m.parentNode;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parent.normalize();
  };
  ctx.srcTraceTimer = null;
  ctx.clearSrcTrace = function clearSrcTrace() {
    ctx.dom.querySelectorAll('.src-box.active').forEach(b => b.classList.remove('active'));
    ctx.dom.querySelectorAll('tr.src-row-active').forEach(t => t.classList.remove('src-row-active'));
  };
  ctx.dom.addEventListener('click', e => {
    const box = e.target.closest('.src-box');
    if (!box) return;
    const lnClass = [...box.classList].find(c => c.startsWith('ln-') || c.startsWith('ln2-'));
    if (!lnClass) return; // calc-result and other non-sourced boxes aren't traceable
    const isY2020 = box.classList.contains('y2020');
    clearTimeout(ctx.srcTraceTimer);
    ctx.clearSrcTrace();
    const matches = [...ctx.dom.querySelectorAll('.src-box.' + lnClass)].filter(b => b.classList.contains('y2020') === isY2020);
    matches.forEach(m => {
      m.classList.add('active');
      const row = m.closest('tr');
      if (row) row.classList.add('src-row-active');
      const details = m.closest('details.src-fold');
      if (details && !details.open) details.open = true;
    });
    const scrollTarget = matches.find(m => m !== box) || matches[0];
    if (scrollTarget) {
      scrollTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
    ctx.srcTraceTimer = setTimeout(ctx.clearSrcTrace, 4000);
  });

  // ================= FLOW PANEL RENDER FUNCTIONS =================
  Object.assign(ctx.ACTIONS, {
    highlightGo(el) {
      ctx.setMainMode('study');
      setTimeout(() => ctx.jumpToLO(el.dataset.id), 30);
    },
    deleteHighlight(el) {
      const index = ctx.PROGRESS.highlights.findIndex(h => h.id === el.dataset.id);
      if (index !== -1) ctx.PROGRESS.highlights.splice(index, 1);
      ctx.dom.querySelectorAll('mark.uhl').forEach(mark => {
        if (mark.dataset.hid === el.dataset.id) ctx.unwrapMark(mark);
      });
      ctx.saveProgress();
      ctx.render();
    }
  });
}
