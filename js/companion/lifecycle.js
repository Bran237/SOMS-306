// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installLifecycle(ctx) {
  ctx.examNextQuestion = function examNextQuestion() {
    clearInterval(ctx.examState.timerId);
    ctx.examState.index++;
    if (ctx.examState.index >= ctx.examState.questions.length) {
      ctx.examState.phase = 'results';
    } else if (ctx.examState.config.timerSec) ctx.examState.timeLeft = ctx.examState.config.timerSec;
    ctx.render();
  };
  ctx.stopSpeedTimer = function stopSpeedTimer() {
    clearInterval(ctx.gameState.timerId);
  };
  ctx.afterRender = function afterRender() {
    if (ctx.MAIN_MODE === 'practice' && ctx.PRACTICE_TAB === 'exam' && ctx.examState.phase === 'active' && ctx.examState.config && ctx.examState.config.timerSec) {
      clearInterval(ctx.examState.timerId);
      const myExam = ctx.examState;
      myExam.timerId = setInterval(() => {
        if (ctx.examState !== myExam) {
          clearInterval(myExam.timerId);
          return;
        }
        myExam.timeLeft--;
        const d = ctx.dom.getElementById('ex-timer-display');
        if (d) d.textContent = myExam.timeLeft + 's';
        if (myExam.timeLeft <= 0) {
          ctx.recordExamAnswer(myExam.questions[myExam.index], false);
        }
      }, 1000);
    }
    if (ctx.MAIN_MODE === 'practice' && ctx.PRACTICE_TAB === 'games' && ctx.gameState.type === 'speed' && ctx.gameState.timeLeft > 0 && ctx.gameState.qs && ctx.gameState.qs[ctx.gameState.index] && !ctx.gameState.timerId) {
      const myGame = ctx.gameState;
      myGame.timerId = setInterval(() => {
        if (ctx.gameState !== myGame) {
          clearInterval(myGame.timerId);
          return;
        }
        myGame.timeLeft--;
        if (myGame.timeLeft <= 0 || !myGame.qs[myGame.index]) {
          clearInterval(myGame.timerId);
          myGame.timeLeft = 0;
          ctx.render();
        } else {
          const el = ctx.dom.querySelector('.timer-display');
          if (el) el.textContent = '⏳ ' + myGame.timeLeft + 's';
        }
      }, 1000);
    }
    if (ctx.MAIN_MODE === 'practice' && ctx.PRACTICE_TAB === 'crossword') {
      ctx.dom.querySelectorAll('.xw-cell input').forEach(inp => {
        if (inp._wired) return;
        inp._wired = true;
        inp.addEventListener('input', () => {
          inp.value = inp.value.toUpperCase().slice(-1);
          inp.classList.remove('ok', 'no');
          const r = parseInt(inp.dataset.r, 10),
            c = parseInt(inp.dataset.c, 10);
          if (inp.value) {
            const right = ctx.dom.querySelector(`.xw-cell input[data-r="${r}"][data-c="${c + 1}"]`);
            const down_ = ctx.dom.querySelector(`.xw-cell input[data-r="${r + 1}"][data-c="${c}"]`);
            if (right) right.focus();else if (down_) down_.focus();
          }
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && !inp.value) {
            const r = parseInt(inp.dataset.r, 10),
              c = parseInt(inp.dataset.c, 10);
            const left = ctx.dom.querySelector(`.xw-cell input[data-r="${r}"][data-c="${c - 1}"]`);
            if (left) left.focus();
          }
        });
      });
    }
  };
}
