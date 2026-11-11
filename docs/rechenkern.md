# Rechenkern

Dieser Text beschreibt, wie aus den Eingaben eines Plans die 36 Monatswerte werden. Er ist für die fachliche Prüfung gedacht. Einkommensteuer, Gewerbesteuer und Körperschaftsteuer stehen in [docs/steuern.md](steuern.md). Die Rentabilitätsvorschau, der Liquiditätsplan und die Kennzahlen stehen in [docs/berichte.md](berichte.md). Was hier steht, ist die Grundlage dafür. Der Saldo dieses Rechenkerns ist noch kein Kontostand: der Liquiditätsplan setzt den Anfangsbestand auf 0 und summiert die Salden.

Der Rechenkern liegt in `src/domain/calc` und kennt weder React noch den Browser. Aufgerufen wird ein Plan und ein Szenario (`base`, `best`, `real` oder `worst`). Zurück kommen Cent-Beträge für jeden der 36 Monate. Die Oberfläche zeigt das noch nicht. Zum Nachrechnen gibt es den Prüfstand für Blitzweg Elektrotechnik, beschrieben am Ende.

## Rundung

Alle Geldbeträge sind ganze Euro-Cent. Gerechnet wird mit den Cent-Zahlen, gerundet wird kaufmännisch: ab einem halben Cent wird von null weg gerundet. 31.245,5 Cent werden 31.246 Cent, −1,5 Cent werden −2 Cent.

Prozentsätze auf einen schon gerundeten Cent-Betrag, also Umsatzsteuer, Vorsteuer, Wareneinsatzquote, Lohnnebenkosten und Monatszins, werden nicht über die binäre Kommazahl geführt. Der Satz wird auf zwölf Nachkommastellen gerastert und danach ganzzahlig geteilt. So bleibt 19 Prozent von einem glatten Betrag glatt, und ein exakt halber Cent fällt nach der Regel oben.

Wo sich eine Summe auf viele Monate verteilt, AfA und gleichmäßige Tilgung, bekommt jeder Monat außer dem letzten den gerundeten Anteil. Der letzte Monat nimmt den Rest, damit die Summe exakt dem Ausgangsbetrag entspricht. Würde dieser Rest negativ, weil die Rundung nach oben zu viel verteilt hätte, wird stattdessen abgerundet.

Ein Monatswert aus Basis, Wachstum und Saison wird erst am Ende gerundet. Eine Monatsausnahme ist schon ein Cent-Betrag und wird nicht noch einmal gerundet. Bei einem festen Monatsbetrag wirkt der Szenariofaktor auf diesen Cent-Betrag und wird danach erneut gerundet. Bei Menge mal Preis werden Mengen- und Preisfaktor vor dem einmaligen Runden des Produkts angewendet. Ein Cent-Zuschlag bei den Kosten kommt nach der Rundung dazu.

## Monatswert

Laufende Beträge und Mengen stehen nicht als 36 Zahlen im Plan, sondern als Regel. Für einen Kalendermonat gilt:

```text
monatlich aufgezinst: Faktor = (1 + Jahresrate) hoch (Abstand in Monaten / 12)
Jahressprung:         Faktor = (1 + Jahresrate) hoch (ganze Jahre, abgerundet)

Monatswert = Basis × Wachstumsfaktor × Saisonfaktor des Kalendermonats
```

Der Saisonfaktor hängt am Kalendermonat, Januar ist der erste der zwölf Faktoren, nicht der erste Planmonat. Fehlt der Bezugsmonat, ist es der Planstart. Eine Ausnahme ersetzt Basis, Wachstum und Saison für genau diesen Monat. Der Szenariofaktor kommt danach trotzdem noch.

Beim Jahressprung bleibt der Faktor zwölf Monate gleich und springt am Jahrestag des Bezugsmonats. Vor dem Bezugsmonat gilt der vorherige Schritt. Mengen, also Stück, Stunden oder Projekte, werden nicht auf ganze Einheiten gerundet. Bei Menge mal Preis wird erst das Produkt auf Cent gerundet.

Außerhalb von „aktiv von“ und „aktiv bis“, und beim Personal außerhalb von Eintritt und Austritt, ist der Monat null.

## Szenarien

