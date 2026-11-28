# Doggy Battle – Design

Stand: 2026-11-27 · Arbeitstitel «Doggy Battle» · Repo `danistra78/doggy-battle`

## 1. Wozu

Daniels Sohn (6 Jahre, Sudoku-begeistert, Rot-Grün-Sehschwäche) soll auf seinem iPad ein
Logikrätsel spielen können. Spielprinzip ist das bekannte Gattungsrätsel «Star Battle» mit Doggys
statt Sternen und Minesweeper-artiger Bedienung. Die Belohnung ist das Lösen selbst: Mit jedem
gelösten Rätsel wird das Gitter etwas grösser und schwieriger.

**Erfolg:** Er startet das Spiel selbständig vom Home-Bildschirm, versteht die Regeln ohne
Erklärung von Erwachsenen und kommt Rätsel für Rätsel weiter, ohne festzusitzen.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele**
- Spielbar auf dem iPad mit dem Finger, im Hoch- und Querformat.
- Fühlt sich an wie eine App: Icon auf dem Home-Bildschirm, Vollbild, offline, Spielstand bleibt.
- Für Rot-Grün-Schwäche voll nutzbar.
- Ohne Lesen bedienbar (Symbole statt Text).
- Jedes Rätsel hat genau eine Lösung, die sich ohne Raten herleiten lässt.
- Automatische, sanft steigende Schwierigkeitskurve.

**Nicht-Ziele (vorerst)**
- Keine native App, kein App Store (später mit Capacitor verpackbar, siehe Abschnitt 4).
- Kein Modus mit 2 Doggys pro Zeile/Spalte/Bereich (später entscheiden).
- Keine Levelauswahl, keine Sammelobjekte, keine Punkte, keine Zeitmessung.
- Kein Live-Generator auf dem Gerät.
- Keine Konten, kein Server, keine Synchronisation zwischen Geräten.

**Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch funktioniert)**
- Er sitzt fest und kommt ohne Erwachsene nicht weiter.
- Information hängt an Rot/Grün oder an Text.
- Zeitdruck, Strafen, Verlieren-Gefühl.
- Werbung, Tracking, Netzwerkzugriffe nach dem ersten Laden.

## 3. Spielregeln

Quadratisches Gitter N×N, aufgeteilt in genau N zusammenhängende Bereiche (Regionen).

1. **Bereichs-Regel:** In jedem Bereich sitzt genau ein Doggy 🐶.
2. **Zeilen- und Spalten-Regel:** In jeder Zeile und jeder Spalte sitzt genau ein Doggy.
3. **Abstands-Regel:** Zwei Doggys berühren sich nie, auch nicht diagonal.

Gelöst ist das Rätsel, wenn N Doggys ohne Regelverstoss stehen (bei eindeutiger Lösung ist das
automatisch die Lösung).

## 4. Ansätze (Rätselerzeugung)

| Ansatz | Vorteile | Nachteile |
|---|---|---|
| **A. Vorab erzeugen** (gewählt) | Qualität und Eindeutigkeit geprüft, Schwierigkeit bewertet und sortierbar, keine Wartezeit, offline trivial | Endlicher Vorrat (praktisch unerschöpflich bei mehreren hundert pro Grösse) |
| B. Live auf dem iPad | Wirklich endlos | Grössere Gitter brauchen Sekunden, Schwierigkeit schwer steuerbar |
| C. Gemischt (Kurve vorab, ab 10×10 live) | Endlos ab 10×10 | Mehr Aufwand ohne spürbaren Nutzen für ihn |

Gewählt: **A** (Claudes Vorschlag, von Daniel bestätigt). Generator und Solver sind dieselben
JS-Module, die auch im Browser laufen, B lässt sich also später ergänzen.

**Plattform:** Web-App (PWA) statt nativer App. Begründung: kein Mac/Xcode, kein Apple-Konto
(99 USD/Jahr) und keine App-Store-Prüfung nötig, Updates sofort. Derselbe Code lässt sich später
mit Capacitor als echte App verpacken.

## 5. Technik (Claudes Wahl)

- Schlichtes HTML/CSS/JavaScript (ES-Module), **kein Build-Schritt**, wie `arcade-games`.
- Node (≥ 20) nur für Generator-Skript und Tests (`node --test`), keine Laufzeit-Abhängigkeiten.
- Hosting: öffentliches Repo (Daniels Entscheid), GitHub Pages aus `main` (Wurzel), `https://danistra78.github.io/doggy-battle/`.
- PWA: `manifest.webmanifest` (`display: standalone`, Hochformat und Querformat erlaubt,
  App-Icon mit Doggy), `apple-touch-icon`, Service Worker cached alle Dateien inkl. Rätsel
  (Cache-Version im Dateinamen/Konstante, damit Updates ankommen).
