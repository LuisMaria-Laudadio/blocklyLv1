let workspace;
let currentLevel = 0;
let state;
let program = [];

// используем картинки-спрайты
const EMOJI = {
  R: 'img/rabbit.png',
  E: 'img/door.png',
  C: 'img/carrot.png',
  W: 'img/wall.png',
  '.': 'img/empty2.png'
};

// звуки (проверь пути и файлы)
const sounds = {
  fail: new Audio('sounds/fail.mp3'),
  win: new Audio('sounds/win.mp3'),
  carrot: new Audio('sounds/carrot.wav')
};

// canvas для эффектов
let fxCanvas, ctx, cell;
const CARROT_POP_MS = 400;
const EXIT_FX_MS = 600;

function $(sel) { return document.querySelector(sel); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ============ Blockly ============ */
function initBlockly() {
  workspace = Blockly.inject('blockly', {
    toolbox: toolboxXml,
    trashcan: true,
    zoom: { startScale: 1.0 },
    grid: { spacing: 20, length: 3, colour: '#1f2937', snap: true }
  });

  // один фиксированный стартовый блок
  const startBlock = workspace.newBlock('when_run');
  startBlock.initSvg();
  startBlock.render();
  startBlock.moveBy(80, 30);
  startBlock.setDeletable(false);
  startBlock.setMovable(false);

  workspace.addChangeListener(updateLimitCounter);
}

/* ============ Уровни ============ */
function loadLevel(idx) {
  if (idx >= LEVELS_RABBIT.length) {
    showWinModal(true);
    return;
  }

  currentLevel = idx;
  const L = LEVELS_RABBIT[idx];
  $('#levelTitle').textContent = `Level ${idx + 1}/${LEVELS_RABBIT.length}`;
  $('#limit').textContent = L.maxBlocks;
  $('#used').textContent = 0;

  state = {
    size: L.size,
    grid: L.grid.map(row => row.split('')),
    original: L.grid.map(row => row.split('')), // копия для полного сброса
    carrots: 0,
    rabbit: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    running: false
  };

  // разбор карты
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      const ch = state.grid[y][x];
      if (ch === 'C') {
        state.carrots++;
      } else if (ch === 'R') {
        state.rabbit = { x, y };
        state.start = { x, y };
        state.grid[y][x] = '.'; // УБИРАЕМ 'R' из сетки, чтобы не было «второго» кролика
        state.original[y][x] = '.'; // и в оригинале тоже
      } else if (ch === 'E') {
        state.exit = { x, y };
      }
    }
  }

  renderBoard();
  $('#goal').textContent = L.goal;
  clearCode();
}

function clearCode() {
  if (!workspace) return;
  const all = workspace.getAllBlocks(false);
  for (const b of all) if (b.type !== 'when_run') b.dispose(false, true);
  program = [];
  updateLimitCounter();
}

/* ============ Поле ============ */
function renderBoard() {
  const board = $('#board');
  board.style.setProperty('--size', state.size);

  // синхронизируем canvas с полем
  fxCanvas.width = board.clientWidth;
  fxCanvas.height = board.clientHeight;
  cell = board.clientWidth / state.size;

  board.innerHTML = '';
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      const ch = state.grid[y][x];
      const cellDiv = document.createElement('div');
      cellDiv.className = 'cell' + (ch === 'W' ? ' wall' : '');
      cellDiv.dataset.x = x;
      cellDiv.dataset.y = y;

      // сначала фон клетки (пол или стена/морковь/дверь)
        // вместо "if (EMOJI[ch]) { ... }"
      if (EMOJI[ch]) {
         const imgBG = document.createElement('img');
         imgBG.src = EMOJI[ch];
         imgBG.className = 'sprite';
         cellDiv.appendChild(imgBG);
      }

      // поверх — сам кролик, если он в этой клетке
      if (x === state.rabbit.x && y === state.rabbit.y) {
        const rab = document.createElement('img');
        rab.src = EMOJI['R'];
        rab.className = 'sprite';
        cellDiv.appendChild(rab);
      }

      board.appendChild(cellDiv);
    }
  }
}