Die Basis sind die eingegebenen Zahlen. Best Case, Real Case und Worst Case sind jeweils eigene Faktoren auf dieser Basis, nicht aufeinander gestapelt. Der Real Case von Blitzweg hat keine Anpassung und ist deshalb gleich der Basis.

Ein globaler Faktor gilt für Umsatz, laufende Kosten oder Gehälter. Ein Faktor auf einer einzelnen Linie ersetzt den globalen für diese Linie. Er wird nicht zusätzlich mit ihm multipliziert. Ist bei einer Kostenzeile nur ein Cent-Zuschlag gesetzt, ist der Faktor dieser Zeile 1 und nicht der globale Kostenfaktor.

Der Umsatzfaktor skaliert bei einem festen Monatsumsatz den Betrag. Bei Menge mal Preis skaliert der globale Faktor nur die Menge, also den Umsatz genau einmal. Ein eigener Preisfaktor der Linie skaliert den Preis zusätzlich.

Nicht verändert werden Investitionen, Gründungs- und Anlaufkosten, Darlehen, Einlagen, Zuschüsse und der Lebensbedarf. Eine umsatzabhängige Kostenzeile hängt am Nettoumsatz nach dem Szenario, weil zum Beispiel eine Zahlungsgebühr dem Umsatz folgt.

## Umsatz und Wareneinsatz

Der Nettoumsatz ist Ertrag im Leistungsmonat. Der Wareneinsatz ist die Quote dieser Linie auf den Nettoumsatz, mit eigenem Vorsteuersatz. Eine Quote über 100 Prozent bleibt zulässig. Einen eigenen monatlichen Wareneinsatzbetrag gibt es nicht, und der Wareneinsatz hat kein eigenes Zahlungsziel: die Auszahlung an den Lieferanten liegt im Leistungsmonat.

Das Zahlungsziel der Kunden wird auf ganze Monate gelegt. Bis 14 Tage bleibt das Geld im Leistungsmonat. Danach verschiebt jeder weitere angefangene 30-Tage-Block um einen Monat. 15 bis 44 Tage sind ein Monat, 45 bis 74 Tage sind zwei Monate. Die Rechnung an den Kunden ist brutto, also netto plus Umsatzsteuer. Beim Kleinunternehmer gibt es keine Umsatzsteuer, der Kunde zahlt den Nettobetrag.

Was nach dem letzten Planmonat eingehen würde, steht am Monatsende als offene Forderung. Es wird nicht in einen 37. Monat geschrieben.

## Personal

Ab dem Eintrittsmonat bis zum Austrittsmonat, jeweils einschließlich, liegen Bruttogehalt und der Arbeitgeberanteil. Der Anteil ist der eingegebene Satz auf das Brutto, nicht ein hinterlegter Sozialversicherungssatz. Eine Sonderzahlung kommt im genannten Monat zum Brutto dazu, der Satz gilt auf die Summe. Der Szenariofaktor gilt für das laufende Gehalt und für die Sonderzahlung. Gezahlt wird im selben Monat. Umsatzsteuer gibt es darauf nicht.

## Laufende Kosten, Gründung und Anlauf

Fixe Kosten folgen der Monatswert-Regel. Umsatzabhängige Kosten sind die Quote vom Nettoumsatz des Monats. Danach kommen Faktor und Cent-Zuschlag des Szenarios.

Der Privatanteil ist der Teil, der nicht Betriebsausgabe ist. 0,2 beim Pkw heißt: 20 Prozent bleiben privat, 80 Prozent sind Aufwand. Die Vorsteuer wird nur auf diesen betrieblichen Nettoanteil gerechnet, und nur wenn Vorsteuer abgezogen werden darf. Die Auszahlung ist trotzdem die ganze Bruttorechnung. Ist der Posten gar keine Betriebsausgabe, ist der Aufwand null und es gibt keine Vorsteuer, das Geld geht aber trotzdem vom Konto.