- Zielplattform: Safari ab iPadOS 16 (Claudes Entscheid). Das Gitter wird als **SVG**
  gezeichnet (Bereichskonturen mit runden Ecken, Muster als SVG-Pattern), damit nichts an neuen
  CSS-Funktionen hängt.
- Speicherung in `localStorage` (als Home-Bildschirm-App ist sie in Safari von der
  7-Tage-Löschung ausgenommen).

Vorgeschlagene Struktur:

```
index.html
manifest.webmanifest
sw.js
css/app.css
js/
  main.js          Start, Bildschirme, Fortschritt
  board.js         Darstellung und Eingabe des Gitters
  rules.js         Regelprüfung, Konflikte, Auto-Markierung
  solver.js        Logik-Solver (Browser + Node), Hinweise, Schwierigkeit
  generator.js     Lösung + Bereiche erzeugen (Node, später Browser)
  progress.js      Kurve, Speicherstand
  sound.js         Bellen, Töne
puzzles/
  tutorial.json    3 handgemachte Übungsrätsel 4×4
  4.json 5.json … 10.json   je Grösse, nach Schwierigkeit sortiert
tools/generate.mjs Erzeugt puzzles/*.json (Seed-basiert, reproduzierbar)
test/*.test.mjs
icons/
```

## 6. Spielablauf und Fortschritt

- **Kein Menü, keine Levelauswahl.** Startbildschirm = grosser ▶️-Knopf, darunter das
  aktuelle Gitter als kleines Vorschaubild. Ein Tipp führt direkt ins laufende Rätsel.
- Nach dem Lösen: Freude-Animation (Doggys hüpfen, Konfetti in weichen Farben), Bellen, dann
  ein grosser ▶️-Knopf für das nächste Rätsel (kein automatischer Wechsel, damit er das gelöste
  Brett anschauen kann).
- **Kurve** (in `progress.js` als Datentabelle, leicht anpassbar):

  | Abschnitt | Grösse | Anzahl Rätsel |
  |---|---|---|
  | Übung | 4×4 | 3 (geführt, siehe 8) |
  | 1 | 5×5 | 5 |
  | 2 | 6×6 | 8 |
  | 3 | 7×7 | 10 |
  | 4 | 8×8 | 10 |
  | 5 | 9×9 | 10 |
  | 6 | 10×10 | endlos (aus dem Vorrat, danach von vorn mit gespiegelten/gedrehten Varianten) |

  Innerhalb eines Abschnitts steigt die Schwierigkeit gemäss Solver-Bewertung (Abschnitt 10).
  Am Anfang jedes neuen Abschnitts ein leichteres Rätsel der neuen Grösse.
- Es geht **nie automatisch zurück**. Hilfe gibt der 💡-Knopf.
- Der Stand des laufenden Rätsels (inkl. Rückgängig-Verlauf nicht nötig) wird bei jeder Änderung
  gespeichert; App schliessen und wieder öffnen setzt genau dort fort.

## 7. Bedienung im Rätsel

```
┌──────────────────────────────────────┐
│  🏠            ● ● ● ○ ○       ↩️  💡  │
│                                      │
│   ╭────┬────┬────╮╭────┬────╮        │
│   │ 🐾 │    │    ││ 🐶 │ 🐾 │        │
│   ├────┼────╯    │╰────┴────┤        │
│   │    │ 🐾   🐾 │    🐾    │        │
│   ╰────┴─────────╯──────────╯  …     │
│                                      │
└──────────────────────────────────────┘
 ● ● ● ○ ○ = Fortschritt im aktuellen Abschnitt
```

- **Tipp-Zyklus pro Feld:** leer → 🐾 (hier kein Doggy) → 🐶 → leer.
- **Wischen** über mehrere Felder setzt 🐾 auf alle überstrichenen leeren Felder (spart Tippen).
- **↩️ Rückgängig:** unbegrenzt innerhalb des aktuellen Rätsels; nimmt eine ganze Aktion zurück
  (inkl. der dabei automatisch gesetzten 🐾).
- **Auto-🐾** (Standard: aus, weil das Spiel damit zu einfach war; umschaltbar im Elternmenü): Setzt er einen Doggy, erscheinen auf
  den 8 Nachbarfeldern sowie der restlichen Zeile, Spalte und dem restlichen Bereich blasse 🐾.
  Auto-🐾 sind intern als «automatisch» markiert und verschwinden wieder, wenn der Doggy entfernt
  wird, sofern kein anderer Doggy sie ebenfalls verursacht. Von Hand gesetzte 🐾 bleiben immer.
  Tippt er auf ein Auto-🐾, verhält es sich wie ein normales 🐾 (nächster Schritt 🐶).
