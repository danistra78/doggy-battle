// Logik-Solver (fünf Regelstufen), Lösungszähler, Hinweise
// Kandidat = Feld mit EMPTY; MARK gilt als ausgeschlossen.
import { EMPTY, MARK, DOG, isSolved } from './rules.js';

// ---- Vorberechnung pro Puzzle (Cache nach n + regions) ----
const cache = new Map();

function prep(puzzle) {
  const key = puzzle.n + ':' + puzzle.regions;
  let P = cache.get(key);
  if (P) return P;
  const { n } = puzzle, N = n * n;
  const row = new Uint8Array(N), col = new Uint8Array(N), reg = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    row[i] = Math.floor(i / n); col[i] = i % n; reg[i] = puzzle.regions.charCodeAt(i) - 65;
  }
  // Einheiten: 0..n-1 Zeilen, n..2n-1 Spalten, 2n..3n-1 Bereiche
  const units = Array.from({ length: 3 * n }, () => []);
  for (let i = 0; i < N; i++) {
    units[row[i]].push(i); units[n + col[i]].push(i); units[2 * n + reg[i]].push(i);
  }
  // Einflussmatrix (ohne i selbst) und Listen
  const infl = new Uint8Array(N * N);
  const inflList = [];
  for (let i = 0; i < N; i++) {
    const l = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      if (row[i] === row[j] || col[i] === col[j] || reg[i] === reg[j] ||
          (Math.abs(row[i] - row[j]) <= 1 && Math.abs(col[i] - col[j]) <= 1)) {
        infl[i * N + j] = 1; l.push(j);
      }
    }
    inflList.push(l);
  }
  P = { n, N, row, col, reg, units, infl, inflList };
  if (cache.size > 500) cache.clear();
  cache.set(key, P);
  return P;
}

// Teilmengen-Masken für m Elemente, nach Grösse gruppiert: masksBySize(m)[k]
const maskCache = [];
function masksBySize(m) {
  if (maskCache[m]) return maskCache[m];
  const out = Array.from({ length: m + 1 }, () => []);
  for (let s = 1; s < 1 << m; s++) out[popcount(s)].push(s);
  return (maskCache[m] = out);
}
function popcount(x) { let c = 0; while (x) { x &= x - 1; c++; } return c; }

// ---- Ein Schritt: niedrigste anwendbare Stufe ----
function findStep(P, cells) {
  const { n, N, units, inflList } = P;
  // Stufe 1: Doggy -> Einfluss ausschliessen
  for (let d = 0; d < N; d++) {
    if (cells[d] !== DOG) continue;
    for (const j of inflList[d]) if (cells[j] === EMPTY) return { level: 1, cell: j, value: MARK, unit: [d] };
  }
  // Einheitenstatus
  const U = 3 * n;
  const hasDog = new Uint8Array(U), cand = new Uint8Array(U), last = new Int16Array(U);
  for (let u = 0; u < U; u++) {
    for (const i of units[u]) {
      if (cells[i] === DOG) hasDog[u] = 1;
      else if (cells[i] === EMPTY) { cand[u]++; last[u] = i; }
    }
    if (!hasDog[u] && cand[u] === 0) return null; // Widerspruch: steckt fest
  }
  // Stufe 2: Einheit ohne Doggy mit genau einem Kandidaten
  for (let u = 0; u < U; u++) {
    if (!hasDog[u] && cand[u] === 1) return { level: 2, cell: last[u], value: DOG, unit: units[u].slice() };
  }
  // Stufe 3: k = 1
  let s = subsetStep(P, cells, hasDog, 1, 1, 3);
  if (s) return s;
  // Stufe 4: Kandidat, dessen Doggy einer anderen Einheit alle Kandidaten nimmt
  const { infl } = P;
  for (let c = 0; c < N; c++) {
    if (cells[c] !== EMPTY) continue;
    for (let u = 0; u < U; u++) {
      if (hasDog[u]) continue;
      let contains = false, all = true;
      for (const j of units[u]) {
        if (j === c) { contains = true; break; }
        if (cells[j] === EMPTY && !infl[c * N + j]) { all = false; break; }
      }
      if (!contains && all) return { level: 4, cell: c, value: MARK, unit: units[u].slice() };
    }
  }
  // Stufe 5: k = 2..n-1
  return subsetStep(P, cells, hasDog, 2, n - 1, 5);
}

