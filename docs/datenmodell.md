# Datenmodell des Finanzplans

Dieser Text erklärt, welche Angaben eine gründende Person macht und wie sie im Plan zusammenhängen. Er ist für die fachliche Prüfung gedacht, nicht als Bedienungsanleitung. Die App merkt sich die Eingaben, prüft, ob sie zusammenpassen, und kann sie als JSON-Datei speichern und wieder einlesen. Die Monatswerte und die Berichte werden daraus gerechnet und nicht in den Plan zurückgeschrieben. Die Berichte stehen in [berichte.md](berichte.md).

Ein durchgängig erfundener Fall ist nicht genug, um die Formen zu sehen. Im Projekt liegen drei deutlich gekennzeichnete Beispiele: Lina Bergmann mit dem Grafikstudio „Studio Nordlicht“, der Elektromeister Jonas Heller mit Fahrzeug, Werkzeug und Thüringer Mikrodarlehen, und Mara Sommer mit dem Café Leseecke, Küche, Wareneinsatzquote, Personal und Saison. Die Beträge sind nicht als Vorlage für einen Antrag gedacht.

## Was angelegt wird

Ein Plan gilt für 36 Monate, durchgängig monatlich. Der erste Monat ist frei wählbar. Start im April 2026 heißt: letzter Monat ist März 2029.

Die gründende Person legt einen Plan an und kann mehrere Zwecke gleichzeitig ankreuzen:

- Gründungszuschuss und Tragfähigkeitsbescheinigung
- Bankkredit oder KfW
- Investoren oder EXIST
- die eigene Planung

Dieselben Zahlen speisen später alle Auswertungen. Getrennte Pläne je Zweck sind nicht nötig. Was eine Bank sieht und was in der Tragfähigkeit steht, filtert später die Darstellung, nicht der Datenbestand.

## Wie die Bausteine zusammenhängen

Die Stammdaten sagen, wer gründet, in welcher Rechtsform und wofür der Plan da ist.

Der Kapitalbedarf sagt, welches Geld der Start bindet: Anlagen, Gründung, Anlauf, Liquiditätspuffer, gegebenenfalls ein erstes Warenlager. Die Finanzierung sagt, woher dieses Geld kommt: Eigenkapital, Darlehen, Zuschüsse. Ob die Finanzierung den Bedarf deckt, prüft ein späterer Schritt. Die App speichert beide Seiten getrennt, damit niemand einen Posten doppelt als Bedarf und als Quelle einträgt.

Umsatz, Personal und laufende Kosten beschreiben den laufenden Betrieb. Daraus werden später GuV und Liquidität.

Der private Lebensbedarf steht daneben. Er ist bei Einzelunternehmen und Personengesellschaften keine Betriebsausgabe, sondern Geld, das vom Konto geht (Entnahme). Bei GmbH und UG ist das Gehalt der Geschäftsführung die Betriebsausgabe. Der Lebensbedarf dient dort nur dem Vergleich: trägt das Gehalt den Unterhalt?

Die Umsatzsteuer bestimmt, ob Umsatzsteuer ausgewiesen und Vorsteuer gezogen wird und wann die Steuer ans Finanzamt geht.

Szenarien verändern den fertigen Plan nicht durch eine zweite Abschrift. Best Case und Worst Case sind Auf- und Abschläge auf die Basis.

So ordnen sich die Eingaben später der Ergebnisrechnung zu. Das ist die vorgesehene Lesart, noch keine Rechnung:

| Eingabe                                                                                                 | Später in der GuV                  | Später nur Liquidität und Bestand                 |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Umsatzlinien, netto                                                                                     | Umsatzerlöse                       | Zahlung später, je nach Zahlungsziel              |
| Wareneinsatz                                                                                            | Material- und Wareneinsatz         | wie oben                                          |
| Personal inklusive Geschäftsführergehalt und Arbeitgeberanteil                                          | Personalaufwand                    | Lohnzahlung im Monat                              |
| Abschreibung der Investitionen                                                                          | Abschreibungen                     | die Anschaffung selbst ist Ausgabe, nicht Aufwand |
| GWG-Sofortabschreibung, Gründungs- und Anlaufkosten als Aufwand, laufende Kosten abzüglich Privatanteil | sonstige betriebliche Aufwendungen | Zahlung je nach Zahlungsziel                      |
| steuerpflichtige Zuschüsse                                                                              | sonstige betriebliche Erträge      | Zufluss                                           |
| Zinsen                                                                                                  | Zinsaufwand                        | Zinszahlung                                       |
| Tilgung, Eigenkapital, Liquiditätsreserve                                                               | nein                               | ja                                                |
| steuerfreie Zuschüsse, darunter der Gründungszuschuss                                                   | nein                               | ja, Zufluss                                       |
| privater Lebensbedarf bei Personenunternehmen                                                           | nein                               | ja, Entnahme                                      |

