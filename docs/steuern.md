# Steuern und Rechtsformen

Dieser Text beschreibt, wie aus dem Betriebsergebnis die Einkommensteuer, der Solidaritätszuschlag, die Kirchensteuer, die Gewerbesteuer und bei GmbH und UG die Körperschaftsteuer werden. Er ist für die fachliche Prüfung gedacht, nicht für eine Steuererklärung. Der Rechenkern liegt weiter in `src/domain/calc` und kennt weder React noch den Browser. Die Sätze stehen im Parametersatz `de-2026`, der mit dem Plan gespeichert wird.

Das Betriebsergebnis aus dem Rechenkern bleibt der Gewinn vor diesen Steuern. Gewerbesteuer, Körperschaftsteuer und Einkommensteuer sind keine Betriebsausgaben und werden nicht aus dem Gewinn herausgerechnet. Gezahlt wird trotzdem: die Zahlungen mindern den Saldo der erfassten Zahlungen. Die empfohlene Steuerrücklage tut das nicht.

## Was die Steuergrundlage ist

Veranlagt wird das Kalenderjahr, nicht „Monat 1 bis 12 des Plans“. Die Monate des Horizonts werden nach ihrem Kalenderjahr gebündelt. Ein Plan von Juni 2026 bis Mai 2029 hat deshalb vier Steuerjahre: 2026, 2027, 2028 und 2029.

Der Gewinn eines Jahres ist die Summe des monatlichen Betriebsergebnisses in den Monaten, die in diesem Kalenderjahr liegen. Ein Rumpfjahr ist ein Kalenderjahr, das nicht mit allen zwölf Monaten im Plan liegt. Das ist am Anfang so, wenn nicht im Januar gestartet wird, und am Ende immer dann, wenn der 36. Monat nicht auf einen Dezember fällt.

Rumpfjahre werden nicht hochgerechnet. Ein Start im Juni hat in diesem Kalenderjahr wirklich nur sieben Monate Gewinn, und genau dieser Gewinn ist die Bemessungsgrundlage. Das letzte Rumpfjahr zeigt nur die Monate, die der Plan noch enthält. Es ist keine Schätzung des ganzen Kalenderjahres. Darauf weist der Rechenkern hin. Vorauszahlungen, deren Termin nach dem letzten Planmonat liegt, bleiben offen und werden nicht in den Horizont vorgezogen.

Weitere Einkünfte und Kinderfreibeträge sind Jahresbeträge. Sie werden auch im Rumpfjahr in voller Höhe angesetzt, nicht anteilig. Der Plan kennt die Monate vor dem Start und nach dem Horizont nicht. Wer dort Einkommen hatte oder haben wird, trägt es bei den weiteren Einkünften ein.

Ein Verlustjahr führt zu null Steuer. Ein Verlustvortrag oder Verlustrücktrag ist nicht eingebaut. Hinzurechnungen und Kürzungen beim Gewerbeertrag nach § 8 und § 9 GewStG ebenfalls nicht: der Gewerbeertrag ist der Gewinn.

## Einkommensteuer

Grundlage je Person ist ihr Gewinnanteil nach dem Anteil im Plan, plus die weiteren jährlichen Einkünfte aus dem Steuerprofil, minus Kinderfreibetrag und BEA-Freibetrag. Ein halber Kinderfreibetrag ist ein Elternteil: 3.414 Euro Kinderfreibetrag plus 1.464 Euro BEA, zusammen 4.878 Euro. Ein ganzer Kinderfreibetrag ist das Doppelte. Eine Günstigerprüfung gegen das Kindergeld gibt es nicht, weil das Kindergeld nicht im Plan steht. Wer den Freibetrag nicht nutzen will, lässt die Anzahl auf null. Sonderausgaben, Vorsorgeaufwendungen und der Sonderausgaben-Pauschbetrag werden nicht abgezogen. Die Kirchensteuer wird nicht als Sonderausgabe zurückgerechnet, damit keine Schleife entsteht.

Das zu versteuernde Einkommen wird auf volle Euro abgerundet. Negativ heißt: Steuer null.

