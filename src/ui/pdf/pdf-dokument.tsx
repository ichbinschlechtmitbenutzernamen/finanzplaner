import React, { Fragment, cloneElement } from "react";
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
import {
  DICHTE_JAHR,
  einfacheReihen,
  gruppenFuerSeite,
  jahresGruppen,
  monatsGruppen,
  stapelHoehe,
} from "./pdf-layout.ts";
import { BREITE_HOCH, BREITE_QUER, NUTZ_HOCH, NUTZ_QUER, stil } from "./pdf-stil.ts";
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

interface TextTeil {
  text: string;
  schrift: number;
  breite: number;
  oben?: number;
  unten?: number;
  faktor?: number;
}

function zeileH1(text: string, breite = BREITE_HOCH): TextTeil {
  return { text, schrift: 16, breite, unten: 6 };
}

function zeileH2(text: string, breite = BREITE_HOCH): TextTeil {
  return { text, schrift: 11, breite, oben: 8, unten: 4 };
}

function zeileAbsatz(text: string, breite = BREITE_HOCH): TextTeil {
  return { text, schrift: 9, breite, unten: 3, faktor: 1.35 };
}

function zeileHinweis(text: string, breite = BREITE_HOCH): TextTeil {
  return { text, schrift: 8, breite, oben: 8, faktor: 1.35 };
}

function zeileLegende(text: string, breite = BREITE_HOCH): TextTeil {
  return { text, schrift: 7.5, breite, unten: 4 };
}

/** Höhe über der Tabelle, einschließlich Tabellenrand und des unsichtbaren Ankers. */
function vorspann(teile: readonly TextTeil[], mitAnker = false): number {
  return stapelHoehe(teile) + 4 + (mitAnker ? 2 : 0);
}

function monatsVorspann(titel: string): number {
  return vorspann(
    [
      zeileH1(titel, BREITE_QUER),
      zeileH2(`Planjahr 3, September 2026 bis August 2027`, BREITE_QUER),
      zeileLegende(MONATS_HINWEIS, BREITE_QUER),
    ],
    true,
  );
}

/**
 * Eine Tabelle je Planjahr. Jede bleibt geschlossen; passt sie nicht mehr,
 * rückt sie auf die nächste Seite. Ist sie höher als eine Seite, wird die
 * Schrift etwas kleiner, und nur dann in Blöcke mit wiederholtem Kopf geteilt.
 */
function monatsBloecke(
  schluessel: string,
  titel: string,
  zeilen: readonly ZellenZeile[],
  berichte: Berichte,
  anker: string,
  rahmen: Rahmen,
): ReactElement[] {
  if (zeilen.length === 0) return [];
  const layout = monatsGruppen(zeilen, monatsVorspann(titel));
  const bloecke: ReactElement[] = [];
  for (const jahr of berichte.planjahre) {
    const zeitraum = `${monatLang(jahr.vonMonat)} bis ${monatLang(jahr.bisMonat)}`;
    layout.gruppen.forEach((teil, index) => {
      const erste = jahr.nummer === 1 && index === 0;
      const fortsetzung = index > 0;
      bloecke.push(
        <View key={`${schluessel}-${jahr.nummer}-${index}`} wrap={false} style={stil.block}>
          {erste ? <Anker id={anker} rahmen={rahmen} /> : null}
          {erste ? <Text style={stil.h1}>{titel}</Text> : null}
          <Text style={stil.h2}>
            {fortsetzung
              ? `${titel} · ${jahr.bezeichnung}, Fortsetzung, ${zeitraum}`
              : jahr.nummer === 1
                ? `${jahr.bezeichnung}, ${zeitraum}`
                : `${titel} · ${jahr.bezeichnung}, ${zeitraum}`}
          </Text>
          <Text style={stil.legende}>{MONATS_HINWEIS}</Text>
          <MonatsTabelle
            zeilen={teil}
            monate={berichte.monate}
            jahr={jahr}
            dichte={layout.dichte}
          />
        </View>,
      );
    });
  }
  return bloecke;
}

