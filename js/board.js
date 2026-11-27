// SVG-Gitter: Darstellung und Touch-Eingabe. Zeichnet nur; Spielzustand liegt in Game.
import { PALETTE, PATTERNS, assignColors } from './palette.js';
import { regionMap } from './rules.js';
import { regionOutline, cellAt, classifyGesture } from './geometry.js';

const NS = 'http://www.w3.org/2000/svg';
const CELL = 100;
const LINE = '#4a4a4a';

const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};

// Muster: dezente, graue, durchscheinende Striche über der Pastellfläche; Kachel 24x24
const S = 'stroke="#4a4a4a" stroke-opacity="0.28" stroke-width="2.5" stroke-linecap="round" fill="none"';
const PATTERN_SVG = {
  dots: '<circle cx="6" cy="6" r="2.6" fill="#4a4a4a" fill-opacity="0.28"/><circle cx="18" cy="18" r="2.6" fill="#4a4a4a" fill-opacity="0.28"/>',
  stripes: `<path d="M0 6H24M0 18H24" ${S}/>`,
  checks: '<rect x="0" y="0" width="12" height="12" fill="#4a4a4a" fill-opacity="0.16"/><rect x="12" y="12" width="12" height="12" fill="#4a4a4a" fill-opacity="0.16"/>',
  waves: `<path d="M0 8Q6 2 12 8T24 8M0 20Q6 14 12 20T24 20" ${S}/>`,
  cross: `<path d="M6 2V10M2 6H10M18 14V22M14 18H22" ${S}/>`,
  diag: `<path d="M0 24L24 0M-6 6L6 -6M18 30L30 18" ${S}/>`,
  rings: `<circle cx="12" cy="12" r="6" ${S}/>`,
  zigzag: `<path d="M0 8L6 2L12 8L18 2L24 8M0 20L6 14L12 20L18 14L24 20" ${S}/>`,
  grid: `<path d="M0 12H24M12 0V24" ${S}/>`,
  none: '',
};

