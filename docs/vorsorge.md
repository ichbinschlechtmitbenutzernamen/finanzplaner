# Private Blöcke und Sozialversicherung

Dieser Text beschreibt die privaten Kostenblöcke und den gerechneten Block Abgaben und Steuern. Er ist für die fachliche Prüfung gedacht. Die Beträge bleiben Eingaben oder werden aus dem Plan gerechnet. Sie werden nicht zurück in den Plan geschrieben, außer die Annahmen unter `sozialversicherung`.

## Blöcke 1 bis 5

Die Beträge sind Monatsbeträge in Cent. Jeder Block hat einen Faktor für Planjahr 2 und einen für Planjahr 3. Planjahr 1 ist der Gründungsmonat und die elf Monate danach. Der Faktor 1 lässt den Monatsbetrag unverändert. Ein eigener Posten ist frei benennbar und löschbar. Ein eigener Block trägt den Schlüssel `eigen`, hat eigene Posten und ist löschbar. Die fünf Standardblöcke bleiben im Assistenten stehen, einzelne Posten darin dürfen entfernt werden.

Der Monatsbetrag eines Postens im Planmonat ist der Wert aus Basis, Wachstum, Saison und Monatsausnahme, multipliziert mit dem Faktor des Planjahres, auf ganze Cent gerundet.

## Block 6

Block 6 ist keine Eingabe. Er wird aus dem Plan gerechnet und lässt sich nicht überschreiben.

Die Bemessung ist der durchschnittliche monatliche Gewinnanteil des Kalenderjahres. Ein Rumpfjahr wird nicht auf zwölf Monate hochgerechnet, es zählt der Durchschnitt der vorhandenen Monate. Liegt für die Person ein Geschäftsführergehalt, ist dieses Brutto einschließlich Sonderzahlungen die Bemessung, Monat für Monat.

Die Beiträge hängen nicht von der Einkommensteuer ab. Die Rücklage hängt von der Steuer ab, nachdem die Beiträge abgezogen sind. Eine Schleife gibt es nicht: die Bemessung ist der Gewinn vor Sonderausgaben, und die Rücklage ist kein weiterer Abzug. Die Kirchensteuer bleibt wie bisher keine Sonderausgabe.

### Werte 2026

Quellen: GKV-Spitzenverband, Rechengrößen und Grenzwerte im Versicherungs- und Beitragsrecht für 2026, Stand 1. Januar 2026; Verordnung über die maßgebenden Rechengrößen der Sozialversicherung für 2026 (SVBezGrV 2026); Bundesministerium für Gesundheit, Beiträge der gesetzlichen Krankenversicherung, Stand 2026; Deutsche Rentenversicherung, Werte der Rentenversicherung 2026; Bundesagentur für Arbeit, Hinweise zum Versicherungspflichtverhältnis auf Antrag, Beitragshöhe 2026; § 345b SGB III; § 10 EStG.

| Größe                                                      | 2026              |
| ---------------------------------------------------------- | ----------------- |
| Bezugsgröße monatlich                                      | 3.955,00 €        |
| Mindestbemessung freiwillige Krankenversicherung           | 1.318,33 €        |
| Beitragsbemessungsgrenze Kranken- und Pflegeversicherung   | 5.812,50 €        |
| Beitragsbemessungsgrenze allgemeine Rentenversicherung     | 8.450,00 €        |
| Mindestbemessung Rentenversicherung                        | 603,00 €          |
| Allgemeiner Beitragssatz Krankenversicherung               | 14,6 %            |
| Ermäßigter Beitragssatz ohne Krankengeld                   | 14,0 %            |
| Durchschnittlicher Zusatzbeitrag                           | 2,9 %             |
| Pflegeversicherung                                         | 3,6 %             |
| Kinderlosenzuschlag                                        | 0,6 Prozentpunkte |
| Beitragssatz Rentenversicherung                            | 18,6 %            |
| Beitragssatz Arbeitslosenversicherung                      | 2,6 %             |
| Höchstbetrag Altersvorsorgeaufwendungen, Einzelveranlagung | 30.826 €          |
| Höchstbetrag sonstige Vorsorgeaufwendungen, Selbständige   | 2.800 €           |

Der Zusatzbeitrag ist der durchschnittliche Satz. Die eigene Kasse kann abweichen. Selbständige tragen den vollen Satz, also beide Anteilshälften, und den vollen Zusatzbeitrag. Mit Krankengeld gilt 17,5 Prozent, ohne Krankengeld 16,9 Prozent. Die Pflegeversicherung ist 3,6 Prozent mit Kindern und 4,2 Prozent ohne Kinder. Das Alter unter 23 und der Abschlag ab dem zweiten Kind sind nicht abgebildet. Sachsen spielt für Selbständige keine Rolle, weil es keinen Arbeitgeberanteil gibt.