function jahresBloecke(
  schluessel: string,
  zeilen: readonly ZellenZeile[],
  berichte: Berichte,
  davor: number,
  kopf: (fortsetzung: boolean) => ReactNode,
  fuss?: ReactNode,
): ReactElement[] {
  if (zeilen.length === 0) return [];
  const layout = jahresGruppen(zeilen, davor);
  return layout.gruppen.map((teil, index) => {
    const letzte = index === layout.gruppen.length - 1;
    return (
      <View key={`${schluessel}-${index}`} wrap={false} style={stil.block}>
        {kopf(index > 0)}
        <JahresTabelle zeilen={teil} jahre={berichte.planjahre} dichte={layout.dichte} />
        {letzte ? fuss : null}
      </View>
    );
  });
}

function einfacheBloecke(
  schluessel: string,
  kopfzeilen: readonly string[],
  zeilen: readonly (readonly string[])[],
  breiten: readonly number[],
  davor: number,
  seite: number,
  kopf: (fortsetzung: boolean) => ReactNode,
  fuss?: ReactNode,
): ReactElement[] {
  const gemessen = zeilen.map((zeile) => ({
    bezeichnung: zeile.join(" "),
    einzug: false,
    zeile,
  }));
  const layout = gruppenFuerSeite(
    gemessen,
    (teil) =>
      einfacheReihen(
        kopfzeilen,
        teil.map((eintrag) => eintrag.zeile),
        breiten,
      ),
    DICHTE_JAHR,
    { seite, davor },
  );
  return layout.gruppen.map((teil, index) => {
    const letzte = index === layout.gruppen.length - 1;
    return (
      <View key={`${schluessel}-${index}`} wrap={false} style={stil.block}>
        {kopf(index > 0)}
        <EinfacheTabelle
          kopf={kopfzeilen}
          zeilen={teil.map((eintrag) => eintrag.zeile)}
          breiten={breiten}
          dichte={layout.dichte}
        />
        {letzte ? fuss : null}
      </View>
    );
  });
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
  const breakEven =
    bruch.erreicht && bruch.monat && bruch.planmonat
      ? `Break-even: ${monatLang(bruch.monat)} (Planmonat ${bruch.planmonat})`
      : "Break-even: im Horizont nicht erreicht";
  const kontostand = `Tiefster Kontostand ${euro(kpis.tiefsterKontostandCents)}${
    kpis.tiefsterKontostandMonat ? ` im ${monatLang(kpis.tiefsterKontostandMonat)}` : ""
  }. Kontokorrentbedarf ${euro(kpis.kontokorrentbedarfCents)}.`;
  const eigenkapital = `Eigenkapitalquote ${prozent(kpis.eigenkapitalquote)}. Eigenmittel ${euro(kpis.eigenmittelCents)}, Finanzierung ${euro(kpis.finanzierungCents)}.`;
  const dienst = berichte.kennzahlen.kapitaldienstfaehigkeit.map(
    (jahr) =>
      `Planjahr ${jahr.planjahr}: Cashflow ${euro(jahr.cashflowCents)}, Kapitaldienst ${euro(jahr.kapitaldienstCents)}, Quote ${faktor(jahr.quote)}`,
  );
  const personen = kpis.tragfaehigkeit.personen.map((person) =>
    person.planjahr2Cents == null
      ? `${person.name}: ohne Bewertung`
      : `${person.name}: ${euro(person.planjahr2Cents)} im Planjahr 2, ${person.tragfaehig ? "tragfähig" : "nicht tragfähig"}`,
  );
  const davor = vorspann([
    zeileH1("Kennzahlen im Überblick"),
    zeileLegende("Beträge in Euro."),
    zeileAbsatz(breakEven),
    zeileHinweis(bruch.definition),
    zeileAbsatz(kontostand),
    zeileAbsatz(eigenkapital),
    zeileH2("Kapitaldienstfähigkeit"),
    ...dienst.map((text) => zeileAbsatz(text)),
    zeileH2("Tragfähigkeit"),
    zeileAbsatz(kpis.tragfaehigkeit.hinweis),
    ...personen.map((text) => zeileAbsatz(text)),
  ]);
  return einfacheBloecke(
    `${abschnitt.id}-kenn`,
    kopf,
    zeilen,
    breiten,
    davor,
    NUTZ_HOCH,
    (fortsetzung) =>
      fortsetzung ? (
        <Text style={stil.h2}>Kennzahlen im Überblick, Fortsetzung</Text>
      ) : (
        <>
          <Anker id={`${abschnitt.id}:kennzahlen`} rahmen={rahmen} />
          <Text style={stil.h1}>Kennzahlen im Überblick</Text>
          <Text style={stil.legende}>Beträge in Euro.</Text>
        </>
      ),
    <>
      <Text style={stil.absatz}>{breakEven}</Text>
      <Text style={stil.hinweis}>{bruch.definition}</Text>
      <Text style={stil.absatz}>{kontostand}</Text>
      <Text style={stil.absatz}>{eigenkapital}</Text>
      <Text style={stil.h2}>Kapitaldienstfähigkeit</Text>
      {dienst.map((text) => (
        <Text key={text} style={stil.absatz}>
          {text}
        </Text>
      ))}
      <Text style={stil.h2}>Tragfähigkeit</Text>
      <Text style={stil.absatz}>{kpis.tragfaehigkeit.hinweis}</Text>
      {kpis.tragfaehigkeit.personen.map((person, index) => (
        <Text key={person.personId} style={stil.absatz}>
          {personen[index]}
        </Text>
      ))}
    </>,
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
  const einleitung = `Deckung ${euro(berichte.kapital.deckung.betragCents)} (${deckungText(berichte.kapital.deckungArt)}).${
    berichte.kapital.darlehenAbzugCents > 0
      ? ` Darlehen unter Nominal ${euro(berichte.kapital.darlehenAbzugCents)}.`
      : ""
  }`;
  return jahresBloecke(
    `${abschnitt.id}-kapital`,
    zeilen,
    berichte,
    vorspann(
      [
        zeileH1("Kapitalbedarf und Finanzierung"),
        zeileAbsatz(einleitung),
        zeileHinweis(berichte.kapital.hinweis),
      ],
      true,
    ),
    (fortsetzung) =>
      fortsetzung ? (
        <Text style={stil.h2}>Kapitalbedarf und Finanzierung, Fortsetzung</Text>
      ) : (
        <>
          <Anker id={`${abschnitt.id}:kapital`} rahmen={rahmen} />
          <Text style={stil.h1}>Kapitalbedarf und Finanzierung</Text>
          <Text style={stil.absatz}>{einleitung}</Text>
        </>
      ),
    <Text style={stil.hinweis}>{berichte.kapital.hinweis}</Text>,
  );
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
  return monatsBloecke(
    `${abschnitt.id}-kapital-monat`,
    "Kapitalbedarf und Finanzierung, Monate",
    zeilen,
    berichte,
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

function Investitionen({
  abschnitt,
  rahmen,
}: {
  abschnitt: PdfSzenarioAbschnitt;
  rahmen: Rahmen;
}): {
  hoch: ReactNode[];
  quer: ReactNode[];
} {
  const berichte = abschnitt.berichte;
  if (!berichte) return { hoch: [], quer: [] };
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
  const anlagenKopf = ["Anlage", "Aktivierung", "AfA Summe", "Buchwert Ende", "Auszahlung"];
  const anlagenBreiten = [200, 80, 80, 80, 80];
  const darlehenKopf = ["Darlehen", "Nominal", "Zins Summe", "Tilgung Summe", "Restschuld"];
  const darlehenBreiten = [200, 80, 80, 80, 80];
  const hoch: ReactNode[] =
    anlagen.length === 0
      ? [
          <View key={`${abschnitt.id}-invest-leer`} wrap={false} style={stil.block}>
            <Anker id={`${abschnitt.id}:investitionen`} rahmen={rahmen} />
            <Text style={stil.h1}>Investitionen und Abschreibungen</Text>
            <Text style={stil.absatz}>Keine Investitionen erfasst.</Text>
          </View>,
        ]
      : einfacheBloecke(
          `${abschnitt.id}-invest`,
          anlagenKopf,
          anlagen,
          anlagenBreiten,
          vorspann([zeileH1("Investitionen und Abschreibungen")], true),
          NUTZ_HOCH,
          (fortsetzung) =>
            fortsetzung ? (
              <Text style={stil.h2}>Investitionen und Abschreibungen, Fortsetzung</Text>
            ) : (
              <>
                <Anker id={`${abschnitt.id}:investitionen`} rahmen={rahmen} />
                <Text style={stil.h1}>Investitionen und Abschreibungen</Text>
              </>
            ),
        );
  if (darlehen.length === 0) {
    hoch.push(
      <View key={`${abschnitt.id}-darlehen-leer`} wrap={false} style={stil.block}>
        <Text style={stil.h2}>Darlehen</Text>
        <Text style={stil.absatz}>Keine Darlehen erfasst.</Text>
        <Text style={stil.hinweis}>{berichte.darlehen.hinweis}</Text>
      </View>,
    );
  } else {
    hoch.push(
      ...einfacheBloecke(
        `${abschnitt.id}-darlehen`,
        darlehenKopf,
        darlehen,
        darlehenBreiten,
        vorspann([zeileH2("Darlehen"), zeileHinweis(berichte.darlehen.hinweis)], false),
        NUTZ_HOCH,
        (fortsetzung) => (
          <Text style={stil.h2}>{fortsetzung ? "Darlehen, Fortsetzung" : "Darlehen"}</Text>
        ),
        <Text style={stil.hinweis}>{berichte.darlehen.hinweis}</Text>,
      ),
    );
  }
  return {
    hoch,
    quer: [
      ...monatsBloecke(
        `${abschnitt.id}-afa`,
        "Abschreibungen, Monate",
        afa,
        berichte,
        `${abschnitt.id}:investitionen-afa`,
        rahmen,
      ),
      ...monatsBloecke(
        `${abschnitt.id}-raten`,
        "Darlehen, Monate",
        raten,
        berichte,
        `${abschnitt.id}:investitionen-darlehen`,
        rahmen,
      ),
    ],
  };
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

const UMSATZ_LEGENDE =
  "Beträge in Euro. Die Summe der Kosten ist dieselbe Reihe wie im Diagramm Umsatz gegen Kosten.";

function Umsatz({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }): {
  hoch: ReactNode[];
  quer: ReactNode[];
} {
  const berichte = abschnitt.berichte;
  if (!berichte) return { hoch: [], quer: [] };
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
  return {
    hoch: jahresBloecke(
      `${abschnitt.id}-umsatz`,
      zeilen,
      berichte,
      vorspann([zeileH1("Umsatz und Kosten"), zeileLegende(UMSATZ_LEGENDE)], true),
      (fortsetzung) =>
        fortsetzung ? (
          <Text style={stil.h2}>Umsatz und Kosten, Fortsetzung</Text>
        ) : (
          <>
            <Anker id={`${abschnitt.id}:umsatz`} rahmen={rahmen} />
            <Text style={stil.h1}>Umsatz und Kosten</Text>
            <Text style={stil.legende}>{UMSATZ_LEGENDE}</Text>
          </>
        ),
    ),
    quer: monatsBloecke(
      `${abschnitt.id}-umsatz-monat`,
      "Umsatz und Kosten, Monate",
      zeilen,
      berichte,
      `${abschnitt.id}:umsatz-monate`,
      rahmen,
    ),
  };
}

function Rentabilitaet({
  abschnitt,
  rahmen,
}: {
  abschnitt: PdfSzenarioAbschnitt;
  rahmen: Rahmen;
}): {
  hoch: ReactNode[];
  quer: ReactNode[];
} {
  const berichte = abschnitt.berichte;
  if (!berichte) return { hoch: [], quer: [] };
  const zeilen = ausBewegung(berichte.rentabilitaet.zeilen, true);
  return {
    hoch: jahresBloecke(
      `${abschnitt.id}-rent`,
      zeilen,
      berichte,
      vorspann([zeileH1("Rentabilität"), zeileHinweis(berichte.rentabilitaet.hinweis)], true),
      (fortsetzung) =>
        fortsetzung ? (
          <Text style={stil.h2}>Rentabilität, Fortsetzung</Text>
        ) : (
          <>
            <Anker id={`${abschnitt.id}:rentabilitaet`} rahmen={rahmen} />
            <Text style={stil.h1}>Rentabilität</Text>
          </>
        ),
      <Text style={stil.hinweis}>{berichte.rentabilitaet.hinweis}</Text>,
    ),
    quer: monatsBloecke(
      `${abschnitt.id}-rent-monat`,
      "Rentabilität, Monate",
      zeilen,
      berichte,
      `${abschnitt.id}:rentabilitaet-monate`,
      rahmen,
    ),
  };
}

function Liquiditaet({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }): {
  hoch: ReactNode[];
  quer: ReactNode[];
} {
  const berichte = abschnitt.berichte;
  if (!berichte) return { hoch: [], quer: [] };
  const plan = berichte.liquiditaet;
  const zeilen = [
    ausBestand(plan.anfangsbestand),
    ...ausBewegung([plan.einzahlungen], true),
    ...ausBewegung([plan.auszahlungen], true),
    ausBestand(plan.endbestand),
    ...ausBewegung([plan.steuerruecklage], false),
    ausBestand(plan.steuerruecklageKumuliert),
  ];
  const einleitung = `Tiefster Kontostand ${euro(plan.tiefsterKontostandCents)}${
    plan.tiefsterKontostandMonat ? ` im ${monatLang(plan.tiefsterKontostandMonat)}` : ""
  }. Kontokorrentbedarf ${euro(plan.kontokorrentbedarfCents)}.`;
  return {
    hoch: jahresBloecke(
      `${abschnitt.id}-liq`,
      zeilen,
      berichte,
      vorspann([zeileH1("Liquidität"), zeileAbsatz(einleitung), zeileHinweis(plan.hinweis)], true),
      (fortsetzung) =>
        fortsetzung ? (
          <Text style={stil.h2}>Liquidität, Fortsetzung</Text>
        ) : (
          <>
            <Anker id={`${abschnitt.id}:liquiditaet`} rahmen={rahmen} />
            <Text style={stil.h1}>Liquidität</Text>
            <Text style={stil.absatz}>{einleitung}</Text>
          </>
        ),
      <Text style={stil.hinweis}>{plan.hinweis}</Text>,
    ),
    quer: monatsBloecke(
      `${abschnitt.id}-liq-monat`,
      "Liquidität, Monate",
      zeilen,
      berichte,
      `${abschnitt.id}:liquiditaet-monate`,
      rahmen,
    ),
  };
}

function Tragfaehigkeit({
  abschnitt,
  rahmen,
}: {
  abschnitt: PdfSzenarioAbschnitt;
  rahmen: Rahmen;
}): { hoch: ReactNode[]; quer: ReactNode[] } {
  const berichte = abschnitt.berichte;
  if (!berichte || !berichte.tragfaehigkeit.anwendbar) return { hoch: [], quer: [] };
  const zeilen = berichte.tragfaehigkeit.personen.flatMap((person) =>
    [
      mitName(
        erste(ausBewegung([person.gewinnNachSteuern], false)),
        `${person.name}: Gewinn nach Steuern`,
      ),
      ...person.bloecke.flatMap((block) =>
        ausBewegung([block], true).map((zeile) =>
          mitName(zeile, `${person.name}: ${zeile.bezeichnung}`),
        ),
      ),
      mitName(
        erste(ausBewegung([person.verfuegbaresEinkommen], false)),
        `${person.name}: verfügbar`,
      ),
    ].flatMap((zeile) => (zeile ? [zeile] : [])),
  );
  const kopfzeilen = ["Person", "Anteil", "Planjahr 2", "Tragfähig"];
  const breiten = [180, 80, 140, 120];
  const personen = berichte.tragfaehigkeit.personen.map((person) => [
    person.name,
    prozent(person.anteil),
    person.planjahr2Cents == null ? "-" : euroZahl(person.planjahr2Cents),
    person.tragfaehig == null ? "-" : person.tragfaehig ? "ja" : "nein",
  ]);
  return {
    hoch: [
      ...einfacheBloecke(
        `${abschnitt.id}-trag`,
        kopfzeilen,
        personen,
        breiten,
        vorspann(
          [
            zeileH1("Tragfähigkeit mit Lebenshaltung"),
            zeileAbsatz(berichte.tragfaehigkeit.hinweis),
          ],
          true,
        ),
        NUTZ_HOCH,
        (fortsetzung) =>
          fortsetzung ? (
            <Text style={stil.h2}>Tragfähigkeit mit Lebenshaltung, Fortsetzung</Text>
          ) : (
            <>
              <Anker id={`${abschnitt.id}:tragfaehigkeit`} rahmen={rahmen} />
              <Text style={stil.h1}>Tragfähigkeit mit Lebenshaltung</Text>
              <Text style={stil.absatz}>{berichte.tragfaehigkeit.hinweis}</Text>
            </>
          ),
      ),
      ...berichte.tragfaehigkeit.personen.map((person) => (
        <Text key={person.personId} style={stil.absatz}>
          {person.name}: {person.herleitung.join(" ")}
        </Text>
      )),
    ],
    quer: monatsBloecke(
      `${abschnitt.id}-trag-monat`,
      "Tragfähigkeit, Monate",
      zeilen,
      berichte,
      `${abschnitt.id}:tragfaehigkeit-monate`,
      rahmen,
    ),
  };
}

const STEUER_LEGENDE =
  "Die festgesetzte Steuer steht je Kalenderjahr. Gezahlt wird zu den Terminen des Liquiditätsplans. Beträge in Euro.";

function Steuern({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }): {
  hoch: ReactNode[];
  quer: ReactNode[];
} {
  const berichte = abschnitt.berichte;
  if (!berichte) return { hoch: [], quer: [] };
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
  const kopfzeilen = ["Kalenderjahr", "von", "bis", "Monate", "festgesetzte Steuer"];
  const breiten = [90, 110, 110, 70, 140];
  return {
    hoch: [
      ...einfacheBloecke(
        `${abschnitt.id}-steuer-jahr`,
        kopfzeilen,
        kalender,
        breiten,
        vorspann([zeileH1("Steuern"), zeileLegende(STEUER_LEGENDE)], true),
        NUTZ_HOCH,
        (fortsetzung) =>
          fortsetzung ? (
            <Text style={stil.h2}>Steuern, Fortsetzung</Text>
          ) : (
            <>
              <Anker id={`${abschnitt.id}:steuern`} rahmen={rahmen} />
              <Text style={stil.h1}>Steuern</Text>
              <Text style={stil.legende}>{STEUER_LEGENDE}</Text>
            </>
          ),
      ),
      ...jahresBloecke(
        `${abschnitt.id}-steuer`,
        zeilen,
        berichte,
        vorspann(
          [zeileH2("Steueraufwand und Zahlungen"), zeileHinweis(berichte.rentabilitaet.hinweis)],
          false,
        ),
        (fortsetzung) => (
          <Text style={stil.h2}>
            {fortsetzung
              ? "Steueraufwand und Zahlungen, Fortsetzung"
              : "Steueraufwand und Zahlungen"}
          </Text>
        ),
        <Text style={stil.hinweis}>{berichte.rentabilitaet.hinweis}</Text>,
      ),
    ],
    quer: monatsBloecke(
      `${abschnitt.id}-steuer-monat`,
      "Steuern, Monate",
      zeilen,
      berichte,
      `${abschnitt.id}:steuern-monate`,
      rahmen,
    ),
  };
}

function Diagramme({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  if (!abschnitt.diagramme) return null;
  return (
    <View key={`${abschnitt.id}-dia`}>
      <Anker id={`${abschnitt.id}:diagramme`} rahmen={rahmen} />
      <Text style={stil.h1} minPresenceAhead={240}>
        Diagramme
      </Text>
      <DiagrammSeitenInhalt diagramme={abschnitt.diagramme} />
    </View>
  );
}

function Pruefung({ abschnitt, rahmen }: { abschnitt: PdfSzenarioAbschnitt; rahmen: Rahmen }) {
  const gruppen = [
    { stufe: "fehler", titel: "Fehler" },
    { stufe: "warnung", titel: "Warnungen" },
    { stufe: "hinweis", titel: "Hinweise" },
  ] as const;
  return (
    <View key={`${abschnitt.id}-pruef`}>
      <Anker id={`${abschnitt.id}:pruefung`} rahmen={rahmen} />
      <Text style={stil.h1} minPresenceAhead={40}>
        Prüfungsmeldungen
      </Text>
      {abschnitt.meldungen.length === 0 ? (
        <Text style={stil.absatz}>Keine Meldungen.</Text>
      ) : (
        gruppen.map((gruppe) => {
          const liste = abschnitt.meldungen.filter((meldung) => meldung.stufe === gruppe.stufe);
          if (liste.length === 0) return null;
          return (
            <View key={gruppe.stufe}>
              <Text style={stil.h2} minPresenceAhead={32}>
                {gruppe.titel}
              </Text>
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
    </View>
  );
}

function vergleichZelle(spalte: ExportSzenarioVergleich, wert: string): string {
  return spalte.fehlerText ? "-" : wert;
}

function Vergleich({ rahmen }: { rahmen: Rahmen }): { quer: boolean; knoten: ReactElement } | null {
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
          spalte.tiefsterKontostandCents == null
            ? "-"
            : `${euroZahl(spalte.tiefsterKontostandCents)}${
                spalte.tiefsterKontostandMonat
                  ? `, ${monatLang(spalte.tiefsterKontostandMonat)}`
                  : ""
              }`,
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
  const legende = "Beträge in Euro. Dieselben Zahlen wie auf der Seite Szenarien.";
  const fehler = spalten.filter((spalte) => spalte.fehlerText);
  const breiteText = quer ? BREITE_QUER : BREITE_HOCH;
  const davor = vorspann(
    [
      zeileH1("Szenarienvergleich", breiteText),
      zeileLegende(legende, breiteText),
      ...fehler.map((spalte) => zeileHinweis(`${spalte.name}: ${spalte.fehlerText}`, breiteText)),
    ],
    true,
  );
  const knoten = (
    <Fragment key="vergleich">
      {einfacheBloecke(
        "vergleich",
        kopf,
        zeilen,
        breiten,
        davor,
        quer ? NUTZ_QUER : NUTZ_HOCH,
        (fortsetzung) =>
          fortsetzung ? (
            <Text style={stil.h2}>Szenarienvergleich, Fortsetzung</Text>
          ) : (
            <>
              <Anker id="vergleich" rahmen={rahmen} />
              <Text style={stil.h1}>Szenarienvergleich</Text>
              <Text style={stil.legende}>{legende}</Text>
            </>
          ),
        <>
          {fehler.map((spalte) => (
            <Text key={spalte.id} style={stil.hinweis}>
              {spalte.name}: {spalte.fehlerText}
            </Text>
          ))}
        </>,
      )}
    </Fragment>
  );
  return { quer, knoten };
}

interface FlussTeil {
  art: "fluss";
  kopf: string;
  quer: boolean;
  /** Jahresübersichten. Der Vergleich hängt sich hier an, damit die kleinen Tabellen zusammenbleiben. */
  sammeln: boolean;
  kinder: ReactNode[];
}

interface FesteSeite {
  art: "fest";
  knoten: ReactElement;
}

type Teil = FlussTeil | FesteSeite;

function mergen(teile: readonly Teil[]): Teil[] {
  const aus: Teil[] = [];
  for (const teil of teile) {
    if (teil.art === "fluss" && teil.kinder.length === 0) continue;
    const letzter = aus.at(-1);
    if (teil.art === "fluss" && letzter?.art === "fluss" && letzter.quer === teil.quer) {
      letzter.kinder.push(...teil.kinder);
      if (teil.sammeln) letzter.sammeln = true;
      continue;
    }
    if (teil.art === "fluss") aus.push({ ...teil, kinder: [...teil.kinder] });
    else aus.push(teil);
  }
  return aus;
}

function teileFuerSzenario(abschnitt: PdfSzenarioAbschnitt, rahmen: Rahmen): Teil[] {
  const kopf = kopfVon(rahmen.dokument, abschnitt.name);
  const teile: Teil[] = [];
  const hat = (id: PdfKapitelId) => abschnitt.kapitel.includes(id);
  if (hat("deckblatt")) {
    teile.push({
      art: "fest",
      knoten: <Deckblatt key={`${abschnitt.id}-deck`} abschnitt={abschnitt} rahmen={rahmen} />,
    });
  }
  const hoch: ReactNode[] = [];
  const quer: ReactNode[] = [];
  const nach: ReactNode[] = [];
  if (hat("kennzahlen")) {
    const knoten = Kennzahlen({ abschnitt, rahmen });
    if (knoten) hoch.push(...knoten);
  }
  if (hat("kapital")) {
    hoch.push(...Kapital({ abschnitt, rahmen }));
    quer.push(...kapitalMonate(abschnitt, rahmen));
  }
  if (hat("investitionen")) {
    const invest = Investitionen({ abschnitt, rahmen });
    hoch.push(...invest.hoch);
    quer.push(...invest.quer);
  }
  if (hat("umsatz")) {
    const umsatz = Umsatz({ abschnitt, rahmen });
    hoch.push(...umsatz.hoch);
    quer.push(...umsatz.quer);
  }
  if (hat("rentabilitaet")) {
    const rent = Rentabilitaet({ abschnitt, rahmen });
    hoch.push(...rent.hoch);
    quer.push(...rent.quer);
  }
  if (hat("liquiditaet")) {
    const liquiditaet = Liquiditaet({ abschnitt, rahmen });
    hoch.push(...liquiditaet.hoch);
    quer.push(...liquiditaet.quer);
  }
  if (hat("tragfaehigkeit")) {
    const trag = Tragfaehigkeit({ abschnitt, rahmen });
    hoch.push(...trag.hoch);
    quer.push(...trag.quer);
  }
  if (hat("steuern")) {
    const steuern = Steuern({ abschnitt, rahmen });
    hoch.push(...steuern.hoch);
    quer.push(...steuern.quer);
  }
  if (hat("diagramme")) {
    const diagramme = Diagramme({ abschnitt, rahmen });
    if (diagramme) nach.push(diagramme);
  }
  if (hat("pruefung")) nach.push(Pruefung({ abschnitt, rahmen }));
  if (hoch.length > 0) teile.push({ art: "fluss", kopf, quer: false, sammeln: true, kinder: hoch });
  if (quer.length > 0) teile.push({ art: "fluss", kopf, quer: true, sammeln: false, kinder: quer });
  if (nach.length > 0)
    teile.push({ art: "fluss", kopf, quer: false, sammeln: false, kinder: nach });
  return teile;
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
  const teile: Teil[] = [
    { art: "fest", knoten: <Inhalt rahmen={rahmen} /> },
    ...dokument.szenarien.flatMap((abschnitt) => teileFuerSzenario(abschnitt, rahmen)),
  ];
  const vergleich = Vergleich({ rahmen });
  if (vergleich) {
    if (vergleich.quer) {
      teile.push({
        art: "fluss",
        kopf: `${dokument.vorhaben} · Szenarienvergleich`,
        quer: true,
        sammeln: false,
        kinder: [vergleich.knoten],
      });
    } else {
      const ziel = [...teile].reverse().find((teil) => teil.art === "fluss" && teil.sammeln);
      if (ziel?.art === "fluss") ziel.kinder.push(vergleich.knoten);
      else {
        teile.push({
          art: "fluss",
          kopf: `${dokument.vorhaben} · Szenarienvergleich`,
          quer: false,
          sammeln: true,
          kinder: [vergleich.knoten],
        });
      }
    }
  }
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
      {mergen(teile).map((teil, index) =>
        teil.art === "fest" ? (
          cloneElement(teil.knoten, { key: `seite-${index}` })
        ) : (
          <Blatt key={`fluss-${index}`} kopf={teil.kopf} quer={teil.quer}>
            {teil.kinder}
          </Blatt>
        ),
      )}
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

/** Elementbaum des PDFs, noch ohne Schrift und Seitenumbruch. Die Tests lesen daran die Tabellen ab. */
export function pdfDokumentBaum(dokument: PdfDokument) {
  return zeichne(dokument, {}, null);
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
