# Finanzplaner

Arbeitsname für eine Web-App, mit der Gründerinnen und Gründer in Deutschland einen Finanzplan über 36 Monate selbst erstellen. Der endgültige Name steht noch nicht fest.

Dieser Stand ist **Schritt 9**: Szenarien. Ein Abweichungs-Szenario speichert nur Hebel und zieht mit dem Basisplan mit. Eine Kopie ist frei bearbeitbar und bleibt beim Anlegen stehen. Oben lässt sich das Szenario wählen, die Seite Szenarien vergleicht die Fälle. PDF fehlt noch.

Die Eingaben stehen in [docs/datenmodell.md](docs/datenmodell.md), die Monatswerte in [docs/rechenkern.md](docs/rechenkern.md), die Steuern in [docs/steuern.md](docs/steuern.md), die Berichte in [docs/berichte.md](docs/berichte.md). Schema-Version ist 11. Ein Entwurf darf schon gespeichert werden, bevor Rechtsform, Person und Startmonat feststehen. Der Assistentenfortschritt liegt optional im Plan. Die Schwellen der Prüfung liegen unter `pruefung`. Die Szenarien liegen unter `planSzenarien`.

## Voraussetzungen

- Node.js 22 oder neuer
- npm

TypeScript ist auf Version 6.0.x festgelegt. Die Vite-Vorlage bringt TypeScript 7 mit, `typescript-eslint` erlaubt bisher nur Versionen unter 6.1. Deshalb bleibt das Projekt auf TypeScript 6, solange ESLint das so verlangt.

## Start

```bash
npm install
npm run dev
```

