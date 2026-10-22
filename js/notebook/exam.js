// Preserved original Notebook renderers, with instance-scoped dependencies.
export function installExam(ctx) {
  ctx.renderExamReview = function renderExamReview() {
    let h = '<h2>Exam review: ' + ctx.ch.title + '</h2>';
    h += '<p class="hint">Review in this order: concepts, formulas, mistakes, differences, then test yourself. Use Flashcards and Practice quiz (tabs above) for drills.</p>';
    const flagged = [];
    (ctx.ch.notebook || []).forEach((s, i) => {
      if (ctx.REVIEW['sec:' + ctx.ch.id + ':' + s.num]) flagged.push('<li><a href="#" data-go="' + ctx.ch.id + '|notebook|nb-' + ctx.ch.id + '-' + i + '">' + s.num + ' ' + s.title + '</a></li>');
    });
    h += '<h3>Difficult concepts (marked for review)</h3>';
    [...ctx.ch.homework, ...ctx.ch.homeworkConcept].forEach(p => {
      if (!ctx.REVIEW['hw:' + ctx.ch.id + ':' + p.id]) return;
      let idx = -1;
      (ctx.ch.notebook || []).forEach((s, i) => {
        if (idx < 0 && (s.hw || []).some(x => ctx.parseHw(x).id === p.id)) idx = i;
      });
      flagged.push('<li><a href="#" data-go="' + ctx.ch.id + '|notebook' + (idx >= 0 ? '|nb-' + ctx.ch.id + '-' + idx : '') + '">' + p.title + '</a></li>');
    });
    h += flagged.length ? '<div class="card"><ul>' + flagged.join('') + '</ul></div>' : '<p class="hint">Nothing marked. Tap ⚑ on a section or problem in the Notebook to list it here.</p>';
    h += '<div class="card nb"><div class="nbapply">' + ctx.examHTML(ctx.ch, {}) + '</div></div>';
    ctx.$('#p-examreview').innerHTML = h;
  };
}
