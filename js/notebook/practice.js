// Preserved original Notebook renderers, with instance-scoped dependencies.
export function installPractice(ctx) {
  ctx.fcBuild = function fcBuild() {
    let all = ctx.ch.cards.map((c, idx) => Object.assign({
      id: idx
    }, c));
    if (ctx.fc.filter === 'term') all = all.filter(c => c.k === 'term');
    if (ctx.fc.filter === 'formula') all = all.filter(c => c.k === 'formula');
    if (ctx.fc.filter === 'review') all = all.filter(c => !ctx.fc.got.has(c.id));
    ctx.fc.deck = all;
    ctx.fc.i = 0;
    ctx.fc.flipped = false;
  };
  ctx.fcShuffle = function fcShuffle() {
    for (let i = ctx.fc.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ctx.fc.deck[i], ctx.fc.deck[j]] = [ctx.fc.deck[j], ctx.fc.deck[i]];
    }
    ctx.fc.i = 0;
    ctx.fc.flipped = false;
  };
  ctx.fcRender = function fcRender() {
    const total = ctx.ch.cards.length;
    let h = '<h2>Flashcards</h2>';
    h += '<div class="toolbar" role="group" aria-label="Filter cards">';
    [['all', 'All'], ['term', 'Terms'], ['formula', 'Formulas'], ['review', 'Still reviewing']].forEach(f => {
      h += '<button class="btn" data-filter="' + f[0] + '" aria-pressed="' + (ctx.fc.filter === f[0]) + '">' + f[1] + '</button>';
    });
    h += '<button class="btn" id="fcShuffle">Shuffle</button></div>';
    if (!ctx.fc.deck.length) {
      h += '<div class="card">' + (ctx.fc.filter === 'review' ? 'Every card is marked as known. Switch to "All" to start over.' : 'No cards here.') + '</div>';
    } else {
      const c = ctx.fc.deck[ctx.fc.i];
      ctx.fc.seen.add(c.id);
      h += '<div class="progress">Card ' + (ctx.fc.i + 1) + ' of ' + ctx.fc.deck.length + ' · Seen ' + ctx.fc.seen.size + '/' + total + ' · Known ' + ctx.fc.got.size + '/' + total + '<div class="bar"><i style="width:' + Math.round(ctx.fc.got.size / total * 100) + '%"></i></div></div>';
      h += '<button class="flash ' + (ctx.fc.flipped ? 'back' : 'front') + '" id="fcCard" aria-label="Flip card">';
      h += '<div class="side">' + (ctx.fc.flipped ? 'Answer' : c.k === 'formula' ? 'Formula' : 'Term') + (ctx.fc.flipped ? '' : ' · tap to flip') + '</div>';
      h += '<div class="text">' + (ctx.fc.flipped ? c.b : c.f) + '</div></button>';
      h += '<div class="toolbar"><button class="btn" id="fcPrev">Previous</button><button class="btn" id="fcFlip">Flip</button><button class="btn" id="fcNext">Next</button></div>';
      h += '<div class="toolbar"><button class="btn primary" id="fcGot">I know this</button><button class="btn" id="fcAgain">Keep reviewing</button></div>';
    }
    ctx.$('#p-cards').innerHTML = h;
    ctx.$('#p-cards').querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
      ctx.fc.filter = b.dataset.filter;
      ctx.fcBuild();
      ctx.fcRender();
    }));
    const sh = ctx.$('#fcShuffle');
    if (sh) sh.addEventListener('click', () => {
      ctx.fcShuffle();
      ctx.fcRender();
    });
    if (ctx.fc.deck.length) {
      const flip = () => {
        ctx.fc.flipped = !ctx.fc.flipped;
        ctx.fcRender();
        ctx.$('#fcCard').focus();
      };
      ctx.$('#fcCard').addEventListener('click', flip);
      ctx.$('#fcFlip').addEventListener('click', flip);
      ctx.$('#fcNext').addEventListener('click', () => {
        ctx.fc.i = (ctx.fc.i + 1) % ctx.fc.deck.length;
        ctx.fc.flipped = false;
        ctx.fcRender();
      });
      ctx.$('#fcPrev').addEventListener('click', () => {
        ctx.fc.i = (ctx.fc.i - 1 + ctx.fc.deck.length) % ctx.fc.deck.length;
        ctx.fc.flipped = false;
        ctx.fcRender();
      });
      ctx.$('#fcGot').addEventListener('click', () => {
        ctx.fc.got.add(ctx.fc.deck[ctx.fc.i].id);
        ctx.fc.i = (ctx.fc.i + 1) % ctx.fc.deck.length;
        ctx.fc.flipped = false;
        ctx.fcRender();
      });
      ctx.$('#fcAgain').addEventListener('click', () => {
        ctx.fc.got.delete(ctx.fc.deck[ctx.fc.i].id);
        ctx.fc.i = (ctx.fc.i + 1) % ctx.fc.deck.length;
        ctx.fc.flipped = false;
        ctx.fcRender();
      });
    }
    ctx.persistCards();
  };
  ctx.qzReset = function qzReset() {
    ctx.qz.i = 0;
    ctx.qz.picked = null;
    ctx.qz.score = 0;
    ctx.qz.missed = [];
    ctx.qz.done = false;
  };
  ctx.qzRender = function qzRender() {
    const Q = ctx.ch.quiz;
    let h = '<h2>Mini quiz</h2>';
    if (ctx.qz.done) {
      h += '<div class="card"><div class="score">' + ctx.qz.score + ' / ' + Q.length + '</div>';
      h += '<p>' + (ctx.qz.score === Q.length ? 'Perfect score.' : ctx.qz.score >= Q.length * 0.8 ? 'Strong. Review the ones you missed below.' : 'Go back through the Summary and Homework tabs, then retake.') + '</p>';
      if (ctx.qz.missed.length) {
        h += '<h3>Review what you missed</h3>';
        ctx.qz.missed.forEach(m => {
          h += '<div class="fb no"><b>' + Q[m].q + '</b><br>Correct answer: ' + Q[m].o[Q[m].a] + '<br>' + Q[m].e + '</div>';
        });
      }
      h += '<button class="btn primary" id="qzRetake">Retake quiz</button></div>';
    } else {
      const q = Q[ctx.qz.i];
      h += '<div class="progress">Question ' + (ctx.qz.i + 1) + ' of ' + Q.length + ' · Score ' + ctx.qz.score + '<div class="bar"><i style="width:' + Math.round(ctx.qz.i / Q.length * 100) + '%"></i></div></div>';
      h += '<div class="card"><p><b>' + q.q + '</b></p>';
      q.o.forEach((o, idx) => {
        let cls = 'opt';
        if (ctx.qz.picked !== null) {
          if (idx === q.a) cls += ' right';else if (idx === ctx.qz.picked) cls += ' wrong';
        }
        h += '<button class="' + cls + '" data-idx="' + idx + '" ' + (ctx.qz.picked !== null ? 'disabled' : '') + '>' + o + '</button>';
      });
      if (ctx.qz.picked !== null) {
        const ok = ctx.qz.picked === q.a;
        h += '<div class="fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? 'Correct.' : 'Not quite.') + '</b> ' + q.e + '</div>';
        h += '<button class="btn primary" id="qzNext">' + (ctx.qz.i === Q.length - 1 ? 'See score' : 'Next question') + '</button>';
      }
      h += '</div>';
    }
    ctx.$('#p-quiz').innerHTML = h;
    ctx.$('#p-quiz').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const idx = +b.dataset.idx;
      ctx.qz.picked = idx;
      ctx.recordNotebookQuiz(ctx.ch.quiz[ctx.qz.i], idx, ctx.qz.i);
      if (idx === ctx.ch.quiz[ctx.qz.i].a) ctx.qz.score++;else ctx.qz.missed.push(ctx.qz.i);
      ctx.qzRender();
    }));
    const nx = ctx.$('#qzNext');
    if (nx) nx.addEventListener('click', () => {
      if (ctx.qz.i === ctx.ch.quiz.length - 1) {
        ctx.qz.done = true;
      } else {
        ctx.qz.i++;
      }
      ctx.qz.picked = null;
      ctx.qzRender();
    });
    const rt = ctx.$('#qzRetake');
    if (rt) rt.addEventListener('click', () => {
      ctx.qzReset();
      ctx.qzRender();
    });
  };
}