// k Einheiten der Art A, deren Kandidaten in genau k Einheiten der Art B liegen
// -> übrige Kandidaten dieser B-Einheiten ausschliessen.
// Paare (A,B): Bereich->Zeile, Bereich->Spalte, Zeile->Bereich, Spalte->Bereich.
function subsetStep(P, cells, hasDog, kmin, kmax, level) {
  const { n, N, row, col, reg, units } = P;
  const kinds = [
    [2 * n, reg, row, 0], // Bereiche -> Zeilen
    [2 * n, reg, col, n], // Bereiche -> Spalten
    [0, row, reg, 2 * n], // Zeilen -> Bereiche
    [n, col, reg, 2 * n], // Spalten -> Bereiche
  ];
  const pre = kinds.map(([aBase, aOf, bOf]) => {
    const open = [];
    for (let a = 0; a < n; a++) if (!hasDog[aBase + a]) open.push(a);
    const bMask = new Int32Array(n);
    for (let i = 0; i < N; i++) if (cells[i] === EMPTY) bMask[aOf[i]] |= 1 << bOf[i];
    return { open, bMask };
  });
  for (let k = kmin; k <= kmax; k++) {
    for (let t = 0; t < 4; t++) {
      const [aBase, aOf, bOf, bBase] = kinds[t];
      const { open, bMask } = pre[t];
      if (k > open.length) continue;
      for (const sub of masksBySize(open.length)[k]) {
        let aSet = 0, bSet = 0;
        for (let x = 0; x < open.length; x++) {
          if (sub & (1 << x)) { aSet |= 1 << open[x]; bSet |= bMask[open[x]]; }
        }
        if (popcount(bSet) !== k) continue;
        for (let i = 0; i < N; i++) {
          if (cells[i] === EMPTY && (bSet & (1 << bOf[i])) && !(aSet & (1 << aOf[i]))) {
            const unit = [];
            for (let a = 0; a < n; a++) if (aSet & (1 << a)) unit.push(...units[aBase + a]);
            unit.sort((p, q) => p - q);
            return { level, cell: i, value: MARK, unit };
          }
        }
      }
    }
  }
  return null;
}

// ---- Öffentliche Schnittstelle ----

// Anzahl Lösungen (bis limit), Backtracking zeilenweise
export function countSolutions(puzzle, limit = 2) {
  const { n } = puzzle;
  const reg = prep(puzzle).reg;
  let count = 0;
  const rec = (r, colMask, regMask, prevCol) => {
    if (r === n) { count++; return; }
    for (let c = 0; c < n && count < limit; c++) {
      if (colMask & (1 << c)) continue;
      if (prevCol >= 0 && Math.abs(c - prevCol) <= 1) continue;
      const g = reg[r * n + c];
      if (regMask & (1 << g)) continue;
      rec(r + 1, colMask | (1 << c), regMask | (1 << g), c);
    }
  };
  rec(0, 0, 0, -1);
  return count;
}

// Löst rein logisch. cells (optional) wird nicht verändert.
// -> { solved, steps, maxLevel, cells /* Endzustand mit DOG/MARK */ }
export function solveLogic(puzzle, cells) {
  const P = prep(puzzle);
  const work = cells ? Uint8Array.from(cells) : new Uint8Array(P.N);
  const steps = [];
  let maxLevel = 0;
  for (let s; (s = findStep(P, work));) {
    work[s.cell] = s.value;
    steps.push(s);
    if (s.level > maxLevel) maxLevel = s.level;
  }
  return { solved: isSolved(puzzle, work), steps, maxLevel, cells: work };
}

// Erster Schritt, der die Anzeige ändert (angezeigte Auto-Pfoten zählen als MARK)
export function nextStep(puzzle, cells, autoMark) {
  const P = prep(puzzle);
  const shown = new Uint8Array(P.N); // angezeigte Auto-Pfoten
  if (autoMark) {
    for (let d = 0; d < P.N; d++) {
      if (cells[d] !== DOG) continue;
      for (const j of P.inflList[d]) if (cells[j] === EMPTY) shown[j] = 1;
    }
  }
  const work = Uint8Array.from(cells);
  for (let s; (s = findStep(P, work));) {
    work[s.cell] = s.value;
    if (s.value === DOG ? cells[s.cell] !== DOG : cells[s.cell] === EMPTY && !shown[s.cell]) return s;
  }
  return null;
}

// Hinweis: zuerst Fehler, dann nächster Logikschritt; null nur wenn gelöst
export function hint(game) {
  const { puzzle, cells } = game;
  const { n } = puzzle;
  const sol = new Uint8Array(n * n);
  puzzle.solution.forEach((c, r) => { sol[r * n + c] = 1; });
  for (let i = 0; i < cells.length; i++) {
    if ((cells[i] === DOG && !sol[i]) || (cells[i] === MARK && sol[i])) return { kind: 'error', cell: i };
  }
  if (isSolved(puzzle, cells)) return null;
  const step = nextStep(puzzle, cells, game.autoMark);
  if (step) return { kind: 'step', step };
  // Logik steckt fest: nächsten Lösungs-Doggy verraten
  const cell = sol.findIndex((v, i) => v && cells[i] !== DOG);
  return { kind: 'step', step: { level: 5, cell, value: DOG, unit: [cell] } };
}

export function difficulty(result) {
  return [result.maxLevel, result.steps.filter(s => s.level >= 3).length, result.steps.length];
}
