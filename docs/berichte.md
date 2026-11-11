# Berichte

Dieser Text beschreibt, wie aus dem Rechenergebnis die Berichte werden. Er ist für die fachliche Prüfung gedacht. Die Strukturen liegen in `src/domain/reports`, kennen weder React noch den Browser und werden nicht in den Plan zurückgeschrieben. Tabelle, Diagramm, PDF und Excel in der Oberfläche greifen später darauf zu. Der Prüfstand `docs/checkpoints/schritt4-berichte.xlsx` zeigt die drei Beispiele.

Alle Geldbeträge sind ganze Euro-Cent. Ein Bericht hat, wo die Zeit eine Rolle spielt, 36 Monatswerte und die Summen der Planjahre.

## Planjahre

Ein Planjahr sind zwölf Monate ab dem Gründungsmonat, nicht das Kalenderjahr.

- Planjahr 1 = Monate 1 bis 12
- Planjahr 2 = Monate 13 bis 24
- Planjahr 3 = Monate 25 bis 36

Blitzweg startet im Juni 2026. Planjahr 1 läuft von Juni 2026 bis Mai 2027. Das Café startet im August 2026, die Hafenlicht GmbH im Januar 2026. Nur bei einem Januar-Start fällt das Planjahr mit dem Kalenderjahr zusammen.

Bewegungen, also Umsatz, Kosten, Einzahlungen, werden im Planjahr addiert. Bestände, also Kontostand und Restschuld, zeigen den Stand am Anfang oder am Ende des Planjahres, nicht die Summe der Monatswerte.

## Steuern in der Rentabilität und in der Liquidität

Die Steuer wird weiter nach Kalenderjahren veranlagt. Daran ändert dieser Schritt nichts. Die Regeln stehen in [steuern.md](steuern.md).

In der Rentabilitätsvorschau ist der Steueraufwand die festgesetzte Steuer des Kalenderjahres. Sie wird gleichmäßig auf die Planmonate dieses Kalenderjahres verteilt. Jeder Monat außer dem letzten erhält den auf Cent gerundeten Anteil, der letzte Monat den Rest, damit die Summe exakt der Jahressteuer entspricht. Liegt ein Kalenderjahr in zwei Planjahren, wandert ein Teil der Steuer in das eine und der Rest in das andere Planjahr. Die Summe über alle 36 Monate ist die Summe der festgesetzten Steuern.

In der Liquidität bleiben die Zahlungszeitpunkte aus der Steuerrechnung: keine Vorauszahlung im ersten Kalenderjahr, Abschluss im September des Folgejahres, danach Viertel und Differenz. Eine Erstattung ist ein negativer Betrag und steht bei den Einzahlungen. Die empfohlene Steuerrücklage ist eine nachrichtliche Zeile. Sie mindert den Kontostand nicht.

## Rentabilitätsvorschau

Die Gliederung folgt der Bank. Kosten stehen als positive Beträge. Die Ergebniszeilen sind saldiert.

```text
Umsatz
− Wareneinsatz
= Rohertrag
− Personal
− Raumkosten
− sonstige Kosten
− Abschreibungen
− Zinsen
= Ergebnis vor Steuern
− Steuern
= Ergebnis nach Steuern
```

Das Ergebnis vor Steuern ist das Betriebsergebnis des Rechenkerns. Die Summe eines Planjahres ist die Summe der Monatsergebnisse in diesen zwölf Monaten.

Raumkosten sind die laufenden Kosten der Kategorien Miete und Nebenkosten. Sonstige Kosten sind der Rest, und zwar so, dass die Gliederung aufgeht:

- laufende Kosten ohne Miete und Nebenkosten
- Gründungs- und Anlaufkosten, soweit sie Aufwand sind und nicht als Anlage abgeschrieben werden
- Sofortaufwand bis 250 Euro netto
- Disagio, Gebühren und ein Auszahlungskurs unter 100 Prozent
- steuerpflichtige Zuschüsse, als negativer Betrag, also als Ertrag

Bei Einzelunternehmen, Freiberuf und Personengesellschaften steht unter dem Ergebnis nach Steuern die Zeile Privatentnahmen. Sie ist nachrichtlich und mindert das Ergebnis nicht. Bei GmbH und UG gibt es die Zeile nicht. Das Geschäftsführergehalt steckt im Personalaufwand.