Gründungs- und Anlaufkosten sind einmalig und im Leistungsmonat Betriebsaufwand. Die Vorsteuer entsteht daneben, soweit sie abgezogen werden darf. Wer einen Posten ausdrücklich als Anlage markiert, schreibt ihn wie eine Investition ab: linear über die angegebene Nutzungsdauer, als GWG im AfA-Monat oder als Sammelposten über 60 Monate. Dieselbe 250-Euro-Regel gilt auch dort. Ein alter Vermerk „nicht sofort abzugsfähig“ aus Schema-Version 2 wird beim Einlesen zu Aufwand, weil dazu keine Anlagenangaben gespeichert waren.

## Investitionen und Abschreibungen

Die Bemessung ist der Nettopreis, abzüglich eines eingetragenen Restwerts. Fehlt der Restwert, wird auf null abgeschrieben. Ohne Vorsteuerabzug, also beim Kleinunternehmer und wenn der Abzug ausgeschaltet ist, erhöht die nicht abziehbare Umsatzsteuer die Bemessung. Gezahlt wird immer der Bruttobetrag, verschoben um das Zahlungsziel der Anlage. Die Vorsteuer entsteht im Anschaffungsmonat, nicht im Zahlungsmonat.

Beträge unter der Sammelposten-Untergrenze des Parametersatzes, im Stand 2026 sind das 25.001 Cent, also bis einschließlich 250,00 Euro netto, werden nicht aktiviert. Sie sind im Anschaffungsmonat sonstiger Betriebsaufwand. Das gilt auch, wenn als Methode linear oder Sammelposten eingetragen wurde. Darüber wird ein Hinweis geschrieben, der Plan bleibt rechenbar.

Darüber:

- Linear: jeden Monat derselbe Anteil über die eingetragene Nutzungsdauer. Der erste Monat ist der AfA-Beginn, ersatzweise der Kaufmonat. Ein angefangener Monat zählt voll, es gibt keine Tageszählung. Der letzte Monat nimmt den Cent-Rest.
- Geringwertiges Wirtschaftsgut: die ganze Bemessung im AfA-Monat. Der Buchwert ist danach null.
- Sammelposten: dieselbe lineare Verteilung, immer über 60 Monate nach § 6 Abs. 2a EStG. Eine Nutzungsdauer wird dafür nicht erfasst. Steht sie in einem Plan der Schema-Version 2, fällt sie beim Einlesen weg.

Passt die Methode nicht zu den GWG- oder Sammelposten-Grenzen, bleibt das ein Hinweis und keine Sperre. Die Rechnung folgt trotzdem der eingetragenen Methode, außer bei der 250-Euro-Regel oben. Die Fachberatung hat diese Grenze bestätigt.

Ein Waren-Erstbestand ist Vorrat, kein Aufwand und keine AfA. Die Auszahlung liegt im ersten Planmonat. Die Liquiditätsreserve ist nur ein Merkposten im Kapitalbedarf. Sie ist kein eigener Zahlungsstrom, weil das Geld aus Einlagen und Darlehen kommt oder eben noch fehlt. Ob die Finanzierung den Bedarf deckt, prüft ein späterer Schritt.

Am Ende von Monat 36 steht der Restbuchwert. Was danach noch abzuschreiben wäre, ist in diesem Buchwert enthalten.

## Finanzierung und Kreditplan

Bareinlagen und Kapitalrücklagen kommen im genannten Monat als Geld. Sacheinlagen gibt es im Modell nicht. Ein älterer Plan verliert sie beim Einlesen.

Zuschüsse kommen als Geld in den genannten Monaten. Der Gründungszuschuss zahlt in Phase 1 Arbeitslosengeld I plus Pauschale und danach, wenn Phase 2 geplant ist, nur die Pauschale. Steuerfreie Zuschüsse stehen nicht im Betriebsergebnis. Steuerpflichtige schon, als sonstiger Ertrag. Einen Progressionsvorbehalt gibt es nicht.

Darlehen laufen monatlich, auch über die 36 Monate hinaus. Gezeigt werden die Monate im Plan. Die Restschuld am letzten Planmonat bleibt stehen.

Der erste Monat ist die erste Auszahlung und hat noch keine Rate. Die erste Rate liegt im Folgemonat. Laufzeit und tilgungsfreie Zeit zählen ab dieser Rate. Ein Darlehen, das im Juni ausgezahlt wird, mit 12 tilgungsfreien Monaten und 84 Monaten Laufzeit, zahlt von Juli bis zum Juni darauf nur Zins und danach 72 Monate Tilgung.