function updateLimitCounter() {
  if (!workspace) return;
  const used = workspace.getAllBlocks(false).filter(b => b.type !== 'when_run').length;
  $('#used').textContent = used;
}

/* ============ Код из блоков ============ */
function compile() {
  program = [];
  const code = Blockly.JavaScript.workspaceToCode(workspace);
  try {
    // eslint-disable-next-line no-new-func
    new Function('program', code)(program);
  } catch (e) {
    console.error(e);
  }
  return program;
}

function canUseMoreBlocks() {
  const used = workspace.getAllBlocks(false).filter(b => b.type !== 'when_run').length;
  return used <= LEVELS_RABBIT[currentLevel].maxBlocks;
}

/* ============ Запуск программы ============ */
async function run() {
  if (state.running) return;
  if (!canUseMoreBlocks()) {
    showFailModal('¡Demasiados bloques!');
    return;
  }
  compile();

  // полный сброс карты
  state.grid = state.original.map(row => [...row]);
  state.carrots = 0;
  for (let y = 0; y < state.size; y++)
    for (let x = 0; x < state.size; x++)
      if (state.grid[y][x] === 'C') state.carrots++;

  // сброс в старт
  state.rabbit = { ...state.start };
  renderBoard();

  // ⏸ задержка перед первым шагом
  await sleep(300);

  state.running = true;
  for (const [cmd, arg] of program) {
    if (cmd === 'move') {
      const ok = await step(arg);
      if (!ok) {
        showFailModal('¡Te has topado con un muro o te has salido de los límites!');
        state.running = false;
        return;
      }
    } else if (cmd === 'agarrar') {
      const ok = await takeCarrot();
      if (!ok) {
        state.running = false;
        return;
      }
    }
  }
  state.running = false;

  // проверяем победу
  const won = checkWin();
  if (!won) {
    showFailModal('¡Intentar otra vez!');
    // сбросим кролика и морковки
    state.rabbit = { ...state.start };
    state.grid = state.original.map(row => [...row]);
    state.carrots = 0;
    for (let y = 0; y < state.size; y++)
      for (let x = 0; x < state.size; x++)
        if (state.grid[y][x] === 'C') state.carrots++;
    renderBoard();
  }
}


/* ============ Движение ============ */
async function step(dir) {
  const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const nx = state.rabbit.x + dx;
  const ny = state.rabbit.y + dy;

  // границы и стены
  if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) return false;
  if (state.grid[ny][nx] === 'W') return false;

  state.rabbit.x = nx;
  state.rabbit.y = ny;
  renderBoard();
  await sleep(250);
  return true;
}

/* ============ Морковка ============ */
async function takeCarrot() {
  const { x, y } = state.rabbit;
  if (state.grid[y][x] === 'C') {
    try { sounds.carrot.currentTime = 0; sounds.carrot.play(); } catch {}
    await carrotPopFX(x, y);           // вспышка
    state.grid[y][x] = '.';            // убираем морковку
    state.carrots--;
    renderBoard();
    return true;
  } else {
    showFailModal('¡Aquí no hay zanahorias! 🥕❌');
    return false;
  }
}

/* ============ Победа/проверка ============ */
function checkWin() {
  const atExit = (state.rabbit.x === state.exit.x && state.rabbit.y === state.exit.y);
  const needCarrots = LEVELS_RABBIT[currentLevel].needCarrots;
  const allCarrots = (state.carrots === 0);

  if (atExit && (!needCarrots || allCarrots)) {
    try { sounds.win.currentTime = 0; sounds.win.play(); } catch {}
    exitFX(state.exit.x, state.exit.y);

    // ✅ если это последний (10-й) уровень → финальная победа
    if (currentLevel === 9) {   // 9, потому что индексация с 0
      showWinModal(true);
    } else {
      showWinModal(false);
    }
    return true;
  } else if (atExit && needCarrots && !allCarrots) {
    showFailModal('¡Recoge todas las zanahorias!');
    return false;
  }
  return false;
}


