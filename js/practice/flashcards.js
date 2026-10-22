// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installFlashcards(ctx) {
  ctx.fcState = {
    deck: [],
    index: 0,
    flipped: false,
    filter: 'all',
    chapter: 'all',
    initialized: false
  };
  ctx.initFlashcardDeck = function initFlashcardDeck(filter, chapter) {
    filter = filter || ctx.fcState.filter;
    chapter = chapter !== undefined ? chapter : ctx.fcState.chapter;
    let pool = chapter === 'all' ? ctx.allConcepts() : ctx.conceptsForChapter(chapter);
    if (filter === 'difficult') pool = pool.filter(c => ctx.PROGRESS.flashcardStatus[c.id] === 'difficult');else if (filter === 'starred') pool = pool.filter(c => ctx.PROGRESS.flashcardStatus[c.id] === 'starred');else if (filter === 'must_know') pool = pool.filter(c => c.tier === 'must_know');
    ctx.fcState = {
      deck: pool,
      index: 0,
      flipped: false,
      filter,
      chapter,
      initialized: true
    };
  };
  ctx.viewFlashcards = function viewFlashcards() {
    if (!ctx.fcState.initialized) ctx.initFlashcardDeck(ctx.fcState.filter, ctx.fcState.chapter);
    const deck = ctx.fcState.deck;
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    if (!deck.length) return `<div class="panel-header"><h1>Flashcards</h1></div>
    <div class="wrap-row" style="margin-bottom:16px;">
      <button class="pill-btn ${ctx.fcState.chapter === 'all' ? 'active' : ''}" data-action="fcChapter" data-val="all">All Chapters</button>
      ${chapters.map(ch => `<button class="pill-btn ${ctx.fcState.chapter === ch.id ? 'active' : ''}" data-action="fcChapter" data-val="${ch.id}">Ch. ${ch.number}</button>`).join('')}
    </div>
    <div class="wrap-row" style="margin-bottom:16px;">
      ${[['all','All cards'],['must_know','Must Know'],['difficult','Study Difficult Cards'],['starred','Starred']].map(([value,label]) => `<button class="pill-btn ${ctx.fcState.filter === value ? 'active' : ''}" data-action="fcFilter" data-val="${value}">${label}</button>`).join('')}
    </div>
    <p class="empty-state">No cards match this filter yet.</p>`;
    const c = deck[ctx.fcState.index];
    const status = ctx.PROGRESS.flashcardStatus[c.id];
    const allCountForChapter = ctx.fcState.chapter === 'all' ? ctx.allConcepts().length : ctx.conceptsForChapter(ctx.fcState.chapter).length;
    return `
    <div class="panel-header"><h1>Flashcards</h1></div>
    <div class="wrap-row" style="margin-bottom:10px;">
      <button class="pill-btn ${ctx.fcState.chapter === 'all' ? 'active' : ''}" style="${ctx.fcState.chapter === 'all' ? 'background:var(--lo4);border-color:var(--lo4);' : ''}" data-action="fcChapter" data-val="all">All Chapters</button>
      ${chapters.map(ch => `<button class="pill-btn ${ctx.fcState.chapter === ch.id ? 'active' : ''}" style="${ctx.fcState.chapter === ch.id ? 'background:var(--lo4);border-color:var(--lo4);' : ''}" data-action="fcChapter" data-val="${ch.id}">Ch. ${ch.number}: ${ch.title}</button>`).join('')}
    </div>
    <div class="wrap-row" style="margin-bottom:16px;">
      <button class="pill-btn ${ctx.fcState.filter === 'all' ? 'active' : ''}" style="${ctx.fcState.filter === 'all' ? 'background:var(--ink);border-color:var(--ink);' : ''}" data-action="fcFilter" data-val="all">All (${allCountForChapter})</button>
      <button class="pill-btn ${ctx.fcState.filter === 'must_know' ? 'active' : ''}" style="${ctx.fcState.filter === 'must_know' ? 'background:var(--bad);border-color:var(--bad);' : ''}" data-action="fcFilter" data-val="must_know">Must Know</button>
      <button class="pill-btn ${ctx.fcState.filter === 'difficult' ? 'active' : ''}" style="${ctx.fcState.filter === 'difficult' ? 'background:var(--warn);border-color:var(--warn);' : ''}" data-action="fcFilter" data-val="difficult">Study Difficult Cards</button>
      <button class="pill-btn ${ctx.fcState.filter === 'starred' ? 'active' : ''}" style="${ctx.fcState.filter === 'starred' ? 'background:var(--accent);border-color:var(--accent);' : ''}" data-action="fcFilter" data-val="starred">Starred</button>
    </div>
    <div class="small-muted" style="text-align:center; margin-bottom:8px;">Card ${ctx.fcState.index + 1} of ${deck.length} &middot; <span class="mono">LO ${c.section}</span></div>
    <div class="fc-scene">
      <div class="fc-card ${ctx.fcState.flipped ? 'flipped' : ''}" data-action="fcFlip">
        <div class="fc-face front">
          <span class="lo-chip" style="background:${ctx.loTint(c.section)};color:${ctx.loColor(c.section)};margin-bottom:10px;">LO ${c.section}</span>
          <div class="fc-term">${c.term}</div>
          <div class="small-muted" style="margin-top:12px;">tap to flip</div>
        </div>
        <div class="fc-face back">
          <div class="fc-def">${c.definition}</div>
        </div>
      </div>
    </div>
    <div class="wrap-row" style="justify-content:center; margin-top:18px;">
      <button class="btn secondary small" data-action="fcNav" data-dir="-1">&larr; Prev</button>
      <button class="btn secondary small" data-action="fcShuffle">Shuffle</button>
      <button class="btn secondary small" data-action="fcNav" data-dir="1">Next &rarr;</button>
    </div>
    <div class="wrap-row" style="justify-content:center; margin-top:12px;">
      <button class="btn small ${status === 'know' ? '' : 'ghost'}" data-action="markFlashcard" data-id="${c.id}" data-status="know">Know It</button>
      <button class="btn small ${status === 'difficult' ? '' : 'ghost'}" data-action="markFlashcard" data-id="${c.id}" data-status="difficult">Mark Difficult</button>
      <button class="btn small ${status === 'starred' ? '' : 'ghost'}" data-action="markFlashcard" data-id="${c.id}" data-status="starred">&#9733; Star</button>
    </div>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    markFlashcard(el) {
      const id = el.dataset.id,
        status = el.dataset.status;
      ctx.PROGRESS.flashcardStatus[id] = ctx.PROGRESS.flashcardStatus[id] === status ? undefined : status;
      ctx.saveProgress();
      ctx.addXP(2);
      if (ctx.ACTIVE_MODAL && ctx.ACTIVE_MODAL.type === 'concept') ctx.renderModal();
      ctx.render();
    },
    fcFlip() {
      ctx.fcState.flipped = !ctx.fcState.flipped;
      if (ctx.fcState.flipped && ctx.fcState.deck[ctx.fcState.index]) {
        const c = ctx.fcState.deck[ctx.fcState.index];
        ctx.markFlashcardReviewed(c.chapterId, c.id);
      }
      ctx.render();
    },
    fcNav(el) {
      const dir = parseInt(el.dataset.dir, 10);
      ctx.fcState.index = (ctx.fcState.index + dir + ctx.fcState.deck.length) % ctx.fcState.deck.length;
      ctx.fcState.flipped = false;
      ctx.render();
    },
    fcShuffle() {
      ctx.fcState.deck = ctx.shuffleArr(ctx.fcState.deck);
      ctx.fcState.index = 0;
      ctx.fcState.flipped = false;
      ctx.render();
    },
    fcFilter(el) {
      ctx.initFlashcardDeck(el.dataset.val, undefined);
      ctx.render();
    },
    fcChapter(el) {
      ctx.initFlashcardDeck(undefined, el.dataset.val);
      ctx.render();
    }
  });
}
