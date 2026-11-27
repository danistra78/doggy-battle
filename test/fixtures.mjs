// 5x5-Testpuzzle (eindeutig lösbar)
export const FIX5 = {
  id: '5-fix',
  n: 5,
  regions: 'AAABBABBBBBBBBCDDBBBDEEEE',
  solution: [0, 2, 4, 1, 3],
};
// Zellindizes der Lösung
export const FIX5_CELLS = FIX5.solution.map((c, r) => r * FIX5.n + c);

// Prüft: genau n Bereiche A.., jeder 4-zusammenhängend
export function regionsConnected(p) {
  const { n, regions } = p;
  const N = n * n;
  for (let g = 0; g < n; g++) {
    const ch = String.fromCharCode(65 + g);
    const cells = [];
    for (let i = 0; i < N; i++) if (regions[i] === ch) cells.push(i);
    if (cells.length === 0) return false;
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const i = stack.pop();
      const r = Math.floor(i / n), c = i % n;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc, j = rr * n + cc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || seen.has(j) || regions[j] !== ch) continue;
        seen.add(j); stack.push(j);
      }
    }
    if (seen.size !== cells.length) return false;
  }
  for (let i = 0; i < N; i++) {
    const g = regions.charCodeAt(i) - 65;
    if (g < 0 || g >= n) return false;
  }
  return true;
}

// Lösung als Spielfeld
export function solutionCells(p) {
  const cells = new Uint8Array(p.n * p.n);
  p.solution.forEach((c, r) => { cells[r * p.n + c] = 2; });
  return cells;
}

// Lexikographischer Vergleich von Zahlenlisten
export function cmpList(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