Der private Monatsbeitrag ersetzt Kranken- und Pflegeversicherung gemeinsam. Er wird nicht auf die Mindest- oder Höchstbemessung begrenzt und gilt in der Steuer als Basisabsicherung. Eine Aufteilung in Basis- und Wahlleistungen gibt es nicht.

Die freiwillige Rentenversicherung nimmt den Regelbeitrag, also 18,6 Prozent der Bezugsgröße, 735,63 Euro im Monat. Die Pflichtversicherung rechnet einkommensgerecht zwischen 603 Euro und 8.450 Euro. Der halbe Regelbeitrag der ersten drei Jahre ist nicht automatisch angesetzt.

Die Arbeitslosenversicherung auf Antrag rechnet 2,6 Prozent der Bezugsgröße, 102,83 Euro. Nach § 345b SGB III gilt im Kalenderjahr der Aufnahme der Tätigkeit und im folgenden Kalenderjahr die halbe Bezugsgröße, 51,42 Euro.

### Steuerabzug

Der bestehende Steuerkern zieht die Vorsorge ab, bevor er den Tarif anwendet. Kranken- und Pflegeversicherung sind in voller Höhe abziehbar. Die Rentenversicherung ist bis 30.826 Euro abziehbar, beim Splitting das Doppelte. Die Arbeitslosenversicherung fällt unter die sonstigen Vorsorgeaufwendungen mit 2.800 Euro, vermindert um die schon abgezogene Basis-Kranken- und Pflegeversicherung. Liegt die darüber, bleibt für die Arbeitslosenversicherung kein Abzug. Der Sonderausgaben-Pauschbetrag bleibt unberücksichtigt.

### Tragfähigkeit und Liquidität

Das verfügbare Einkommen ist der Gewinnanteil nach der festgesetzten Steuer, minus die Blöcke 1 bis 5, minus Kranken-, Pflege-, Renten- und Arbeitslosenversicherung. Die Einkommensteuerrücklage steht in Block 6, wird aber nicht noch einmal abgezogen. Sie ist das monatliche Zwölftel aus Einkommensteuer, Solidaritätszuschlag und Kirchensteuer. Die Gewerbesteuer bleibt in der Zeile Steuern, weil sie keine private Rücklage ist.

In der Liquidität sind die Blöcke 1 bis 5 und die Beiträge Auszahlungen. Die Rücklage mindert den Kontostand nicht. Die festgesetzte Steuer geht weiter zu ihren Terminen. Bei GmbH und UG gibt es keine Entnahme. Der Lebensbedarf bleibt dort ein Vergleichswert. Ist ein Geschäftsführergehalt geplant, bemisst Block 6 dieses Gehalt.

## Migration von Schema 13

| Bisher                                     | Neu                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lebenshaltung                              | Block Lebenshaltung, Posten Lebensmittel/Kleidung/Drogerie/Apotheke. Die alte Pauschale bündelte Wohnen, Essen und Alltag und lässt sich nicht aufteilen. |
| Altersvorsorge                             | Block Sonstige Versicherungen, Posten Altersvorsorge privat                                                                                               |
| Sonstige Versicherungen                    | Block Sonstige Versicherungen, Posten Andere Versicherungen                                                                                               |
| Krankenversicherung und Pflegeversicherung | entfallen als Eingabe. Block 6 rechnet sie. Die alten Beträge werden nicht übernommen.                                                                    |
| Faktoren                                   | 1,00 und 1,00                                                                                                                                             |
| Sozialversicherung                         | gesetzlich, mit Krankengeld, Kinder wenn Kinderfreibeträge größer als 0 sind, Rentenversicherung nein, Arbeitslosenversicherung nein                      |

So wird eine alte private Altersvorsorge nicht zusätzlich als gesetzliche Rente gezählt.

## Monatsfaktor

Der Monats- oder Saisonfaktor hat keine Obergrenze. Er muss mindestens 0 sein und darf Dezimalstellen haben. 1 lässt einen Monatsbetrag unverändert. Ein Handwerker kann 60 Euro je Stunde als Startwert setzen und 80 sowie 120 als Faktor, also als Stunden. Dieselbe Grenze ist im Schema, in den Eingabehilfen, im Assistenten, in den Szenarien und in Excel entfernt. Ein großer Faktor ist ein Hinweis, kein Fehler.