## Stammdaten

- Name des Plans und der Firma oder des Vorhabens
- Kennzeichen, ob es sich um einen erfundenen Beispielplan handelt
- Rechtsform
- Branche als Freitext, optional ein stabiler Schlüssel für spätere Branchenvorlagen und optional der Wirtschaftszweig
- kurze Beschreibung der Tätigkeit
- Ort, Bundesland, optional Straße und Postleitzahl
- Gründungsmonat
- optional: Handelsregister ja oder nein
- Zwecke des Plans
- die Personen mit Rolle, Anteil, optionalem Steuerprofil und optionalem Lebensbedarf
- bei GmbH und UG das Stammkapital
- bei allen Rechtsformen außer dem Freiberuf der Gewerbesteuer-Hebesatz der Gemeinde

Der Hebesatz wird als Prozentzahl gespeichert. 460 bedeutet 460 Prozent, nicht 4,60.

Anteile sind Dezimalzahlen. 1 bedeutet 100 Prozent. Die Anteile aller Personen müssen zusammen 100 Prozent ergeben. Eine reine Geschäftsführung ohne Beteiligung trägt 0 Prozent. Eine Person kann mehrere Rollen haben, zum Beispiel Gesellschafterin und Geschäftsführerin.

Das Stammkapital ist die gesellschaftsrechtliche Angabe. Das Geld, das wirklich auf dem Konto ankommt, steht bei den Einlagen. Die Summe der Einlagen darf höher sein als das Stammkapital (Rücklage). Die App erzwingt keine Gleichheit und prüft auch nicht die gesetzlichen Mindestbeträge von GmbH oder UG.

Optional kann vermerkt werden, welche Branchenvorlage den Plan einmal gefüllt hat. Die Vorlage selbst ist kein Teil der Zahlen. So kann eine Vorlage später aktualisiert werden, ohne einen schon bearbeiteten Plan zu überschreiben.

## Kapitalbedarf

Alle Anschaffungen und Kosten in diesem Block werden netto erfasst. Der Umsatzsteuersatz steht daneben. Wer 1.000 Euro brutto bei 19 Prozent Umsatzsteuer kauft, trägt 840,34 Euro netto und den Satz 0,19 ein, nicht 1.000 Euro. Die Vorsteuer, die bis zur Erstattung auf dem Konto fehlt, rechnet später die Liquidität. Sie ist keine zweite Eingabe. Sonst wäre der Betrag doppelt gezählt.

### Investitionen

Je Anlage: Bezeichnung, Kategorie, Nettopreis, Umsatzsteuersatz, Kaufmonat, Zahlungsziel in Tagen, Abschreibungsmethode, Nutzungsdauer in Monaten.

Methoden:

- linear: Nutzungsdauer mindestens ein Monat. Die Abschreibung beginnt im Kaufmonat, außer es ist ein späterer AfA-Beginn eingetragen (Maschine steht noch nicht).
- geringwertiges Wirtschaftsgut, sofort Aufwand: Nutzungsdauer 0. Zulässig bis zur GWG-Obergrenze im Parametersatz, im Stand 2026 sind das 800 Euro netto. Ein höherer Betrag bleibt speicherbar, wird aber markiert.
- Sammelposten: keine Nutzungsdauer. Aufgelöst wird immer über 60 Monate, fünf Jahre nach § 6 Abs. 2a EStG. Zulässig von 250,01 bis 1.000 Euro netto, ebenfalls laut Parametersatz. Außerhalb dieser Spanne gibt es einen Hinweis, keine Sperre. Im Bereich 250,01 bis 800 Euro sind Sofort-GWG und Sammelposten beide zulässig. Lineare Abschreibung ist immer zulässig und wird nicht bemängelt. Ein Betrag bis 250,00 Euro netto wird nicht aktiviert, sondern als sofortiger Betriebsaufwand gebucht.

Ein Restwert ist optional. Fehlt er, schreibt die spätere Rechnung auf null ab. Degressive Abschreibung gibt es im Modell nicht.

### Gründungskosten und Anlaufkosten

