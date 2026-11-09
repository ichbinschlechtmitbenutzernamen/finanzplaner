# Finanzplaner

Arbeitsname für eine Web-App, mit der Gründerinnen und Gründer in Deutschland einen Finanzplan über 36 Monate selbst erstellen. Der endgültige Name steht noch nicht fest.

Dieser Stand ist **Schritt 1**: Projektgerüst und Datenmodell. Es gibt noch keine Berechnung, keinen Assistenten und keine Auswertungen. Die Seite zeigt nur, dass der fiktive Beispielplan geladen ist.

Die fachliche Beschreibung der Eingaben steht in [docs/datenmodell.md](docs/datenmodell.md).

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
```

`npm test` prüft das Schema, den fiktiven Beispielplan und den JSON-Export und -Import.

`npm run lint` ist ESLint und die Formatprüfung mit Prettier. `npm run format` schreibt die Formatierung neu.

`npm run build` erzeugt die statische Seite in `dist/`. `npm run preview` zeigt diese Fassung lokal.

## Aufbau

- `src/domain` – Typen, Zod-Schema, Prüfung, Migration und JSON-Export/Import. Dieser Ordner importiert kein React und kein Node-Modul, damit die spätere Rechnung im Browser laufen kann.
- `src/fixtures/beispiel-einzelunternehmen.ts` – erfundener Plan einer Einzelunternehmerin. Als Beispiel gekennzeichnet, nicht für einen Antrag verwenden.
- `src/App.tsx` – Platzhalterseite.
- `docs/datenmodell.md` – Überblick für die Fachberatung, inklusive offener Fragen.

## Daten

Gespeichert werden Eingaben, keine fertigen Monatsspalten. Beträge stehen in ganzen Euro-Cent. `schemaVersion` ist 1. Import und Export laufen über `exportPlanToJson` und `importPlanFromJson` in `src/domain/io.ts`. Konten und ein Server kommen später. Dieselbe JSON-Datei ist dann der Inhalt, der im Browser liegt.
