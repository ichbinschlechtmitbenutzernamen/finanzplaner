# Finanzplaner

Finanzplan über 36 Monate für Gründerinnen und Gründer in Deutschland. Version 1.0. Die Rechnung läuft im Browser. Eingaben bleiben auf diesem Gerät. Es gibt keinen Server und kein Konto.

Die Anwendung: <https://ichbinschlechtmitbenutzernamen.github.io/finanzplaner/>

Die Oberfläche heißt Finanzplaner, in der Kopfzeile, im Fenstertitel und als Monogramm F im Favicon. Farben, Schrift, Abstände und Schatten kommen aus zentralen Design-Tokens. Im PDF bleiben Tabellen zusammen: passt eine Tabelle nicht mehr auf den Rest der Seite, rückt sie geschlossen weiter.

## Kurzanleitung

**Start.** Ohne Beispiel-Link erscheint die Startseite. „Eigenen Plan anlegen“ führt zur Wahl aus Assistent oder Tabelle und einer Branchenvorlage. „Beispiel ansehen“ öffnet Blitzweg, Café Leseecke, Hafenlicht GmbH oder das Grafikstudio. Liegt schon ein Plan im Browser, setzt „Weiter mit meinem Plan“ ihn fort. „Neuen Plan anlegen“ ersetzt den vorhandenen Plan erst nach einer Rückfrage. „Plan laden“ liest eine Sicherungsdatei. Direkte Links wie `#elektro/ueberblick` öffnen das Beispiel weiterhin.

**Plan anlegen.** Die Branchenvorlage heißt Ohne Vorlage, Handwerk, Gastronomie oder Einzelhandel. Die Vorlage setzt typische Bezeichnungen für Umsatz, Wareneinsatz, Personal, laufende Kosten und Investitionen. Beträge bleiben leer und lassen sich später nicht nachladen. Danach die Wahl: Assistent oder Tabelle. Vor dieser Wahl ist kein Reiter als geöffnet markiert.

**Navigation.** Vier Hauptreiter: Eingeben, Ergebnisse, Prüfen und Szenarien. Unter Eingeben liegen Assistent und Alle Eingaben. Unter Ergebnisse liegen der Überblick und fünf Berichte. Ein Bericht zeigt den kurzen Namen groß und den Fachbegriff klein darunter: Gewinn und Verlust (Rentabilitätsvorschau), Kontostand je Monat (Liquiditätsplan), Was Sie brauchen (Kapitalbedarf und Finanzierung), Anschaffungen und Kredite (Investitionen und Darlehen), Reicht es zum Leben? (Privatbedarf und Tragfähigkeit). Die Berichte bleiben in der Tabelle bearbeitbar. Pfeiltasten, Pos1 und Ende wechseln den Reiter auf beiden Ebenen. Links wie `#elektro/ueberblick` und `#elektro/liquiditaet` öffnen dieselbe Ansicht wie bisher.

**Assistent und Tabelle.** Der Assistent führt durch die Stationen und schreibt in denselben Plan wie Alle Eingaben. Bei GmbH und UG entfällt die Station Persönliches. In der Tabelle stehen 36 Monate und je Planjahr eine Summe. Die Planjahre starten eingeklappt. Pfeile bewegen die Auswahl, Enter öffnet die Zelle, Tab springt weiter, Strg+Z und Strg+Y machen rückgängig und wiederholen. Oben bleiben die Beispiele und der eigene Plan erreichbar, „Startseite“ führt zurück. Unter 1024 Pixel zeigt die Kopfzeile Planname und die angezeigte Variante. Sichern, Laden, PDF, Excel, Zurücksetzen und die Beispiele liegen dann im Menü.

**Varianten.** Oben unter „Angezeigte Variante“ wählen Sie, was alle Reiter, die Kennzahlenleiste und der Export zeigen. Der Hauptreiter Szenarien dient zum Anlegen, Bearbeiten und Vergleichen. Basisplan, Vorsichtig und Optimistisch sind von Anfang an da. Vorsichtig senkt den Umsatz und schiebt den Start, Optimistisch hebt den Umsatz. Jede Variante nennt in einem Satz, was sich gegenüber dem Basisplan ändert. „Neue Variante“ stellt Stellschrauben ein und folgt dem Basisplan. „Kopie des Basisplans“ ist ein eigener Stand. Ist eine Variante mit Stellschrauben angezeigt, sind Tabelle und Assistent nur zum Ansehen. Ein Hinweis nennt die Variante und führt zurück zum Basisplan.

