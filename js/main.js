// Spielablauf: Start- und Spielbildschirm, Speichern, Hinweise, Ton, Elternmenü
import { Game } from './state.js';
import { createBoard } from './board.js';
import { hint } from './solver.js';
import { CURVE, advance, stepBack, load, store, reset } from './progress.js';
import { restoreGame } from './restore.js';
import { initSound, bark } from './sound.js';
import { openMenu } from './menu.js';

const $ = (id) => document.getElementById(id);
const LONG_PRESS_MS = 3000;
const HINT_DELAY_MS = 1100;

const pools = {};
let save = load(localStorage);
let game = null, board = null, prevBad = new Set(), solved = false, hintTimer = 0;
let previewBoard = null;

async function loadPools() {
  const files = { 4: 'puzzles/tutorial.json', 5: 'puzzles/5.json', 6: 'puzzles/6.json', 7: 'puzzles/7.json', 8: 'puzzles/8.json', 9: 'puzzles/9.json', 10: 'puzzles/10.json' };
  await Promise.all(Object.entries(files).map(async ([n, url]) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    pools[n] = await res.json();
  }));
}

function persist() {
  save = { ...save, current: game.toJSON() };
  store(localStorage, save);
}

// Punkte: Fortschritt im Abschnitt; 10x10 (endlos) zeigt je 5 Rätsel
function renderDots() {
  const { count } = CURVE[save.section];
  const total = count === Infinity ? 5 : count;
  const filled = count === Infinity ? save.index % 5 : save.index;
  const dots = $('dots');
  dots.replaceChildren();
  for (let i = 0; i < total; i++) {
    const d = document.createElement('span');
    d.className = i < filled ? 'dot on' : 'dot';
    dots.append(d);
  }
}

function show(screen) {
  $('start').hidden = screen !== 'start';
  $('game').hidden = screen !== 'game';
}

// Neues Game samt Brett für den aktuellen Save aufbauen (altes Brett zuerst abbauen)
function buildGame() {
  clearTimeout(hintTimer);
  board?.destroy();
  game = restoreGame(save, pools);
  solved = false;
  prevBad = game.conflicts();
  board = createBoard($('board'), game);
  $('next').hidden = true;
  $('board').classList.remove('locked');
  game.onChange(onChange);
  renderDots();
  persist();
}

function onChange() {
  if (solved) return;
  persist();
  const bad = game.conflicts();
  const fresh = [...bad].filter((i) => !prevBad.has(i));
  prevBad = bad;
  if (fresh.length) {
    board.wiggle(fresh);
    bark('grumble');
  }
  if (game.solved()) onSolved();
}

function onSolved() {
  solved = true;
  clearTimeout(hintTimer);
  save = advance(save);
  store(localStorage, save);
  $('board').classList.add('locked');
  board.celebrate();
  bark('happy');
  setTimeout(() => { if (solved) $('next').hidden = false; }, 900);
}

function showHint() {
  if (solved) return;
  const h = hint(game);
  if (!h) return;
  clearTimeout(hintTimer);
  if (h.kind === 'error') {
    board.wiggle([h.cell]);
    board.pulse([h.cell]);
    return;
  }
  const { step } = h;
  board.pulse(step.unit);
  const g = game;
  hintTimer = setTimeout(() => { if (g === game && !solved) game.set(step.cell, step.value); }, HINT_DELAY_MS);
}

function showStart() {
  clearTimeout(hintTimer);
  if (solved) buildGame();
  previewBoard?.destroy();
  previewBoard = createBoard($('preview'), new Game(game.puzzle, Uint8Array.from(game.cells), game.autoMark), { interactive: false });
  show('start');
}

function startPlaying() {
  show('game');
}

// Kurzer Druck auf 🏠 = Startbildschirm, 3 s = Elternmenü
function setupHome() {
  const home = $('home');
  let timer = 0, long = false;
  home.addEventListener('pointerdown', () => {
    long = false;
    clearTimeout(timer);
    timer = setTimeout(() => { long = true; openParentMenu(); }, LONG_PRESS_MS);
  });
  const cancel = () => clearTimeout(timer);
  home.addEventListener('pointerup', () => { cancel(); if (!long) showStart(); });
  home.addEventListener('pointercancel', cancel);
  home.addEventListener('pointerleave', cancel);
  home.addEventListener('contextmenu', (e) => e.preventDefault());
  home.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') showStart(); });
}

function openParentMenu() {
  const apply = (next) => { save = { ...next, settings: save.settings }; };
  const rebuild = () => { buildGame(); showStart(); };
  openMenu(() => save, {
    toggle(key, value) {
      save = { ...save, settings: { ...save.settings, [key]: value } };
      if (key === 'autoMark') { game.autoMark = value; board.render(); }
      store(localStorage, save);
    },
    repeatTutorial() { apply({ ...save, section: 0, index: 0, current: null }); rebuild(); },
    stepBack() { apply(stepBack(save)); rebuild(); },
    resetAll() { apply(reset()); rebuild(); },
  });
}

async function init() {
  initSound(() => save.settings.sound);
  try {
    await loadPools();
  } catch (e) {
    console.error(e);
    return;
  }
  buildGame();
  setupHome();
  $('play').addEventListener('click', startPlaying);
  $('next').addEventListener('click', () => { buildGame(); });
  $('undo').addEventListener('click', () => { if (!solved) game.undo(); });
  $('hint').addEventListener('click', showHint);
  document.addEventListener('dblclick', (e) => e.preventDefault());
  showStart();
}

init();
