// Schwierigkeitskurve und Speicherstand
import { transform } from './generator.js';

export const CURVE = [
  { n: 4, count: 3, tutorial: true },
  { n: 5, count: 5 },
  { n: 6, count: 8 },
  { n: 7, count: 10 },
  { n: 8, count: 10 },
  { n: 9, count: 10 },
  { n: 10, count: Infinity },
];

const KEY = 'doggyBattle.v1';
const VERSION = 1;
const DEFAULT_SETTINGS = { sound: true, autoMark: true };

// Standard-Save: frisch bei jedem Aufruf, damit nichts geteilt wird
function defaultSave() {
  return {
    version: VERSION,
    section: 0,
    index: 0,
    totalSolved: 0,
    current: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

// Rätsel für Abschnitt und Index. pools[n] ist das Array der Rätsel mit Grösse n.
export function pickPuzzle(pools, section, index) {
  const { n, count } = CURVE[section];
  const pool = pools[n];
  // Index auf den gültigen Bereich klemmen, damit nie ausserhalb des Pools gelesen wird
  const last = count === Infinity ? Infinity : count - 1;
  const i = Math.min(index, last);

  if (CURVE[section].tutorial) return pool[i];

  if (count === Infinity) {
    const len = pool.length;
    const t = Math.floor(i / len) % 8;
    const p = pool[i % len];
    return { ...transform(p, t), id: `${p.id}-t${t}` };
  }

  // Endlicher Abschnitt: gleichmässig über die unteren 70 % des Pools.
  // count === 1 umgehen, sonst Division durch 0.
  const len = pool.length;
  const k = count === 1 ? 0 : Math.round((i * (0.7 * (len - 1))) / (count - 1));
  return pool[k];
}

// Nächstes Rätsel: nächster Index, bzw. nächster Abschnitt am Ende
export function advance(save) {
  const { section, index } = save;
  const { count } = CURVE[section];
  const last = count !== Infinity && index + 1 >= count;

  return {
    ...save,
    section: last ? section + 1 : section,
    index: last ? 0 : index + 1,
    totalSolved: save.totalSolved + 1,
    current: null,
  };
}

// Zurück zum Anfang des vorherigen Abschnitts, nie unter Abschnitt 1
export function stepBack(save) {
  return {
    ...save,
    section: Math.max(1, save.section - 1),
    index: 0,
    current: null,
  };
}

// Lädt den Save; bei fehlendem, kaputtem oder fremdem Eintrag der Standard
export function load(storage) {
  let raw;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return defaultSave();
  }
  if (raw == null) return defaultSave();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (!data || typeof data !== 'object' || data.version !== VERSION) return defaultSave();
  if (!isValidFields(data)) return defaultSave();

  const base = defaultSave();
  const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  return {
    ...base,
    ...data,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

// Prüft Abschnitt, Index, Zähler und current; sonst Standard
function isValidFields(d) {
  const { section, index, totalSolved, current } = d;
  if (!(Number.isInteger(section) && section >= 0 && section < CURVE.length)) return false;
  if (!(Number.isInteger(index) && index >= 0)) return false;
  if (!(Number.isInteger(totalSolved) && totalSolved >= 0)) return false;
  if (current === null) return true;
  return (
    typeof current === 'object' &&
    current.puzzle !== undefined &&
    current.puzzle !== null &&
    Array.isArray(current.cells)
  );
}

// Speichert den Save; Rückgabe false bei Fehler (Quota, Privatmodus)
export function store(storage, save) {
  try {
    storage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function reset() {
  return defaultSave();
}