export function createBoard(svgEl, game) {
  const { puzzle } = game;
  const n = puzzle.n;
  const size = n * CELL;
  const regions = regionMap(puzzle);
  const colors = assignColors(puzzle);
  const uid = `b${Math.random().toString(36).slice(2, 7)}`;

  svgEl.replaceChildren();
  svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svgEl.setAttribute('role', 'img');
  svgEl.classList.add('board');

  const defs = el('defs', {}, svgEl);
  PATTERNS.forEach((name, c) => {
    if (name === 'none') return;
    const p = el('pattern', { id: `${uid}-p${c}`, width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
    p.innerHTML = PATTERN_SVG[name];
  });

  const cellsOf = colors.map(() => []);
  regions.forEach((r, i) => cellsOf[r].push(i));

  const fills = el('g', {}, svgEl);
  colors.forEach((c, r) => {
    const d = regionOutline(puzzle, r, CELL, 18);
    const clip = el('clipPath', { id: `${uid}-c${r}` }, defs);
    el('path', { d }, clip);
    const g = el('g', { 'clip-path': `url(#${uid}-c${r})` }, fills);
    el('path', { d, fill: PALETTE[c] }, g);
    if (PATTERNS[c] !== 'none') el('path', { d, fill: `url(#${uid}-p${c})` }, g);
    for (const i of cellsOf[r]) {
      el('rect', { x: (i % n) * CELL, y: Math.floor(i / n) * CELL, width: CELL, height: CELL, fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.7, 'stroke-width': 2 }, g);
    }
  });

  const symbols = el('g', { 'text-anchor': 'middle', 'pointer-events': 'none' }, svgEl);
  const groups = [], texts = [], badges = [];
  for (let i = 0; i < n * n; i++) {
    const cx = (i % n) * CELL + CELL / 2, cy = Math.floor(i / n) * CELL + CELL / 2;
    const g = el('g', { class: 'cell', style: `transform-origin:${cx}px ${cy}px` }, symbols);
    el('circle', { class: 'ring', cx, cy, r: CELL * 0.4, fill: 'none', stroke: LINE, 'stroke-width': 5, opacity: 0 }, g);
    const t = el('text', { x: cx, y: cy, dy: '0.35em', 'font-size': CELL * 0.56 }, g);
    const b = el('text', { x: cx + CELL * 0.27, y: cy - CELL * 0.2, dy: '0.35em', 'font-size': CELL * 0.3, display: 'none' }, g);
    b.textContent = '⚠️';
    groups.push(g); texts.push(t); badges.push(b);
  }

  // dicke Bereichsgrenzen
  const borders = el('g', { fill: 'none', stroke: LINE, 'stroke-width': 6, 'stroke-linejoin': 'round', 'pointer-events': 'none' }, svgEl);
  colors.forEach((_, r) => el('path', { d: regionOutline(puzzle, r, CELL, 18) }, borders));

  const SYMBOL = { dog: ['🐶', 1], mark: ['🐾', 1], auto: ['🐾', 0.4], empty: ['', 1] };
  function render() {
    const bad = game.conflicts();
    for (let i = 0; i < n * n; i++) {
      const v = game.view(i);
      const [ch, op] = SYMBOL[v];
      texts[i].textContent = ch;
      texts[i].setAttribute('opacity', op);
      texts[i].setAttribute('font-size', v === 'dog' ? CELL * 0.62 : CELL * 0.46);
      groups[i].classList.toggle('dog', v === 'dog');
      badges[i].setAttribute('display', v === 'dog' && bad.has(i) ? 'inline' : 'none');
    }
  }

  const play = (cells, cls, ms) => {
    for (const i of cells) {
      const g = groups[i];
      if (!g) continue;
      g.classList.remove(cls);
      void g.getBoundingClientRect(); // Animation neu starten
      g.classList.add(cls);
      setTimeout(() => g.classList.remove(cls), ms);
    }
  };
  const wiggle = (cells) => play(cells, 'wiggle', 600);
  const pulse = (cells) => play(cells, 'pulse', 1500);
  let celebrateTimer = 0;
  function celebrate() {
    let k = 0;
    groups.forEach((g) => { if (g.classList.contains('dog')) g.style.animationDelay = `${(k++) * 120}ms`; });
    svgEl.classList.add('celebrate');
    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => {
      svgEl.classList.remove('celebrate');
      groups.forEach((g) => { g.style.animationDelay = ''; });
    }, 3000);
  }

  // Eingabe
  let pid = null, points = [], swiping = false, done = 0;
  const local = (e) => {
    const r = svgEl.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const boardSize = () => svgEl.getBoundingClientRect().width;
  const reset = () => { pid = null; points = []; swiping = false; done = 0; };

  svgEl.addEventListener('pointerdown', (e) => {
    if (pid !== null) return;
    e.preventDefault();
    pid = e.pointerId;
    points = [local(e)];
    try { svgEl.setPointerCapture(pid); } catch { /* Pointer schon weg */ }
  });
  svgEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    points.push(local(e));
    const g = classifyGesture(points, n, boardSize());
    if (g.kind !== 'swipe') return;
    if (!swiping) { swiping = true; game.beginSwipe(); }
    for (; done < g.cells.length; done++) game.swipeOver(g.cells[done]);
  });
  svgEl.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pid) return;
    points.push(local(e));
    if (swiping) game.endSwipe();
    else {
      const g = classifyGesture(points, n, boardSize());
      if (g.kind === 'tap' && g.cell >= 0) game.tap(g.cell);
    }
    reset();
  });
  svgEl.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pid) return;
    if (swiping) game.endSwipe();
    reset();
  });
  svgEl.addEventListener('contextmenu', (e) => e.preventDefault());

  game.onChange(render);
  render();
  return { render, wiggle, pulse, celebrate };
}
