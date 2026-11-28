// Spielablauf: Start- und Spielbildschirm, Speichern, Hinweise, Ton, Elternmenü
import { Game } from './state.js';
import { createBoard } from './board.js';
import { hint } from './solver.js';
import { CURVE, advance, stepBack, load, store, reset } from './progress.js';
import { restoreGame } from './restore.js';
import { initSound, bark, testSound } from './sound.js';
import { openMenu } from './menu.js';
import { startTutorial } from './tutorial.js';
import { onHold } from './hold.js';

const $ = (id) => document.getElementById(id);
const LONG_PRESS_MS = 3000;
const HINT_DELAY_MS = 1100;

const pools = {};
let save = load(localStorage);
let game = null, board = null, prevBad = new Set(), solved = false, hintTimer = 0;
let previewBoard = null;
let stopTutorial = null, playing = false, introSeen = null; // introSeen: Rätsel-ID, dessen Regel-Animation lief

// Übungsführung beenden (Brett wird ersetzt, Startbildschirm, Lösung)
function endTutorial() {
  stopTutorial?.();
  stopTutorial = null;
}

function maybeTutorial() {
  endTutorial();
  if (playing && !solved && CURVE[save.section].tutorial && save.index < 3) {
    const id = game.puzzle.id;
    stopTutorial = startTutorial(board, game, save.index, { skipIntro: introSeen === id });
    introSeen = id;
  }
}

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
  endTutorial();
  introSeen = null;
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
  maybeTutorial();
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
  endTutorial();
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
  board.pulse([...new Set([...step.unit, step.cell])]);
  const g = game;
  hintTimer = setTimeout(() => { if (g === game && !solved) game.set(step.cell, step.value); }, HINT_DELAY_MS);
}

function showStart() {
  clearTimeout(hintTimer);
  playing = false;
  endTutorial();
  if (solved) buildGame();
  previewBoard?.destroy();
  previewBoard = createBoard($('preview'), new Game(game.puzzle, Uint8Array.from(game.cells), game.autoMark), { interactive: false });
  show('start');
}

function startPlaying() {
  playing = true;
  show('game');
  if (!stopTutorial) maybeTutorial();
}

// 🏠 im Spiel: kurzer Druck = Startbildschirm, 3 s = Elternmenü; 🏠 unten am Start: 3 s = Elternmenü
function setupHome() {
  onHold($('home'), { ms: LONG_PRESS_MS, onTap: showStart, onLong: openParentMenu });
  onHold($('start-home'), { ms: LONG_PRESS_MS, onLong: openParentMenu });
}

// 🔄 am Start: ganz von vorne (zurück zur Übung), nur nach ✅; Einstellungen bleiben
function setupRestart() {
  $('restart').addEventListener('click', () => {
    confirmRestart(() => {
      save = { ...reset(), settings: save.settings };
      buildGame();
      showStart();
    });
  });
}

function confirmRestart(onYes) {
  const dlg = document.createElement('dialog');
  dlg.className = 'ask';
  const q = document.createElement('div');
  q.className = 'ask-q';
  q.textContent = '🔄';
  q.setAttribute('aria-label', 'Ganz von vorne anfangen?');
  const row = document.createElement('div');
  row.className = 'ask-row';
  const mk = (label, aria, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn big';
    b.textContent = label;
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', () => { dlg.close(); fn?.(); });
    return b;
  };
  row.append(mk('✅', 'Ja, von vorne', onYes), mk('❌', 'Nein'));
  dlg.append(q, row);
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

function openParentMenu() {
  const apply = (next) => { save = { ...next, settings: save.settings }; };
  const rebuild = () => { buildGame(); showStart(); };
  openMenu(() => save, {
    toggle(key, value) {
      save = { ...save, settings: { ...save.settings, [key]: value } };
      if (key === 'autoMark') { game.autoMark = value; board.render(); }
      store(localStorage, save);
      if (key === 'sound' && value) bark('happy'); // Probeton beim Einschalten
    },
    repeatTutorial() { apply({ ...save, section: 0, index: 0, current: null }); rebuild(); },
    stepBack() { if (save.section === 0) return; apply(stepBack(save)); rebuild(); },
    resetAll() { apply(reset()); rebuild(); },
    testSound,
  });
}

// Fehlerfall: grosser ▶️/🔄-Knopf lädt neu, nie ein leerer Bildschirm
function showFailure(e) {
  console.error(e);
  $('start').hidden = true;
  $('game').hidden = true;
  if ($('retry')) return;
  const b = document.createElement('button');
  b.id = 'retry';
  b.className = 'btn big retry';
  b.setAttribute('aria-label', 'Neu laden');
  b.textContent = '🔄';
  b.addEventListener('click', () => location.reload());
  document.body.append(b);
}

async function init() {
  try {
    initSound(() => save.settings.sound);
    await loadPools();
    buildGame();
    setupHome();
    setupRestart();
    $('play').addEventListener('click', startPlaying);
    $('next').addEventListener('click', () => {
      try { buildGame(); } catch (e) { showFailure(e); }
    });
    $('undo').addEventListener('click', () => { if (!solved) game.undo(); });
    $('hint').addEventListener('click', showHint);
    document.addEventListener('dblclick', (e) => e.preventDefault());
    showStart();
  } catch (e) {
    showFailure(e);
  }
}

// Kein Pinch-Zoom (Safari-Gesten); das Elternmenü-<dialog> bleibt bedienbar (Tippen, keine Gesten nötig)
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault());
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((e) => console.warn('Service Worker:', e));
}

init();