**Prüfung.** Der Hauptreiter Prüfen zeigt die Meldungen der angezeigten Variante und die Anzahl daneben. Ein Klick springt zum Feld in der Tabelle oder im Assistenten. Die Kennzahlenleiste springt in den passenden Bericht. Fehler bleiben exportierbar.

**PDF und Excel.** „PDF erstellen“ und „Excel erstellen“ erzeugen die Datei im Browser. Das PDF übernimmt die Berichte der gewählten Variante. Die Excel-Mappe rechnet selbst: gelbe Zellen im Blatt Eingaben sind Eingaben, die Berichte holen sich die Zahlen per Formel.

**Sichern.** Am eigenen Plan stehen „Plan sichern“ und „Plan laden“. Die Datei ist JSON, der Name setzt sich aus Planname und Datum zusammen. Ein kurzer Hinweis bleibt stehen, dass die Eingaben nur in diesem Browser liegen. Wurde seit der letzten Sicherung gearbeitet und das mindestens 30 Minuten lang, erscheint ein schließbarer Hinweis mit dem Zeitpunkt der letzten Sicherung. „Plan zurücksetzen“ und das Löschen einer Variante fragen vorher nach. Zurücksetzen steht unter „Weitere“, getrennt von Sichern, PDF und Excel.

## Voraussetzungen

- Node.js 22 oder neuer
- npm

TypeScript ist auf Version 6.0.x festgelegt. Die Vite-Vorlage bringt TypeScript 7 mit, `typescript-eslint` erlaubt bisher nur Versionen unter 6.1. Deshalb bleibt das Projekt auf TypeScript 6, solange ESLint das so verlangt.

## Entwicklung

```bash
npm install
npm run dev
```