Einmalbeträge mit Monat, Umsatzsteuersatz und Zahlungsziel. Beispiele: Gewerbeanmeldung, Beratung, Startkampagne. Die Liste entscheidet, ob es Gründung oder Anlauf ist. Gebucht werden sie als sofortiger Betriebsaufwand im Leistungsmonat, zuzüglich Vorsteuer, soweit sie abziehbar ist. Wer einen Posten ausdrücklich als Anlage markiert, gibt zusätzlich die Abschreibungsmethode an. Dann gilt dieselbe AfA wie bei den Investitionen, beim Sammelposten also 60 Monate. Eine Nutzungsdauer gibt es dort nicht.

### Betriebsmittel

Ein manuell eingegebener Betriebsmittelbedarf. Die Rechnung leitet ihn nicht aus Umsatz oder Kosten ab. Fehlt er in einem älteren Plan, wird er beim Einlesen 0.

Dazu ein Betrag für die Liquiditätsreserve zu Beginn. Das ist kein Aufwand, sondern Geld, das als Puffer im Kapitalbedarf steht. Optional ein Waren-Erstbestand netto samt Umsatzsteuersatz. Der laufende Wareneinsatz steht bei den Umsatzlinien, nicht hier. Betriebsmittelbedarf und Reserve sind keine Zahlungsströme.

## Finanzierung

### Eigenkapital

Mehrere Posten, je mit Betrag, Monat und Art: Bareinlage oder Kapitalrücklage. Sacheinlagen gibt es im Modell nicht. Der Posten kann einer Person zugeordnet werden. Eine Einlage von außen, ohne Person im Plan, ist ebenfalls möglich.

### Darlehen und Förderdarlehen

Je Darlehen: Geber, Art (Bank, KfW, anderes Förderdarlehen, privat, Gesellschafterdarlehen), Nominalzins pro Jahr, Laufzeit in Monaten, tilgungsfreie Monate, Tilgungsart, ob in der tilgungsfreien Zeit Zinsen gezahlt werden.

Die Tilgungsarten:

- Annuität: gleichbleibende Rate, der Zinsanteil sinkt
- Ratentilgung: gleichbleibende Tilgung, Zinsen extra auf die Restschuld
- endfällig: Zinsen laufend, die gesamte Tilgung im letzten Monat

Der Darlehensbetrag ist die Summe der Auszahlungen. Eine Auszahlung ist der Normalfall. Weitere Auszahlungen sind eigene Monate. Der Zeitplan hängt an der ersten Auszahlung und startet bei einer zweiten Tranche nicht neu.

Laufzeit und tilgungsfreie Zeit zählen ab der ersten Rate. Die erste Rate liegt im Monat nach der ersten Auszahlung. Ein Darlehen, das im April ausgezahlt wird, mit 12 tilgungsfreien Monaten und 72 Monaten Laufzeit, zahlt von Mai des ersten Jahres bis April des Folgejahres nur Zins (wenn Zinsen in der Freizeit nicht erlassen sind) und danach 60 Monate Tilgung. Die Laufzeit darf über die 36 Planmonate hinausgehen. Gezeigt werden später nur die Monate im Horizont.

„Keine Zinsen in der tilgungsfreien Zeit“ bedeutet: die Zinsen werden erlassen. Sie werden nicht gestundet und nicht auf die Schuld aufgeschlagen. Ein vollständig zinsloses Darlehen hat zusätzlich den Nominalzins 0.

Optional: Disagio, ein Hinweis auf Sicherheiten, bei Gesellschafterdarlehen die Person.

Raten sind monatlich. Vierteljährliche Raten sind nicht vorgesehen. Annuität und Ratentilgung (gleichbleibende Tilgung plus sinkende Zinsen) sind allgemein möglich. Endfällige Darlehen ebenfalls.

Im Parametersatz liegt eine Fördervorlage, die bei der Plananlage eingefroren und danach editierbar ist: das Thüringer Mikrodarlehen der Thüringer Aufbaubank. Gespeicherte Grenzen, gegen die ein verknüpftes Darlehen geprüft wird: 5.000 bis 35.000 Euro, höchstens 84 Monate Laufzeit, höchstens 12 Monate tilgungsfrei. Vorgaben, die in das Darlehen kopiert werden und dort geändert werden können: Sollzins 2,40 Prozent pro Jahr, Ratentilgung, Zinszahlung auch in der tilgungsfreien Zeit, Auszahlung zu 100 Prozent, keine Gebühr. Der Effektivzins ist nicht extra gespeichert. Die spätere Zinsrechnung nutzt den Sollzins des Darlehens.

### Zuschüsse

Zwei Formen:

