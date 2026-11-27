// Spielstand wiederherstellen: gespeichertes Rätsel nur verwenden, wenn es brauchbar ist
import { Game } from './state.js';
import { pickPuzzle } from './progress.js';

function usable(puzzle, cells) {
  const n = puzzle?.n;
  return Number.isInteger(n) && n > 0
    && typeof puzzle.regions === 'string' && puzzle.regions.length === n * n
    && Array.isArray(puzzle.solution) && puzzle.solution.length === n
    && cells.length === n * n
    && cells.every((v) => v === 0 || v === 1 || v === 2);
}

export function restoreGame(save, pools) {
  const { current, settings } = save;
  if (current) {
    try {
      const cells = Uint8Array.from(current.cells);
      if (usable(current.puzzle, cells)) return new Game(current.puzzle, cells, settings.autoMark);
    } catch { /* kaputter Eintrag: frisches Rätsel */ }
  }
  return new Game(pickPuzzle(pools, save.section, save.index), undefined, settings.autoMark);
}
