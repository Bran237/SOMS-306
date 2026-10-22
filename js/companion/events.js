// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installEvents(ctx) {
  /* ================= ACTION DISPATCHER ================= */
  ctx.dom.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const fn = ctx.ACTIONS[action];
    if (fn) fn(el, e);
  });
  ctx.dom.addEventListener('change', e => {
    if (e.target.id === 'xwChapterSelect') {
      ctx.xwChapter = e.target.value;
      ctx.xwState = null;
      ctx.render();
    }
  });

  // ---- Contextual source-number tracing (click a sourced number to see it light up everywhere it matches) ----
  Object.assign(ctx.ACTIONS, {
    nav(el) {
      ctx.navigate(el.dataset.route, el.dataset.param);
    },
    cardsFilter(el) {
      ctx.cardsFilter[el.dataset.key] = el.dataset.val;
      ctx.render();
    },
    openConcept(el) {
      ctx.openConceptModal(el.dataset.id);
    },
    jumpLO(el) {
      ctx.setMainMode('study');
      setTimeout(() => ctx.jumpToLO(el.dataset.lo), 30);
    },
    modalJumpToLO(el) {
      const c = ctx.getConcept(el.dataset.id);
      ctx.closeModal();
      ctx.setMainMode('study');
      if (c) setTimeout(() => ctx.jumpToGlossaryTerm(c.id), 30);
    },
    enableReminders: async () => {
      const ok = await ctx.requestNotificationPermission();
      ctx.toast(ok ? 'Daily reminders enabled.' : 'Reminders need notification permission to work \u2014 try again and allow it.');
      ctx.closeModal();
      ctx.render();
    }
  });
}
