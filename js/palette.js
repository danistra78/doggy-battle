// Rot-Grün-taugliche Pastellpalette: Farbe + Muster je Bereich
import { regionMap } from './rules.js';

export const PALETTE = ['#eeffe6', '#9c96ac', '#fffe96', '#d7d9db', '#d8ffff', '#f1dafe', '#9e96c6', '#e8e9a9', '#dba696', '#9d97fc'];
export const PATTERNS = ['dots', 'stripes', 'checks', 'waves', 'cross', 'diag', 'rings', 'zigzag', 'grid', 'none'];

const MATRIX = {
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};

const toLinear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const fromLinear = (v) => {
  v = Math.min(1, Math.max(0, v));
  return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
};
const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Machado 2009, Schweregrad 1.0, in linearem RGB; gibt [r,g,b] 0..255 zurück
export function simulate(hex, type) {
  const m = MATRIX[type];
  if (!m) throw new Error(`Unbekannter Typ: ${type}`);
  const lin = parse(hex).map(toLinear);
  return m.map((row) => Math.round(fromLinear(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
}

function lab(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIE76; Argumente sind Hex-Strings oder [r,g,b]
export function deltaE(a, b) {
  const la = lab(typeof a === 'string' ? parse(a) : a);
  const lb = lab(typeof b === 'string' ? parse(b) : b);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

// Nachbarbereiche je Bereich (4er-Nachbarschaft der Zellen)
function adjacency(puzzle) {
  const { n } = puzzle;
  const m = regionMap(puzzle);
  const count = Math.max(...m) + 1;
  const adj = Array.from({ length: count }, () => new Set());
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const a = m[r * n + c];
      if (c + 1 < n && m[r * n + c + 1] !== a) { adj[a].add(m[r * n + c + 1]); adj[m[r * n + c + 1]].add(a); }
      if (r + 1 < n && m[(r + 1) * n + c] !== a) { adj[a].add(m[(r + 1) * n + c]); adj[m[(r + 1) * n + c]].add(a); }
    }
  }
  return adj;
}

// Pair-Abstand: kleinstes ΔE unter deutan und protan
export function simDistance(a, b) {
  return Math.min(deltaE(simulate(a, 'deutan'), simulate(b, 'deutan')), deltaE(simulate(a, 'protan'), simulate(b, 'protan')));
}

// Gierige Graphfärbung: Bereiche nach Nachbarzahl absteigend (Index als Tie-Break);
// je Bereich die Farbe, deren kleinster simulierter Abstand zu bereits gefärbten Nachbarn
// maximal ist, unbenutzte Farben bevorzugt. Deterministisch.
export function assignColors(puzzle) {
  const adj = adjacency(puzzle);
  const order = adj.map((_, i) => i).sort((a, b) => adj[b].size - adj[a].size || a - b);
  const out = new Array(adj.length).fill(-1);
  const used = new Array(PALETTE.length).fill(0);
  for (const reg of order) {
    let best = -1, bestScore = -Infinity;
    for (let c = 0; c < PALETTE.length; c++) {
      let score = Infinity;
      for (const nb of adj[reg]) if (out[nb] >= 0) score = Math.min(score, c === out[nb] ? 0 : simDistance(PALETTE[c], PALETTE[out[nb]]));
      score = score * 1000 - used[c];
      if (score > bestScore) { bestScore = score; best = c; }
    }
    out[reg] = best;
    used[best]++;
  }
  return out;
}
