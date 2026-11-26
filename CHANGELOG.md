# Änderungsprotokoll

## Unveröffentlicht

- **Startseite.** Aufruf ohne Beispiel-Link zeigt eine kurze Startseite. Von dort legen Sie einen eigenen Plan an, öffnen eines der vier Beispiele oder laden eine Datei. Ein bereits vorhandener Plan lässt sich fortsetzen; ein neuer Plan ersetzt ihn erst nach einer Rückfrage. Direkte Links wie `#elektro/ueberblick` bleiben gültig. Vor der Wahl zwischen Assistent und Tabelle ist kein Reiter als geöffnet markiert.
- **Sichern und Laden.** Eigene Pläne lassen sich als JSON-Datei sichern und wieder laden, auch ältere Schema-Versionen. Ein Hinweis bleibt sichtbar, dass die Daten nur in diesem Browser liegen. Nach 30 Minuten ungesicherter Arbeit erscheint ein schließbarer Hinweis mit dem Zeitpunkt der letzten Sicherung.
- **Rückfragen.** „Plan zurücksetzen“ und das Löschen eines Szenarios fragen in einem Dialog nach. Zurücksetzen steht unter „Weitere“, getrennt von Sichern, PDF und Excel.

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
