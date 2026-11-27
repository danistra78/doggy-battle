# Doggy Battle 🐶

Logikrätsel für das iPad: In jeder Zeile, jeder Spalte und jedem Farbbereich sitzt genau ein Doggy,
und Doggys berühren sich nie, auch nicht diagonal. Das Gitter wächst mit jedem gelösten Rätsel.

Web-App (PWA), läuft offline. In Safari öffnen und «Zum Home-Bildschirm» wählen.

👉 https://danistra78.github.io/doggy-battle/ (sobald veröffentlicht)

Design: [docs/superpowers/specs/2026-11-27-doggy-battle-design.md](docs/superpowers/specs/2026-11-27-doggy-battle-design.md)

## So wird gespielt

In jeder Zeile, jeder Spalte und jedem Farbbereich sitzt genau ein Doggy. Zwei Doggys berühren sich nie,
auch nicht an der Ecke. Antippen setzt ein Markierungszeichen, nochmals antippen ein Doggy. 💡 gibt einen Hinweis,
↩️ nimmt den letzten Zug zurück.

## Auf dem iPad installieren

Seite in Safari öffnen, Teilen → «Zum Home-Bildschirm». Danach startet das Spiel im Vollbild und läuft auch offline.

## Lokal entwickeln

```
python3 -m http.server   # dann http://localhost:8000/
npm test
```

## Wichtig beim Ändern

Bei jeder Änderung an ausgelieferten Dateien (HTML, CSS, JS, Rätsel, Icons) in `sw.js` die Konstante `CACHE`
hochzählen (`doggy-v1` → `doggy-v2`), sonst behalten bereits installierte Geräte die alten Dateien.
Neue Dateien zusätzlich in `FILES` eintragen; `npm test` prüft die Liste.