## Liquiditätsplan

```text
Anfangsbestand
+ Einzahlungen
− Auszahlungen
= Endbestand
```

Der Anfangsbestand des ersten Monats ist 0. Der Endbestand eines Monats ist der Anfangsbestand des nächsten. Der Endbestand ist die laufende Summe der Zahlungssalden aus dem Rechenkern. Die Liquiditätsreserve ist kein Kassenbestand. Sie steht nur im Kapitalbedarf.

Einzahlungen: Kundenzahlungen, Einlagen, Darlehensauszahlungen, Zuschüsse, Erstattungen der Umsatzsteuer und Erstattungen der Ertragsteuer.

Auszahlungen: Wareneinsatz, Personal, laufende Kosten einschließlich Gründung und Anlauf, Investitionen, Zinsen, Tilgung, Umsatzsteuer, Einkommensteuer mit Solidaritätszuschlag und Kirchensteuer, Gewerbesteuer, Körperschaftsteuer mit Solidaritätszuschlag, Privatentnahmen.

Der tiefste Kontostand ist der niedrigste Endbestand der 36 Monate. Der Anfang von 0 vor der ersten Bewegung zählt nicht mit. Ist der tiefste Stand negativ, ist der Kontokorrentbedarf sein Betrag ohne Vorzeichen. Sonst ist der Bedarf 0. Einen Stand innerhalb des Monats kennt der Plan nicht.

## Kapitalbedarf und Finanzierung

Der Bedarf ist die Summe der erfassten Nettobeträge:

- Investitionen
- Gründungskosten
- Anlaufkosten
- Waren-Erstbestand, wenn einer erfasst ist
- Betriebsmittel
- Reserve

Der Waren-Erstbestand ist ein eigener Posten. Er ist Vorrat, kein Betriebsmittelbedarf und keine Reserve.

Betriebsmittel ist nur die manuelle Eingabe `betriebsmittelbedarfCents`. Die Rechnung leitet ihn nicht ab. In den Beispielen steht 0, weil dafür kein Betrag erfasst war. Die Reserve ist die bisherige Liquiditätsreserve.

Die Finanzierung ist:

- Eigenmittel, Bareinlage und Kapitalrücklage
- Darlehen zum Nominal
- Zuschüsse, die im Horizont zufließen

Deckung ist Finanzierung minus Bedarf. Positiv ist eine Überdeckung, negativ eine Deckungslücke, null ist ausgeglichen.

Die Umsatzsteuer auf Anschaffungen ist kein Bedarfsposten. Sie läuft im Liquiditätsplan. Als Anlage markierte Gründungs- und Anlaufkosten bleiben in ihrer Liste und stehen nicht noch einmal bei den Investitionen.

Darlehen zählen mit dem Nominal. Disagio, Gebühren und ein Auszahlungskurs unter 100 Prozent mindern die Auszahlung. Die Differenz steht nachrichtlich. Im Liquiditätsplan ist der Zufluss bereits der geringere Betrag.

Betriebsmittel und Reserve liegen im ersten Planmonat. Das ist die zeitliche Zuordnung im Kapitalplan, kein Zahlungsstrom. Die Monats- und Planjahressummen der übrigen Posten folgen dem Monat der Erfassung.

## Investitionen, AfA und Darlehen

Je Anlagegut: Kategorie, Methode, ob abgeschrieben oder sofort als Aufwand gebucht wird, Aktivierung, Restwert, Abschreibung, Buchwert und Auszahlung. Die Summe der Abschreibungen ist die Abschreibung aus dem Rechenkern. Der Buchwert am Ende eines Planjahres ist der Buchwert des letzten Monats dieses Planjahres.

Je Darlehen: Nominalzins, Tilgungsart, Laufzeit, tilgungsfreie Zeit, Auszahlung, Zins, Tilgung, Rate und Restschuld in den 36 Planmonaten. Die Restschuld am letzten Planmonat bleibt stehen, auch wenn die Laufzeit darüber hinausgeht. Der Monat der ersten Auszahlung hat noch keine Rate.

## Privatbedarf und Tragfähigkeit

