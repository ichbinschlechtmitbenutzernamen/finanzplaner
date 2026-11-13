# Excel-Export

Die Arbeitsmappe entsteht vollständig im Browser. Es gibt keinen Server, und die Plandaten verlassen das Gerät nicht. Gewählt ist ExcelJS. Die Bibliothek liegt in einem eigenen Bündel und wird erst geladen, wenn jemand auf „Excel erstellen“ klickt.

Die Datei rechnet selbst. Das Blatt Eingaben enthält die Planeingaben des gewählten Szenarios. Die Berichtsblätter und die Hilfsblätter Parameter, Rechnung und Steuerberechnung holen sich die Zahlen per Formel daraus. Eine Änderung einer gelben Eingabezelle schlägt in Excel auf Abschreibungen, Umsatzsteuer, Darlehen, Liquidität, Rentabilität und Steuern durch. Neben jeder Formel steht der von der App berechnete Wert als gespeichertes Ergebnis, damit ein Viewer ohne Neuberechnung dieselben Zahlen zeigt.

## Blätter

Im Dialog sind die Blätter an- und abwählbar. Standardmäßig sind alle an. Die Auswahl liegt im Plan unter `excelExport` und wandert mit Schema-Version 13 mit. Ältere Pläne bekommen alle Blätter.

Das Eingabeblatt und die Hilfsblätter sind immer in der Datei, sobald ein Rechenblatt gewählt ist, auch wenn die Eingaben im Dialog abgewählt wurden. Prüfung und Szenarienvergleich allein brauchen sie nicht.

- Übersicht: Kennzahlen. Hat das Szenario mindestens einen Fehler, steht ein Vermerk mit der Anzahl. Warnungen allein lösen ihn nicht aus.
- Eingaben: Stammdaten, Rechtsform, Personen, Hebel, Steuerparameter, Umsatz, Personal, laufende Kosten, Investitionen, Finanzierung, Lebenshaltung und Vorsorge. Gelbe Zellen mit blauer Schrift sind Eingaben.
- Kapitalbedarf und Finanzierung
- Investitionen und AfA, dazu die Darlehen. Der Reiter im Dialog heißt „Investitionen und Abschreibungen“. Der Blattname ist kürzer, weil Excel höchstens 31 Zeichen zulässt.
- Umsatz und Kosten
- Rentabilität
- Liquidität
- Tragfähigkeit mit Lebenshaltung, nur bei Einzelunternehmen, Freiberuf und Personengesellschaften. Bei GmbH und UG gibt es das Blatt nicht, auch wenn es in der gespeicherten Auswahl steht.
- Steuern
- Prüfung: alle Meldungen aus `meldungenFuerExport`, feste Werte
- Szenarienvergleich: Kennzahlen aller Szenarien aus `vergleichFuerExport`, feste Werte

Hilfsblätter, nicht im Dialog:

- Parameter: Monatsachse ab dem Startmonat
- Rechnung: Monatswerte in Cent
- Steuerberechnung: Kalenderjahre, Tarif, Gewerbesteuer, Körperschaftsteuer, Zahlungszeitpunkte

36 Monatsspalten und je Planjahr eine Summenspalte. Die Kopfzeile und die erste Spalte sind fixiert. Eurozahlen nutzen das Format `#,##0.00 [$€-407]` mit negativen Werten in Rot, die Hilfsblätter rechnen in Cent. Der Druck ist A4 quer.

## Was die Formeln nachbilden

Die Regeln sind dieselben wie in [rechenkern.md](rechenkern.md), [steuern.md](steuern.md) und [berichte.md](berichte.md).

- Monatswerte aus Basis, Wachstum, Saison und Monatsausnahme, danach der Hebel und der Faktor der Ansicht Best, Real oder Worst
- Wareneinsatz als Quote, beim Kleinunternehmer brutto
- Abschreibung linear, als GWG im Monat des Beginns und als Sammelposten über 60 Monate. Bis 250 Euro netto wird sofort Aufwand
- Umsatzsteuer im Folgemonat, bei vierteljährlicher Voranmeldung nach dem Quartalsende, mit Dauerfrist einen Monat später. Bei Ist-Versteuerung verschiebt sich die Steuer in den Zahlungseingang
- Darlehen: Zins auf die Restschuld zu Monatsbeginn, Ratentilgung, Annuität und endfällige Tilgung. Die erste Rate liegt im Folgemonat der ersten Auszahlung
- Einkommensteuer nach § 32a EStG 2026, Solidaritätszuschlag mit Freigrenze und Milderung, Kirchensteuer nach dem Bundesland, Gewerbesteuer mit Freibetrag 24.500 Euro für Einzelunternehmen und Personengesellschaften und der Anrechnung des 4-fachen Messbetrags je Gesellschafter, Körperschaftsteuer und Gewerbesteuer ohne Freibetrag für GmbH und UG
- Zahlungszeitpunkte wie im Rechenkern: das erste Kalenderjahr im Abschlussmonat des Folgejahres, danach vierteljährliche Vorauszahlungen und die Differenz im September des Folgejahres

Bei einer Abweichung stehen die Hebel als Eingabezellen und gehen in die Formeln ein. Der Umsatzstart schiebt die fertige Reihe. Eine Kopie schreibt ihren gespeicherten Stand in die Eingaben, die Hebel stehen dann auf neutral.

## Abgleich

Geprüft wurde mit LibreOffice Calc, `calculateAll` über die Programmierschnittstelle, nicht mit `--convert-to`: das Umspeichern allein lässt die gespeicherten Ergebnisse stehen. Für Blitzweg Elektrotechnik, Café Leseecke, Hafenlicht GmbH und Studio Nordlicht ist die größte Abweichung nach der Neuberechnung 0,00 Euro, auf den Cent, bei Umsatz, Ergebnis nach Steuern, Steueraufwand, Kundenzahlungen, Darlehen, Zinsen, Tilgung, Investitionen, Ein- und Auszahlungen und dem Endbestand. Dasselbe gilt für die Hebel Vorsichtig und Optimistisch von Blitzweg beim Ergebnis nach Steuern.

Die Toleranz, die der Export zulässt, ist 1 Euro. Die Beispiele bleiben darunter.

## Bewusst so

- Neue Zeilen lassen sich in Excel nicht anfügen. Die Formeln folgen den Zeilen des exportierten Plans. Beträge, Sätze und Hebel bleiben änderbar.
- Formelzellen sind nicht geschützt.
- Prüfung und Szenarienvergleich sind Werte, keine Formeln.
- Was der Rechenkern auslässt, lässt auch die Mappe aus: Verlustvortrag, Ausschüttungsbesteuerung, Hinzurechnungen und Kürzungen beim Gewerbeertrag, Sonderausgaben.

## Dateiname

Der Dateiname enthält das Vorhaben und den Kalendertag, zum Beispiel `Blitzweg-Elektrotechnik-2026-11-13.xlsx`.
