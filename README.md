# Finanzplaner

Arbeitsname für eine Web-App, mit der Gründerinnen und Gründer in Deutschland einen Finanzplan über 36 Monate selbst erstellen. Der endgültige Name steht noch nicht fest.

Dieser Stand ist **Schritt 3**: Der Rechenkern erzeugt aus einem Plan die 36 Monatswerte und die Ertragsteuer. Die Seite zeigt weiterhin die fiktiven Beispielpläne und lässt zwischen ihnen wechseln. Auswertungen und der Assistent fehlen noch.

Die Eingaben stehen in [docs/datenmodell.md](docs/datenmodell.md), die Monatswerte in [docs/rechenkern.md](docs/rechenkern.md), die Steuern in [docs/steuern.md](docs/steuern.md). Schema-Version ist 5. Ein Entwurf darf schon gespeichert werden, bevor Rechtsform, Person und Startmonat feststehen.

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

## Prüfen

```bash
npm test
npm run lint
npm run build
npm run export:check
```

`npm test` prüft das Schema, die Beispielpläne und den Rechenkern gegen von Hand gerechnete Cent-Beträge.

`npm run export:check` rechnet den fiktiven Elektromeister Blitzweg und schreibt [docs/checkpoints/schritt2-blitzweg.xlsx](docs/checkpoints/schritt2-blitzweg.xlsx). Dieselbe Prüfung schreibt [docs/checkpoints/schritt3-steuern.xlsx](docs/checkpoints/schritt3-steuern.xlsx) mit dem Steuerweg für Blitzweg, das Café Leseecke und die Hafenlicht GmbH.

`npm run lint` ist ESLint und die Formatprüfung mit Prettier. `npm run format` schreibt die Formatierung neu.

`npm run build` erzeugt die statische Seite in `dist/`. `npm run preview` zeigt diese Fassung lokal.

## Aufbau

- `src/domain` – Typen, Zod-Schema, Prüfung, Migration, JSON-Export/Import und der Rechenkern in `src/domain/calc`. Dieser Ordner importiert kein React und kein Node-Modul, damit die Rechnung im Browser laufen kann.
- `src/fixtures` – vier erfundene Beispielpläne: Grafikstudio, Elektromeister mit Thüringer Mikrodarlehen, Café, Hafenlicht GmbH
- `src/App.tsx` – Platzhalterseite mit Wechsel zwischen den Beispielen
- `docs/datenmodell.md` – Überblick über die Eingaben für die Fachberatung
- `docs/rechenkern.md` – Rechenregeln für die Fachberatung
- `docs/steuern.md` – Einkommensteuer, Gewerbesteuer, Körperschaftsteuer
- `docs/checkpoints/schritt2-blitzweg.xlsx` – Prüfstand des Beispiels Blitzweg
- `docs/checkpoints/schritt3-steuern.xlsx` – Prüfstand der Steuern

## Daten

Gespeichert werden Eingaben, keine fertigen Monatsspalten. Beträge stehen in ganzen Euro-Cent. `schemaVersion` ist 5. Steuersätze, die Tarifformel und Fördervorlagen liegen als Parametersatz im Plan. Import und Export laufen über `exportPlanToJson` und `importPlanFromJson` in `src/domain/io.ts`. Konten und ein Server kommen später. Dieselbe JSON-Datei ist dann der Inhalt, der im Browser liegt.