1. Gründungszuschuss, strukturiert. Eingaben: monatliches Arbeitslosengeld I, Dauer der Phase 1, monatliche Pauschale, ob Phase 2 geplant ist, Dauer der Phase 2, Startmonat. Üblich sind 6 Monate ALG plus Pauschale und danach 9 Monate nur Pauschale, oft 300 Euro. Diese Zahlen sind Eingaben, keine fest eingebauten Gesetzeswerte, damit ein abweichender Bescheid nicht an der App scheitert. Alle Monate müssen im Horizont liegen.
2. Freie Liste von Monat und Betrag, gekennzeichnet als EXIST oder als sonstiger Zuschuss.

Jeder Zuschuss hat den Schalter steuerfrei ja oder nein. Der Gründungszuschuss ist steuerfrei. Einen Progressionsvorbehalt gibt es nicht: er steht nicht im Katalog des § 32b EStG. Die App setzt ihn nicht, auch nicht optional.

## Umsatzplanung

Mehrere Umsatzlinien. Zwei Arten:

- ein Netto-Monatsbetrag
- Menge mal Nettopreis, mit optionaler Einheit (Projekt, Stunde, Stück)

Je Linie: Umsatzsteuersatz, Zahlungsziel in Tagen, optional ein erster und ein letzter aktiver Monat. Außerhalb dieses Fensters ist die Linie später null.

Der Wareneinsatz ist je Linie entweder keiner oder ein Prozentsatz vom Nettoumsatz, mit eigenem Vorsteuersatz. Ein eigener monatlicher Wareneinsatzbetrag ist nicht vorgesehen. Eine Quote über 100 Prozent ist zulässig, wenn unter den eigenen Kosten verkauft wird. Stücklisten und Lagerbewegungen je Artikel gibt es nicht.

## Personal

Jede Stelle hat Bezeichnung, optionale Namen, Rolle, Bruttomonatsgehalt, Eintritt, optional Austritt, Wochenstunden und den Arbeitgeber-Nebenkostensatz auf das Brutto.

Rollen: angestellt, Minijob, Geschäftsführung, Aushilfe. Werkstudentinnen und Werkstudenten sind „angestellt“. Den passenden Satz gibt die gründende Person ein. Die App enthält keine Beitragssätze der Sozialversicherung, weil die sich jährlich ändern.

Optional können die Nebenkosten in Renten-, Arbeitslosen-, Kranken- und Pflegeversicherung, Umlage U1, Umlage U2, Insolvenzgeldumlage und Unfallversicherung zerlegt werden. Die Summe muss dem eingegebenen Satz entsprechen. Gerechnet wird später mit dem Satz. Das Detail dokumentiert ihn.

Ein Schalter sagt, ob die Stelle sozialversicherungspflichtig ist. Eine geschäftsführende Gesellschafterin ohne Versicherungspflicht trägt den Satz 0 oder nur die Unfallversicherung, je nach Fall.

Sonderzahlungen wie ein Weihnachtsgeld sind einzelne Monate mit einem Bruttobetrag. Ein automatisches 13. Gehalt gibt es nicht.

Das Geschäftsführergehalt einer GmbH oder UG ist eine solche Stelle und verweist auf die Person in den Stammdaten. Es ist Betriebsausgabe. Die Inhaberin eines Einzelunternehmens steht nicht zusätzlich auf der Lohnliste. Ihr Unterhalt steht im Lebensbedarf.

## Laufende Kosten

Je Posten eine Kategorie (Miete, Versicherung, Marketing, Software, Buchhaltung und weitere, dazu „Sonstiges“ für alles, was die Liste noch nicht kennt) und eine Art:

- fester monatlicher Nettobetrag
- ein Satz vom Nettoumsatz, zum Beispiel Zahlungsgebühren

Dazu Umsatzsteuersatz, Zahlungsziel, ob es eine Betriebsausgabe ist, und optional ein Privatanteil zwischen 0 und 1. Der Privatanteil ist der Teil, der nicht abgezogen wird. 0,2 beim Pkw heißt: 20 Prozent bleiben privat. Fehlt der Privatanteil, gilt später 0.

## Privater Lebensbedarf

Er hängt an der Person, nicht an einem eigenen Topf. Wird er erfasst, gehören dazu:

- Lebenshaltung (Wohnen, Essen und der übrige Alltag, ohne die folgenden Posten)
- Krankenversicherung
- Pflegeversicherung
- Altersvorsorge
- sonstige Versicherungen, etwa Haftpflicht oder Berufsunfähigkeit

Jeder dieser Posten ist ein monatlicher Betrag und kann später wachsen. Null ist erlaubt, wenn es den Posten nicht gibt.

Für den Gründungszuschuss und die Tragfähigkeit ist dieser Block bei Personenunternehmen die Grundlage. Bei GmbH und UG kann er trotzdem gefüllt werden, fließt aber nicht in die GuV.

