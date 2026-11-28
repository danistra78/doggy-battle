import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURVE, pickPuzzle, advance, stepBack, load, store, reset } from '../js/progress.js';
import { transform } from '../js/generator.js';

const pull = f => JSON.parse(readFileSync(new URL(`../puzzles/${f}`, import.meta.url), 'utf8'));
const pools = {
  4: pull('tutorial.json'),
  5: pull('5.json'),
  6: pull('6.json'),
  7: pull('7.json'),
  8: pull('8.json'),
  9: pull('9.json'),
  10: pull('10.json'),
};

const KEY = 'doggyBattle.v1';

// Storage-Attrappe mit getItem/setItem auf einem Map
function memStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    raw: m,
  };
}

// Schwierigkeit als Vergleichsschlüssel (lexikografisch)
const cmpDiff = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

const defaultSettings = { sound: true, autoMark: false };
const baseSave = (over = {}) => ({
  version: 1,
  section: 0,
  index: 0,
  totalSolved: 0,
  current: null,
  settings: { ...defaultSettings },
  settingsRev: 2,
  ...over,
});

// Gültige Lösung: eine Spalte je Zeile, keine zwei Doggys in Spalte oder Nachbarschaft
function isValidSolution(p) {
  const { n, solution } = p;
  if (solution.length !== n) return false;
  if (new Set(solution).size !== n) return false;
  for (let r = 1; r < n; r++) {
    if (Math.abs(solution[r] - solution[r - 1]) <= 1) return false;
  }
  return true;
}

test('CURVE: Abschnitte 4×4 bis 10×10, Tutorial zuerst, letzter unendlich', () => {
  assert.deepEqual(CURVE.map(s => s.n), [4, 5, 6, 7, 8, 9, 10]);
  assert.equal(CURVE[0].tutorial, true);
  assert.equal(CURVE[0].count, 3);
  assert.equal(CURVE[6].count, Infinity);
});

test('pickPuzzle: erster Index jedes Abschnitts ist das leichteste Rätsel', () => {
  CURVE.forEach((s, section) => {
    const first = pickPuzzle(pools, section, 0);
    assert.deepEqual(first.difficulty, pools[s.n][0].difficulty, `Abschnitt ${section}`);
  });
});

test('pickPuzzle: Schwierigkeit steigt nicht fallend über Indizes (endliche Abschnitte)', () => {
  CURVE.slice(0, 6).forEach((s, section) => {
    let prev = null;
    for (let i = 0; i < s.count; i++) {
      const p = pickPuzzle(pools, section, i);
      if (prev) assert.ok(cmpDiff(prev.difficulty, p.difficulty) <= 0, `Abschnitt ${section}, Index ${i}`);
      prev = p;
    }
  });
});

test('pickPuzzle: Tutorial liefert tutorial[index] unverändert', () => {
  [0, 1, 2].forEach(i => {
    assert.equal(pickPuzzle(pools, 0, i).id, pools[4][i].id);
  });
});

test('pickPuzzle: endlicher Abschnitt gibt ein Original aus dem Pool zurück', () => {
  const p = pickPuzzle(pools, 2, 7);
  assert.ok(pools[6].some(q => q.id === p.id && q.regions === p.regions));
});

test('pickPuzzle: 10×10 bei Index len und len+1 liefert gültige, verschiedene, transformierte Rätsel', () => {
  const pool = pools[10];
  const len = pool.length;
  const a = pickPuzzle(pools, 6, len);
  const b = pickPuzzle(pools, 6, len + 1);

  // Index len → pool[0] mit t = floor(len/len) % 8 = 1
  assert.equal(a.id, `${pool[0].id}-t1`);
  assert.deepEqual(a, { ...transform(pool[0], 1), id: `${pool[0].id}-t1` });
  assert.equal(b.id, `${pool[1].id}-t1`);

  for (const p of [a, b]) {
    assert.equal(p.n, 10);
    assert.equal(p.regions.length, 100);
    assert.ok(isValidSolution(p));
  }
  assert.notEqual(a.regions, b.regions);
  assert.notEqual(a.id, b.id);
  assert.notEqual(a.regions, pool[0].regions);
});

test('advance: nach letztem 5×5 → Abschnitt 6×6, Index 0, Zähler und current zurückgesetzt', () => {
  const save = baseSave({ section: 1, index: CURVE[1].count - 1, totalSolved: 4, current: { puzzle: {}, cells: [] } });
  const next = advance(save);
  assert.equal(next.section, 2);
  assert.equal(next.index, 0);
  assert.equal(next.totalSolved, 5);
  assert.equal(next.current, null);
});

test('advance: innerhalb eines Abschnitts nur Index + 1', () => {
  const next = advance(baseSave({ section: 3, index: 4, totalSolved: 10 }));
  assert.equal(next.section, 3);
  assert.equal(next.index, 5);
  assert.equal(next.totalSolved, 11);
});

test('advance: 10×10 verlässt den Abschnitt nie', () => {
  let s = baseSave({ section: 6, index: 299 });
  s = advance(s);
  assert.equal(s.section, 6);
  assert.equal(s.index, 300);
  s = advance(s);
  assert.equal(s.index, 301);
});

test('load: fehlender Eintrag → Standard-Save', () => {
  const d = load(memStorage());
  assert.deepEqual(d, baseSave());
});

test('load: kaputtes JSON → Standard-Save', () => {
  const s = memStorage();
  s.setItem(KEY, '{kaputt');
  assert.deepEqual(load(s), baseSave());
});

