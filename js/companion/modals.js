// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installModals(ctx) {
  ctx.renderModal = function renderModal() {
    const root = ctx.dom.getElementById('modalRoot');
    if (!root) return;
    if (!ctx.ACTIVE_MODAL) {
      root.innerHTML = '';
      return;
    }
    if (ctx.ACTIVE_MODAL.type === 'concept') root.innerHTML = ctx.conceptModalHTML(ctx.ACTIVE_MODAL.id);else if (ctx.ACTIVE_MODAL.type === 'settings') root.innerHTML = ctx.settingsModalHTML();
    const backdrop = root.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', e => {
      if (e.target === backdrop) ctx.closeModal();
    });
    const closeBtn = root.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', ctx.closeModal);
    ctx.wireModalActions();
  };
  ctx.conceptModalHTML = function conceptModalHTML(conceptId) {
    const c = ctx.getConcept(conceptId);
    if (!c) return '';
    const stat = ctx.conceptAccuracy(c.id);
    const status = ctx.PROGRESS.flashcardStatus[c.id];
    return `<div class="modal-backdrop"><div class="modal-box">
    <button class="modal-close">&times;</button>
    <div class="wrap-row" style="margin-bottom:10px;">
      <span class="badge badge-tier-${c.tier}">${c.tier === 'must_know' ? 'Must Know' : 'Supporting Detail'}</span>
      <span class="lo-chip" style="background:${ctx.loTint(c.section)};color:${ctx.loColor(c.section)};">LO ${c.section}</span>
      ${stat ? `<span class="lo-chip" style="background:var(--paper-2);">Your accuracy: ${stat.accuracy}%</span>` : ''}
    </div>
    <h2 style="margin-bottom:10px;">${c.term}</h2>
    ${c.formula ? `<div class="formula-box" style="margin-bottom:14px;"><span class="formula-label">Formula</span><div class="formula-eq">${c.formula}</div></div>` : ''}
    <div class="concept-field"><div class="fl">DEFINITION</div><div class="fv">${c.definition}</div></div>
    ${c.plain ? `<div class="concept-field"><div class="fl">PLAIN-ENGLISH EXPLANATION</div><div class="fv">${c.plain}</div></div>` : ''}
    ${c.why ? `<div class="concept-field"><div class="fl">WHY IT MATTERS</div><div class="fv">${c.why}</div></div>` : ''}
    ${c.example ? `<div class="concept-field"><div class="fl">EASY-TO-REMEMBER EXAMPLE</div><div class="fv">${c.example}</div></div>` : ''}
    ${c.textbookExample ? `<div class="concept-field"><div class="fl">TEXTBOOK EXAMPLE</div><div class="fv">${c.textbookExample}</div></div>` : ''}
    ${c.commonMistake ? `<div class="concept-field"><div class="fl">COMMON MISTAKE / CONFUSION</div><div class="fv">${c.commonMistake}</div></div>` : ''}
    ${c.mnemonic ? `<div class="concept-field"><div class="fl">MEMORY TRICK</div><div class="fv">${c.mnemonic}</div></div>` : ''}
    ${c.examQuestion ? `<div class="concept-field"><div class="fl">POSSIBLE EXAM QUESTION</div><div class="fv"><i>${c.examQuestion}</i></div></div>` : ''}
    <div class="wrap-row" style="margin-top:14px;">
      <button class="btn small ${status === 'know' ? 'primary' : ''}" data-action="markFlashcard" data-id="${c.id}" data-status="know">Know It</button>
      <button class="btn small ${status === 'difficult' ? 'primary' : ''}" data-action="markFlashcard" data-id="${c.id}" data-status="difficult">Mark Difficult</button>
      <button class="btn small ${status === 'starred' ? 'primary' : ''}" data-action="markFlashcard" data-id="${c.id}" data-status="starred">&#9733; Star</button>
      <button class="btn small ghost" data-action="modalJumpToLO" data-id="${c.id}">Go to this section &rarr;</button>
    </div>
  </div></div>`;
  };
  ctx.wireModalActions = function wireModalActions() {};
}