Optional je Person, für eine spätere grobe Einkommensteuer, nicht für eine Steuererklärung: Kirchensteuer, Ehegattensplitting, Kinderfreibeträge in halben Schritten, weitere Einkünfte außerhalb des Vorhabens. Solidaritätszuschlag wäre daraus abzuleiten und ist keine eigene Eingabe.

## Umsatzsteuer und Zahllast

Standard ist die Regelbesteuerung mit Vorsteuerabzug. Alle Beträge im Plan sind netto. Die Umsatzsteuer steht als Satz daneben.

- Regelbesteuerung oder Kleinunternehmerregelung
- Vorsteuerabzugsberechtigt ja oder nein. Bei Kleinunternehmern muss das Nein sein. Bei der Regelbesteuerung ist Ja der Normalfall, Nein bleibt für einzelne Fälle möglich.
- Soll- oder Ist-Versteuerung
- Voranmeldung monatlich oder vierteljährlich
- Dauerfristverlängerung ja oder nein

Die Zahllast eines Monats ist die Umsatzsteuer auf die Leistungen minus die abziehbare Vorsteuer. Bei Kleinunternehmern ist sie null: keine Umsatzsteuer auf die Erlöse, kein Vorsteuerabzug, die Vorsteuer erhöht später die Anschaffungskosten.

Wann das Geld ans Finanzamt geht, hängt nicht am einzelnen Zahlungsziel der Kundschaft, sondern an der Voranmeldung. Der Entstehungsmonat ist bei Soll der Leistungsmonat und bei Ist der Monat, in dem das Geld nach dem Zahlungsziel eingeht. Gezahlt wird:

- bei monatlicher Voranmeldung im Folgemonat, mit Dauerfristverlängerung einen Monat später
- bei vierteljährlicher Voranmeldung im Monat nach dem Quartalsende, mit Dauerfristverlängerung einen weiteren Monat später

Der übliche Fälligkeitstag, der 10., bleibt im Monatsraster in diesem Zahlungsmonat. Die Umsatzgrenzen der Kleinunternehmerregelung stehen im Parametersatz und sperren den Plan nicht.

Zahlungsziele von Kunden und Lieferanten werden später auf ganze Monate gelegt: bis 14 Tage bleiben im Leistungsmonat, danach verschiebt jeder weitere angefangene 30-Tage-Block um einen Monat.

## Monatswerte: Basis, Wachstum, Saison, Ausnahme

Laufende Beträge und Mengen werden nicht als 36 einzelne Zahlen gespeichert. Gespeichert wird die Regel. Die Rechnung baut die Monate später daraus. So können sich Regel und Tabelle nicht widersprechen, und Assistent und Tabellenansicht ändern dieselben Felder.

Die Regel hat vier Teile. Jeder außer der Basis ist optional.

1. Basisbetrag in Cent, oder eine Basismenge. Der Bezugsmonat sagt, für welchen Monat dieser Wert gilt. Fehlt er, ist es der erste Planmonat.
2. Wachstum als Jahresrate. 0,05 bedeutet 5 Prozent pro Jahr, ein negativer Wert einen Rückgang. Zwei Spielarten: monatlich aufgezinst, oder einmal im Jahr sprunghaft und dazwischen konstant.
3. Saison: zwölf Faktoren für Januar bis Dezember, nicht für „Monat 1 bis 12 des Plans“. 1 ist neutral, 0 ist ein geschlossener Monat. Der Durchschnitt muss nicht 1 sein. Wer den April-Faktor auf 1,2 setzt, hebt jeden April an, auch wenn der Plan im April startet.
4. Ausnahmen je Monat. Sie ersetzen den fertigen Monatswert. Wachstum und Saison werden in diesem Monat nicht zusätzlich angewendet.

Die bestätigte Formel, die die spätere Rechnung anwendet:

```text
Wachstum monatlich aufgezinst:
  Faktor = (1 + Jahresrate) hoch (Abstand in Monaten / 12)

Wachstum im Jahressprung:
  Faktor = (1 + Jahresrate) hoch (ganze Jahre seit dem Bezugsmonat)

Monatswert = Basis × Wachstumsfaktor × Saisonfaktor
```

Gerundet wird am Ende auf ganze Cent. Eine Ausnahme setzt den Cent-Betrag direkt.