- **Felder** mindestens 44 pt, Gitter füllt die verfügbare Fläche quadratisch aus; kein Zoom,
  kein Scrollen, Doppeltipp-Zoom und Text-Auswahl unterdrückt.
- 🏠 führt zum Startbildschirm. Ein **langer Druck (3 s) auf 🏠** öffnet das Elternmenü.

## 8. Regeln lernen ohne Text (Übung)

Drei handgemachte 4×4-Rätsel, die je eine Regel einführen. Erklärung nur über Animation und
Symbole (eine Hand 👆 zeigt, wohin tippen; ✔️ / ⚠️ für richtig/falsch), kein Lesen nötig:

1. **Zeilen und Spalten:** Gitter mit nur einer Farbe pro Zeile hervorgehoben; Animation zeigt:
   zwei Doggys in einer Zeile → ⚠️, einer → ✔️. Dann geführtes Lösen.
2. **Bereiche:** Bereiche pulsieren nacheinander, je ein Doggy hinein.
3. **Nicht berühren:** Ein Doggy, Nachbarfelder werden nacheinander mit 🐾 belegt; ein zweiter
   Doggy daneben wackelt → ⚠️.

Danach geht es ohne Führung weiter. Die Übung lässt sich im Elternmenü erneut starten.

**Festlegungen (Claudes Entscheid):**
- Alle drei Regeln gelten in jeder Übung vollständig (ein Regelwerk, ein Solver, keine
  Sondermodi). Bereiche sind immer sichtbar; die Übung lenkt nur den Blick. Die Rätsel sind so
  gewählt, dass der geführte Weg nie gegen eine noch nicht gezeigte Regel verstösst. Ein ⚠️ für
  eine noch nicht gezeigte Regel ist akzeptiert (das Wackeln erklärt sich selbst).
- Freies Brett mit Animation darüber: Er darf überall tippen, die Hand 👆 zeigt jeweils den
  nächsten Solver-Schritt. Weicht er ab, zeigt die Hand weiter auf den nächsten sinnvollen Schritt
  vom aktuellen Stand aus.
- Ein 4×4 hat insgesamt nur zwei gültige Doggy-Stellungen; die Bereiche entscheiden, welche.
  Das reicht für drei Übungsrätsel (Bereiche verschieden, Lösung darf sich wiederholen).

## 9. Darstellung und Barrierefreiheit

**Stil (Daniels Vorgabe): weiche Farben, runde Ecken.**
- Pastellpalette, heller warmer Hintergrund (cremeweiss), dunkelgraue statt schwarze Linien,
  dunkelgrauer Text/Symbole.
- Runde Ecken überall: Knöpfe, Dialoge, Gitter aussen; **Bereiche** haben an ihren äusseren
  Ecken gerundete Konturen (Kontur folgt der Bereichsform, konvexe Ecken gerundet).
- Grosse, runde Knöpfe, sanfte Schatten, ruhige Animationen.

**Rot-Grün-Schwäche (Pflicht):**
- Bereiche sind **dreifach** unterscheidbar: Farbe, **dicke dunkle Grenzlinie** zwischen
  Bereichen (dünne helle Linie zwischen Feldern desselben Bereichs) und ein **zartes Muster** je
  Bereich (Punkte, Streifen, Karos, Wellen …, 10 Muster).
- Palette mit 10 Pastelltönen, die auch unter Deuteranopie- und Protanopie-Simulation
  unterscheidbar bleiben, vor allem über Helligkeit und Blau/Gelb-Achse. Benachbarte Bereiche
  erhalten Farben mit möglichst grossem simuliertem Abstand (Färbung per Graphfärbung).
  Die Palette wird mit einem Simulationsskript geprüft (Test, siehe 12).
- **Kein Rot/Grün als Signal.** Fehler = Wackeln + ⚠️-Symbol auf den betroffenen Doggys + kurzes
  Knurren/Bellen. Gelöst = Hüpfen + Konfetti + fröhliches Bellen.

**Konflikte:** Zwei Doggys in derselben Zeile, Spalte oder demselben Bereich oder sich berührend
→ beide wackeln einmal und behalten ein ⚠️, bis der Konflikt behoben ist. Das Spiel bricht nie ab.
Falsch gesetzte, aber regelkonforme Doggys werden **nicht** angezeigt (das ist Sache des 💡).

## 10. Hinweis-Knopf 💡

