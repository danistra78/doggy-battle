// Geführte Übung: Regel-Animation (Geister-Doggys im Overlay), danach freies Brett mit Hand 👆.
// Geister sind reine Overlay-Elemente und ändern game.cells nie.
import { hint } from './solver.js';
import { regionMap } from './rules.js';
import { regionOutline } from './geometry.js';

const NS = 'http://www.w3.org/2000/svg';
const CELL = 100;
const LINE = '#4a4a4a';

// ---- reine Helfer (getestet in test/tutorial.test.mjs) ----

const solCells = (p) => p.solution.map((c, r) => r * p.n + c);
const touching = (n, a, b) => Math.abs((a % n) - (b % n)) <= 1 && Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1;

// Zeile bzw. Spalte k: good = Lösungs-Doggy darin, bad = ein zweites Feld, das sonst nichts verletzt
export function lineDemo(puzzle, kind, k = 1) {
  const { n } = puzzle;
  const reg = regionMap(puzzle);
  const line = Array.from({ length: n }, (_, j) => (kind === 'row' ? k * n + j : j * n + k));
  const good = solCells(puzzle).find((c) => line.includes(c));
  const cost = (c) => (touching(n, c, good) ? 2 : 0) + (reg[c] === reg[good] ? 1 : 0);
  const bad = line.filter((c) => c !== good).sort((a, b) => cost(a) - cost(b) || a - b)[0];
  return { line, good, bad };
}

// Je Bereich (in Reihenfolge): seine Zellen und sein Lösungs-Doggy
export function regionDemo(puzzle) {
  const reg = regionMap(puzzle);
  const sol = solCells(puzzle);
  const out = [];
  for (let r = 0; r <= Math.max(...reg); r++) {
    const cells = [];
    reg.forEach((v, i) => { if (v === r) cells.push(i); });
    out.push({ region: r, cells, dog: sol.find((c) => reg[c] === r) });
  }
  return out;
}

// Ein Doggy mit möglichst vielen Nachbarn; paws = Nachbarn der Reihe nach, bad = Nachbar für den zweiten Doggy
export function touchDemo(puzzle) {
  const { n } = puzzle;
  const reg = regionMap(puzzle);
  const nbrs = (d) => {
    const out = [];
    for (let i = 0; i < n * n; i++) if (i !== d && touching(n, i, d)) out.push(i);
    return out;
  };
  const dog = solCells(puzzle).reduce((best, c) => (nbrs(c).length > nbrs(best).length ? c : best));
  const all = nbrs(dog);
  const cost = (c) => (c % n === dog % n ? 2 : 0) + (Math.floor(c / n) === Math.floor(dog / n) ? 2 : 0) + (reg[c] === reg[dog] ? 1 : 0);
  const bad = [...all].sort((a, b) => cost(a) - cost(b) || a - b)[0];
  return { dog, bad, paws: all.filter((c) => c !== bad) };
}

// ---- Zeichnen ----

const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};

