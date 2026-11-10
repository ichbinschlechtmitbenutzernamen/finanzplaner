# Datenmodell des Finanzplans

Dieser Text erklärt, welche Angaben eine gründende Person macht und wie sie im Plan zusammenhängen. Er ist für die fachliche Prüfung gedacht, nicht als Bedienungsanleitung. Die App rechnet in diesem Schritt noch nichts. Sie merkt sich nur die Eingaben, prüft, ob sie zusammenpassen, und kann sie als JSON-Datei speichern und wieder einlesen.

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

| Eingabe                                                                                                         | Später in der GuV                  | Später nur Liquidität und Bestand                 |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Umsatzlinien, netto                                                                                             | Umsatzerlöse                       | Zahlung später, je nach Zahlungsziel              |
| Wareneinsatz                                                                                                    | Material- und Wareneinsatz         | wie oben                                          |
| Personal inklusive Geschäftsführergehalt und Arbeitgeberanteil                                                  | Personalaufwand                    | Lohnzahlung im Monat                              |
| Abschreibung der Investitionen                                                                                  | Abschreibungen                     | die Anschaffung selbst ist Ausgabe, nicht Aufwand |
| GWG-Sofortabschreibung, sofort abzugsfähige Gründungs- und Anlaufkosten, laufende Kosten abzüglich Privatanteil | sonstige betriebliche Aufwendungen | Zahlung je nach Zahlungsziel                      |
| steuerpflichtige Zuschüsse                                                                                      | sonstige betriebliche Erträge      | Zufluss                                           |
| Zinsen                                                                                                          | Zinsaufwand                        | Zinszahlung                                       |
| Tilgung, Eigenkapital, Liquiditätsreserve                                                                       | nein                               | ja                                                |
| steuerfreie Zuschüsse, darunter der Gründungszuschuss                                                           | nein                               | ja, Zufluss                                       |
| privater Lebensbedarf bei Personenunternehmen                                                                   | nein                               | ja, Entnahme                                      |

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
- Sammelposten: Nutzungsdauer ist eine Eingabe. Zulässig von 250,01 bis 1.000 Euro netto, ebenfalls laut Parametersatz. Außerhalb dieser Spanne gibt es einen Hinweis, keine Sperre. Im Bereich 250,01 bis 800 Euro sind Sofort-GWG und Sammelposten beide zulässig. Lineare Abschreibung ist immer zulässig und wird nicht bemängelt.

Ein Restwert ist optional. Fehlt er, schreibt die spätere Rechnung auf null ab. Degressive Abschreibung gibt es im Modell nicht.

### Gründungskosten und Anlaufkosten

Einmalbeträge mit Monat, Umsatzsteuersatz, Zahlungsziel und dem Vermerk, ob sie sofort Betriebsausgabe sind. Beispiele: Gewerbeanmeldung, Beratung, Startkampagne. Die Liste entscheidet, ob es Gründung oder Anlauf ist.

### Betriebsmittel

Ein Betrag für die Liquiditätsreserve zu Beginn. Das ist kein Aufwand, sondern Geld, das als Puffer im Kapitalbedarf steht. Optional ein Waren-Erstbestand netto samt Umsatzsteuersatz. Der laufende Wareneinsatz steht bei den Umsatzlinien, nicht hier.

## Finanzierung

### Eigenkapital

Mehrere Posten, je mit Betrag, Monat und Art: Bareinlage, Sacheinlage oder Kapitalrücklage. Eine Sacheinlage kann auf eine Investition zeigen, muss es aber nicht. Der Posten kann einer Person zugeordnet werden. Eine Einlage von außen, ohne Person im Plan, ist ebenfalls möglich.

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

Jeder Zuschuss hat zwei Schalter: steuerfrei ja oder nein, und Progressionsvorbehalt ja oder nein. Der Gründungszuschuss im Beispiel steht auf steuerfrei und auf Progressionsvorbehalt. Eine freie Leistung kann anders markiert werden. Die App entscheidet das nicht selbst.

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

- keine fertige GuV, keine Liquidität, kein Break-even, keine Diagrammdaten
- keine 36 ausgeschriebenen Monatsspalten neben der Regel
- keine gesetzlichen Steuersätze und keine Sozialversicherungssätze
- keine Benutzerkonten
- keine Branchen-Benchmarks, nur der Schlüssel, an den eine Vorlage sich später hängen kann

Plausibilitätsprüfungen, Kennzahlen, Grafiken, PDF und Excel lesen später diesen Datenbestand. Sie speichern ihre Ergebnisse nicht in den Plan zurück, damit eine geänderte Eingabe keine veraltete Kennzahl stehen lässt.

## Speicherung, Version, Ids

Der Plan ist ein JSON-Objekt. Geldbeträge sind ganze Euro-Cent, damit sich Rundungsfehler nicht in der Datei sammeln. Die Oberfläche zeigt später Euro. Sätze sind Dezimalzahlen: 0,19 ist 19 Prozent.

Jede Person, jede Investition, jede Linie und jede Szenario-Anpassung hat eine stabile Id. Querbezüge laufen über diese Ids, nicht über die Position in der Liste. Ids dürfen sich im Plan nicht wiederholen.

