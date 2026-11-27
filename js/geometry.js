// Reine Geometrie ohne DOM: Bereichskonturen und Gestenerkennung
import { regionMap } from './rules.js';

const LETTERS = 'ABCDEFGHIJ';
const fmt = (v) => String(Math.round(v * 100) / 100);

// SVG-Pfad der Kontur von Bereich r (Index 0..9 oder Buchstabe); radius in derselben Einheit wie cell. Konvexe Ecken gerundet (Bogen), konkave spitz.
export function regionOutline(puzzle, r, cell = 1, radius = 0.18) {
  const { n } = puzzle;
  const m = regionMap(puzzle);
  const id = typeof r === 'number' ? r : LETTERS.indexOf(r);
  const mine = (row, col) => row >= 0 && col >= 0 && row < n && col < n && m[row * n + col] === id;
  const rr = radius / cell; // Radius (gleiche Einheit wie cell) in Zelleinheiten
  // Gerichtete Randkanten im Uhrzeigersinn (y nach unten), Bereich liegt rechts der Laufrichtung
  const out = new Map(); // "x,y" -> [[x2,y2], ...]
  const add = (x1, y1, x2, y2) => {
    const k = `${x1},${y1}`;
    if (!out.has(k)) out.set(k, []);
    out.get(k).push([x2, y2]);
  };
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!mine(row, col)) continue;
      if (!mine(row - 1, col)) add(col, row, col + 1, row);
      if (!mine(row, col + 1)) add(col + 1, row, col + 1, row + 1);
      if (!mine(row + 1, col)) add(col + 1, row + 1, col, row + 1);
      if (!mine(row, col - 1)) add(col, row + 1, col, row);
    }
  }
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const dir = (x1, y1, x2, y2) => [Math.sign(x2 - x1), Math.sign(y2 - y1)];
  let d = '';
  while (out.size) {
    const [k0, list0] = out.entries().next().value;
    const take = (k, prevDir) => {
      const list = out.get(k);
      let pick = 0;
      if (list.length > 1 && prevDir) {
        // Pinch-Punkt: am stärksten nach rechts abbiegen, so bleiben diagonal berührende Teile getrennt
        const [x, y] = k.split(',').map(Number);
        let best = -Infinity;
        list.forEach((t, idx) => {
          const c = cross(prevDir, dir(x, y, t[0], t[1]));
          if (c > best) { best = c; pick = idx; }
        });
      }
      const t = list.splice(pick, 1)[0];
      if (!list.length) out.delete(k);
      return t;
    };
    const [sx, sy] = k0.split(',').map(Number);
    const verts = [[sx, sy]];
    let cur = take(k0, null);
    while (`${cur[0]},${cur[1]}` !== k0) {
      verts.push(cur);
      const prev = verts[verts.length - 2];
      cur = take(`${cur[0]},${cur[1]}`, dir(prev[0], prev[1], cur[0], cur[1]));
    }
    // Kollineare Punkte entfernen
    const k = verts.length;
    const pts = verts.filter((v, i) => {
      const p = verts[(i + k - 1) % k], q = verts[(i + 1) % k];
      return cross(dir(p[0], p[1], v[0], v[1]), dir(v[0], v[1], q[0], q[1])) !== 0;
    });
    const c = pts.length;
    const P = (x, y) => `${fmt(x * cell)} ${fmt(y * cell)}`;
    // Start in der Mitte der ersten Kante, dann alle Ecken, zuletzt Ecke 0
    const mid = [(pts[0][0] + pts[1 % c][0]) / 2, (pts[0][1] + pts[1 % c][1]) / 2];
    d += `M${P(mid[0], mid[1])}`;
    for (let s = 1; s <= c; s++) {
      const v = pts[s % c], p = pts[s - 1], q = pts[(s + 1) % c];
      const d1 = dir(p[0], p[1], v[0], v[1]), d2 = dir(v[0], v[1], q[0], q[1]);
      if (cross(d1, d2) > 0) {
        d += `L${P(v[0] - d1[0] * rr, v[1] - d1[1] * rr)}A${fmt(radius)} ${fmt(radius)} 0 0 1 ${P(v[0] + d2[0] * rr, v[1] + d2[1] * rr)}`;
      } else {
        d += `L${P(v[0], v[1])}`;
      }
    }
    d += 'Z';
  }
  return d;
}

// Zellindex unter Punkt (x, y) in einem Gitter der Kantenlänge size, sonst -1
export function cellAt(x, y, n, size) {
  if (!(x >= 0 && y >= 0 && x < size && y < size)) return -1;
  const cs = size / n;
  return Math.floor(y / cs) * n + Math.floor(x / cs);
}

// Wisch erst, wenn der Finger > 8 px von der Startposition entfernt war und eine zweite Zelle erreicht hat
export function classifyGesture(points, n, size) {
  const start = cellAt(points[0].x, points[0].y, n, size);
  let far = false;
  const cells = [start];
  for (const p of points) {
    if (Math.hypot(p.x - points[0].x, p.y - points[0].y) > 8) far = true;
    const c = cellAt(p.x, p.y, n, size);
    if (c !== -1 && c !== cells[cells.length - 1]) cells.push(c);
  }
  const distinct = new Set(cells.filter((c) => c !== -1));
  if (far && distinct.size >= 2) return { kind: 'swipe', cells: cells.filter((c) => c !== -1) };
  return { kind: 'tap', cell: start };
}