Beispiel, nur zur Prüfung der Formel: Basis 1.000 Euro im April, 12 Prozent Jahreswachstum, monatlich aufgezinst, Mai-Faktor 1,1. Abstand ein Monat. (1,12) hoch (1/12) ist etwa 1,0095. Mal 1,1 ergibt etwa 1,11044. Der Maiwert ist 1.110,44 Euro. Beim Jahressprung bliebe der Aprilwert zwölf Monate lang 1.000 Euro und läge erst im April darauf bei 1.120 Euro, danach noch mal mal den Saisonfaktor.

Dieselbe Regel gilt für Mengen, Preise, Gehälter, fixe Kosten und den Lebensbedarf. Einmalbeträge (Kauf, Einlage, einzelne Zuschussmonate) haben keinen Wachstumsbaustein, sondern einen konkreten Monat.

## Tabellenbearbeitung

Die Tabelle zeigt 36 Monate und je Planjahr eine Summenspalte. Eine Zelle ändert die gespeicherte Regel nicht durch eine zweite Monatsliste, sondern über die Bausteine, die es schon gibt.

- Eine einzelne Zelle, „nach rechts fortschreiben“ und das Einfügen aus Excel schreiben `monatsOverride`. Die Überschreibung ersetzt Basis, Wachstum und Saison in genau diesem Monat. Eine geleerte Zelle nimmt die Überschreibung zurück, die Regel gilt wieder.
- Wachstum ab einem Monat setzt dort eine neue Basis und ein neues `wachstum`. Monate davor werden als Überschreibung eingefroren, damit sie stehen bleiben. Eine bisherige Saison entfällt ab dieser Änderung, damit die Rate exakt gilt. „Je Monat“ rechnet die Rate in die Jahresrate um: `(1 + Monatsrate)` hoch 12, minus 1, Modus `compound_monthly`. „Je Jahr“ speichert die Rate als `yearly_step`, der Wert springt alle zwölf Monate.
- `wachstum.eingabe` merkt sich die eingegebene Rate und ob sie je Monat oder je Jahr galt. Die Rechnung liest das Feld nicht. Sie verwendet `jahresrate` und `modus`.
- Saisonfaktoren ersetzen `saison.faktoren` für Januar bis Dezember und löschen die Überschreibungen der Zeile, damit die Formel wieder für alle Monate gilt.
- Einmalbeträge (Investition, Gründung, Anlauf, Einlage, Darlehensauszahlung, freie Zuschussmonate, Betriebsmittel) ändern den Betrag im bereits erfassten Monat. Der Monat wandert dadurch nicht.

Schema-Version ist 7. Version 6 wird beim Einlesen nur angehoben. Regeln und Überschreibungen bleiben unverändert. Das neue Feld ist optional.

## Rechtsformen

| Rechtsform        | Personen im Plan                                                                    | Was die spätere Steuerlogik unterscheiden muss                                | Was dafür schon erfasst wird                      |
| ----------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| Einzelunternehmen | genau eine Person, Rolle Inhaberin oder Inhaber                                     | Einkommensteuer, Gewerbesteuer, Privatentnahmen                               | Hebesatz, Lebensbedarf, Steuerprofil              |
| Freiberuf         | genau eine Person, Rolle Freiberufler                                               | Einkommensteuer, keine Gewerbesteuer, Privatentnahmen                         | Lebensbedarf, Steuerprofil, kein Hebesatz nötig   |
| GbR, OHG          | mindestens zwei Personen, nur als Gesellschafter                                    | Gewinn nach Anteilen, Einkommensteuer je Person, Gewerbesteuer mit Freibetrag | Anteile, Lebensbedarf je Person, Hebesatz         |
| KG                | mindestens eine komplementäre und eine kommanditistische Person, niemand ist beides | wie GbR, zuzüglich der Haftungsrollen                                         | Rollen, Anteile, Hebesatz                         |
| GmbH, UG          | mindestens eine gesellschafterische und eine geschäftsführende Rolle                | Körperschaftsteuer, Gewerbesteuer ohne Freibetrag, Gehalt als Betriebsausgabe | Stammkapital, Gehalt als Personalstelle, Hebesatz |

Die App prüft diese Form, nicht die rechtliche Richtigkeit der Berufswahl. Ob eine Tätigkeit wirklich freiberuflich ist, entscheidet die gründende Person mit der Beratung.

Messzahl, Freibetrag, Körperschaftsteuersatz und Solidaritätszuschlag sind keine Eingabefelder. Sie wären Gesetz und gehören in die spätere Rechnung.

## Szenarien

Es gibt die Basis und drei Fälle: Best Case, Real Case, Worst Case. Einer davon ist als aktive Ansicht markiert. „Basis“ als aktive Ansicht heißt: die eingegebenen Zahlen ohne Aufschlag.

Der Real Case startet ohne Anpassungen und ist damit gleich der Basis. Best und Worst tragen Faktoren.

