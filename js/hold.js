// Drücken und Halten: kurzer Tipp → onTap, nach ms gehalten → onLong.
// Sichtbarer Fortschritt über die Klasse .holding (CSS füllt den Knopf).
// Auf iOS: touchstart ohne Standardaktion, sonst bricht Safari das Halten ab
// (Textauswahl, Lupe) und schickt pointercancel.
export function onHold(el, { ms, onTap = () => {}, onLong }) {
  let timer = 0, fired = false, active = false;
  el.style.setProperty('--hold-ms', `${ms}ms`);

  const stop = () => {
    clearTimeout(timer);
    active = false;
    el.classList.remove('holding');
  };
  const start = () => {
    stop();
    fired = false;
    active = true;
    el.classList.add('holding');
    timer = setTimeout(() => { fired = true; stop(); onLong(); }, ms);
  };
  const end = () => {
    const wasActive = active;
    stop();
    if (wasActive && !fired) onTap();
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch {}
    start();
  });
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } });
}
