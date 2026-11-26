# Änderungsprotokoll

## Unveröffentlicht

- **Dunkles Design Nachtblau und Gold.** Die Oberfläche ist dauerhaft dunkel, mit 2-Pixel-Ecken und ohne Schatten. Auf schmalen Bildschirmen bleibt der Menüknopf neben dem Titel. PDF und Excel bleiben hell.

## 1.1.0 – 2026-11-26

- **Startseite und Sichern/Laden.** Ohne Beispiel-Link erscheint die Startseite. Eigene Pläne lassen sich als JSON sichern und laden. Ein Hinweis bleibt sichtbar, dass die Daten nur in diesem Browser liegen. Zurücksetzen und Löschen fragen vorher nach.
- **Live-Kennzahlen.** Über Assistent und Tabelle bleibt eine Leiste mit Kontostand, Ergebnis, Break-even, Tragfähigkeit, Meldungen und Kapitalbedarf der angezeigten Variante. Ein Klick öffnet den passenden Reiter.
- **Export, Hilfeleiste und Tastatur.** PDF und Excel übernehmen die angezeigte Variante. Die Kurzhilfe steht in einer Zeile, Tastatur und Einfügen unter „Hilfe“. Dialoge halten den Fokus. Planjahre starten eingeklappt.
- **Navigation und Mobil.** Vier Hauptreiter: Eingeben, Ergebnisse, Prüfen und Szenarien. Berichte zeigen den kurzen Namen und den Fachbegriff. Unter 1024 Pixel liegen die Werkzeuge im Menü.
- **Varianten in Alltagssprache.** Der Umschalter heißt „Angezeigte Variante“. Stellschrauben haben ein Beispiel, jede Variante eine Kurzbeschreibung. Gespeichert bleibt `planSzenarien`.

## 1.0.0

Erste veröffentlichte Fassung. Die App rechnet im Browser. Eingaben bleiben auf dem Gerät.

1. **Fundament.** Datenmodell über 36 Monate, Prüfung mit Zod, Migration und die Beispielpläne. Beträge stehen in Cent.
2. **Rechenkern.** Umsatz, Personal, Kosten, Abschreibung, Darlehen und Umsatzsteuer.
3. **Steuern.** Einkommensteuer nach § 32a EStG 2026, Solidaritätszuschlag, Kirchensteuer, Gewerbesteuer und Körperschaftsteuer, mit den Zahlungszeitpunkten.
4. **Berichte.** Rentabilität, Liquidität, Kapitalbedarf, Investitionen, Darlehen, Tragfähigkeit und Kennzahlen. Planjahre zählen ab dem Gründungsmonat.
5. **Tabelle.** Eingaben und Berichte über 36 Monate, mit Überschreibung, Wachstum, Saison und Rückgängig.
6. **Überblick.** Kennzahlen und Diagramme als Startansicht.
7. **Assistent.** Geführte Stationen. Sie schreiben in denselben Plan wie die Tabelle.
8. **Prüfung.** Fehler, Warnungen und Hinweise. Die Schwellen liegen im Plan.
9. **Szenarien.** Basisplan, Abweichungen mit Hebeln, Kopien und der Vergleich.
10. **PDF.** Bericht im Browser, mit Kapitelauswahl. Die Diagramme sind Vektoren. Bei Fehlern bleibt der Export möglich. Tabellen bleiben zusammen und rücken geschlossen weiter, wenn sie nicht mehr auf den Rest der Seite passen.
11. **Excel.** Arbeitsmappe mit Formeln aus dem Blatt Eingaben. LibreOffice rechnet die Beispiele nach.
12. **Privat und Vorlagen.** Private Kostenblöcke mit Posten und Planjahrfaktoren, Sozialversicherung 2026 und Branchenvorlagen beim Anlegen. Schema-Version 15. Die Vorlagen setzen nur Bezeichnungen.
13. **Veröffentlichung.** Neutrales Erscheinungsbild: Farben, Schrift, Abstände und Schatten liegen als Design-Tokens, der Name in der Kopfzeile ist Finanzplaner. Version 1.0. Bei jedem Push auf `main` bauen die Tests und GitHub Pages veröffentlicht [die App](https://ichbinschlechtmitbenutzernamen.github.io/finanzplaner/).