Der Tarif ist § 32a Abs. 1 EStG in der Fassung ab dem Veranlagungszeitraum 2026, Steuerfortentwicklungsgesetz vom 23. Dezember 2024 (BGBl. 2024 I Nr. 449). Die Formel steht im Parametersatz und im Code, Quelle auch dort: https://www.gesetze-im-internet.de/estg/__32a.html

```text
bis 12.348 Euro:                         0
von 12.349 bis 17.799 Euro:              (914,51 · y + 1.400) · y
von 17.800 bis 69.878 Euro:              (173,10 · z + 2.397) · z + 1.034,87
von 69.879 bis 277.825 Euro:             0,42 · x − 11.135,63
ab 277.826 Euro:                         0,45 · x − 19.470,38
```

y ist ein Zehntausendstel des Betrags über 12.348 Euro, z ein Zehntausendstel des Betrags über 17.799 Euro, x das abgerundete zu versteuernde Einkommen. Der Steuerbetrag wird auf volle Euro abgerundet. Die Koeffizienten liegen als Hundertstel im Plan, damit 914,51 nicht als binäre Kommazahl gespeichert wird.

Ehegattensplitting steht im Steuerprofil. Die Steuer ist dann das Doppelte der Steuer auf die Hälfte des zu versteuernden Einkommens, die Hälfte vor dem Tarif auf volle Euro abgerundet. Gesplittet wird nur das Einkommen, das der Plan kennt: Gewinnanteil plus weitere Einkünfte. Einkommen einer anderen Person, das nicht dort steht, fehlt.

Der Gründungszuschuss ist steuerfrei und steht nicht im Gewinn. Steht bei einem Zuschuss der Progressionsvorbehalt, wird § 32b EStG so angewendet: der Steuersatz aus dem um den Zuschuss erhöhten Einkommen wird auf das zu versteuernde Einkommen gelegt, das Ergebnis auf volle Euro abgerundet. Bei einer Personengesellschaft wird der Zuschuss wie der Gewinn nach Anteilen verteilt, weil der Plan ihn nicht einer Person zuordnet.

## Solidaritätszuschlag und Kirchensteuer

Der Solidaritätszuschlag auf die Einkommensteuer folgt § 3 Abs. 3 und § 4 des Solidaritätszuschlaggesetzes 1995, Freigrenze ab dem Veranlagungszeitraum 2026. Der Satz ist 5,5 Prozent. Liegt die festgesetzte Einkommensteuer bei der Einzelveranlagung nicht über 20.350 Euro, ist der Zuschlag null. Beim Splitting gilt das Doppelte, 40.700 Euro. Darüber ist der Zuschlag der kleinere Betrag aus 5,5 Prozent der Steuer und 11,9 Prozent des Betrags über der Freigrenze. Ab 37.839 Euro Einkommensteuer bei der Einzelveranlagung gilt der volle Satz. Bruchteile eines Cents entfallen. Bemessungsgrundlage ist die Einkommensteuer nach der Anrechnung des § 35 EStG.

Auf die Körperschaftsteuer gibt es keine Freigrenze. Der Zuschlag ist 5,5 Prozent der Körperschaftsteuer.

Die Kirchensteuer ist 8 Prozent in Bayern und Baden-Württemberg und 9 Prozent in den übrigen Ländern, aber nur, wenn die Person im Steuerprofil kirchensteuerpflichtig ist. Der Satz folgt dem Bundesland des Plans. Eine eigene Wohnsitzangabe gibt es nicht. Basis ist ebenfalls die festgesetzte Einkommensteuer, nicht der Solidaritätszuschlag. Bruchteile eines Cents entfallen.

## Gewerbesteuer

Freiberuflerinnen und Freiberufler zahlen keine Gewerbesteuer. Bei allen anderen Rechtsformen wird sie gerechnet. Der Hebesatz der Gemeinde ist die einzige Eingabe. 460 bedeutet 460 Prozent.

§ 11 GewStG, https://www.gesetze-im-internet.de/gewstg/__11.html :

