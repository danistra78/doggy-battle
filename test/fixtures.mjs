// 5x5-Testpuzzle (eindeutig lösbar)
export const FIX5 = {
  id: '5-fix',
  n: 5,
  regions: 'AAABBABBBBBBBBCDDBBBDEEEE',
  solution: [0, 2, 4, 1, 3],
};
// Zellindizes der Lösung
export const FIX5_CELLS = FIX5.solution.map((c, r) => r * FIX5.n + c);
