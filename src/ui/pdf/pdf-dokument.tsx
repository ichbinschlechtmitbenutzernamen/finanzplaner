import React from "react";
import { Document, Page, Text, View, pdf, renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";

// Das Beispielskript übersetzt JSX mit dem klassischen Laufzeitsystem.
void React;
import { PDF_KAPITEL_LABEL } from "../../domain/pdf/kapitel.ts";
import type { PdfDokument, PdfSzenarioAbschnitt } from "../../domain/pdf/modell.ts";
import { KOSTEN_ZEILEN } from "../../domain/reports/diagramme.ts";
import { findeZeile } from "../../domain/reports/planjahr.ts";
import type { Berichte } from "../../domain/reports/typen.ts";
import type { ExportSzenarioVergleich } from "../../domain/szenarien/vergleich.ts";
import type { PdfKapitelId } from "../../domain/types.ts";
import { DiagrammSeitenInhalt } from "./pdf-diagramme.tsx";
import { stil } from "./pdf-stil.ts";
import { EinfacheTabelle, JahresTabelle, MonatsTabelle } from "./pdf-tabelle.tsx";
import { ausBestand, ausBewegung, ausPosten, nurDiese, type ZellenZeile } from "./zeilen.ts";
import {
  artText,
  datumText,
  deckungText,
  euro,
  euroZahl,
  faktor,
  monatLang,
  personenUeberschrift,
  prozent,
  rechtsformText,
  rollenText,
} from "./zahlen.ts";

interface Rahmen {
  dokument: PdfDokument;
  seiten: Record<string, number>;
  /** Schreibt die Seitenzahl eines Ankers. Im zweiten Durchlauf null. */
  merken: ((id: string, seite: number) => void) | null;
}

const STEUER_ZAHLUNGEN = [
  "einzahlung-ust",
  "einzahlung-est",
  "einzahlung-gewst",
  "einzahlung-kst",
  "auszahlung-ust",
  "auszahlung-est",
  "auszahlung-gewst",
  "auszahlung-kst",
] as const;

const MONATS_HINWEIS =
  "Beträge in Euro. Bewegungen sind in der Jahresspalte summiert. Anfangsbestände zeigen den Stand am Anfang des Planjahres, andere Bestände den Stand am Ende.";

function Anker({ id, rahmen }: { id: string; rahmen: Rahmen }) {
  return (
    <Text
      style={{ fontSize: 1, lineHeight: 1 }}
      render={({ pageNumber }) => {
        if (pageNumber > 0) rahmen.merken?.(id, pageNumber);
        return "";
      }}
    />
  );
}

function Blatt({
  kopf,
  quer = false,
  children,
}: {
  kopf: string;
  quer?: boolean;
  children: ReactNode;
}) {
  return (
    <Page
      size="A4"
      orientation={quer ? "landscape" : "portrait"}
      style={quer ? stil.seiteQuer : stil.seite}
    >
      <Text fixed style={quer ? stil.kopfQuer : stil.kopf}>
        {kopf}
      </Text>
      <Text
        fixed
        style={quer ? stil.fussQuer : stil.fuss}
        render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
      />
      {children}
    </Page>
  );
}

function inhaltEintraege(dokument: PdfDokument): { id: string; titel: string }[] {
  const liste: { id: string; titel: string }[] = [];
  for (const abschnitt of dokument.szenarien) {
    for (const kapitel of abschnitt.kapitel) {
      liste.push({
        id: `${abschnitt.id}:${kapitel}`,
        titel: `${abschnitt.name} · ${PDF_KAPITEL_LABEL[kapitel]}`,
      });
    }
  }
  if (dokument.vergleich) {
    liste.push({ id: "vergleich", titel: PDF_KAPITEL_LABEL.vergleich });
  }
  return liste;
}

function Inhalt({ rahmen }: { rahmen: Rahmen }) {
  const eintraege = inhaltEintraege(rahmen.dokument);
  return (
    <Blatt kopf={`${rahmen.dokument.vorhaben} · Inhalt`}>
      <Text style={stil.h1}>Inhaltsverzeichnis</Text>
      <Text style={stil.meta}>
        {rahmen.dokument.vorhaben}, PDF vom {datumText(rahmen.dokument.erstelltAm)}
      </Text>
      {eintraege.length === 0 ? (
        <Text style={stil.absatz}>Keine Kapitel ausgewählt.</Text>
      ) : (
        eintraege.map((eintrag) => (
          <View key={eintrag.id} style={stil.tocZeile}>
            <Text style={stil.tocTitel}>{eintrag.titel}</Text>
            <Text style={stil.tocSeite}>
              {rahmen.seiten[eintrag.id] ? String(rahmen.seiten[eintrag.id]) : " "}
            </Text>
          </View>
        ))
      )}
    </Blatt>
  );
}

function kopfVon(dokument: PdfDokument, name: string): string {
  return `${dokument.vorhaben} · ${name}`;
}

function monatsSeiten(
  schluessel: string,
  titel: string,
  zeilen: readonly ZellenZeile[],
  berichte: Berichte,
  kopf: string,
  anker: string,
  rahmen: Rahmen,
): ReactElement[] {
  if (zeilen.length === 0) return [];
  return berichte.planjahre.map((jahr) => (
    <Blatt key={`${schluessel}-${jahr.nummer}`} quer kopf={kopf}>
      {jahr.nummer === 1 ? <Anker id={anker} rahmen={rahmen} /> : null}
      <Text style={stil.h1}>{titel}</Text>
      <Text style={stil.h2}>
        {jahr.bezeichnung}, {monatLang(jahr.vonMonat)} bis {monatLang(jahr.bisMonat)}
      </Text>
      <Text style={stil.legende}>{MONATS_HINWEIS}</Text>
      <MonatsTabelle zeilen={zeilen} monate={berichte.monate} jahr={jahr} />
    </Blatt>
  ));
}

function adresse(abschnitt: PdfSzenarioAbschnitt): string {
  const blatt = abschnitt.deckblatt;
  return [blatt.strasse, [blatt.plz, blatt.ort].filter(Boolean).join(" "), blatt.bundesland]
    .filter((teil) => teil && teil.trim())
    .join(", ");
}

function Deckblatt({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const blatt = abschnitt.deckblatt;
  const zeitraum =
    blatt.startMonat && blatt.letzterMonat
      ? `${monatLang(blatt.startMonat)} bis ${monatLang(blatt.letzterMonat)}`
      : "Zeitraum noch offen";
  return (
    <Blatt kopf={kopfVon(rahmen.dokument, abschnitt.name)}>
      <Anker id={`${abschnitt.id}:deckblatt`} rahmen={rahmen} />
      <Text style={stil.h1}>{blatt.firmenname || rahmen.dokument.vorhaben}</Text>
      <Text style={stil.h2}>
        {abschnitt.art === "basis"
          ? abschnitt.name
          : `${abschnitt.name} · ${artText(abschnitt.art)}`}
      </Text>
      {blatt.planName ? <Text style={stil.absatz}>{blatt.planName}</Text> : null}
      <Text style={stil.absatz}>Rechtsform: {rechtsformText(blatt.rechtsform)}</Text>
      <Text style={stil.absatz}>Zeitraum: {zeitraum}</Text>
      <Text style={stil.absatz}>Stand: {datumText(blatt.geaendertAm)}</Text>
      <Text style={stil.absatz}>PDF erstellt am {datumText(rahmen.dokument.erstelltAm)}</Text>
      {adresse(abschnitt) ? <Text style={stil.absatz}>{adresse(abschnitt)}</Text> : null}
      {blatt.branche ? <Text style={stil.absatz}>Branche: {blatt.branche}</Text> : null}
      {blatt.taetigkeit ? <Text style={stil.hinweis}>{blatt.taetigkeit}</Text> : null}
      <Text style={stil.h2}>{personenUeberschrift(blatt.rechtsform)}</Text>
      {blatt.personen.length === 0 ? (
        <Text style={stil.absatz}>Keine Person erfasst.</Text>
      ) : (
        blatt.personen.map((person, index) => (
          <Text key={`${person.name}-${index}`} style={stil.absatz}>
            {person.name} · {rollenText(person.rollen)} · Anteil {prozent(person.anteil)}
          </Text>
        ))
      )}
      {abschnitt.fehlerVermerk ? (
        <View style={stil.warnung}>
          <Text style={stil.warnungTitel}>Fehler im Plan</Text>
          <Text>{abschnitt.fehlerVermerk}</Text>
        </View>
      ) : null}
      {abschnitt.fehlerText ? (
        <View style={stil.warnung}>
          <Text style={stil.warnungTitel}>Rechnung fehlgeschlagen</Text>
          <Text>{abschnitt.fehlerText}</Text>
        </View>
      ) : null}
      {blatt.beispiel ? (
        <Text style={stil.hinweis}>
          Fiktiver Datensatz, nicht für einen echten Antrag. Dieses PDF wurde vollständig im Browser
          erzeugt. Die Plandaten haben das Gerät nicht verlassen.
        </Text>
      ) : (
        <Text style={stil.hinweis}>
          Dieses PDF wurde vollständig im Browser erzeugt. Die Plandaten haben das Gerät nicht
          verlassen.
        </Text>
      )}
    </Blatt>
  );
}

function Kennzahlen({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const kpis = abschnitt.kpis;
  const berichte = abschnitt.berichte;
  if (!kpis || !berichte) return null;
  const kopf = ["Kennzahl", ...kpis.planjahre.map((jahr) => jahr.bezeichnung), "Horizont"];
  const breiten = [160, ...kpis.planjahre.map(() => 90), 90];
  const zeilen = [
    [
      "Umsatz",
      ...kpis.planjahre.map((jahr) => euroZahl(jahr.umsatzCents)),
      euroZahl(kpis.gesamt.umsatzCents),
    ],
    [
      "Ergebnis nach Steuern",
      ...kpis.planjahre.map((jahr) => euroZahl(jahr.ergebnisNachSteuernCents)),
      euroZahl(kpis.gesamt.ergebnisNachSteuernCents),
    ],
    [
      "Rohertragsquote",
      ...kpis.planjahre.map((jahr) => prozent(jahr.rohertragsquote)),
      prozent(kpis.gesamt.rohertragsquote),
    ],
    [
      "Personalkostenquote",
      ...kpis.planjahre.map((jahr) => prozent(jahr.personalkostenquote)),
      prozent(kpis.gesamt.personalkostenquote),
    ],
  ];
  const bruch = kpis.breakEven;
  return (
    <Blatt key={`${abschnitt.id}-kenn`} kopf={kopfVon(rahmen.dokument, abschnitt.name)}>
      <Anker id={`${abschnitt.id}:kennzahlen`} rahmen={rahmen} />
      <Text style={stil.h1}>Kennzahlen im Überblick</Text>
      <Text style={stil.legende}>Beträge in Euro.</Text>
      <EinfacheTabelle kopf={kopf} zeilen={zeilen} breiten={breiten} />
      <Text style={stil.absatz}>
        Break-even:{" "}
        {bruch.erreicht && bruch.monat && bruch.planmonat
          ? `${monatLang(bruch.monat)} (Planmonat ${bruch.planmonat})`
          : "im Horizont nicht erreicht"}
      </Text>
      <Text style={stil.hinweis}>{bruch.definition}</Text>
      <Text style={stil.absatz}>
        Tiefster Kontostand {euro(kpis.tiefsterKontostandCents)}
        {kpis.tiefsterKontostandMonat ? ` im ${monatLang(kpis.tiefsterKontostandMonat)}` : ""}.
        Kontokorrentbedarf {euro(kpis.kontokorrentbedarfCents)}.
      </Text>
      <Text style={stil.absatz}>
        Eigenkapitalquote {prozent(kpis.eigenkapitalquote)}. Eigenmittel{" "}
        {euro(kpis.eigenmittelCents)}, Finanzierung {euro(kpis.finanzierungCents)}.
      </Text>
      <Text style={stil.h2}>Kapitaldienstfähigkeit</Text>
      {berichte.kennzahlen.kapitaldienstfaehigkeit.map((jahr) => (
        <Text key={jahr.planjahr} style={stil.absatz}>
          Planjahr {jahr.planjahr}: Cashflow {euro(jahr.cashflowCents)}, Kapitaldienst{" "}
          {euro(jahr.kapitaldienstCents)}, Quote {faktor(jahr.quote)}
        </Text>
      ))}
      <Text style={stil.h2}>Tragfähigkeit</Text>
      <Text style={stil.absatz}>{kpis.tragfaehigkeit.hinweis}</Text>
      {kpis.tragfaehigkeit.personen.map((person) => (
        <Text key={person.personId} style={stil.absatz}>
          {person.name}:{" "}
          {person.planjahr2Cents == null
            ? "ohne Bewertung"
            : `${euro(person.planjahr2Cents)} im Planjahr 2, ${person.tragfaehig ? "tragfähig" : "nicht tragfähig"}`}
        </Text>
      ))}
    </Blatt>
  );
}

function Kapital({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const zeilen = [
    ...berichte.kapital.bedarf.map((posten) => ausPosten(posten)),
    ausPosten(berichte.kapital.summeBedarf, "summe"),
    ...berichte.kapital.finanzierung.map((posten) => ausPosten(posten)),
    ausPosten(berichte.kapital.summeFinanzierung, "summe"),
    ausPosten(berichte.kapital.deckung, "ergebnis"),
  ];
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  return [
    <Blatt key={`${abschnitt.id}-kapital`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:kapital`} rahmen={rahmen} />
      <Text style={stil.h1}>Kapitalbedarf und Finanzierung</Text>
      <Text style={stil.absatz}>
        Deckung {euro(berichte.kapital.deckung.betragCents)} (
        {deckungText(berichte.kapital.deckungArt)}).
        {berichte.kapital.darlehenAbzugCents > 0
          ? ` Darlehen unter Nominal ${euro(berichte.kapital.darlehenAbzugCents)}.`
          : ""}
      </Text>
      <JahresTabelle zeilen={zeilen} jahre={berichte.planjahre} />
      <Text style={stil.hinweis}>{berichte.kapital.hinweis}</Text>
    </Blatt>,
  ];
}

function kapitalMonate(abschnitt: PdfSzenarioAbschnitt, rahmen: Rahmen): ReactElement[] {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const zeilen = [
    ...berichte.kapital.bedarf.map((posten) => ausPosten(posten)),
    ausPosten(berichte.kapital.summeBedarf, "summe"),
    ...berichte.kapital.finanzierung.map((posten) => ausPosten(posten)),
    ausPosten(berichte.kapital.summeFinanzierung, "summe"),
    ausPosten(berichte.kapital.deckung, "ergebnis"),
  ];
  return monatsSeiten(
    `${abschnitt.id}-kapital-monat`,
    "Kapitalbedarf und Finanzierung, Monate",
    zeilen,
    berichte,
    kopfVon(rahmen.dokument, abschnitt.name),
    `${abschnitt.id}:kapital-monate`,
    rahmen,
  );
}

function mitName(zeile: ZellenZeile | undefined, name: string): ZellenZeile | null {
  if (!zeile) return null;
  return { ...zeile, bezeichnung: name };
}

function erste(zeilen: ZellenZeile[]): ZellenZeile | undefined {
  return zeilen[0];
}

function Investitionen({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const anlagen = berichte.anlagen.positionen.map((position) => [
    `${position.bezeichnung}\n${position.kategorie}, ${position.methode}, ${position.behandlung}`,
    euroZahl(position.aktivierungCents),
    euroZahl(position.abschreibung.summeCents),
    euroZahl(position.buchwert.horizontWertCents),
    euroZahl(position.auszahlung.summeCents),
  ]);
  const darlehen = berichte.darlehen.darlehen.map((position) => [
    `${position.bezeichnung}\n${position.geber}, ${position.tilgungsart}, ${prozent(position.nominalzinsPa)}, ${position.laufzeitMonate} Monate`,
    euroZahl(position.nominalCents),
    euroZahl(position.zins.summeCents),
    euroZahl(position.tilgung.summeCents),
    euroZahl(position.restschuld.horizontWertCents),
  ]);
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  const afa = [
    ...berichte.anlagen.positionen.flatMap((position) => {
      const zeile = mitName(
        erste(ausBewegung([position.abschreibung], false)),
        position.bezeichnung,
      );
      return zeile ? [zeile] : [];
    }),
    ...ausBewegung([berichte.anlagen.summeAbschreibung], false),
  ];
  const raten = berichte.darlehen.darlehen.flatMap((position) =>
    [
      mitName(erste(ausBewegung([position.zins], false)), `${position.bezeichnung}: Zins`),
      mitName(erste(ausBewegung([position.tilgung], false)), `${position.bezeichnung}: Tilgung`),
      mitName(erste(ausBewegung([position.rate], false)), `${position.bezeichnung}: Rate`),
      mitName(ausBestand(position.restschuld), `${position.bezeichnung}: Restschuld`),
    ].flatMap((zeile) => (zeile ? [zeile] : [])),
  );
  return [
    <Blatt key={`${abschnitt.id}-invest`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:investitionen`} rahmen={rahmen} />
      <Text style={stil.h1}>Investitionen und Abschreibungen</Text>
      {anlagen.length === 0 ? (
        <Text style={stil.absatz}>Keine Investitionen erfasst.</Text>
      ) : (
        <EinfacheTabelle
          kopf={["Anlage", "Aktivierung", "AfA Summe", "Buchwert Ende", "Auszahlung"]}
          zeilen={anlagen}
          breiten={[200, 80, 80, 80, 80]}
        />
      )}
      <Text style={stil.h2}>Darlehen</Text>
      {darlehen.length === 0 ? (
        <Text style={stil.absatz}>Keine Darlehen erfasst.</Text>
      ) : (
        <EinfacheTabelle
          kopf={["Darlehen", "Nominal", "Zins Summe", "Tilgung Summe", "Restschuld"]}
          zeilen={darlehen}
          breiten={[200, 80, 80, 80, 80]}
        />
      )}
      <Text style={stil.hinweis}>{berichte.darlehen.hinweis}</Text>
    </Blatt>,
    ...monatsSeiten(
      `${abschnitt.id}-afa`,
      "Abschreibungen, Monate",
      afa,
      berichte,
      kopf,
      `${abschnitt.id}:investitionen-afa`,
      rahmen,
    ),
    ...monatsSeiten(
      `${abschnitt.id}-raten`,
      "Darlehen, Monate",
      raten,
      berichte,
      kopf,
      `${abschnitt.id}:investitionen-darlehen`,
      rahmen,
    ),
  ];
}

function summeKosten(abschnitt: PdfSzenarioAbschnitt): ZellenZeile | null {
  const diagramme = abschnitt.diagramme;
  if (!diagramme) return null;
  return {
    bezeichnung: "Summe Kosten",
    monateCents: diagramme.umsatzGegenKosten.map((punkt) => punkt.kostenCents),
    planjahreCents: diagramme.umsatzGegenKostenPlanjahre.map((punkt) => punkt.kostenCents),
    summeCents: diagramme.umsatzGegenKosten.reduce((summe, punkt) => summe + punkt.kostenCents, 0),
    rolle: "summe",
    bestand: false,
    einzug: false,
  };
}

function Umsatz({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const kosten = summeKosten(abschnitt);
  const gewaehlt = [
    findeZeile(berichte.rentabilitaet.zeilen, "umsatz"),
    ...KOSTEN_ZEILEN.map((id) => findeZeile(berichte.rentabilitaet.zeilen, id)),
  ];
  const ergebnis = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
  const zeilen = [
    ...ausBewegung(gewaehlt, false),
    ...(kosten ? [kosten] : []),
    ...ausBewegung([ergebnis], false),
  ];
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  return [
    <Blatt key={`${abschnitt.id}-umsatz`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:umsatz`} rahmen={rahmen} />
      <Text style={stil.h1}>Umsatz und Kosten</Text>
      <Text style={stil.legende}>
        Beträge in Euro. Die Summe der Kosten ist dieselbe Reihe wie im Diagramm Umsatz gegen
        Kosten.
      </Text>
      <JahresTabelle zeilen={zeilen} jahre={berichte.planjahre} />
    </Blatt>,
    ...monatsSeiten(
      `${abschnitt.id}-umsatz-monat`,
      "Umsatz und Kosten, Monate",
      zeilen,
      berichte,
      kopf,
      `${abschnitt.id}:umsatz-monate`,
      rahmen,
    ),
  ];
}

function Rentabilitaet({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const zeilen = ausBewegung(berichte.rentabilitaet.zeilen, true);
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  return [
    <Blatt key={`${abschnitt.id}-rent`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:rentabilitaet`} rahmen={rahmen} />
      <Text style={stil.h1}>Rentabilität</Text>
      <JahresTabelle zeilen={zeilen} jahre={berichte.planjahre} />
      <Text style={stil.hinweis}>{berichte.rentabilitaet.hinweis}</Text>
    </Blatt>,
    ...monatsSeiten(
      `${abschnitt.id}-rent-monat`,
      "Rentabilität, Monate",
      zeilen,
      berichte,
      kopf,
      `${abschnitt.id}:rentabilitaet-monate`,
      rahmen,
    ),
  ];
}

function Liquiditaet({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const plan = berichte.liquiditaet;
  const zeilen = [
    ausBestand(plan.anfangsbestand),
    ...ausBewegung([plan.einzahlungen], true),
    ...ausBewegung([plan.auszahlungen], true),
    ausBestand(plan.endbestand),
    ...ausBewegung([plan.steuerruecklage], false),
    ausBestand(plan.steuerruecklageKumuliert),
  ];
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  return [
    <Blatt key={`${abschnitt.id}-liq`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:liquiditaet`} rahmen={rahmen} />
      <Text style={stil.h1}>Liquidität</Text>
      <Text style={stil.absatz}>
        Tiefster Kontostand {euro(plan.tiefsterKontostandCents)}
        {plan.tiefsterKontostandMonat ? ` im ${monatLang(plan.tiefsterKontostandMonat)}` : ""}.
        Kontokorrentbedarf {euro(plan.kontokorrentbedarfCents)}.
      </Text>
      <JahresTabelle zeilen={zeilen} jahre={berichte.planjahre} />
      <Text style={stil.hinweis}>{plan.hinweis}</Text>
    </Blatt>,
    ...monatsSeiten(
      `${abschnitt.id}-liq-monat`,
      "Liquidität, Monate",
      zeilen,
      berichte,
      kopf,
      `${abschnitt.id}:liquiditaet-monate`,
      rahmen,
    ),
  ];
}

function Tragfaehigkeit({
  abschnitt,
  rahmen,
}: {
  abschnitt: PdfSzenarioAbschnitt;
  rahmen: Rahmen;
}) {
  const berichte = abschnitt.berichte;
  if (!berichte || !berichte.tragfaehigkeit.anwendbar) return [];
  const zeilen = berichte.tragfaehigkeit.personen.flatMap((person) =>
    [
      mitName(
        erste(ausBewegung([person.gewinnNachSteuern], false)),
        `${person.name}: Gewinn nach Steuern`,
      ),
      mitName(erste(ausBewegung([person.lebenshaltung], false)), `${person.name}: Lebenshaltung`),
      mitName(erste(ausBewegung([person.vorsorge], false)), `${person.name}: Vorsorge`),
      mitName(
        erste(ausBewegung([person.verfuegbaresEinkommen], false)),
        `${person.name}: verfügbar`,
      ),
    ].flatMap((zeile) => (zeile ? [zeile] : [])),
  );
  const kopfzeilen = ["Person", "Anteil", "Planjahr 2", "Tragfähig"];
  const personen = berichte.tragfaehigkeit.personen.map((person) => [
    person.name,
    prozent(person.anteil),
    person.planjahr2Cents == null ? "-" : euroZahl(person.planjahr2Cents),
    person.tragfaehig == null ? "-" : person.tragfaehig ? "ja" : "nein",
  ]);
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  return [
    <Blatt key={`${abschnitt.id}-trag`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:tragfaehigkeit`} rahmen={rahmen} />
      <Text style={stil.h1}>Tragfähigkeit mit Lebenshaltung</Text>
      <Text style={stil.absatz}>{berichte.tragfaehigkeit.hinweis}</Text>
      <EinfacheTabelle kopf={kopfzeilen} zeilen={personen} breiten={[180, 80, 140, 120]} />
    </Blatt>,
    ...monatsSeiten(
      `${abschnitt.id}-trag-monat`,
      "Tragfähigkeit, Monate",
      zeilen,
      berichte,
      kopf,
      `${abschnitt.id}:tragfaehigkeit-monate`,
      rahmen,
    ),
  ];
}

function Steuern({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const berichte = abschnitt.berichte;
  if (!berichte) return [];
  const kalender = berichte.rentabilitaet.kalenderjahre.map((jahr) => [
    String(jahr.jahr),
    monatLang(jahr.vonMonat),
    monatLang(jahr.bisMonat),
    String(jahr.monateImPlan),
    euroZahl(jahr.steuerCents),
  ]);
  const aufwand = ausBewegung([findeZeile(berichte.rentabilitaet.zeilen, "steuern")], false);
  const zahlungen = ausBewegung(
    nurDiese(
      [berichte.liquiditaet.einzahlungen, berichte.liquiditaet.auszahlungen],
      STEUER_ZAHLUNGEN,
    ),
    false,
  );
  const zeilen = [
    ...aufwand,
    ...zahlungen,
    ...ausBewegung([berichte.liquiditaet.steuerruecklage], false),
  ];
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  return [
    <Blatt key={`${abschnitt.id}-steuer`} kopf={kopf}>
      <Anker id={`${abschnitt.id}:steuern`} rahmen={rahmen} />
      <Text style={stil.h1}>Steuern</Text>
      <Text style={stil.legende}>
        Die festgesetzte Steuer steht je Kalenderjahr. Gezahlt wird zu den Terminen des
        Liquiditätsplans. Beträge in Euro.
      </Text>
      <EinfacheTabelle
        kopf={["Kalenderjahr", "von", "bis", "Monate", "festgesetzte Steuer"]}
        zeilen={kalender}
        breiten={[90, 110, 110, 70, 140]}
      />
      <Text style={stil.h2}>Steueraufwand und Zahlungen</Text>
      <JahresTabelle zeilen={zeilen} jahre={berichte.planjahre} />
      <Text style={stil.hinweis}>{berichte.rentabilitaet.hinweis}</Text>
    </Blatt>,
    ...monatsSeiten(
      `${abschnitt.id}-steuer-monat`,
      "Steuern, Monate",
      zeilen,
      berichte,
      kopf,
      `${abschnitt.id}:steuern-monate`,
      rahmen,
    ),
  ];
}

function Diagramme({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  if (!abschnitt.diagramme) return null;
  return (
    <Blatt key={`${abschnitt.id}-dia`} kopf={kopfVon(rahmen.dokument, abschnitt.name)}>
      <Anker id={`${abschnitt.id}:diagramme`} rahmen={rahmen} />
      <Text style={stil.h1}>Diagramme</Text>
      <DiagrammSeitenInhalt diagramme={abschnitt.diagramme} />
    </Blatt>
  );
}

function Pruefung({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const gruppen = [
    { stufe: "fehler", titel: "Fehler" },
    { stufe: "warnung", titel: "Warnungen" },
    { stufe: "hinweis", titel: "Hinweise" },
  ] as const;
  return (
    <Blatt kopf={kopfVon(rahmen.dokument, abschnitt.name)}>
      <Anker id={`${abschnitt.id}:pruefung`} rahmen={rahmen} />
      <Text style={stil.h1}>Prüfungsmeldungen</Text>
      {abschnitt.meldungen.length === 0 ? (
        <Text style={stil.absatz}>Keine Meldungen.</Text>
      ) : (
        gruppen.map((gruppe) => {
          const liste = abschnitt.meldungen.filter((meldung) => meldung.stufe === gruppe.stufe);
          if (liste.length === 0) return null;
          return (
            <View key={gruppe.stufe}>
              <Text style={stil.h2}>{gruppe.titel}</Text>
              {liste.map((meldung) => (
                <View key={meldung.id} wrap={false}>
                  <Text style={stil.absatz}>
                    {meldung.stufeText} · {meldung.kategorieText}: {meldung.text}
                  </Text>
                  <Text style={stil.hinweis}>{meldung.begruendung}</Text>
                </View>
              ))}
            </View>
          );
        })
      )}
    </Blatt>
  );
}

function vergleichZelle(spalte: ExportSzenarioVergleich, wert: string): string {
  return spalte.fehlerText ? "-" : wert;
}

function Vergleich({ rahmen }: { rahmen: Rahmen }) {
  const spalten = rahmen.dokument.vergleich;
  if (!spalten) return null;
  const quer = spalten.length > 4;
  const label = quer ? 170 : 150;
  const breite = ((quer ? 784 : 520) - label) / Math.max(spalten.length, 1);
  const kopf = ["", ...spalten.map((spalte) => spalte.name)];
  const breiten = [label, ...spalten.map(() => breite)];
  const jahre = Math.max(...spalten.map((spalte) => spalte.umsatzPlanjahreCents.length), 0);
  const zeilen: string[][] = [["Art", ...spalten.map((spalte) => artText(spalte.art))]];
  for (let index = 0; index < jahre; index += 1) {
    zeilen.push([
      `Umsatz Planjahr ${index + 1}`,
      ...spalten.map((spalte) =>
        vergleichZelle(spalte, euroZahl(spalte.umsatzPlanjahreCents[index] ?? 0)),
      ),
    ]);
    zeilen.push([
      `Ergebnis nach Steuern Planjahr ${index + 1}`,
      ...spalten.map((spalte) =>
        vergleichZelle(spalte, euroZahl(spalte.ergebnisNachSteuernPlanjahreCents[index] ?? 0)),
      ),
    ]);
  }
  zeilen.push(
    [
      "Tiefster Kontostand",
      ...spalten.map((spalte) =>
        vergleichZelle(
          spalte,
          spalte.tiefsterKontostandCents == null ? "-" : euroZahl(spalte.tiefsterKontostandCents),
        ),
      ),
    ],
    [
      "Kapitalbedarf",
      ...spalten.map((spalte) =>
        vergleichZelle(
          spalte,
          spalte.kapitalbedarfCents == null ? "-" : euroZahl(spalte.kapitalbedarfCents),
        ),
      ),
    ],
    [
      "Break-even",
      ...spalten.map((spalte) =>
        vergleichZelle(
          spalte,
          spalte.breakEvenMonat && spalte.breakEvenPlanmonat
            ? `${monatLang(spalte.breakEvenMonat)}, Planmonat ${spalte.breakEvenPlanmonat}`
            : "nicht erreicht",
        ),
      ),
    ],
    [
      "Tragfähigkeit Planjahr 2",
      ...spalten.map((spalte) => {
        if (spalte.fehlerText) return "-";
        if (!spalte.tragfaehigkeitAnwendbar) return "entfällt";
        return spalte.tragfaehigkeitPlanjahr2Cents == null
          ? "-"
          : euroZahl(spalte.tragfaehigkeitPlanjahr2Cents);
      }),
    ],
    ["Fehler", ...spalten.map((spalte) => String(spalte.fehler))],
    ["Warnungen", ...spalten.map((spalte) => String(spalte.warnungen))],
    ["Hinweise", ...spalten.map((spalte) => String(spalte.hinweise))],
  );
  return (
    <Blatt quer={quer} kopf={`${rahmen.dokument.vorhaben} · Szenarienvergleich`}>
      <Anker id="vergleich" rahmen={rahmen} />
      <Text style={stil.h1}>Szenarienvergleich</Text>
      <Text style={stil.legende}>
        Beträge in Euro. Dieselben Zahlen wie auf der Seite Szenarien.
      </Text>
      <EinfacheTabelle kopf={kopf} zeilen={zeilen} breiten={breiten} />
      {spalten
        .filter((spalte) => spalte.fehlerText)
        .map((spalte) => (
          <Text key={spalte.id} style={stil.hinweis}>
            {spalte.name}: {spalte.fehlerText}
          </Text>
        ))}
    </Blatt>
  );
}

function szenarioSeiten(abschnitt: PdfSzenarioAbschnitt, rahmen: Rahmen): ReactElement[] {
  const seiten: ReactElement[] = [];
  const hat = (id: PdfKapitelId) => abschnitt.kapitel.includes(id);
  if (hat("deckblatt"))
    seiten.push(<Deckblatt key={`${abschnitt.id}-deck`} abschnitt={abschnitt} rahmen={rahmen} />);
  if (hat("kennzahlen")) {
    const blatt = Kennzahlen({ abschnitt, rahmen });
    if (blatt) seiten.push(blatt);
  }
  if (hat("kapital")) {
    const blatt = Kapital({ abschnitt, rahmen });
    seiten.push(...blatt);
    seiten.push(...kapitalMonate(abschnitt, rahmen));
  }
  if (hat("investitionen")) seiten.push(...Investitionen({ abschnitt, rahmen }));
  if (hat("umsatz")) seiten.push(...Umsatz({ abschnitt, rahmen }));
  if (hat("rentabilitaet")) seiten.push(...Rentabilitaet({ abschnitt, rahmen }));
  if (hat("liquiditaet")) seiten.push(...Liquiditaet({ abschnitt, rahmen }));
  if (hat("tragfaehigkeit")) seiten.push(...Tragfaehigkeit({ abschnitt, rahmen }));
  if (hat("steuern")) seiten.push(...Steuern({ abschnitt, rahmen }));
  if (hat("diagramme")) {
    const blatt = Diagramme({ abschnitt, rahmen });
    if (blatt) seiten.push(blatt);
  }
  if (hat("pruefung"))
    seiten.push(<Pruefung key={`${abschnitt.id}-pruef`} abschnitt={abschnitt} rahmen={rahmen} />);
  return seiten;
}

function PdfPlan({
  dokument,
  seiten,
  merken,
}: {
  dokument: PdfDokument;
  seiten: Record<string, number>;
  merken: Rahmen["merken"];
}) {
  const rahmen: Rahmen = { dokument, seiten, merken };
  const leer =
    dokument.szenarien.every((abschnitt) => abschnitt.kapitel.length === 0) && !dokument.vergleich;
  return (
    <Document
      title={`${dokument.vorhaben} – Finanzplan`}
      author="Finanzplaner"
      creator="Finanzplaner"
      language="de"
      subject="Finanzplan, im Browser erstellt"
    >
      <Inhalt rahmen={rahmen} />
      {dokument.szenarien.flatMap((abschnitt) => szenarioSeiten(abschnitt, rahmen))}
      {dokument.vergleich ? <Vergleich rahmen={rahmen} /> : null}
      {leer ? (
        <Blatt kopf={`${dokument.vorhaben} · Finanzplan`}>
          <Text style={stil.h1}>Keine Kapitel ausgewählt</Text>
          <Text style={stil.absatz}>
            Im Dialog war kein Kapitel angehakt. Die Auswahl liegt im Plan und lässt sich wieder
            einschalten.
          </Text>
        </Blatt>
      ) : null}
    </Document>
  );
}

function zeichne(dokument: PdfDokument, seiten: Record<string, number>, merken: Rahmen["merken"]) {
  return <PdfPlan dokument={dokument} seiten={seiten} merken={merken} />;
}

/** Zwei Durchläufe, damit das Inhaltsverzeichnis die Seitenzahlen kennt. */
export async function pdfDokumentZuBlob(dokument: PdfDokument): Promise<Blob> {
  const seiten: Record<string, number> = {};
  const merken = (id: string, seite: number) => {
    seiten[id] = seite;
  };
  await pdf(zeichne(dokument, seiten, merken)).toBlob();
  return pdf(zeichne(dokument, { ...seiten }, null)).toBlob();
}

export async function pdfDokumentZuBuffer(dokument: PdfDokument) {
  const seiten: Record<string, number> = {};
  const merken = (id: string, seite: number) => {
    seiten[id] = seite;
  };
  await renderToBuffer(zeichne(dokument, seiten, merken));
  return renderToBuffer(zeichne(dokument, { ...seiten }, null));
}