```text
Gewerbeertrag auf volle 100 Euro nach unten abrunden
bei Einzelunternehmen und Personengesellschaften Freibetrag 24.500 Euro abziehen,
höchstens den abgerundeten Ertrag
bei GmbH und UG keinen Freibetrag
Steuermessbetrag = 3,5 Prozent, auf volle Euro abgerundet
Gewerbesteuer = Steuermessbetrag × Hebesatz, auf volle Euro abgerundet
```

Ein Gewinn von null oder darunter ergibt keine Gewerbesteuer. Die Gewerbesteuer mindert den Gewinn nicht.

## Anrechnung nach § 35 EStG

Bei Einzelunternehmen und Personengesellschaften wird das 4,0-fache des Gewerbesteuer-Messbetrags auf die tarifliche Einkommensteuer angerechnet. Die Anrechnung ist der kleinste dieser Beträge:

- das 4,0-fache des Messbetrags
- die tatsächlich zu zahlende Gewerbesteuer
- der Ermäßigungshöchstbetrag
- die tarifliche Einkommensteuer

Der Ermäßigungshöchstbetrag ist die tarifliche Einkommensteuer mal den positiven gewerblichen Einkünften durch die Summe aller positiven Einkünfte. Negative andere Einkünfte kürzen den Nenner nicht. Sie kürzen das zu versteuernde Einkommen und damit die Steuer, auf die der Satz angewendet wird. Bei einem Hebesatz von 400 Prozent deckt das 4,0-fache die Gewerbesteuer genau, darüber bleibt ein Teil der Gewerbesteuer liegen. Freiberuf hat keine Anrechnung, weil es keinen Messbetrag gibt. GmbH und UG auch nicht.

Bei GbR, OHG und KG gibt es einen Messbetrag und eine Gewerbesteuer der Gesellschaft. Beides wird nach dem Gewinnanteil auf die Gesellschafterinnen und Gesellschafter verteilt, in vollen Euro, die letzte Person erhält den Rest. Jede Person rechnet ihren Anteil gegen die eigene Einkommensteuer, mit eigenem Tarif, eigenem Splitting, eigener Kirchensteuer und eigenem Höchstbetrag. Vorabgewinne gibt es im Plan nicht. Eine Person ohne Anteil, etwa eine Geschäftsführung ohne Beteiligung, bekommt keinen Gewinn und keinen Messbetrag.

Die Einkommensteuer, der Solidaritätszuschlag und die Kirchensteuer der Personen sind privat. Sie stehen in der Steuerübersicht und gehen als eigene Zahlung aus der Liquidität, zusätzlich zum Lebensbedarf und nicht als Betriebsausgabe. Bei der GmbH und UG gibt es diese Personensteuer nicht. Die Körperschaftsteuer ist eine Zahlung der Gesellschaft.

## GmbH und UG

Die Körperschaftsteuer ist 15 Prozent des Gewinns, der Gewinn auf volle Euro abgerundet, die Steuer ebenfalls. Darauf 5,5 Prozent Solidaritätszuschlag, ohne Freigrenze. Die Gewerbesteuer läuft ohne Freibetrag und ohne Anrechnung auf eine Einkommensteuer. Das Geschäftsführergehalt ist eine Personalstelle und damit schon im Gewinn enthalten.

Ausschüttungen und die Steuer darauf, Kapitalertragsteuer und das Teileinkünfteverfahren, werden nicht gerechnet. Das ist bewusst ausgelassen. Der Lebensbedarf der Gesellschafter bleibt ein Vergleichswert und ist keine Entnahme.

## Wann das Geld geht

Im ersten Kalenderjahr des Plans gibt es keine Vorauszahlung. Die gesamte Steuer dieses Jahres wird im zweiten Kalenderjahr an einem Tag gezahlt. Der Kalendermonat steht im Plan unter `steuerplanung.abschlusszahlungMonat`, Standard ist 9, also September. September liegt auf einem gesetzlichen Vorauszahlungstermin der Einkommensteuer und nach der Abgabefrist Ende Juli für eine Erklärung ohne Berater. Der Bescheid kann früher oder später kommen. Der Monat ist deshalb eine Planungsannahme und lässt sich ändern. Gewerbesteuer und Einkommensteuer oder Körperschaftsteuer nutzen denselben Monat, damit es eine Eingabe bleibt.

