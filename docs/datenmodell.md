# Datenmodell des Finanzplans

Dieser Text erklärt, welche Angaben eine gründende Person macht und wie sie im Plan zusammenhängen. Er ist für die fachliche Prüfung gedacht, nicht als Bedienungsanleitung. Die App rechnet in diesem Schritt noch nichts. Sie merkt sich nur die Eingaben, prüft, ob sie zusammenpassen, und kann sie als JSON-Datei speichern und wieder einlesen.

Ein durchgängig erfundener Fall liegt im Projekt: Lina Bergmann, Einzelunternehmen „Studio Nordlicht“ in Leipzig, Grafik und Web. Der Plan ist als Beispiel markiert. Die Beträge sind nicht als Vorlage für einen Antrag gedacht.

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
- geringwertiges Wirtschaftsgut, sofort Aufwand: Nutzungsdauer 0. Eine Betragsgrenze prüft die App nicht, weil der Gesetzgeber sie ändert.
- Sammelposten: Nutzungsdauer ist eine Eingabe. Fünf Jahre, also 60 Monate, sind üblich, werden aber nicht erzwungen.

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

Raten sind monatlich. Vierteljährliche Raten gibt es nicht.

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

Der Wareneinsatz ist je Linie:

- keiner
- ein Prozentsatz vom Nettoumsatz, mit eigenem Vorsteuersatz
- ein eigener monatlicher Nettobetrag, ebenfalls mit Vorsteuersatz

Eine Quote über 100 Prozent ist zulässig, wenn unter den eigenen Kosten verkauft wird. Stücklisten und Lagerbewegungen je Artikel gibt es nicht.

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

## Umsatzsteuer

- Regelbesteuerung oder Kleinunternehmerregelung
- Soll- oder Ist-Versteuerung
- Voranmeldung monatlich oder vierteljährlich
- Dauerfristverlängerung ja oder nein

Bei Kleinunternehmern bleibt Soll oder Ist gespeichert, hat aber keine Wirkung. Es wird keine Umsatzsteuer auf die Erlöse gelegt und keine Vorsteuer abgezogen. Die Vorsteuer erhöht dann später die Anschaffungskosten. Deshalb bleiben Nettopreis und Steuersatz auch in diesem Fall getrennte Felder. Die Umsatzgrenzen der Kleinunternehmerregelung prüft die App nicht.

Die Erfolgsrechnung folgt dem Leistungsmonat. Die Liquidität verschiebt Ein- und Auszahlungen um das Zahlungsziel. Die Umsatzsteuer folgt Soll (mit der Leistung) oder Ist (mit dem Geld).

## Monatswerte: Basis, Wachstum, Saison, Ausnahme

Laufende Beträge und Mengen werden nicht als 36 einzelne Zahlen gespeichert. Gespeichert wird die Regel. Die Rechnung baut die Monate später daraus. So können sich Regel und Tabelle nicht widersprechen, und Assistent und Tabellenansicht ändern dieselben Felder.

Die Regel hat vier Teile. Jeder außer der Basis ist optional.

1. Basisbetrag in Cent, oder eine Basismenge. Der Bezugsmonat sagt, für welchen Monat dieser Wert gilt. Fehlt er, ist es der erste Planmonat.
2. Wachstum als Jahresrate. 0,05 bedeutet 5 Prozent pro Jahr, ein negativer Wert einen Rückgang. Zwei Spielarten: monatlich aufgezinst, oder einmal im Jahr sprunghaft und dazwischen konstant.
3. Saison: zwölf Faktoren für Januar bis Dezember, nicht für „Monat 1 bis 12 des Plans“. 1 ist neutral, 0 ist ein geschlossener Monat. Der Durchschnitt muss nicht 1 sein. Wer den April-Faktor auf 1,2 setzt, hebt jeden April an, auch wenn der Plan im April startet.
4. Ausnahmen je Monat. Sie ersetzen den fertigen Monatswert. Wachstum und Saison werden in diesem Monat nicht zusätzlich angewendet.

Die vorgesehene Formel, noch nicht programmiert:

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

`schemaVersion` steht im Plan und ist derzeit 1. Eine ältere Datei läuft durch eine Migrationskette, bevor sie geprüft wird. Die Kette ist der Haken für spätere Änderungen. In diesem Schritt gibt es noch keine Altversion, der Haken ist aber die einzige Tür: Import liest JSON, migriert, prüft. Export prüft und schreibt JSON. Beides funktioniert im Browser, ohne Server.

Ein Plan, der die Prüfung nicht besteht, wird nicht exportiert. Leer dürfen die Listen sein (noch kein Umsatz, noch kein Darlehen). Nicht leer bleiben Rechtsform, mindestens eine Person, Startmonat, Umsatzsteuer-Einstellungen und die drei Szenarien mit Namen. Ein halb ausgefüllter Assistentenschritt ist damit noch kein speicherbarer Plan.

## Annahmen, die schon im Modell stecken

Bitte gegenlesen. Was davon falsch ist, sollte vor der Rechenlogik geändert werden.

