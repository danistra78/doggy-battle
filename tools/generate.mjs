// Rätselvorrat erzeugen: node tools/generate.mjs [--seed 1]
// Verteilt einzelne Starts auf worker_threads. Reproduzierbar: Start k einer Grösse n hat
// einen festen Seed, Ergebnisse werden in Reihenfolge von k ausgewertet.
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync, mkdirSync } from 'node:fs';
import { rng, generate, canonical } from '../js/generator.js';

const SIZES = [[4, 3, 'tutorial.json'], [5, 100], [6, 100], [7, 100], [8, 100], [9, 100], [10, 300]];
const MAX_JOBS = 2_000_000;

// Seed für Start k bei Grösse n
function jobSeed(seed, n, k) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(n, 0xc2b2ae35) ^ Math.imul(k + 1, 0x27d4eb2f);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return h >>> 0;
}

if (!isMainThread) {
  parentPort.on('message', ({ n, k, seed }) => {
    parentPort.postMessage({ k, p: generate(n, rng(jobSeed(seed, n, k))) });
  });
} else {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seed');
  const seed = si >= 0 ? Number(args[si + 1]) : 1;
  if (!Number.isInteger(seed)) { console.error('--seed braucht eine ganze Zahl'); process.exit(1); }
  const outDir = new URL('../puzzles/', import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const workers = Array.from({ length: Math.max(1, availableParallelism() - 1) },
    () => new Worker(new URL(import.meta.url)));
  const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

  const runSize = (n, count) => new Promise((resolve, reject) => {
    const results = new Map();   // k -> Puzzle|null
    const canon = new Set();
    const chosen = [];
    let next = 0, done = 0, inFlight = 0, finished = false, okStarts = 0;
    const feed = w => {
      if (finished || next >= MAX_JOBS) return false;
      w.postMessage({ n, k: next++, seed }); inFlight++;
      return true;
    };
    for (const w of workers) {
      w.removeAllListeners('message');
      w.on('message', ({ k, p }) => {
        inFlight--;
        results.set(k, p);
        // Ergebnisse streng in Reihenfolge von k übernehmen
        while (!finished && results.has(done)) {
          const q = results.get(done); results.delete(done); done++;
          if (!q) continue;
          okStarts++;
          const c = canonical(q);
          if (canon.has(c)) continue;
          canon.add(c); chosen.push(q);
          if (chosen.length === count) finished = true;
        }
        if (!finished) {
          if (!feed(w) && inFlight === 0) reject(new Error(`n=${n}: nur ${chosen.length} von ${count}`));
        } else if (inFlight === 0) resolve({ chosen, starts: done, okStarts });
      });
    }
    for (const w of workers) feed(w);
  });

  for (const [n, count, file = `${n}.json`] of SIZES) {
    const t0 = performance.now();
    const { chosen, starts, okStarts } = await runSize(n, count);
    chosen.sort((a, b) => cmp(a.difficulty, b.difficulty)); // stabil: Reihenfolge der Starts
    const out = chosen.map((p, i) => ({
      id: `${n}-${String(i + 1).padStart(3, '0')}`, n, regions: p.regions, solution: p.solution, difficulty: p.difficulty,
    }));
    writeFileSync(new URL(file, outDir), '[\n' + out.map(p => JSON.stringify(p)).join(',\n') + '\n]\n');
    const s = ((performance.now() - t0) / 1000).toFixed(1);
    console.log(`${n}×${n}: ${count} Rätsel in ${s} s (${starts} Starts, ${okStarts} erfolgreich, ${okStarts - count} Dubletten) -> ${file}`);
  }
  for (const w of workers) await w.terminate();
}
