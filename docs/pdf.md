# PDF-Export

Das PDF entsteht vollständig im Browser. Es gibt keinen Server, und die Plandaten verlassen das Gerät nicht. Gewählt ist `@react-pdf/renderer`.

Die Bibliothek passt, weil der Finanzplan aus vielen Tabellen besteht und das Dokument Hoch- und Querformat mischt. Kopfzeile und die Fußzeile „Seite x von y“ hängen an jeder Seite. Die Diagramme sind SVG-Vektoren, also scharf beim Vergrößern. Die Schrift ist Roboto aus dem Paket `@fontsource/roboto`, nur der lateinische Schnitt in normal und fett. Sie wird mit der Seite ausgeliefert und nicht aus dem Netz geladen. Die Bibliothek und die Schrift liegen in einem eigenen Bündel und werden erst geladen, wenn jemand auf „PDF herunterladen“ klickt.

Das PDF rechnet nichts selbst. Berichte, Kennzahlen, Diagrammreihen, Prüfungsmeldungen und der Szenarienvergleich kommen aus denselben Funktionen wie die Oberfläche: `erstelleBerichte`, `ueberblickKpis`, die Reihen in `src/domain/reports/diagramme.ts`, `meldungenFuerExport` und `vergleichFuerExport`. Beträge sind Euro-Cent und werden deutsch formatiert.

## Kapitel

Im Dialog sind die Kapitel an- und abwählbar. Standardmäßig sind alle an. Die Auswahl liegt im Plan unter `pdfExport` und wandert mit Schema-Version 12 mit. Ältere Pläne bekommen alle Kapitel.

Im Dialog wird das Szenario gewählt. Standard ist der Basisplan. Nur dieses Szenario erhält die gewählten Kapitel. Das Deckblatt nennt es, und der Fehlervermerk gilt für dieses Szenario. Die übrigen Szenarien stehen einmal am Ende im Szenarienvergleich, mit Umsatz und Ergebnis nach Steuern je Planjahr, tiefstem Kontostand und Monat, Kapitalbedarf, Break-even, Tragfähigkeit und der Anzahl von Fehlern, Warnungen und Hinweisen.

- Deckblatt: Vorhaben, Rechtsform, Gründerin oder Gründer beziehungsweise Gesellschafter, Stand und das Datum des PDF
- Kennzahlen im Überblick
- Kapitalbedarf und Finanzierung, mit Monatstabelle
- Investitionen und Abschreibungen, dazu die Darlehen, mit Monatstabellen
- Umsatz und Kosten, mit Monatstabelle
- Rentabilität, mit Monatstabelle
- Liquidität, mit Monatstabelle
- Tragfähigkeit mit Lebenshaltung, nur bei Einzelunternehmen, Freiberuf und Personengesellschaften. Bei GmbH und UG gibt es das Kapitel nicht, auch wenn es in der gespeicherten Auswahl steht
- Steuern, festgesetzte Steuer je Kalenderjahr und die Zahlungen aus dem Liquiditätsplan
- Diagramme: Umsatz gegen Kosten je Monat, Kontostand mit Tiefpunkt, kumuliertes Ergebnis, Kostenstruktur je Planjahr, Mittelherkunft und Mittelverwendung je Planjahr
- Prüfungsmeldungen: Fehler, Warnungen und Hinweise
- Szenarienvergleich

Die Monatstabellen sind A4 quer. Jedes Planjahr hat eine Seite mit den zwölf Monaten und der Jahresspalte. Die Jahresübersichten sind A4 hoch. Oben steht das Vorhaben und das Szenario, unten „Seite x von y“. Vorne liegt ein Inhaltsverzeichnis.

## Fehler

Der Export bleibt möglich, auch wenn die Prüfung Fehler meldet. Hat das jeweilige Szenario mindestens einen Fehler, steht auf seinem Deckblatt ein deutlicher Vermerk mit der Anzahl. Warnungen allein lösen den Vermerk nicht aus. Das Kapitel Prüfung listet alle Meldungen dieses Szenarios.

## Dateiname

Der Dateiname enthält das Vorhaben und den Kalendertag, zum Beispiel `Blitzweg-Elektrotechnik-2026-11-12.pdf`.