Zinsen eines Monats sind Restschuld zu Monatsbeginn mal Jahreszins durch 12, auf Cent gerundet. Eine weitere Tranche erhöht die Schuld im selben Monat, trägt aber erst ab dem Folgemonat Zinsen. Getilgt werden kann sie schon im Zuflussmonat. Im letzten Monat der Laufzeit wird getilgt, was dann noch da ist.

„Keine Zinsen in der tilgungsfreien Zeit“ heißt: die Zinsen werden erlassen. Sie werden nicht gestundet und nicht auf die Schuld geschrieben.

- Annuität: die Rate wird einmal nach der Formel Nominal × r × (1+r)^n / ((1+r)^n − 1) gerundet, mit r = Jahreszins / 12 und n = Monate mit Tilgung. Die Tilgung ist Rate minus Zins des Monats. Der letzte Monat gleicht auf null aus, die Rate kann dort um wenige Cent abweichen.
- Ratentilgung: gleichbleibende Tilgung auf das Nominal, Zinsen extra auf die sinkende Restschuld. Der letzte Tilgungsmonat nimmt den Cent-Rest.
- Endfällig: Zins in den Ratenmonaten, die ganze Tilgung im letzten Monat.

Disagio, eine Gebühr und ein Auszahlungskurs unter 100 Prozent mindern den Geldeingang im ersten Auszahlungsmonat und sind dort Aufwand. Sie werden nicht über die Laufzeit verteilt und erhöhen die Schuld nicht. Die Schuld ist das Nominal. Eine Sondertilgung gibt es im Plan nicht.

### Thüringer Mikrodarlehen im Beispiel Blitzweg

25.000,00 Euro, Sollzins 2,40 Prozent, Ratentilgung, 84 Monate, 12 Monate tilgungsfrei, Zinsen werden in der Freizeit gezahlt, Auszahlung Juni 2026 zu 100 Prozent, keine Gebühr.

Der Monatszins auf die vollen 25.000,00 Euro ist 50,00 Euro. Das gilt für die zwölf tilgungsfreien Monate und noch einmal für die erste Tilgung. Die Tilgung verteilt 25.000,00 Euro auf 72 Monate: 347,22 Euro in den ersten 71 Tilgungsmonaten, 347,38 Euro im letzten, Summe exakt 25.000,00 Euro. Die erste Tilgung ist Juli 2027. Danach sinkt der Zins mit der Restschuld. Im Mai 2029, dem 36. Planmonat und der 23. Tilgung, sind 7.638,84 Euro getilgt. Vor dieser Rate stehen 17.361,16 Euro, der Zins ist 34,72 Euro, danach stehen 17.013,94 Euro. Die Schuld ist erst im Juni 2033 bei null. Das liegt außerhalb der 36 Spalten und steht als Restschuld am Monatsende.

## Umsatzsteuer

Die Umsatzsteuer einer Linie ist der Nettoumsatz mal dem Satz der Linie, je Linie auf Cent gerundet. Bei der Soll-Versteuerung entsteht sie im Leistungsmonat, bei der Ist-Versteuerung im Monat des Zahlungseingangs. Liegt dieser Eingang nach dem Horizont, ist die Steuer noch keine Zahllast. Sie wird separat ausgewiesen.

Die Vorsteuer auf Wareneinsatz, Kosten, Gründung, Anlauf, Investitionen und den Waren-Erstbestand entsteht im Leistungs- oder Anschaffungsmonat. Die Ist-Versteuerung verschiebt sie nicht. Abgezogen wird sie nur, wenn der Plan vorsteuerabzugsberechtigt ist. Beim Kleinunternehmer ist das nie der Fall: keine Umsatzsteuer auf die Erlöse, keine Vorsteuer, die nicht abziehbare Steuer erhöht Aufwand und AfA-Bemessung. Die 250-Euro-Grenze wird trotzdem am eingetragenen Nettobetrag geprüft.

Die Zahllast eines Monats ist Umsatzsteuer minus Vorsteuer. Negativ heißt Erstattung. Gezahlt wird:

- bei monatlicher Voranmeldung im Folgemonat, mit Dauerfristverlängerung einen Monat später
- bei vierteljährlicher Voranmeldung im Monat nach dem Quartalsende, mit Dauerfristverlängerung einen weiteren Monat später

