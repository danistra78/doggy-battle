// Spielzustand: Tippzyklus, Wischen, Rückgängig
import { EMPTY, MARK, DOG, autoMarks, conflicts, isSolved } from './rules.js';

export class Game {
  constructor(puzzle, cells, autoMark = true) {
    this.puzzle = puzzle;
    this.cells = cells ?? new Uint8Array(puzzle.n * puzzle.n);
    this.autoMark = autoMark;
    this.undoStack = [];
    this.listeners = [];
    this.swipe = null;
    this._auto = null; // Cache von autoMarks, bei Änderung verworfen
  }

  _autoSet() {
    return (this._auto ??= autoMarks(this.puzzle, this.cells));
  }

  _changed() {
    this._auto = null;
    for (const fn of this.listeners) fn();
  }

  onChange(fn) { this.listeners.push(fn); }

  view(i) {
    const v = this.cells[i];
    if (v === DOG) return 'dog';
    if (v === MARK) return 'mark';
    return this.autoMark && this._autoSet().has(i) ? 'auto' : 'empty';
  }

  tap(i) {
    const v = this.view(i);
    const next = v === 'empty' ? MARK : v === 'dog' ? EMPTY : v === 'mark' ? DOG : DOG;
    this.set(i, next);
  }

  set(i, value) {
    const old = this.cells[i];
    if (old === value) return;
    this.cells[i] = value;
    this.undoStack.push([[i, old]]);
    this._changed();
  }

  beginSwipe() { this.swipe = []; }

  swipeOver(i) {
    if (!this.swipe || this.cells[i] !== EMPTY) return;
    this.swipe.push([i, EMPTY]);
    this.cells[i] = MARK;
    this._changed();
  }

  endSwipe() {
    if (this.swipe && this.swipe.length) this.undoStack.push(this.swipe);
    this.swipe = null;
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    for (let k = entry.length - 1; k >= 0; k--) this.cells[entry[k][0]] = entry[k][1];
    this._changed();
    return true;
  }

  conflicts() { return conflicts(this.puzzle, this.cells); }
  solved() { return isSolved(this.puzzle, this.cells); }
  toJSON() { return { puzzle: this.puzzle, cells: Array.from(this.cells) }; }
}
