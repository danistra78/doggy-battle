// Bellen und Knurren per Web Audio (gefilterte Rauschbursts)
let ctx = null;
let enabled = () => true;

function ensure() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!ctx && AC) {
    try { ctx = new AC(); } catch { ctx = null; }
  }
  if (ctx && ctx.state !== 'running') ctx.resume?.().catch?.(() => {});
  return ctx;
}

// Safari zählt pointerdown nicht als Nutzeraktion: erst bei pointerup/click erzeugen
export function initSound(isEnabled) {
  enabled = isEnabled;
  for (const type of ['pointerup', 'click']) document.addEventListener(type, ensure, { passive: true });
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
function burst(c, t, dur, f0, f1, q, vol) {
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
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

export function bark(kind) {
  if (!enabled()) return;
  const c = ensure();
  if (!c || c.state === 'closed') return;
  const t = c.currentTime + 0.01;
  if (kind === 'happy') {
    burst(c, t, 0.14, 500, 1100, 5, 0.9);
    burst(c, t + 0.24, 0.16, 600, 1300, 5, 1);
  } else {
    burst(c, t, 0.5, 220, 110, 3, 1);
    burst(c, t + 0.1, 0.4, 160, 90, 2, 0.5);
  }
}
