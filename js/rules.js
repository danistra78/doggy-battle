// Regeln: Zellindex i = row*n + col; Felder: EMPTY/MARK/DOG
export const EMPTY = 0, MARK = 1, DOG = 2;

export function regionMap(puzzle) {
  const m = new Int8Array(puzzle.n * puzzle.n);
  for (let i = 0; i < m.length; i++) m[i] = puzzle.regions.charCodeAt(i) - 65;
  return m;
}

// Nachbarn + Zeile + Spalte + Bereich von i, ohne i, sortiert
export function influence(puzzle, i) {
  const { n } = puzzle;
  const m = regionMap(puzzle);
  const r = Math.floor(i / n), c = i % n;
  const out = [];
  for (let j = 0; j < n * n; j++) {
    if (j === i) continue;
    const jr = Math.floor(j / n), jc = j % n;
    if (jr === r || jc === c || m[j] === m[i] || (Math.abs(jr - r) <= 1 && Math.abs(jc - c) <= 1)) out.push(j);
  }
  return out;
}

// Doggys, die gegen eine Regel verstossen
export function conflicts(puzzle, cells) {
  const m = regionMap(puzzle);
  const dogs = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === DOG) dogs.push(i);
  const bad = new Set();
  const { n } = puzzle;
  for (let a = 0; a < dogs.length; a++) {
    for (let b = a + 1; b < dogs.length; b++) {
      const i = dogs[a], j = dogs[b];
      const ir = Math.floor(i / n), ic = i % n, jr = Math.floor(j / n), jc = j % n;
      if (ir === jr || ic === jc || m[i] === m[j] || (Math.abs(ir - jr) <= 1 && Math.abs(ic - jc) <= 1)) {
        bad.add(i); bad.add(j);
      }
    }
  }
  return bad;
}

// Leere Felder im Einfluss eines Doggys
export function autoMarks(puzzle, cells) {
  const out = new Set();
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== DOG) continue;
    for (const j of influence(puzzle, i)) if (cells[j] === EMPTY) out.add(j);
  }
  return out;
}

export function isSolved(puzzle, cells) {
  let dogs = 0;
  for (let i = 0; i < cells.length; i++) if (cells[i] === DOG) dogs++;
  return dogs === puzzle.n && conflicts(puzzle, cells).size === 0;
}
