// Bellen und Knurren per Web Audio (gefilterte Rauschbursts)
let ctx = null, master = null;
let enabled = () => true;

// Laut genug für iPad-Lautsprecher: Kompressor + Aufholverstärkung vor dem Ausgang
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

function ensure() {
  // iOS: Wiedergabe statt «Umgebung», sonst schaltet der Stummschalter Web Audio ab
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!ctx && AC) {
    try { ctx = new AC(); master = chain(ctx); } catch { ctx = null; master = null; }
  }
  if (ctx && ctx.state !== 'running') ctx.resume?.().catch?.(() => {});
  return ctx;
}

// Safari zählt pointerdown nicht als Nutzeraktion: erst bei pointerup/click/touchend erzeugen
export function initSound(isEnabled) {
  enabled = isEnabled;
  for (const type of ['pointerup', 'click', 'touchend']) document.addEventListener(type, ensure, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx) ensure(); });
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

// Klang auf out ab Zeit t planen (auch für Offline-Messung nutzbar)
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

export function bark(kind) {
  if (!enabled()) return;
  const c = ensure();
  if (!c || c.state === 'closed') return;
  schedule(c, master, kind, c.currentTime + 0.01);
}