Der Entwicklungsserver läuft danach auf [http://localhost:5173](http://localhost:5173).

```bash
npm test
npm run lint
npm run build
npm run export:check
```

`npm test` prüft das Schema, die Beispielpläne, den Rechenkern, die Berichte, die Kennzahlen und Diagrammdaten, die Eingabehilfen, die Tabelle, den Assistenten, die Plausibilitätschecks, die Szenarien, das PDF-Datenmodell und den Excel-Export. Steht LibreOffice bereit, rechnet ein Test die Formeln der vier Beispiele nach. `npm run excel:abgleich` schreibt die größte Abweichung je Beispiel. `npm run export:pdf` schreibt die vier Beispiel-PDFs nach `/opt/cursor/artifacts`.

`npm run export:check` rechnet den fiktiven Elektromeister Blitzweg und schreibt [docs/checkpoints/schritt2-blitzweg.xlsx](docs/checkpoints/schritt2-blitzweg.xlsx). Dieselbe Prüfung schreibt [docs/checkpoints/schritt3-steuern.xlsx](docs/checkpoints/schritt3-steuern.xlsx) mit dem Steuerweg für Blitzweg, das Café Leseecke und die Hafenlicht GmbH und [docs/checkpoints/schritt4-berichte.xlsx](docs/checkpoints/schritt4-berichte.xlsx) mit den Berichten dieser drei Beispiele. `npm run export:berichte` schreibt nur den Berichtsprüfstand.

`npm run lint` ist ESLint und die Formatprüfung mit Prettier. `npm run format` schreibt die Formatierung neu.

`npm run build` erzeugt die statische Seite in `dist/`. `npm run preview` zeigt diese Fassung lokal. Für GitHub Pages setzt [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) `VITE_BASE=/finanzplaner/`. Die Basis in `vite.config.ts` ist sonst `/`.

Die Eingaben stehen in [docs/datenmodell.md](docs/datenmodell.md), die Monatswerte in [docs/rechenkern.md](docs/rechenkern.md), die Steuern in [docs/steuern.md](docs/steuern.md), die privaten Blöcke in [docs/vorsorge.md](docs/vorsorge.md), die Berichte in [docs/berichte.md](docs/berichte.md), der PDF-Aufbau in [docs/pdf.md](docs/pdf.md), der Excel-Aufbau in [docs/excel.md](docs/excel.md). Schema-Version ist 15. Was sich von Schritt 1 bis zur Fassung 1.0 geändert hat, steht in [CHANGELOG.md](CHANGELOG.md).

## Aufbau

- `src/domain` – Typen, Zod-Schema, Prüfung, Migration, JSON-Export/Import, der Rechenkern in `src/domain/calc`, die Szenarien in `src/domain/szenarien`, die Berichte in `src/domain/reports`, die Plausibilitätschecks in `src/domain/checks`, die Diagrammdaten in `src/domain/reports/diagramme.ts`, das PDF-Datenmodell in `src/domain/pdf`, die Excel-Formeln in `src/domain/excel` und die Eingabehilfen in `src/domain/eingabe`. Dieser Ordner importiert kein React und kein Node-Modul, damit die Rechnung im Browser laufen kann. `vergleichFuerExport` und `meldungenFuerExport` liefern die Zahlen und Meldungen, die PDF und Excel übernehmen.
- `src/fixtures` – vier erfundene Beispielpläne: Grafikstudio, Elektromeister mit Thüringer Mikrodarlehen, Café, Hafenlicht GmbH
- `src/domain/assistent` – Stationen, Validierung und das Schreiben in den Plan
- `src/domain/vorlagen` – Branchenvorlagen. Sie legen nur Bezeichnungen an, keine Beträge
- `src/ui` – Assistent, Überblick, Szenarien, Prüfung, Diagramme, Tabelle, Reiter, Rückgängig, die Eingabeleiste, die Startseite, Sichern und Laden, der PDF-Dialog und der Excel-Dialog. PDF-Bibliothek und ExcelJS liegen in eigenen Bündeln und werden erst beim Erstellen geladen.
- `src/App.tsx` – Startseite, die Beispiele und der eigene Plan. Änderungen bleiben im Browser, eine Sicherungsdatei liegt daneben. Startansicht der Beispiele ist der Überblick
- `docs/datenmodell.md` – Überblick über die Eingaben für die Fachberatung
- `docs/rechenkern.md` – Rechenregeln für die Fachberatung
- `docs/steuern.md` – Einkommensteuer, Gewerbesteuer, Körperschaftsteuer
- `docs/berichte.md` – Rentabilitätsvorschau, Liquidität, Kapitalbedarf, Kennzahlen
- `docs/checkpoints/schritt2-blitzweg.xlsx` – Prüfstand des Beispiels Blitzweg
- `docs/checkpoints/schritt3-steuern.xlsx` – Prüfstand der Steuern
- `docs/checkpoints/schritt4-berichte.xlsx` – Prüfstand der Berichte

## Daten

Gespeichert werden Eingaben, keine fertigen Monatsspalten und keine Berichte. Beträge stehen in ganzen Euro-Cent. `schemaVersion` ist 15. Eine Branchenvorlage beim Anlegen steht unter `stammdaten.angewendeteVorlage`. Posten ohne Betrag stehen am Assistentenfortschritt und gehen nicht in die Rechnung ein. Steuersätze, die Tarifformel und Fördervorlagen liegen als Parametersatz im Plan. Optional steht der Assistentenfortschritt unter `assistent`. Die Schwellen der Plausibilitätsprüfung stehen unter `pruefung`. Die Meldungen werden nicht gespeichert. In der Oberfläche heißen sie Varianten. Gespeichert bleiben sie unter `planSzenarien`: Stellschrauben einer Variante oder der eingefrorene Stand einer Kopie. Der Schlüssel und das Dateiformat ändern sich nicht. Die Kapitelauswahl des PDF steht unter `pdfExport`. Die Blattauswahl des Excel-Exports steht unter `excelExport`. Import und Export laufen über `exportPlanToJson` und `importPlanFromJson` in `src/domain/io.ts`. Dieselbe Funktion schreibt den Speicher im Browser und die Sicherungsdatei, einschließlich älterer Schema-Versionen. Der Zeitpunkt der letzten Sicherung liegt unter `finanzplaner.sicherung.` im Browser. Konten und ein Server gibt es nicht.