// opts.skipIntro: Regel-Animation auslassen, gleich freies Brett mit Hand
export function startTutorial(board, game, step, opts = {}) {
  const { overlay, cellCenter } = board;
  const { puzzle } = game;
  const n = puzzle.n;
  let stopped = false;
  let timers = [];
  let catcher = null;
  let hand = null, handIn = null;

  const layer = el('g', { class: 'tut-layer' }, overlay);
  const stage = el('g', { class: 'tut-stage' }, layer);
  const at = (ms, fn) => timers.push(setTimeout(() => { if (!stopped) fn(); }, ms));

  const text = (ch, i, { size = 56, dx = 0, dy = 0, opacity = 1, cls = '' } = {}) => {
    const { x, y } = cellCenter(i);
    const g = el('g', { class: cls, style: `transform-origin:${x}px ${y}px` }, stage);
    const t = el('text', { x: x + dx, y: y + dy, dy: '0.35em', 'font-size': size, 'text-anchor': 'middle', opacity }, g);
    t.textContent = ch;
    return g;
  };
  const ghost = (i) => text('🐶', i, { size: 62, opacity: 0.5, cls: 'cell tut-ghost' });
  const warn = (i) => text('⚠️', i, { size: 30, dx: 27, dy: -20, cls: 'tut-pop tut-warn' });
  const check = (i) => text('✔️', i, { size: 34, dx: 27, dy: -20, cls: 'tut-pop' });
  const wiggle = (g) => { g.classList.add('wiggle'); };

  function frame(cells, fill) {
    const rows = cells.map((c) => Math.floor(c / n)), cols = cells.map((c) => c % n);
    const x0 = Math.min(...cols) * CELL, y0 = Math.min(...rows) * CELL;
    return el('rect', {
      x: x0 + 4, y: y0 + 4, width: (Math.max(...cols) + 1) * CELL - x0 - 8, height: (Math.max(...rows) + 1) * CELL - y0 - 8,
      rx: 18, fill: fill ?? '#ffffff', 'fill-opacity': 0.45, stroke: LINE, 'stroke-width': 8, class: 'tut-pop',
    }, stage);
  }
  const clear = () => stage.replaceChildren();

  // Eine Linie (Zeile/Spalte): zwei Geister -> ⚠️ + Wackeln, einer weg -> ✔️. Dauer 1900 ms.
  function lineScript(kind, t0) {
    const { line, good, bad } = lineDemo(puzzle, kind);
    let bg;
    at(t0, () => frame(line));
    at(t0 + 400, () => ghost(good));
    at(t0 + 700, () => { bg = ghost(bad); });
    at(t0 + 1000, () => { wiggle(bg); warn(bad); });
    at(t0 + 1600, () => { bg.remove(); stage.querySelectorAll('.tut-warn').forEach((e) => e.remove()); });
    at(t0 + 1700, () => check(good));
    at(t0 + 2000, clear);
    return t0 + 2100;
  }

  function regionScript() {
    const items = regionDemo(puzzle);
    const per = Math.floor(3800 / items.length);
    items.forEach(({ region, cells, dog }, k) => {
      const t = k * per;
      let outline;
      at(t, () => {
        outline = el('path', { d: regionOutline(puzzle, region, CELL, 18), fill: '#ffffff', 'fill-opacity': 0.5, stroke: LINE, 'stroke-width': 8, class: 'tut-pop' }, stage);
      });
      at(t + per * 0.35, () => ghost(dog));
      at(t + per * 0.85, () => outline?.remove());
    });
    return items.length * per + 400;
  }

  function touchScript() {
    const { dog, bad, paws } = touchDemo(puzzle);
    at(0, () => ghost(dog));
    paws.forEach((c, k) => at(600 + k * 380, () => text('🐾', c, { size: 46, opacity: 0.85, cls: 'tut-pop' })));
    const t = 600 + paws.length * 380 + 300;
    let bg;
    at(t, () => { bg = ghost(bad); });
    at(t + 300, () => { wiggle(bg); warn(bad); });
    return t + 1300;
  }

  // ---- Hand ----
  function placeHand() {
    const h = hint(game);
    const cell = !h ? -1 : h.kind === 'error' ? h.cell : h.step.cell;
    if (cell < 0 || cell == null) { hand?.setAttribute('display', 'none'); return; }
    if (!hand) {
      hand = el('g', { class: 'tut-hand' }, layer);
      handIn = el('g', { class: 'tut-hand-in' }, hand);
      const t = el('text', { x: 0, y: 44, dy: '0.35em', 'font-size': 64, 'text-anchor': 'middle' }, handIn);
      t.textContent = '👆';
      hand.style.transition = 'none';
    }
    const { x, y } = cellCenter(cell);
    hand.removeAttribute('display');
    hand.style.transform = `translate(${x}px, ${y}px)`;
    hand.dataset.cell = String(cell);
    void hand.getBoundingClientRect();
    hand.style.transition = '';
  }

  function free() {
    clearTimers();
    removeCatcher();
    clear();
    game.onChange(() => { if (!stopped) placeHand(); });
    placeHand();
  }

  // ---- Überspringen: Fänger schluckt den Tipp, damit er kein Symbol setzt ----
  function removeCatcher() { catcher?.remove(); catcher = null; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  catcher = el('rect', { x: 0, y: 0, width: n * CELL, height: n * CELL, fill: 'transparent', 'pointer-events': 'all' }, layer);
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click']) {
    catcher.addEventListener(type, (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (type === 'pointerdown' && !stopped) free();
    });
  }

  if (opts.skipIntro) free();
  else {
    const end = step === 0 ? lineScript('column', lineScript('row', 300))
      : step === 1 ? regionScript() : touchScript();
    at(end, free);
  }

  return function stop() {
    if (stopped) return;
    stopped = true;
    clearTimers();
    layer.remove();
  };
}