Eine Anpassung ist:

- global: Faktor auf Umsatz, auf laufende Kosten, auf Gehälter, oder eine Kombination
- eine Umsatzlinie: Mengenfaktor, und bei Menge mal Preis zusätzlich ein Preisfaktor
- eine Kostenzeile: Faktor und optional ein fester Cent-Betrag obendrauf, auch negativ
- eine Personalstelle: Gehaltsfaktor

Ein liniengenauer Faktor ersetzt den globalen Faktor für diese Linie. Er wird nicht noch einmal mit dem globalen Faktor multipliziert. Je Linie und je Fall nur eine Anpassung, und nur ein globaler Block je Fall.

Neue Posten, die es nur im Worst Case gibt, kann ein Szenario nicht anlegen. Dafür müsste die Linie in der Basis stehen, im Real Case mit Faktor 1, und in den anderen Fällen mit 0 oder einem anderen Faktor.

## Was bewusst nicht im Plan steht

- keine gespeicherte GuV, keine gespeicherte Liquidität, kein gespeicherter Break-even. Die Berichte werden bei Bedarf gerechnet und nicht in den Plan geschrieben
- keine zweite, vollständig ausgeschriebene 36-Monats-Liste neben der Regel. Die Tabelle schreibt Überschreibungen, Wachstum und Saison in dieselben Felder
- keine Eingabe gesetzlicher Steuersätze und keine Sozialversicherungssätze. Die Steuersätze liegen im Parametersatz
- keine Benutzerkonten
- keine Branchen-Benchmarks, nur der Schlüssel, an den eine Vorlage sich später hängen kann

Plausibilitätsprüfungen, Kennzahlen, Grafiken, PDF und Excel lesen später diesen Datenbestand. Sie speichern ihre Ergebnisse nicht in den Plan zurück, damit eine geänderte Eingabe keine veraltete Kennzahl stehen lässt.

## Speicherung, Version, Ids

Der Plan ist ein JSON-Objekt. Geldbeträge sind ganze Euro-Cent, damit sich Rundungsfehler nicht in der Datei sammeln. Die Oberfläche zeigt später Euro. Sätze sind Dezimalzahlen: 0,19 ist 19 Prozent.

Jede Person, jede Investition, jede Linie und jede Szenario-Anpassung hat eine stabile Id. Querbezüge laufen über diese Ids, nicht über die Position in der Liste. Ids dürfen sich im Plan nicht wiederholen.

`schemaVersion` steht im Plan und ist derzeit 7. Version 1 wird beim Einlesen angehoben: Status „vollständig“, Vorsteuerabzug nach dem Umsatzsteuer-Regime, und der Parametersatz von 2026 wird eingesetzt, falls er fehlt. Ein Wareneinsatz als Monatsbetrag aus Version 1 lässt sich nicht automatisch umrechnen und wird abgelehnt. Version 2 verliert beim Einlesen die Sacheinlagen, die Nutzungsdauer an Sammelposten und den alten Schalter „sofort abzugsfähig“. Gründungs- und Anlaufkosten aus Version 2 werden Aufwand. Wer sie als Anlage führen will, markiert das danach neu. Version 3 erhält die Tarifformel, die Soli-Gleitzone und den Zahlungsmonat der Steuer des ersten Jahres. Fehlende Tarifwerte kommen aus dem Parametersatz de-2026, schon gespeicherte Freibeträge bleiben. Der Zahlungsmonat ist der September, wenn er noch nicht im Plan steht. Version 4 verliert den Schalter Progressionsvorbehalt. Version 5 ergänzt den manuellen Betriebsmittelbedarf. Fehlt er, wird er 0. Version 6 wird auf 7 angehoben. Dabei kommt kein Pflichtfeld dazu. Optional kann ein Wachstum seit Version 7 die eingegebene Rate unter `eingabe` merken.

Ein Plan hat den Status Entwurf oder vollständig. Der Entwurf darf ohne Rechtsform, ohne Person und ohne Startmonat gespeichert werden. Listen dürfen leer sein, Namen dürfen leer sein. Was schon ausgefüllt ist, muss trotzdem formal stimmen, zum Beispiel Ids, Cent-Beträge und die Grenzen einer verknüpften Darlehensvorlage. Erst der vollständige Plan verlangt Startmonat, Rechtsform, mindestens eine passende Person, Ort, Bundesland, Gründungsmonat, einen Zweck und die Summe der Anteile von 100 Prozent.