/* ============ FX ============ */
function carrotPopFX(cx, cy) {
  return new Promise(resolve => {
    const start = performance.now();
    const loop = (t) => {
      const p = Math.min(1, (t - start) / CARROT_POP_MS);

      ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      const x = cx * cell + cell / 2;
      const y = cy * cell + cell / 2;

      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f59e0b'; // оранж
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.25 + 0.35 * p), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (p < 1) requestAnimationFrame(loop);
      else {
        ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        resolve();
      }
    };
    requestAnimationFrame(loop);
  });
}

function exitFX(cx, cy) {
  const start = performance.now();
  const loop = (t) => {
    const p = Math.min(1, (t - start) / EXIT_FX_MS);
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    const x = cx * cell + cell / 2;
    const y = cy * cell + cell / 2;

    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3b82f6'; // синий
    ctx.beginPath();
    ctx.arc(x, y, cell * (0.3 + 0.5 * p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (p < 1) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ============ Модалки ============ */
function showFailModal(msg) {
  try { sounds.fail.currentTime = 0; sounds.fail.play(); } catch {}
  const dlg = $('#modal');
  $('#modalTitle').textContent = '¡Error!';
  $('#modalBody').innerHTML = `
    <p>${msg}</p>
    <img src="img/fail.png" alt="fail" style="max-width:120px">
    <div class="modal-actions"><button id="okBtn" class="btn primary">Ok</button></div>
  `;
  dlg.showModal();

  // ✅ обработчик кнопки вместо формы
  dlg.querySelector('#okBtn').addEventListener('click', () => {
    dlg.close();
    state.rabbit = { ...state.start };
    renderBoard();
  });
}

function showWinModal(final) {
  const dlg = $('#modal');
  dlg.classList.remove('win-final');

  if (final) {
    dlg.classList.add('win-final');
    $('#modalTitle').textContent = '¡Felicidades! 🏆';
    $('#modalBody').innerHTML = `
      <p>¡Has completado todos los niveles!</p>
      <img src="img/trophy.png" alt="trophy">
      <div class="modal-actions"><button id="okBtn" class="btn primary">Ok</button></div>
    `;
  } else {
    $('#modalTitle').textContent = '¡Buen trabajo!';
    $('#modalBody').innerHTML = `
      <p>¡El nivel está completado!</p>
      <img src="img/success.gif" alt="success">
      <div class="modal-actions"><button id="okBtn" class="btn primary">Ok</button></div>
    `;
  }

  dlg.showModal();

  // ✅ кнопка вместо формы
  dlg.querySelector('#okBtn').addEventListener('click', () => {
    dlg.close();
    if (!final) loadLevel(currentLevel + 1);
  });
}

/* ============ Кнопки/Старт ============ */
window.addEventListener('DOMContentLoaded', () => {
  fxCanvas = document.getElementById('fxCanvas');
  ctx = fxCanvas.getContext('2d');

  initBlockly();
  loadLevel(0);

  $('#runBtn').addEventListener('click', run);
  $('#resetBtn').addEventListener('click', () => loadLevel(currentLevel));
  //$('#hintBtn').addEventListener('click', () => {
    //const hint = LEVELS_RABBIT[currentLevel].hint || 'Попробуй шаг за шагом.';
    //showFailModal(hint);
  //});

  $('#prevLevel').addEventListener('click', () => {
    if (currentLevel > 0) loadLevel(currentLevel - 1);
  });
  $('#nextLevel').addEventListener('click', () => {
    if (currentLevel < LEVELS_RABBIT.length - 1) loadLevel(currentLevel + 1);
  });

  // при ресайзе браузера пересинхроним canvas с полем
  window.addEventListener('resize', () => renderBoard());
});