- Der Horizont ist fest 36 Monate. Buchungsmonate (Kauf, Rate, Umsatz, Gehalt, Ausnahme) müssen darin liegen. Der Gründungsmonat darf außerhalb liegen, er ist eine Angabe, kein Buchungssatz.
- Es gibt keine Anfangsbestände eines schon laufenden Betriebs. Die Kasse entsteht aus den erfassten Einlagen, Darlehen und Zuschüssen.
- Netto und Umsatzsteuersatz statt Brutto. Die Vorsteuer-Vorfinanzierung ist Liquidität, keine zweite Ausgabe im Kapitalbedarf.
- Kreditregeln wie im Abschnitt Finanzierung: erste Rate im Folgemonat, Annuität auf die Zeit nach der Freizeit, Zins in der Freizeit nur Zahlung oder Erlass, Tranchen ohne neuen Zeitplan, nur Monatsraten.
- GuV im Leistungsmonat, Geldfluss um das Zahlungsziel verschoben, Umsatzsteuer nach Soll oder Ist.
- Saisonfaktoren gelten für Kalendermonate. Eine Monatsausnahme gewinnt gegen Wachstum und Saison.
- Der Real Case ohne Anpassungen ist die Basis. Spezifische Faktoren ersetzen globale.
- Geschäftsführergehalt ist Personal. Lebensbedarf ist bei Personenunternehmen Entnahme und bei Kapitalgesellschaften nur der Vergleich mit dem Gehalt.
- Lohnnebenkosten, Hebesatz und die Phasen des Gründungszuschusses gibt die gründende Person ein. Die App hinterlegt dafür keine aktuellen Gesetzeswerte.
- Privatanteil ist der nicht abziehbare Teil.

## Offene Fragen an die Fachberatung

1. Soll der Real Case die Basis bleiben, also dieselben Zahlen ohne eigenen Faktor, und reichen Faktoren plus ein Cent-Zuschlag bei Kosten für Best und Worst? Oder muss ein Fall eigene Posten enthalten können, die in den anderen Fällen fehlen?
2. Stimmt die Formel „Basis, dann Wachstum, dann Saisonfaktor des Kalendermonats, Monatsausnahme ersetzt alles“? Und ist die monatliche Aufzinsung der Standard, der Jahressprung nur die Alternative?
3. Reicht es, Zahlungsziele später auf ganze Monate zu legen (bis 14 Tage im selben Monat, danach grob je 30 Tage ein weiterer Monat)? Oder muss die Liquidität taggenau sein?
4. Trägt die Kreditlogik die Fälle aus der Beratung, insbesondere KfW? Gemeint sind: erste Rate im Monat nach der ersten Auszahlung, Annuität erst nach der tilgungsfreien Zeit, Zins in der Freizeit entweder Zahlung oder Erlass. Kapitalisierte oder nur gestundete Zinsen und Vierteljahresraten kann das Modell nicht.
5. Sollen Steuersätze und Freibeträge später mit im Plan stehen, damit eine bei der Bank abgegebene Fassung sich nicht ändert, wenn das Recht sich ändert? Oder gilt immer das Recht am Tag der Auswertung?
6. Sollen gründende Personen Beträge später in Euro brutto sehen, während der Plan netto speichert? In vielen Kapitalbedarfsbögen steht der Bruttobetrag, weil die Vorsteuer bis zur Erstattung fehlt.
7. Muss ein angefangener Assistent schon gespeichert werden können, bevor Rechtsform, Person und Startmonat feststehen? Dafür bräuchte es ein zweites, lockereres Format neben dem geprüften Plan.
8. Reichen lineare Abschreibung, Sofortabschreibung als geringwertiges Wirtschaftsgut und Sammelposten mit frei eingegebener Nutzungsdauer? Die gesetzlichen Betragsgrenzen prüfen wir nicht. Degressive Abschreibung fehlt.
9. Reicht die Abbildung des Gründungszuschusses (ALG I plus Pauschale, optionale zweite Phase nur Pauschale, abweichende Bescheide als freie Monatsliste)? Bitte auch die beiden Schalter prüfen: steuerfrei und trotzdem Progressionsvorbehalt. EXIST läuft über die freie Liste mit eigenem Programmkennzeichen.
10. Ist die Trennung richtig, dass der Lebensbedarf bei GmbH und UG nicht in die GuV gehört, sondern nur zeigt, ob das Geschäftsführergehalt den Unterhalt trägt? Und dass er bei Einzelunternehmen und Personengesellschaften Entnahme ist, keine Betriebsausgabe?
11. Genügt der Hebesatz als einzige Gewerbesteuer-Eingabe (460 = 460 Prozent)? Messzahl und Freibetrag wären Gesetz. Die Abgrenzung Freiberuf oder Gewerbe trifft die gründende Person, nicht die App.
12. Genügen Wareneinsatz als Prozent vom Nettoumsatz oder als Monatsbetrag für die Zielgruppe, einschließlich kleinem Handel? Stücklisten und die Übernahme schon vorhandener Kontostände sind nicht vorgesehen.
