// Elternmenü: <dialog> mit Text (Deutsch)
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e[k] = v;
  e.append(...kids);
  return e;
};

// actions: { toggle(key), repeatTutorial(), stepBack(), resetAll() }; getSave() liefert den aktuellen Save
export function openMenu(getSave, actions) {
  const dlg = el('dialog', { className: 'menu' });
  const body = el('div', { className: 'menu-body' });
  dlg.append(body);

  const close = () => { dlg.close(); };
  const row = (label, input) => el('label', { className: 'menu-row' }, el('span', {}, label), input);
  const check = (key, label) => {
    const cb = el('input', { type: 'checkbox', checked: !!getSave().settings[key] });
    cb.addEventListener('change', () => actions.toggle(key, cb.checked));
    return row(label, cb);
  };
  const btn = (label, fn, cls = '') => {
    const b = el('button', { type: 'button', className: `menu-btn ${cls}`.trim() }, label);
    b.addEventListener('click', fn);
    return b;
  };

  const confirmBox = el('div', { className: 'menu-confirm', hidden: true },
    el('p', {}, 'Wirklich alles zurücksetzen?'),
    btn('Ja, zurücksetzen', () => { actions.resetAll(); close(); }, 'danger'),
    btn('Abbrechen', () => { confirmBox.hidden = true; }));

  body.append(
    check('sound', 'Ton'),
    check('autoMark', 'Automatische Pfoten'),
    btn('Übung wiederholen', () => { actions.repeatTutorial(); close(); }),
    btn('Eine Grösse zurück', () => { actions.stepBack(); close(); }),
    btn('Fortschritt zurücksetzen', () => { confirmBox.hidden = false; }),
    confirmBox,
    el('p', { className: 'menu-count' }, `Gelöste Rätsel: ${getSave().totalSolved}`),
    btn('Schliessen', close),
  );

  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}
