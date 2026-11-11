# Finanzplaner

Arbeitsname für eine Web-App, mit der Gründerinnen und Gründer in Deutschland einen Finanzplan über 36 Monate selbst erstellen. Der endgültige Name steht noch nicht fest.

Dieser Stand ist **Schritt 6**: Die Startansicht ist der Überblick mit Kennzahlen je Planjahr und fünf Diagrammen. Die Tabelle bleibt für die Eingaben und die Berichte. Änderungen rechnen sofort in die Diagramme. PDF und der Assistent fehlen noch.

Die Eingaben stehen in [docs/datenmodell.md](docs/datenmodell.md), die Monatswerte in [docs/rechenkern.md](docs/rechenkern.md), die Steuern in [docs/steuern.md](docs/steuern.md), die Berichte in [docs/berichte.md](docs/berichte.md). Schema-Version ist 7. Ein Entwurf darf schon gespeichert werden, bevor Rechtsform, Person und Startmonat feststehen.

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

Die Seite öffnet den Überblick. Oben lassen sich die Beispiele Blitzweg, Café Leseecke, Hafenlicht GmbH und das Grafikstudio laden. Änderungen bleiben im Browser (`localStorage`) und ersetzen den Beispielplan so lange, bis „Beispiel zurücksetzen“ gewählt wird. Der Schalter Monate / Planjahre gilt für die Diagramme. Der Kontostand im Monatsbild zeigt die Nullinie und den tiefsten Stand.

Die Reiter Eingaben, Rentabilitätsvorschau, Liquiditätsplan, Kapitalbedarf und Finanzierung, Investitionen und Darlehen sowie Privatbedarf und Tragfähigkeit nutzen dieselbe Monatstabelle. Nur die Eingaben sind bearbeitbar. Pfeile bewegen die Auswahl, Enter öffnet die Zelle, Tab springt weiter, Strg+Z und Strg+Y machen rückgängig und wiederholen. In der Eingabeleiste lässt sich ein Wert nach rechts fortschreiben, eine Rate je Monat oder je Jahr anwenden und Saisonfaktoren für die Kalendermonate setzen. Kopierte Excel-Zellen (tab-getrennt) werden mit Strg+V eingefügt.

## Prüfen

```bash
npm test
npm run lint
npm run build
npm run export:check
```

`npm test` prüft das Schema, die Beispielpläne, den Rechenkern, die Berichte, die Kennzahlen und Diagrammdaten, die Eingabehilfen und die Tabelle.

`npm run export:check` rechnet den fiktiven Elektromeister Blitzweg und schreibt [docs/checkpoints/schritt2-blitzweg.xlsx](docs/checkpoints/schritt2-blitzweg.xlsx). Dieselbe Prüfung schreibt [docs/checkpoints/schritt3-steuern.xlsx](docs/checkpoints/schritt3-steuern.xlsx) mit dem Steuerweg für Blitzweg, das Café Leseecke und die Hafenlicht GmbH und [docs/checkpoints/schritt4-berichte.xlsx](docs/checkpoints/schritt4-berichte.xlsx) mit den Berichten dieser drei Beispiele. `npm run export:berichte` schreibt nur den Berichtsprüfstand.

`npm run lint` ist ESLint und die Formatprüfung mit Prettier. `npm run format` schreibt die Formatierung neu.

`npm run build` erzeugt die statische Seite in `dist/`. `npm run preview` zeigt diese Fassung lokal. Für GitHub Pages setzt der Workflow `VITE_BASE`.

## Aufbau

- `src/domain` – Typen, Zod-Schema, Prüfung, Migration, JSON-Export/Import, der Rechenkern in `src/domain/calc`, die Berichte in `src/domain/reports`, die Diagrammdaten in `src/domain/reports/diagramme.ts` und die Eingabehilfen in `src/domain/eingabe`. Dieser Ordner importiert kein React und kein Node-Modul, damit die Rechnung im Browser laufen kann.
- `src/fixtures` – vier erfundene Beispielpläne: Grafikstudio, Elektromeister mit Thüringer Mikrodarlehen, Café, Hafenlicht GmbH
- `src/ui` – Überblick, Diagramme, Tabelle, Reiter, Rückgängig und die Eingabeleiste
- `src/App.tsx` – lädt die Beispiele und merkt sich Änderungen im Browser. Startansicht ist der Überblick
- `docs/datenmodell.md` – Überblick über die Eingaben für die Fachberatung
- `docs/rechenkern.md` – Rechenregeln für die Fachberatung
- `docs/steuern.md` – Einkommensteuer, Gewerbesteuer, Körperschaftsteuer
- `docs/berichte.md` – Rentabilitätsvorschau, Liquidität, Kapitalbedarf, Kennzahlen
- `docs/checkpoints/schritt2-blitzweg.xlsx` – Prüfstand des Beispiels Blitzweg
- `docs/checkpoints/schritt3-steuern.xlsx` – Prüfstand der Steuern
- `docs/checkpoints/schritt4-berichte.xlsx` – Prüfstand der Berichte

## Daten

Gespeichert werden Eingaben, keine fertigen Monatsspalten und keine Berichte. Beträge stehen in ganzen Euro-Cent. `schemaVersion` ist 7. Steuersätze, die Tarifformel und Fördervorlagen liegen als Parametersatz im Plan. Import und Export laufen über `exportPlanToJson` und `importPlanFromJson` in `src/domain/io.ts`. Konten und ein Server kommen später. Dieselbe JSON-Datei liegt im Browser.