Gilt für Einzelunternehmen, Freiberuf, GbR, OHG und KG, je Person mit einem Anteil über 0. Für GmbH und UG wird sie nicht gerechnet. Dort steht nur der Hinweis, dass das Geschäftsführergehalt die Betriebsausgabe ist, Ausschüttungen nicht gerechnet werden und der Lebensbedarf ein Vergleichswert bleibt.

Je Person und Monat:

```text
Gewinnanteil am Betriebsergebnis
− eigene Steuern
= Gewinn nach Steuern
− Lebenshaltung
− Vorsorge
= verfügbares Einkommen
```

Die Vorsorge ist Krankenversicherung, Pflegeversicherung, Altersvorsorge und sonstige Versicherungen. Die Steuer einer Person ist ihre Einkommensteuer, der Solidaritätszuschlag, die Kirchensteuer und ihr Anteil an der Gewerbesteuer. Verteilt wird sie wie der Steueraufwand der Rentabilität auf die Monate des Kalenderjahres.

Der Gewinnanteil eines Monats ist der Anteil am Betriebsergebnis dieses Monats. Die letzte Person erhält den Cent-Rest, dieselbe Teilung wie in der Steuerrechnung. Bei einer Person mit 100 Prozent ist der Gewinn nach Steuern das Ergebnis nach Steuern des Betriebs. Bei mehreren Personen kann die Summe der Monatsanteile in einem einzelnen Monat um wenige Cent vom Jahresgewinnanteil abweichen, weil die Steuer am Jahresgewinn hängt und die Anteile je Monat gerundet werden. Über alle 36 Monate gleichen sich Gewinn und Steuer aus.

Tragfähig ist eine Person, wenn ihr verfügbares Einkommen im Planjahr 2 mindestens 0 ist. Ausgewiesen werden das Ja oder Nein und der Betrag. Fehlt der Lebensbedarf, sind Lebenshaltung und Vorsorge 0. Die Tragfähigkeit prüft dann nur den Gewinn nach Steuern.

## Kennzahlen

**Break-even-Monat.** Der erste Planmonat mit positivem Monatsergebnis. Positiv heißt: Ergebnis nach Steuern größer als 0. Null gilt nicht als positiv. Ein später wieder negativer Monat verschiebt den Break-even nicht. Gibt es im Horizont keinen positiven Monat, ist der Break-even nicht erreicht. Maßgeblich ist das Ergebnis nach der verteilten Steuer, nicht das Ergebnis vor Steuern und nicht der Kontostand.

**Rohertragsquote.** Rohertrag geteilt durch Umsatz, je Planjahr und für den ganzen Horizont. Ohne Umsatz gibt es keine Quote.

**Umsatzrendite.** Ergebnis nach Steuern geteilt durch Umsatz, je Planjahr und für den ganzen Horizont.

**Kapitaldienstfähigkeit.** Je Planjahr. Der Cashflow ist das Ergebnis nach Steuern plus Abschreibungen minus Privatentnahmen. Geteilt wird durch Zins plus Tilgung. Die Quote ist ein Faktor: 1,0 deckt den Kapitaldienst genau. Ohne Zins und ohne Tilgung entfällt die Kennzahl. Bei der GmbH und UG sind die Privatentnahmen 0, das Geschäftsführergehalt steckt schon im Ergebnis.

**Tiefster Liquiditätsstand.** Der tiefste Endbestand, mit Monat. Der Kontokorrentbedarf steht daneben.

**Eigenkapitalquote der Finanzierung.** Eigenmittel geteilt durch Eigenmittel plus Darlehen zum Nominal plus Zuschüsse. Zuschüsse stehen im Nenner, nicht im Zähler. Ohne Finanzierung gibt es keine Quote.

## Was bewusst so entschieden ist

- Planjahre statt Kalenderjahre in den Berichten. Die Veranlagung bleibt das Kalenderjahr.
- Betriebsmittelbedarf nur als Eingabe, Standard 0. Keine Ableitung aus dem Zahlungssaldo.
- Lebenshaltung und Vorsorge waren schon je Person im Plan. Dafür gibt es keine neue Migration.
- Der Waren-Erstbestand ist eine eigene Zeile im Kapitalbedarf.
- Raumkosten sind nur Miete und Nebenkosten.
- Der Break-even ist der erste Planmonat mit Ergebnis nach Steuern größer als 0.