Der 10. des Monats bleibt im Monatsraster in diesem Zahlungsmonat. Blitzweg ist monatlich und ohne Dauerfrist. Die leere Planvorlage steht auf vierteljährlich, das ist eine Eingabe und keine feste Regel des Rechenkerns.

## Was die Übersicht zeigt

Das Betriebsergebnis vor Steuern ist:

```text
Umsatzerlöse
− Wareneinsatz
− Personal
− laufende Kosten
− Gründungs- und Anlaufkosten, soweit sie nicht als Anlage markiert sind
− Sofortaufwand bis 250 Euro
− Abschreibungen
− Zinsen
− Disagio und Gebühren
+ steuerpflichtige Zuschüsse
```

Darunter stehen die erfassten Zahlungen: Kundengeld, Ware, Personal, Kosten, Investitionen, Zinsen, Tilgung, die Umsatzsteuerzahlung, Einlagen, Darlehenszufluss, Zuschüsse und, bei Personenunternehmen, der private Lebensbedarf als Entnahme. Bei GmbH und UG bleibt der Lebensbedarf ein Vergleichswert und wird nicht vom Konto genommen. Das Geschäftsführergehalt ist dort eine Personalstelle.

Der Saldo ist die Summe dieser Zahlungen, abzüglich der Ertragsteuerzahlungen aus [docs/steuern.md](steuern.md). Die empfohlene Steuerrücklage ist kein Zahlungsstrom und fehlt im Saldo. Der Saldo ist kein Kontostand und kein Liquiditätsplan. Es fehlt der Anfangsbestand, und die Liquiditätsreserve ist bewusst nicht als Einnahme gezählt.

## Prüfstand

`npm run export:check` rechnet Blitzweg im Real Case und schreibt `docs/checkpoints/schritt2-blitzweg.xlsx`. Sieben Blätter, 36 Monatsspalten, Beträge in Euro mit zwei Nachkommastellen: Übersicht, Umsatz & Wareneinsatz, Personal, Kosten, Investitionen & Abschreibungen, Finanzierung, Umsatzsteuer. Der Juni-Umsatz muss 7.475,00 Euro sein, die Restschuld im Mai 2029 muss 17.013,94 Euro sein. Weicht das ab, bricht das Skript ab.

## Bestätigt

Die Fachberatung hat diese Regeln bestätigt: Beträge bis 250 Euro netto sind sofortiger Betriebsaufwand. Der Monatszins ist Nominalzins durch 12, die Annuität wird einmal gerundet, der letzte Monat gleicht aus. Die Vorsteuer entsteht im Leistungsmonat, die Umsatzsteuer bei Ist-Versteuerung im Zahlungseingang. Beim Kleinunternehmer sind Aufwand und AfA-Bemessung brutto, die 250-Euro-Grenze bleibt am Nettobetrag. Der Sammelposten läuft fest über 60 Monate. Gründungs- und Anlaufkosten sind Aufwand, außer sie sind ausdrücklich als Anlage markiert. Sacheinlagen gibt es nicht.

## Noch offen

1. Disagio, Gebühren und ein Auszahlungskurs unter 100 Prozent sind Aufwand im Auszahlungsmonat und werden nicht verteilt. Eine Sondertilgung gibt es nicht.
2. Der Wareneinsatz hat kein eigenes Zahlungsziel und wird im Leistungsmonat gezahlt.
3. Umsatzabhängige Kosten beziehen sich auf den Nettoumsatz aller Linien nach Szenario. Der Privatanteil kürzt nur den Aufwand und die Vorsteuer, nicht die Auszahlung.
4. Als Anlage markierte Gründungs- und Anlaufkosten stehen in der Kategorie Sonstiges. Es gibt dafür keine eigene Anlagenkategorie.
5. Erledigt in Schritt 3: Einkommensteuer nach § 32a EStG, Solidaritätszuschlag mit Gleitzone, Kirchensteuer aus dem Bundesland, Gewerbesteuer und Körperschaftsteuer. Die Regeln stehen in docs/steuern.md. Warnungen zur Kleinunternehmergrenze bleiben Schritt 8.