Der Entwicklungsserver läuft danach auf [http://localhost:5173](http://localhost:5173).

Die Seite öffnet den Überblick. Oben lassen sich die Beispiele Blitzweg, Café Leseecke, Hafenlicht GmbH und das Grafikstudio laden, dazu ein neuer Plan. Daneben steht der Szenario-Umschalter: Basisplan, Vorsichtig und Optimistisch sind von Anfang an da. Vorsichtig senkt den Umsatz um 20 Prozent und schiebt den Umsatzstart um drei Monate. Optimistisch hebt den Umsatz um 20 Prozent. Beide sind Abweichungen und lassen sich umbenennen, ändern und löschen. Ist eine Abweichung aktiv, sind Tabelle und Assistent nur lesend. Eine Kopie bearbeiten Tabelle und Assistent direkt. Der Reiter Szenarien vergleicht Umsatz und Ergebnis nach Steuern je Planjahr, den tiefsten Kontostand, den Kapitalbedarf, den Break-even, die Tragfähigkeit und die Meldungen. Darunter liegt der Kontostand aller Szenarien. Ein neuer Plan fragt zuerst: Assistent oder Tabelle. Der Assistent hat neun Stationen. Bei GmbH und UG entfällt Persönliches. Der Reiter Prüfung zeigt die Meldungen des aktiven Szenarios, gruppiert nach Stufe und Kategorie, und den Zähler in der Navigation. Ein Klick springt zum Feld in der Tabelle oder im Assistenten. Fehler bleiben exportierbar. Änderungen bleiben im Browser (`localStorage`) und ersetzen den geladenen Plan so lange, bis zurückgesetzt wird. Der Schalter Monate / Planjahre gilt für die Diagramme. Der Kontostand im Monatsbild zeigt die Nullinie und den tiefsten Stand.

Die Reiter Eingaben, Rentabilitätsvorschau, Liquiditätsplan, Kapitalbedarf und Finanzierung, Investitionen und Darlehen sowie Privatbedarf und Tragfähigkeit nutzen dieselbe Monatstabelle. Nur die Eingaben sind bearbeitbar. Pfeile bewegen die Auswahl, Enter öffnet die Zelle, Tab springt weiter, Strg+Z und Strg+Y machen rückgängig und wiederholen. In der Eingabeleiste lässt sich ein Wert nach rechts fortschreiben, eine Rate je Monat oder je Jahr anwenden und Saisonfaktoren für die Kalendermonate setzen. Kopierte Excel-Zellen (tab-getrennt) werden mit Strg+V eingefügt.

## Prüfen

```bash
npm test
npm run lint
npm run build
npm run export:check
```

`npm test` prüft das Schema, die Beispielpläne, den Rechenkern, die Berichte, die Kennzahlen und Diagrammdaten, die Eingabehilfen, die Tabelle, den Assistenten, die Plausibilitätschecks und die Szenarien.

`npm run export:check` rechnet den fiktiven Elektromeister Blitzweg und schreibt [docs/checkpoints/schritt2-blitzweg.xlsx](docs/checkpoints/schritt2-blitzweg.xlsx). Dieselbe Prüfung schreibt [docs/checkpoints/schritt3-steuern.xlsx](docs/checkpoints/schritt3-steuern.xlsx) mit dem Steuerweg für Blitzweg, das Café Leseecke und die Hafenlicht GmbH und [docs/checkpoints/schritt4-berichte.xlsx](docs/checkpoints/schritt4-berichte.xlsx) mit den Berichten dieser drei Beispiele. `npm run export:berichte` schreibt nur den Berichtsprüfstand.

`npm run lint` ist ESLint und die Formatprüfung mit Prettier. `npm run format` schreibt die Formatierung neu.

`npm run build` erzeugt die statische Seite in `dist/`. `npm run preview` zeigt diese Fassung lokal. Für GitHub Pages setzt der Workflow `VITE_BASE`.

## Aufbau

- `src/domain` – Typen, Zod-Schema, Prüfung, Migration, JSON-Export/Import, der Rechenkern in `src/domain/calc`, die Szenarien in `src/domain/szenarien`, die Berichte in `src/domain/reports`, die Plausibilitätschecks in `src/domain/checks`, die Diagrammdaten in `src/domain/reports/diagramme.ts` und die Eingabehilfen in `src/domain/eingabe`. Dieser Ordner importiert kein React und kein Node-Modul, damit die Rechnung im Browser laufen kann. `vergleichFuerExport` liefert die Vergleichszahlen aller Szenarien für einen späteren PDF- oder Excel-Export.
- `src/fixtures` – vier erfundene Beispielpläne: Grafikstudio, Elektromeister mit Thüringer Mikrodarlehen, Café, Hafenlicht GmbH
- `src/domain/assistent` – Stationen, Validierung und das Schreiben in den Plan
- `src/ui` – Assistent, Überblick, Szenarien, Prüfung, Diagramme, Tabelle, Reiter, Rückgängig und die Eingabeleiste
- `src/App.tsx` – lädt die Beispiele und einen neuen Plan und merkt sich Änderungen im Browser. Startansicht der Beispiele ist der Überblick
- `docs/datenmodell.md` – Überblick über die Eingaben für die Fachberatung
- `docs/rechenkern.md` – Rechenregeln für die Fachberatung
- `docs/steuern.md` – Einkommensteuer, Gewerbesteuer, Körperschaftsteuer
- `docs/berichte.md` – Rentabilitätsvorschau, Liquidität, Kapitalbedarf, Kennzahlen
- `docs/checkpoints/schritt2-blitzweg.xlsx` – Prüfstand des Beispiels Blitzweg
- `docs/checkpoints/schritt3-steuern.xlsx` – Prüfstand der Steuern
- `docs/checkpoints/schritt4-berichte.xlsx` – Prüfstand der Berichte

## Daten

Gespeichert werden Eingaben, keine fertigen Monatsspalten und keine Berichte. Beträge stehen in ganzen Euro-Cent. `schemaVersion` ist 11. Steuersätze, die Tarifformel und Fördervorlagen liegen als Parametersatz im Plan. Optional steht der Assistentenfortschritt unter `assistent`. Die Schwellen der Plausibilitätsprüfung stehen unter `pruefung`. Die Meldungen werden nicht gespeichert. Szenarien stehen unter `planSzenarien`: Hebel einer Abweichung oder der eingefrorene Stand einer Kopie. Import und Export laufen über `exportPlanToJson` und `importPlanFromJson` in `src/domain/io.ts`. Konten und ein Server kommen später. Dieselbe JSON-Datei liegt im Browser.