`schemaVersion` steht im Plan und ist derzeit 2. Version 1 wird beim Einlesen angehoben: Status „vollständig“, Vorsteuerabzug nach dem Umsatzsteuer-Regime, und der Parametersatz von 2026 wird eingesetzt, falls er fehlt. Ein Wareneinsatz als Monatsbetrag aus Version 1 lässt sich nicht automatisch umrechnen und wird abgelehnt.

Ein Plan hat den Status Entwurf oder vollständig. Der Entwurf darf ohne Rechtsform, ohne Person und ohne Startmonat gespeichert werden. Listen dürfen leer sein, Namen dürfen leer sein. Was schon ausgefüllt ist, muss trotzdem formal stimmen, zum Beispiel Ids, Cent-Beträge und die Grenzen einer verknüpften Darlehensvorlage. Erst der vollständige Plan verlangt Startmonat, Rechtsform, mindestens eine passende Person, Ort, Bundesland, Gründungsmonat, einen Zweck und die Summe der Anteile von 100 Prozent.

Der Parametersatz (`parameter`) wird bei der Anlage kopiert und bleibt im Plan, auch wenn sich Gesetz oder Förderkonditionen später ändern. Er enthält die Steuersätze und Freibeträge, die GWG-Grenzen und die Darlehensvorlagen. Die Oberfläche zeigt später Euro. Sätze sind Dezimalzahlen: 0,19 ist 19 Prozent.

## Festgelegte Entscheidungen

Die Fachberatung hat diese Punkte bestätigt. Sie sind so umgesetzt.

- Best Case und Worst Case bleiben Faktoren auf der Basis, bei Kosten zusätzlich ein Cent-Zuschlag. Der Real Case ohne Anpassung ist die Basis. Ein liniengenauer Faktor ersetzt den globalen.
- Monatswert = Basis mal Wachstum mal Saisonfaktor des Kalendermonats. Die Monatsausnahme ersetzt das Ergebnis. Standard ist die monatliche Aufzinsung, der Jahressprung bleibt als Alternative wählbar.
- Zahlungsziele werden auf ganze Monate gerundet, nicht taggenau.
- Darlehen laufen monatlich. Annuität und Ratentilgung sind beide vorgesehen. Keine Vierteljahresraten, keine kapitalisierten Zinsen.
- Nettobeträge sind der Normalfall, mit Vorsteuerabzug in der Regelbesteuerung. Die Zahllast ist Umsatzsteuer minus Vorsteuer, der Zahlungsmonat ist modelliert. Kleinunternehmer bleiben möglich.
- Steuersätze, Freibeträge, GWG-Grenzen und die TAB-Vorlage liegen als Parametersatz im Plan.
- Ein angefangener Assistent ist als Entwurf speicherbar.
- Keine degressive Abschreibung. GWG- und Sammelposten-Grenzen werden geprüft und bei Abweichung nur markiert.
- Gründungszuschuss, Lebensbedarf je Rechtsform und der Hebesatz als einzige Gewerbesteuer-Eingabe bleiben wie beschrieben.
- Wareneinsatz nur als Prozent vom Nettoumsatz.

## Offene Fragen an die Fachberatung

1. Die progressive Einkommensteuer-Formel nach § 32a EStG (Zonengrenzen und Koeffizienten für 2026) liegt nicht im Parametersatz. Gespeichert sind Grundfreibetrag 12.348 Euro, Kinderfreibetrag 3.414 Euro und BEA-Freibetrag 1.464 Euro je Elternteil sowie die Sätze 42 und 45 Prozent. Soll die vollständige Tarifformel ergänzt werden?
2. Beim Solidaritätszuschlag sind 5,5 Prozent und eine Freigrenze von 20.350 Euro auf die festgesetzte Einkommensteuer gespeichert. Die Gleitzone darüber fehlt. Bitte am aktuellen SolZG bestätigen. Die Kirchensteuer steht mit 8 Prozent für Bayern und Baden-Württemberg und 9 Prozent für die übrigen Länder im Parametersatz. Soll der Satz automatisch aus dem Bundesland folgen?
3. GWG bis 800 Euro netto und Sammelposten von 250,01 bis 1.000 Euro netto überschneiden sich. Beide sind im Überlapp erlaubt, gewarnt wird nur außerhalb. Beträge bis 250 Euro dürfen als Sofort-GWG erfasst werden. Soll darunter ein eigener Sofortaufwand ohne Anlage werden?
4. Der Zahlungsmonat der USt-Zahllast ist der Folgemonat bei monatlicher Voranmeldung und der Monat nach dem Quartalsende bei vierteljährlicher Voranmeldung, jeweils plus ein Monat bei Dauerfrist. Der 10. des Monats bleibt unberücksichtigt. Passt das?
5. Die Kleinunternehmergrenzen 25.000 und 100.000 Euro netto stehen im Parametersatz und sperren keinen Plan. Soll später eine Warnung kommen, wenn der geplante Umsatz die Grenze überschreitet?
6. Beim Thüringer Mikrodarlehen sind Betrag, Höchstlaufzeit und tilgungsfreie Zeit harte Grenzen der gespeicherten Vorlage. Sollzins, Tilgungsart, volle Auszahlung und fehlende Gebühren sind änderbare Vorgaben des einzelnen Darlehens. Der Effektivzins von 2,43 Prozent ist nicht gespeichert. Reicht der Sollzins für die Zinsrechnung, und braucht es ein Feld für Sondertilgungen?