Ab dem zweiten Kalenderjahr werden Vorauszahlungen angesetzt, jeweils ein Viertel der für dasselbe Jahr geplanten Steuer:

- Einkommensteuer und Körperschaftsteuer im März, Juni, September und Dezember
- Gewerbesteuer im Februar, Mai, August und November

Die ersten drei Termine werden auf volle Euro abgerundet. Der vierte Termin trägt den Rest einschließlich übrig gebliebener Cent, damit die Summe der Jahressteuer entspricht. Gesetzlich richten sich die Vorauszahlungen nach dem letzten Bescheid, also nach dem Vorjahr. Der Plan setzt sie auf die Steuer desselben Jahres. Dadurch gibt es keine zweite Nachzahlung, solange alle vier Termine im Horizont liegen: Vorauszahlung und geplante Steuer sind gleich, die Differenz ist null. Weicht die Wirklichkeit später vom Plan ab, sieht man das hier nicht. Termine nach dem letzten Monat bleiben offen.

Im September des zweiten Jahres können deshalb zwei Dinge zusammenfallen: die ganze Steuer des ersten Jahres und die September-Vorauszahlung des zweiten Jahres.

## Steuerrücklage

Zusätzlich wird eine monatliche Empfehlung ausgegeben: die erwartete Jahressteuer geteilt durch 12, auf volle Euro abgerundet. In einem vollen Kalenderjahr erhält der Dezember den Rest, damit die zwölf Empfehlungen zusammen die Jahressteuer ergeben. Im Rumpfjahr bleibt jeder vorhandene Monat beim abgerundeten Zwölftel. Die Monate außerhalb des Plans fehlen, der Stand bleibt deshalb unter der Jahressteuer.

Der kumulierte Stand zählt die Empfehlungen von Beginn des Plans an. Er wird nicht um die echten Zahlungen vermindert. Die Empfehlung ist ein Merkposten. Der Rechenkern schreibt dazu den Hinweis: „Bestenfalls jeden Monat Budget zur Bildung einer Steuerrücklage verwenden, damit die Steuerlast in der Liquidität berücksichtigt ist.“

## Was der Prüfstand zeigt

`npm run export:check` schreibt neben dem bisherigen Blatt für Blitzweg die Datei `docs/checkpoints/schritt3-steuern.xlsx`. Darin liegen der Rechenweg und die Monate für Blitzweg Elektrotechnik, das Café Leseecke und die fiktive Hafenlicht GmbH. Die Hafenlicht GmbH hat in jedem der drei vollen Jahre 111.600 Euro Gewinn, 16.740 Euro Körperschaftsteuer, 920,70 Euro Solidaritätszuschlag und bei einem Beispiel-Hebesatz von 400 Prozent 15.624 Euro Gewerbesteuer.

## Bewusst ausgelassen

- Ausschüttungsbesteuerung bei GmbH und UG
- Verlustvortrag und Verlustrücktrag
- Hinzurechnungen und Kürzungen beim Gewerbeertrag
- Sonderausgaben, Vorsorge, Kindergeld und die Günstigerprüfung
- Kirchensteuer als Sonderausgabe
- Vorauszahlungen nach dem Vorjahresbescheid statt nach der geplanten Steuer desselben Jahres
- eine Hochrechnung des letzten Rumpfjahres

## Noch offen für die Fachberatung

- Ob der September als Standard für die Abschlusszahlung des ersten Jahres passt.
- Ob das letzte Rumpfjahr für die Planung doch auf ein volles Jahr hochgerechnet werden soll.
- Ob die Vorauszahlung lieber dem Vorjahresbescheid folgen soll, mit einer eigenen Nachzahlung.
- Ob der Progressionsvorbehalt des Gründungszuschusses so, wie hier nach § 32b, bleiben soll.
- Ob Kirchensteuer und Solidaritätszuschlag auf der Einkommensteuer nach § 35 liegen sollen. Hier tun sie das.
