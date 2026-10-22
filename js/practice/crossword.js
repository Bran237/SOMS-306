// Preserved Study Companion feature. Dependencies are provided by its instance context.
export function installCrossword(ctx) {
  ctx.xwState = null;
  ctx.xwChapter = 'ch1';
  ctx.buildCrossword = function buildCrossword(wordList) {
    const GRID = 24;
    const grid = [];
    for (let r = 0; r < GRID; r++) grid.push(new Array(GRID).fill(null));
    const placements = [];
    const words = ctx.shuffleArr(wordList.slice()).sort((a, b) => b.answer.length - a.answer.length);
    function inb(r, c) {
      return r >= 0 && c >= 0 && r < GRID && c < GRID;
    }
    function get(r, c) {
      return inb(r, c) ? grid[r][c] : undefined;
    }
    function canPlace(answer, row, col, dir) {
      for (let i = 0; i < answer.length; i++) {
        const r = dir === 'down' ? row + i : row,
          c = dir === 'across' ? col + i : col;
        if (!inb(r, c)) return false;
        const cell = grid[r][c];
        if (cell && cell !== answer[i]) return false;
        if (!cell) {
          if (dir === 'across') {
            if (get(r - 1, c) || get(r + 1, c)) return false;
          } else {
            if (get(r, c - 1) || get(r, c + 1)) return false;
          }
        }
      }
      if (dir === 'across') {
        if (get(row, col - 1) || get(row, col + answer.length)) return false;
      } else {
        if (get(row - 1, col) || get(row + answer.length, col)) return false;
      }
      return true;
    }
    function place(answer, row, col, dir) {
      for (let i = 0; i < answer.length; i++) {
        const r = dir === 'down' ? row + i : row,
          c = dir === 'across' ? col + i : col;
        grid[r][c] = answer[i];
      }
    }
    const first = words[0];
    const startRow = Math.floor(GRID / 2),
      startCol = Math.floor((GRID - first.answer.length) / 2);
    place(first.answer, startRow, startCol, 'across');
    placements.push({
      answer: first.answer,
      clue: first.clue,
      row: startRow,
      col: startCol,
      dir: 'across'
    });
    for (let wi = 1; wi < words.length; wi++) {
      const w = words[wi];
      let best = null;
      for (let pi = 0; pi < placements.length && !best; pi++) {
        const p = placements[pi];
        for (let i = 0; i < w.answer.length && !best; i++) {
          for (let j = 0; j < p.answer.length && !best; j++) {
            if (w.answer[i] !== p.answer[j]) continue;
            const dir = p.dir === 'across' ? 'down' : 'across';
            let row, col;
            if (dir === 'down') {
              row = p.row - i;
              col = p.col + j;
            } else {
              row = p.row + j;
              col = p.col - i;
            }
            if (canPlace(w.answer, row, col, dir)) best = {
              row,
              col,
              dir
            };
          }
        }
      }
      if (best) {
        place(w.answer, best.row, best.col, best.dir);
        placements.push({
          answer: w.answer,
          clue: w.clue,
          row: best.row,
          col: best.col,
          dir: best.dir
        });
      } else {
        outer: for (let r2 = 0; r2 < GRID; r2++) {
          for (let c2 = 0; c2 <= GRID - w.answer.length; c2++) {
            if (canPlace(w.answer, r2, c2, 'across')) {
              place(w.answer, r2, c2, 'across');
              placements.push({
                answer: w.answer,
                clue: w.clue,
                row: r2,
                col: c2,
                dir: 'across'
              });
              break outer;
            }
          }
        }
      }
    }
    let minR = GRID,
      maxR = 0,
      minC = GRID,
      maxC = 0;
    placements.forEach(p => {
      const r2 = p.dir === 'down' ? p.row + p.answer.length - 1 : p.row;
      const c2 = p.dir === 'across' ? p.col + p.answer.length - 1 : p.col;
      minR = Math.min(minR, p.row);
      maxR = Math.max(maxR, r2);
      minC = Math.min(minC, p.col);
      maxC = Math.max(maxC, c2);
    });
    placements.forEach(p => {
      p.row -= minR;
      p.col -= minC;
    });
    const rows = maxR - minR + 1,
      cols = maxC - minC + 1;
    const hasLetter = [];
    for (let r = 0; r < rows; r++) hasLetter.push(new Array(cols).fill(false));
    const solution = [];
    for (let r = 0; r < rows; r++) solution.push(new Array(cols).fill(null));
    placements.forEach(p => {
      for (let i = 0; i < p.answer.length; i++) {
        const r = p.dir === 'down' ? p.row + i : p.row,
          c = p.dir === 'across' ? p.col + i : p.col;
        hasLetter[r][c] = true;
        solution[r][c] = p.answer[i];
      }
    });
    const numberGrid = [];
    for (let r = 0; r < rows; r++) numberGrid.push(new Array(cols).fill(null));
    let num = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!hasLetter[r][c]) continue;
        const startsAcross = (c === 0 || !hasLetter[r][c - 1]) && c + 1 < cols && hasLetter[r][c + 1];
        const startsDown = (r === 0 || !hasLetter[r - 1][c]) && r + 1 < rows && hasLetter[r + 1][c];
        if (startsAcross || startsDown) {
          numberGrid[r][c] = num;
          num++;
        }
      }
    }
    placements.forEach(p => {
      p.number = numberGrid[p.row][p.col];
    });
    placements.sort((a, b) => a.number - b.number || (a.dir > b.dir ? 1 : -1));
    return {
      rows,
      cols,
      hasLetter,
      solution,
      numberGrid,
      placements
    };
  };
  ctx.viewCrosswordGame = function viewCrosswordGame() {
    if (!ctx.xwState) ctx.xwState = ctx.buildCrossword(ctx.CONTENT.crossword && ctx.CONTENT.crossword[ctx.xwChapter] || []);
    const xw = ctx.xwState;
    const chapters = ctx.CONTENT.course.chapters.map(id => ctx.CONTENT.chapters[id]);
    let gridHtml = `<div class="xw-grid" style="grid-template-columns:repeat(${xw.cols},25px);grid-template-rows:repeat(${xw.rows},25px);display:grid;">`;
    for (let r = 0; r < xw.rows; r++) {
      for (let c = 0; c < xw.cols; c++) {
        if (!xw.hasLetter[r][c]) gridHtml += '<div class="xw-cell block"></div>';else {
          const n = xw.numberGrid[r][c];
          gridHtml += `<div class="xw-cell">${n ? `<span class="xw-num">${n}</span>` : ''}<input maxlength="1" data-r="${r}" data-c="${c}"></div>`;
        }
      }
    }
    gridHtml += '</div>';
    const across = xw.placements.filter(p => p.dir === 'across');
    const down = xw.placements.filter(p => p.dir === 'down');
    const cluesHtml = `<div class="xw-clues"><h4>Across</h4><ul style="list-style:none;padding-left:0;">${across.map(p => `<li>${p.number}. ${p.clue}</li>`).join('')}</ul>
    <h4>Down</h4><ul style="list-style:none;padding-left:0;">${down.map(p => `<li>${p.number}. ${p.clue}</li>`).join('')}</ul></div>`;
    return `
    <div class="xw-toolbar">
      <label style="margin:0;">Chapter:</label>
      <select id="xwChapterSelect" style="width:auto;">${chapters.map(ch => `<option value="${ch.id}" ${ctx.xwChapter === ch.id ? 'selected' : ''}>Chapter ${ch.number}</option>`).join('')}</select>
      <button class="btn small" data-action="xwCheck">Check answers</button>
      <button class="btn small" data-action="xwReveal">Reveal answers</button>
      <button class="btn small" data-action="xwNew">New layout</button>
    </div>
    <div class="xw-wrap">${gridHtml}${cluesHtml}</div>
  `;
  };
  Object.assign(ctx.ACTIONS, {
    xwCheck() {
      ctx.dom.querySelectorAll('.xw-cell input').forEach(inp => {
        const r = parseInt(inp.dataset.r, 10),
          c = parseInt(inp.dataset.c, 10);
        inp.classList.remove('ok', 'no');
        if (!inp.value) return;
        inp.classList.add(inp.value === ctx.xwState.solution[r][c] ? 'ok' : 'no');
      });
    },
    xwReveal() {
      ctx.dom.querySelectorAll('.xw-cell input').forEach(inp => {
        const r = parseInt(inp.dataset.r, 10),
          c = parseInt(inp.dataset.c, 10);
        inp.value = ctx.xwState.solution[r][c];
        inp.classList.remove('no');
        inp.classList.add('ok');
      });
    },
    xwNew() {
      ctx.xwState = null;
      ctx.render();
    }
  });
}
