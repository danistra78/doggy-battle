// Bellen und Knurren: einmal per Web Audio offline berechnet, als WAV über <audio> abgespielt.
// <audio> statt Live-Web-Audio, weil iOS Web Audio beim Stummschalter und ohne
// Freischaltung im selben Tipp oft stumm lässt; <audio> spielt als Medienwiedergabe.
import { encodeWav } from './wav.js';

const RATE = 44100;
const LENGTH_S = 0.7;
let enabled = () => true;
const clips = {}; // kind -> HTMLAudioElement
const playing = new WeakSet();
let unlocked = false;

// Kompressor + Aufholverstärkung, damit es aus kleinen Lautsprechern laut genug klingt
export function chain(c) {
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -30;
  comp.knee.value = 6;
  comp.ratio.value = 12;
  comp.attack.value = 0.001;
  comp.release.value = 0.15;
  const gain = c.createGain();
  gain.gain.value = 2.5;
  comp.connect(gain).connect(c.destination);
  return comp;
}

let noise = null;
function noiseBuffer(c) {
  if (!noise || noise.sampleRate !== c.sampleRate) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// Ein Burst: Bandpass-Mittenfrequenz fährt von f0 nach f1, Lautstärke mit Hüllkurve
function burst(c, out, t, dur, f0, f1, q, vol) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, t);
  filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

// Klang auf out ab Zeit t planen
export function schedule(c, out, kind, t) {
  if (kind === 'happy') {
    burst(c, out, t, 0.14, 500, 1100, 4, 1);
    burst(c, out, t + 0.24, 0.16, 600, 1300, 4, 1);
  } else {
    // Knurren: tief klingen, aber im Bereich, den kleine Lautsprecher wiedergeben
    burst(c, out, t, 0.5, 420, 260, 2.5, 1);
    burst(c, out, t + 0.1, 0.4, 320, 220, 2, 0.7);
  }
}

// Offline rendern (braucht keinen Tipp); ältere Safari-Versionen melden über oncomplete
async function render(kind) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const c = new OAC(1, Math.round(RATE * LENGTH_S), RATE);
  schedule(c, chain(c), kind, 0.01);
  const done = new Promise((resolve) => { c.oncomplete = (e) => resolve(e.renderedBuffer); });
  const p = c.startRendering();
  const buf = (p && typeof p.then === 'function') ? await p : await done;
  const url = URL.createObjectURL(new Blob([encodeWav(buf.getChannelData(0), RATE)], { type: 'audio/wav' }));
  const a = new Audio(url);
  a.preload = 'auto';
  a.addEventListener('ended', () => playing.delete(a));
  return a;
}

// iOS gibt ein <audio> erst frei, wenn es einmal in einem Tipp gestartet wurde: stumm starten und anhalten
function unlock() {
  if (unlocked || !clips.happy) return;
  unlocked = true;
  for (const a of Object.values(clips)) {
    if (playing.has(a)) continue;
    a.muted = true;
    Promise.resolve(a.play()).then(() => {
      if (!playing.has(a)) { a.pause(); a.currentTime = 0; }
      a.muted = false;
    }).catch(() => { a.muted = false; unlocked = false; });
  }
}

export function initSound(isEnabled) {
  enabled = isEnabled;
  Promise.all(['happy', 'grumble'].map(async (k) => { clips[k] = await render(k); }))
    .catch((e) => console.warn('Ton:', e));
  for (const type of ['touchend', 'click', 'keydown']) document.addEventListener(type, unlock, { passive: true, capture: true });
}

function play(kind) {
  const a = clips[kind];
  if (!a) return;
  playing.add(a);
  a.muted = false;
  try { a.currentTime = 0; } catch {}
  Promise.resolve(a.play()).catch((e) => { playing.delete(a); console.warn('Ton:', e); });
}

export function bark(kind) {
  if (enabled()) play(kind);
}

// Elternmenü: spielt immer, auch wenn «Ton» aus ist
export function testSound() {
  unlock();
  play('happy');
}
