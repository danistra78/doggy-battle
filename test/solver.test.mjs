import test from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions, solveLogic, nextStep, hint, difficulty } from '../js/solver.js';
import { EMPTY, MARK, DOG, autoMarks } from '../js/rules.js';
import { Game } from '../js/state.js';
import { FIX5, FIX5_CELLS } from './fixtures.mjs';

const n = FIX5.n;
const at = (r, c) => r * n + c;

test('countSolutions: FIX5 eindeutig', () => {
  assert.equal(countSolutions(FIX5), 1);
});

test('countSolutions: 4x4 mit Zeilenbereichen hat 2 Lösungen', () => {
  assert.equal(countSolutions({ n: 4, regions: 'AAAABBBBCCCCDDDD' }), 2);
  assert.equal(countSolutions({ n: 4, regions: 'AAAABBBBCCCCDDDD' }, 1), 1);
});

test('solveLogic: FIX5 gelöst, DOGs = Lösung', () => {
  const res = solveLogic(FIX5);
  assert.equal(res.solved, true);
  const dogs = [];
  for (let i = 0; i < res.cells.length; i++) if (res.cells[i] === DOG) dogs.push(i);
  assert.deepEqual(dogs, FIX5_CELLS);
  assert.ok(res.maxLevel >= 1 && res.maxLevel <= 5);
  assert.equal(res.maxLevel, Math.max(...res.steps.map(s => s.level)));
  for (const s of res.steps) {
    assert.ok(Array.isArray(s.unit) && s.unit.length > 0);
    if (s.value === DOG) assert.ok(FIX5_CELLS.includes(s.cell));
    else assert.equal(s.value, MARK);
    if (s.value === MARK) assert.ok(!FIX5_CELLS.includes(s.cell));
  }
});

test('solveLogic: Eingabe-cells wird nicht verändert', () => {
  const cells = new Uint8Array(n * n);
  solveLogic(FIX5, cells);
  assert.ok(cells.every(v => v === EMPTY));
});

test('difficulty', () => {
  const res = solveLogic(FIX5);
  const d = difficulty(res);
  assert.equal(d[0], res.maxLevel);
  assert.equal(d[1], res.steps.filter(s => s.level >= 3).length);
  assert.equal(d[2], res.steps.length);
});

test('Stufe 1: Doggy schliesst Einfluss aus', () => {
  const cells = new Uint8Array(n * n);
  cells[at(0, 0)] = DOG;
  const s = solveLogic(FIX5, cells).steps[0];
  assert.equal(s.level, 1);
  assert.equal(s.value, MARK);
  assert.deepEqual(s.unit, [at(0, 0)]);
});

test('Stufe 2: Bereich C mit einem Kandidaten', () => {
  const s = solveLogic(FIX5).steps[0];
  assert.deepEqual({ level: s.level, cell: s.cell, value: s.value }, { level: 2, cell: at(2, 4), value: DOG });
});

test('nextStep: autoMark=true überspringt angezeigte Auto-Pfoten', () => {
  const cells = new Uint8Array(n * n);
  cells[at(0, 0)] = DOG;
  const auto = autoMarks(FIX5, cells);
  const s = nextStep(FIX5, cells, true);
  assert.ok(s);
  assert.ok(!(s.level === 1 && auto.has(s.cell)));
  assert.ok(!(s.value === MARK && auto.has(s.cell)));
  const s2 = nextStep(FIX5, cells, false);
  assert.equal(s2.level, 1);
  assert.equal(s2.value, MARK);
  assert.ok(auto.has(s2.cell));
  assert.ok(cells.filter(v => v !== EMPTY).length === 1); // unverändert
});

test('nextStep: null bei gelöstem Feld', () => {
  const cells = new Uint8Array(n * n);
  for (const i of FIX5_CELLS) cells[i] = DOG;
  assert.equal(nextStep(FIX5, cells, true), null);
});

test('hint: falscher Doggy -> error', () => {
  const g = new Game(FIX5);
  g.set(at(0, 1), DOG);
  assert.deepEqual(hint(g), { kind: 'error', cell: at(0, 1) });
});

test('hint: MARK auf Lösungsfeld -> error', () => {
  const g = new Game(FIX5);
  g.set(at(1, 2), MARK);
  assert.deepEqual(hint(g), { kind: 'error', cell: at(1, 2) });
});

test('hint: korrekter Teilstand -> step', () => {
  const g = new Game(FIX5);
  g.set(at(0, 0), DOG);
  g.set(at(4, 0), MARK);
  const h = hint(g);
  assert.equal(h.kind, 'step');
  assert.ok(h.step.level >= 1 && h.step.level <= 5);
  if (h.step.value === DOG) assert.ok(FIX5_CELLS.includes(h.step.cell));
  else assert.ok(!FIX5_CELLS.includes(h.step.cell) && g.view(h.step.cell) === 'empty');
});

test('hint: gelöst -> null', () => {
  const g = new Game(FIX5);
  for (const i of FIX5_CELLS) g.set(i, DOG);
  assert.equal(hint(g), null);
});

// Handzustand aus String: '.' leer, 'x' MARK, 'D' DOG
const parse = s => Uint8Array.from(s, ch => (ch === 'x' ? MARK : ch === 'D' ? DOG : EMPTY));
const first = (p, s) => solveLogic(p, parse(s)).steps[0];

test('Stufe 3: Kandidaten von Bereich E nur in Zeile 4', () => {
  const s = first(FIX5, '....x' + '...xx' + 'xxxxD' + '...xx' + '....x');
  assert.deepEqual(s, { level: 3, cell: at(4, 0), value: MARK, unit: [21, 22, 23, 24] });
});

test('Stufe 4: Doggy auf (0,1) nähme Zeile 1 alle Kandidaten', () => {
  const s = first(FIX5, '....x' + '...xx' + 'xxxxD' + '..xxx' + 'x...x');
  assert.deepEqual(s, { level: 4, cell: at(0, 1), value: MARK, unit: [5, 6, 7, 8, 9] });
});

test('Stufe 5: Bereiche B und E nur in Zeilen 3 und 4', () => {
  const P5 = { id: '5-l5', n: 5, regions: 'ADDDDAAADDAACDDBCCEEBBBEE', solution: [3, 0, 2, 4, 1] };
  assert.equal(countSolutions(P5), 1);
  const s = first(P5, '.xx..' + '..x..' + '.x.x.' + '.x.x.' + '..x..');
  assert.deepEqual(s, { level: 5, cell: 17, value: MARK, unit: [15, 18, 19, 20, 21, 22, 23, 24] });
  const res = solveLogic(P5);
  assert.equal(res.solved, true);
  assert.equal(res.maxLevel, 5);
  assert.deepEqual([...res.cells].flatMap((v, i) => (v === DOG ? [i % 5] : [])), P5.solution);
});