test('load: falsche version → Standard-Save', () => {
  const s = memStorage();
  s.setItem(KEY, JSON.stringify(baseSave({ version: 2, section: 4, totalSolved: 99 })));
  assert.deepEqual(load(s), baseSave());
});

test('load: getItem wirft → kein Throw, Standard-Save', () => {
  const s = { getItem: () => { throw new Error('denied'); }, setItem() {} };
  assert.doesNotThrow(() => load(s));
  assert.deepEqual(load(s), baseSave());
});

test('load: fehlende settings-Schlüssel werden mit Standard gefüllt', () => {
  const s = memStorage();
  s.setItem(KEY, JSON.stringify(baseSave({ settings: { sound: false } })));
  assert.deepEqual(load(s).settings, { sound: false, autoMark: false });
});

test('store/load: current bleibt erhalten, auch wenn pools später andere Rätsel enthalten', () => {
  const mutablePools = { ...pools, 5: [...pools[5]] };
  const puzzle = mutablePools[5][3];
  const save = baseSave({
    section: 1,
    index: 2,
    totalSolved: 7,
    current: { puzzle, cells: [0, 5, 10, 15, 20] },
  });
  const s = memStorage();
  assert.equal(store(s, save), true);

  // Pool nachträglich verändern
  mutablePools[5][3] = mutablePools[5][4];
  mutablePools[5][4] = puzzle;

  assert.deepEqual(load(s), save);
});

test('store: setItem wirft → kein Throw, Rückgabe false', () => {
  const s = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  assert.doesNotThrow(() => store(s, baseSave()));
  assert.equal(store(s, baseSave()), false);
});

test('store: schreibt unter doggyBattle.v1, Rückgabe true', () => {
  const s = memStorage();
  assert.equal(store(s, baseSave({ totalSolved: 3 })), true);
  assert.equal(JSON.parse(s.raw.get(KEY)).totalSolved, 3);
});

test('stepBack: aus Abschnitt 1 bleibt in 1, Index 0', () => {
  const back = stepBack(baseSave({ section: 1, index: 3, totalSolved: 2, current: { puzzle: {}, cells: [] } }));
  assert.equal(back.section, 1);
  assert.equal(back.index, 0);
  assert.equal(back.current, null);
  assert.equal(back.totalSolved, 2);
});

test('stepBack: aus Abschnitt 3 → Abschnitt 2, Index 0', () => {
  const back = stepBack(baseSave({ section: 3, index: 4 }));
  assert.equal(back.section, 2);
  assert.equal(back.index, 0);
  assert.equal(back.current, null);
});

test('stepBack: in der Übung (Abschnitt 0) unverändert', () => {
  const save = baseSave({ section: 0, index: 2, current: { puzzle: {}, cells: [] } });
  assert.deepEqual(stepBack(save), save);
});

test('reset: liefert frischen Standard-Save', () => {
  assert.deepEqual(reset(), baseSave());
});

// Ungültige Felder: load fällt auf den vollständigen Standard-Save zurück
const badSaves = {
  'section 99 (ausserhalb CURVE)': { section: 99 },
  'section -1': { section: -1 },
  'section 1.5': { section: 1.5 },
  'section als String': { section: '1' },
  'index -1': { index: -1 },
  'index 1.5': { index: 1.5 },
  'index als String': { index: '2' },
  'totalSolved -1': { totalSolved: -1 },
  'totalSolved als String': { totalSolved: '3' },
  'current als Zahl': { current: 5 },
  'current ohne puzzle': { current: { cells: [] } },
  'current ohne cells': { current: { puzzle: {} } },
  'current mit cells als String': { current: { puzzle: {}, cells: 'x' } },
};

for (const [name, bad] of Object.entries(badSaves)) {
  test(`load: ungültig (${name}) → Standard-Save`, () => {
    const s = memStorage();
    s.setItem(KEY, JSON.stringify({ ...baseSave({ section: 2, index: 3, totalSolved: 4 }), ...bad }));
    assert.deepEqual(load(s), baseSave());
  });
}

test('load: gültiger Save mit current-Objekt bleibt erhalten', () => {
  const s = memStorage();
  const save = baseSave({ section: 2, index: 3, totalSolved: 4, current: { puzzle: {}, cells: [1, 2] } });
  s.setItem(KEY, JSON.stringify(save));
  assert.deepEqual(load(s), save);
});

test('pickPuzzle: Index über count wird auf count-1 geklemmt, kein Throw', () => {
  assert.doesNotThrow(() => pickPuzzle(pools, 1, 99));
  assert.deepEqual(pickPuzzle(pools, 1, 99), pickPuzzle(pools, 1, 4));
  assert.deepEqual(pickPuzzle(pools, 0, 99), pickPuzzle(pools, 0, 2));
});

test('load: alter Save ohne settingsRev bekommt Auto-Pfoten aus, Rest bleibt', () => {
  const s = memStorage();
  const old = baseSave({ section: 3, index: 2, totalSolved: 9, settings: { sound: false, autoMark: true } });
  delete old.settingsRev;
  s.setItem(KEY, JSON.stringify(old));
  const got = load(s);
  assert.deepEqual(got.settings, { sound: false, autoMark: false });
  assert.equal(got.settingsRev, 2);
  assert.equal(got.section, 3);
  assert.equal(got.totalSolved, 9);
});

test('load: mit settingsRev 2 bleibt eine bewusste Wahl Auto-Pfoten an erhalten', () => {
  const s = memStorage();
  s.setItem(KEY, JSON.stringify(baseSave({ settings: { sound: true, autoMark: true } })));
  assert.equal(load(s).settings.autoMark, true);
});