Unbegrenzt, ohne Strafe. Reihenfolge:
1. Gibt es einen Doggy, der nicht zur Lösung gehört, oder ein 🐾 auf einem Lösungsfeld: dieses
   Feld wackelt und bekommt einen pulsierenden Rahmen (nichts wird automatisch entfernt).
2. Sonst: Der Solver ermittelt den nächsten logischen Schritt vom aktuellen Stand aus. Das
   betroffene Feld (bzw. die Zeile/der Bereich, die den Schluss begründen) pulsiert, und das
   Ergebnis (🐾 oder 🐶) wird eingeblendet und gesetzt (als rückgängig machbare Aktion).

## 11. Rätselerzeugung (Generator und Solver)

**Solver** (`solver.js`): arbeitet nur mit menschlichen Schlussregeln, in Stufen:
1. Doggy steht → Nachbarn, Rest der Zeile/Spalte/Bereich ausschliessen.
2. Zeile/Spalte/Bereich hat nur noch ein freies Feld → Doggy.
3. Bereich liegt komplett in einer Zeile/Spalte → Rest dieser Zeile/Spalte ausschliessen
   (und umgekehrt: Zeile liegt komplett in einem Bereich).
4. Ein Feld, dessen Doggy (inkl. Nachbarn) eine Zeile/Spalte/einen Bereich komplett leeren würde
   → ausschliessen.
5. k Bereiche liegen komplett in k Zeilen/Spalten → Rest dieser Zeilen/Spalten ausschliessen
   (und umgekehrt).

Kein Raten, kein Backtracking. Ausgabe: gelöst ja/nein, Schrittfolge, höchste benötigte Stufe.

**Eindeutigkeit** wird zusätzlich mit einem separaten Backtracking-Zähler geprüft
(Abbruch bei 2 Lösungen).

**Generator** (`tools/generate.mjs`, Seed-basiert):
1. Gültige Doggy-Lösung per Backtracking (Zeile/Spalte/Abstand).
2. Jeder Doggy ist Keim eines Bereichs; Bereiche wachsen zufällig in freie Nachbarfelder, bis
   das Gitter voll ist.
3. Prüfen: eindeutig **und** vom Solver vollständig lösbar. Wenn nicht: einzelne Grenzfelder
   zwischen zwei Bereichen umhängen (Zusammenhang erhalten) und erneut prüfen; nach einer
   Versuchsgrenze verwerfen und neu beginnen.
4. Bewertung: Schwierigkeit = (höchste Stufe, Anzahl Schritte mit Stufe ≥ 3, Gesamtschritte).
5. Dubletten (auch gedreht/gespiegelt) verwerfen.

**Vorrat:** 4×4 nur Übung (handgemacht, aber vom Solver geprüft); 5×5 bis 9×9 je mind. 100;
10×10 mind. 300. Pro Datei nach Schwierigkeit sortiert. Format pro Rätsel:
`{ "id": "8-042", "n": 8, "regions": "AABBC…" (N×N Zeichen, zeilenweise), "solution": [Spalte je Zeile], "difficulty": [stufe, harte, schritte] }`.

## 12. Tests und Qualität

- `node --test`: Regelprüfung, Auto-🐾 (inkl. Entfernen bei überlappenden Ursachen),
  Rückgängig, Solver-Regeln einzeln, Eindeutigkeitszähler, Generator (Seed → gleiche Ausgabe),
  Validierung aller Dateien in `puzzles/` (eindeutig, Solver-lösbar, Bereiche zusammenhängend,
  N Bereiche).
- Farbtest: Palette unter Deuteranopie/Protanopie-Simulation, Mindestabstand benachbarter Farben.
- Manuell: Durchspielen auf iPad (Safari und Home-Bildschirm-App), Hoch-/Querformat, offline.

## 13. Elternmenü (langer Druck auf 🏠)

Hier darf Text stehen. Inhalt: Ton an/aus, Auto-🐾 an/aus, Übung wiederholen, eine Grösse
zurück, Fortschritt zurücksetzen (mit Bestätigung), Anzeige: gelöste Rätsel gesamt.

## 14. Dem Builder überlassen

- Konkrete Pastellwerte und Muster (innerhalb der Vorgaben in 9, Simulationstest muss bestehen).
- Doggy-Darstellung: Apple-Emoji 🐶/🐾 oder eigene SVG-Grafik (SVG bevorzugt, falls Emoji in
  Bereichsfarben schlecht lesbar sind).
- Töne: per Web Audio synthetisiert oder lizenzfreie (CC0) Aufnahmen; Ton erst nach erstem
  Tippen (iOS-Vorgabe).
- Genaue Animationen, Konfetti, App-Icon.
- Wischgeste: Erkennung Tipp vs. Wischen.
