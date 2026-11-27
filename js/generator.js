// Rätselgenerator: Lösung, Bereiche wachsen lassen, Hill-Climbing per Umhängen
import { countSolutions, solveLogic, difficulty } from './solver.js';
import { DOG } from './rules.js';

const MAX_MOVES = 200;   // Umhänge-Versuche pro Start
const COUNT_LIMIT = 40;  // Lösungszähler-Grenze für die Bewertung

// mulberry32
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, k) => Math.floor(rand() * k);

function shuffle(rand, a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = pick(rand, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Schritt 1: gültige Doggy-Lösung (Spalte je Zeile), Backtracking mit Zufallsreihenfolge
function randomSolution(n, rand) {
  const sol = [];
  const used = new Uint8Array(n);
  const rec = r => {
    if (r === n) return true;
    for (const c of shuffle(rand, Array.from({ length: n }, (_, k) => k))) {
      if (used[c] || (r > 0 && Math.abs(c - sol[r - 1]) <= 1)) continue;
      used[c] = 1; sol.push(c);
      if (rec(r + 1)) return true;
      used[c] = 0; sol.pop();
    }
    return false;
  };
  return rec(0) ? sol : null;
}

function neighbours(n) {
  const out = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n, l = [];
    if (r > 0) l.push(i - n);
    if (c > 0) l.push(i - 1);
    if (c < n - 1) l.push(i + 1);
    if (r < n - 1) l.push(i + n);
    out.push(l);
  }
  return out;
}

// Schritt 2: jeder Doggy ist Keim; zufällige freie Nachbarfelder anhängen
function growRegions(n, sol, nb, rand) {
  const N = n * n;
  const reg = new Int8Array(N).fill(-1);
  sol.forEach((c, r) => { reg[r * n + c] = r; });
  let free = N - n;
  while (free > 0) {
    const front = [];
    for (let i = 0; i < N; i++) {
      if (reg[i] !== -1) continue;
      for (const j of nb[i]) if (reg[j] !== -1) front.push(i * N + j);
    }
    const f = front[pick(rand, front.length)];
    reg[Math.floor(f / N)] = reg[f % N];
    free--;
  }
  return reg;
}

// Bereiche nach erstem Auftreten (zeilenweise) benennen
function nameRegions(reg) {
  const map = new Map();
  let s = '';
  for (const g of reg) {
    if (!map.has(g)) map.set(g, String.fromCharCode(65 + map.size));
    s += map.get(g);
  }
  return s;
}

// Bleibt Bereich g ohne Zelle skip zusammenhängend? (start = Doggy-Zelle von g)
function connectedWithout(reg, nb, g, start, skip) {
  let size = 0;
  for (let i = 0; i < reg.length; i++) if (reg[i] === g && i !== skip) size++;
  const seen = new Uint8Array(reg.length);
  seen[start] = 1;
  const stack = [start];
  let cnt = 1;
  while (stack.length) {
    const i = stack.pop();
    for (const j of nb[i]) {
      if (seen[j] || j === skip || reg[j] !== g) continue;
      seen[j] = 1; cnt++; stack.push(j);
    }
  }
  return cnt === size;
}

function score(p) {
  const res = solveLogic(p);
  let dogs = 0;
  for (const v of res.cells) if (v === DOG) dogs++;
  return [countSolutions(p, COUNT_LIMIT), -dogs, res];
}

// Ein Start (Spec 11, Schritte 1–3). Liefert Puzzle oder null (verworfen).
export function generate(n, rand) {
  const N = n * n;
  const sol = randomSolution(n, rand);
  if (!sol) return null;
  const nb = neighbours(n);
  const reg = growRegions(n, sol, nb, rand);
  const isDog = new Uint8Array(N), dogOf = new Int16Array(n);
  sol.forEach((c, r) => { isDog[r * n + c] = 1; dogOf[r] = r * n + c; });
  const puzzle = () => ({ n, regions: nameRegions(reg), solution: sol.slice() });

  let [cnt, neg, res] = score(puzzle());
  for (let move = 0; move < MAX_MOVES && !(cnt === 1 && res.solved); move++) {
    // Kandidaten: (Grenzzelle, Nachbarbereich), Doggy-Zellen nie
    const cand = [];
    for (let i = 0; i < N; i++) {
      if (isDog[i]) continue;
      for (const j of nb[i]) if (reg[j] !== reg[i]) cand.push(i * n + reg[j]);
    }
    let chosen = -1;
    while (cand.length) {
      const k = pick(rand, cand.length);
      const m = cand[k];
      const i = Math.floor(m / n), g = reg[i];
      if (connectedWithout(reg, nb, g, dogOf[g], i)) { chosen = m; break; }
      cand[k] = cand[cand.length - 1]; cand.pop();
    }
    if (chosen < 0) break;
    const i = Math.floor(chosen / n), from = reg[i];
    reg[i] = chosen % n;
    const [c2, n2, r2] = score(puzzle());
    if (c2 < cnt || (c2 === cnt && n2 <= neg)) { cnt = c2; neg = n2; res = r2; }
    else reg[i] = from;
  }
  if (!(cnt === 1 && res.solved)) return null;
  return { ...puzzle(), difficulty: difficulty(res) };
}

// Drehung/Spiegelung t = 0..7: Bit 2 = transponieren, Bit 1 = Zeilen spiegeln, Bit 0 = Spalten spiegeln
export function transform(puzzle, t) {
  const { n } = puzzle;
  const map = (r, c) => {
    if (t & 4) [r, c] = [c, r];
    if (t & 2) r = n - 1 - r;
    if (t & 1) c = n - 1 - c;
    return [r, c];
  };
  const reg = new Int8Array(n * n);
  const solution = new Array(n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const [r2, c2] = map(r, c);
      reg[r2 * n + c2] = puzzle.regions.charCodeAt(r * n + c);
    }
    const [r2, c2] = map(r, puzzle.solution[r]);
    solution[r2] = c2;
  }
  return { ...puzzle, regions: nameRegions(reg), solution };
}

// Kleinste regions-Zeichenkette aller 8 Transformationen
export function canonical(puzzle) {
  let best = null;
  for (let t = 0; t < 8; t++) {
    const s = transform(puzzle, t).regions;
    if (best === null || s < best) best = s;
  }
  return best;
}