Der Parametersatz (`parameter`) wird bei der Anlage kopiert und bleibt im Plan, auch wenn sich Gesetz oder Förderkonditionen später ändern. Er enthält die Steuersätze, die Tarifformel nach § 32a EStG, die Freibeträge, die GWG-Grenzen und die Darlehensvorlagen. Der Kalendermonat, in dem die Steuer des ersten Jahres im Folgejahr gezahlt wird, steht daneben unter `steuerplanung` und ist kein Gesetzessatz. Standard ist der September. Die Oberfläche zeigt später Euro. Sätze sind Dezimalzahlen: 0,19 ist 19 Prozent.

## Festgelegte Entscheidungen

Die Fachberatung hat diese Punkte bestätigt. Sie sind so umgesetzt.

- Best Case und Worst Case bleiben Faktoren auf der Basis, bei Kosten zusätzlich ein Cent-Zuschlag. Der Real Case ohne Anpassung ist die Basis. Ein liniengenauer Faktor ersetzt den globalen.
- Monatswert = Basis mal Wachstum mal Saisonfaktor des Kalendermonats. Die Monatsausnahme ersetzt das Ergebnis. Standard ist die monatliche Aufzinsung, der Jahressprung bleibt als Alternative wählbar.
- Zahlungsziele werden auf ganze Monate gerundet, nicht taggenau.
- Darlehen laufen monatlich. Annuität und Ratentilgung sind beide vorgesehen. Keine Vierteljahresraten, keine kapitalisierten Zinsen.
- Nettobeträge sind der Normalfall, mit Vorsteuerabzug in der Regelbesteuerung. Die Zahllast ist Umsatzsteuer minus Vorsteuer, der Zahlungsmonat ist modelliert. Kleinunternehmer bleiben möglich.
- Steuersätze, Freibeträge, GWG-Grenzen und die TAB-Vorlage liegen als Parametersatz im Plan.
- Ein angefangener Assistent ist als Entwurf speicherbar.
- Keine degressive Abschreibung. GWG- und Sammelposten-Grenzen werden geprüft und bei Abweichung nur markiert. Ein Sammelposten läuft immer über 60 Monate. Beträge bis 250 Euro netto sind sofortiger Betriebsaufwand und keine Anlage.
- Gründungs- und Anlaufkosten sind Aufwand im Leistungsmonat, es sei denn, sie sind ausdrücklich als Anlage markiert. Sacheinlagen gibt es nicht.
- Gründungszuschuss, Lebensbedarf je Rechtsform und der Hebesatz als einzige Gewerbesteuer-Eingabe bleiben wie beschrieben.
- Wareneinsatz nur als Prozent vom Nettoumsatz.

## Offene Fragen an die Fachberatung

1. Erledigt: Die Tarifformel § 32a EStG 2026 liegt im Parametersatz. Die Rechnung steht in docs/steuern.md.
2. Erledigt: Der Solidaritätszuschlag hat die Freigrenze 20.350 Euro und die Gleitzone mit 11,9 Prozent. Beim Splitting gilt die doppelte Freigrenze. Die Kirchensteuer folgt dem Bundesland des Plans, 8 Prozent in Bayern und Baden-Württemberg, sonst 9 Prozent, oder keine, wenn die Person nicht kirchensteuerpflichtig ist.
3. Erledigt: Beträge bis 250,00 Euro netto sind sofortiger Betriebsaufwand und keine Anlage. Sammelposten werden fest über 60 Monate aufgelöst, ohne eigene Nutzungsdauer. GWG und Sammelposten dürfen sich zwischen 250,01 und 800 Euro weiter überschneiden. Außerhalb der Grenzen gibt es einen Hinweis, keine Sperre.
4. Der Zahlungsmonat der USt-Zahllast ist der Folgemonat bei monatlicher Voranmeldung und der Monat nach dem Quartalsende bei vierteljährlicher Voranmeldung, jeweils plus ein Monat bei Dauerfrist. Der 10. des Monats bleibt unberücksichtigt. Passt das?
5. Die Kleinunternehmergrenzen 25.000 und 100.000 Euro netto stehen im Parametersatz und sperren keinen Plan. Soll später eine Warnung kommen, wenn der geplante Umsatz die Grenze überschreitet?
6. Beim Thüringer Mikrodarlehen sind Betrag, Höchstlaufzeit und tilgungsfreie Zeit harte Grenzen der gespeicherten Vorlage. Sollzins, Tilgungsart, volle Auszahlung und fehlende Gebühren sind änderbare Vorgaben des einzelnen Darlehens. Der Effektivzins von 2,43 Prozent ist nicht gespeichert. Reicht der Sollzins für die Zinsrechnung, und braucht es ein Feld für Sondertilgungen?
