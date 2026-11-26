# Änderungsprotokoll

## Unveröffentlicht

- **Varianten.** Der Reiter Szenarien erklärt Varianten in Alltagssprache. Stellschrauben haben ein kurzes Beispiel, jede Variante eine Kurzbeschreibung gegenüber dem Basisplan, etwa „Umsatz −20 %, Start 3 Monate später“. Oben heißt der Umschalter „Angezeigte Variante“ und gilt für alle Reiter, die Kennzahlenleiste und den Export. Im Reiter markiert „wird angezeigt“ die aktuelle Variante, „Diese Variante anzeigen“ schaltet um. Ein Hinweis nennt die Variante und führt zurück zum Basisplan. In PDF und Excel heißt die sichtbare Bezeichnung Variante, der Variantenvergleich eingeschlossen. Gespeichert bleibt `planSzenarien`.
- **Navigation.** Die Ansichten liegen auf zwei Ebenen. Eingeben bündelt Assistent und Alle Eingaben. Ergebnisse bündelt den Überblick und fünf Berichte. Jeder Bericht zeigt einen kurzen Namen und darunter den Fachbegriff: Gewinn und Verlust (Rentabilitätsvorschau), Kontostand je Monat (Liquiditätsplan), Was Sie brauchen (Kapitalbedarf und Finanzierung), Anschaffungen und Kredite (Investitionen und Darlehen), Reicht es zum Leben? (Privatbedarf und Tragfähigkeit). Prüfen zeigt die Zahl der Meldungen. Szenarien bleibt ein eigener Hauptreiter. Links wie `#elektro/liquiditaet` gelten weiter, ebenso die Sprünge aus Prüfung und Kennzahlenleiste. Pfeiltasten, Pos1 und Ende gelten auf beiden Ebenen. Unter 1024 Pixel zeigt die Kopfzeile Planname und die angezeigte Variante; Sichern, Laden, PDF, Excel, Zurücksetzen und die Beispiele liegen im Menü.
- **Tabelle.** Planjahre starten eingeklappt. Zuerst sehen Sie die Jahressumme, die Monate öffnet ein Klick auf das Planjahr. Diese Wahl bleibt je Plan für die Sitzung erhalten. Jahressummen lassen sich nicht direkt ändern: „Zum Bearbeiten Jahr aufklappen“.
- **Hilfeleiste.** Die Kurzhilfe steht in einer Zeile. Fortschreiben, Faktor oder Menge, Wachstum und die zwölf Monatsfelder erscheinen, wenn eine Zeile ausgewählt ist, sonst unter „Mehr Werkzeuge“. Tastatur, Einfügen aus Excel und Überschreibungen stehen unter „Hilfe“. Leere Zahlenfelder für Beträge und Mengen zeigen „z. B. 1.234,56“.
- **Export.** PDF und Excel übernehmen die angezeigte Variante. Im Dialog können Sie eine andere wählen.
- **Bedienung.** PDF, Excel, Stellschrauben und Rückfragen setzen den Fokus beim Öffnen, halten ihn im Dialog und geben ihn an die auslösende Schaltfläche zurück. Escape schließt weiterhin. Die Reiter folgen den Pfeiltasten, Pos1 und Ende.
- **Kennzahlenleiste.** Über dem Assistenten und der Tabelle bleibt eine schmale Leiste sichtbar. Sie zeigt den tiefsten Kontostand, das Ergebnis nach Steuern der ersten drei Planjahre, den Break-even, die Tragfähigkeit, die Zahl der Fehler und Warnungen und den Kapitalbedarf der angezeigten Variante. Ein Klick öffnet den passenden Reiter. Vor der Wegwahl und bei einem leeren Plan stehen Striche.
- **Startseite.** Aufruf ohne Beispiel-Link zeigt eine kurze Startseite. Von dort legen Sie einen eigenen Plan an, öffnen eines der vier Beispiele oder laden eine Datei. Ein bereits vorhandener Plan lässt sich fortsetzen; ein neuer Plan ersetzt ihn erst nach einer Rückfrage. Direkte Links wie `#elektro/ueberblick` bleiben gültig. Vor der Wahl zwischen Assistent und Tabelle ist kein Reiter als geöffnet markiert.
- **Sichern und Laden.** Eigene Pläne lassen sich als JSON-Datei sichern und wieder laden, auch ältere Schema-Versionen. Ein Hinweis bleibt sichtbar, dass die Daten nur in diesem Browser liegen. Nach 30 Minuten ungesicherter Arbeit erscheint ein schließbarer Hinweis mit dem Zeitpunkt der letzten Sicherung.
- **Rückfragen.** „Plan zurücksetzen“ und das Löschen einer Variante fragen in einem Dialog nach. Zurücksetzen steht unter „Weitere“, getrennt von Sichern, PDF und Excel.

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
