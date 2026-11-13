import { parseIsoMonth } from "../months.ts";
import type { Planberechnung } from "../calc/types.ts";
import { annuitaetCents, roundCents, verteilteRaten } from "../calc/round.ts";
import type { Finanzplan, IsoMonth } from "../types.ts";
import type {
  AnlageZellen,
  DarlehenZellen,
  EingabeModell,
  GeldZellen,
  KostenZellen,
  PersonalZellen,
  Skalare,
  UmsatzZellen,
  ZuschussZellen,
} from "./eingaben.ts";
import {
  fAktiv,
  fAnteil,
  fCent,
  fEinkommensteuerCent,
  fKirchensteuer,
  fRund,
  fSatz,
  fSatzKlemme,
  fSkaliert,
  fSoli,
  fVerteilt,
  fViertel,
  fWachstum,
  fWenn,
  fZinsMonat,
  type TarifParameter,
} from "./formeln.ts";
import { Blatt, monatsCent, zeilenBereich, type Reihe } from "./gitter.ts";

const N = 36;

export interface AnlageReihe {
  name: string;
  herkunft: AnlageZellen["herkunft"];
  afa: Reihe;
  sofort: Reihe;
  buchwert: Reihe;
  auszahlung: Reihe;
}

export interface DarlehenReihe {
  name: string;
  zins: Reihe;
  tilgung: Reihe;
  rate: Reihe;
  rest: Reihe;
  auszahlung: Reihe;
}

export interface PersonReihe {
  name: string;
  anteil: number;
  gewinn: Reihe;
  steuer: Reihe;
  lebenshaltung: Reihe;
  vorsorge: Reihe;
}

export interface Rechenmodell {
  parameter: Blatt;
  rechnung: Blatt;
  steuer: Blatt;
  umsatz: Reihe;
  wareneinsatz: Reihe;
  personal: Reihe;
  raum: Reihe;
  laufendOhneRaum: Reihe;
  gruendung: Reihe;
  sofort: Reihe;
  finanzaufwand: Reihe;
  zuschussErtrag: Reihe;
  abschreibung: Reihe;
  zinsen: Reihe;
  betriebsergebnis: Reihe;
  einzahlungKunden: Reihe;
  auszahlungWare: Reihe;
  auszahlungPersonal: Reihe;
  auszahlungKosten: Reihe;
  auszahlungInvest: Reihe;
  auszahlungZins: Reihe;
  auszahlungTilgung: Reihe;
  ustZahlung: Reihe;
  einlagen: Reihe;
  darlehenAus: Reihe;
  zuschussZahlung: Reihe;
  entnahmen: Reihe;
  estZahlung: Reihe;
  gewstZahlung: Reihe;
  kstZahlung: Reihe;
  ruecklage: Reihe;
  ruecklageKumuliert: Reihe;
  steuerAufwand: Reihe;
  anfang: Reihe;
  einzahlungen: Reihe;
  auszahlungen: Reihe;
  ende: Reihe;
  restschuld: Reihe;
  kapitalInvest: Reihe;
  kapitalGruendung: Reihe;
  kapitalAnlauf: Reihe;
  kapitalWaren: Reihe;
  kapitalMittel: Reihe;
  kapitalReserve: Reihe;
  kapitalEigen: Reihe;
  kapitalDarlehen: Reihe;
  kapitalZuschuss: Reihe;
  anlagen: AnlageReihe[];
  darlehen: DarlehenReihe[];
  linien: { name: string; netto: Reihe }[];
  personen: PersonReihe[];
  monate: IsoMonth[];
}

export function baueRechnung(
  plan: Finanzplan,
  eingabe: EingabeModell,
  ergebnis: Planberechnung,
): Rechenmodell {
  const parameter = baueParameter(eingabe.skalare, ergebnis.monate);
  const rechnung = new Blatt("Rechnung");
  rechnung.quer = true;
  rechnung.fixierenZeile = 2;
  rechnung.fixierenSpalte = 1;
  rechnung.breite(1, 54);
  const steuerBlatt = new Blatt("Steuerberechnung");
  steuerBlatt.quer = true;
  steuerBlatt.fixierenZeile = 2;
  steuerBlatt.fixierenSpalte = 1;
  steuerBlatt.breite(1, 54);
  const ctx: Ctx = {
    plan,
    eingabe,
    ergebnis,
    parameter,
    rechnung,
    steuer: steuerBlatt,
    skalare: eingabe.skalare,
    jahrZeile: 4,
    monatZeile: 5,
  };
  rechnung.zeile({
    text: "Rechnung in Cent. Berichtsblätter teilen durch 100. Gelbe Eingaben stehen auf dem Blatt Eingaben.",
    stil: "hinweis",
  });

  const linien = ergebnis.umsatz.linien.map((linie, index) =>
    umsatzLinie(ctx, eingabe.umsatz[index]!, linie),
  );
  const umsatz = summe(
    ctx,
    "Umsatz netto",
    linien.map((linie) => linie.netto),
    ergebnis.umsatz.summeNettoCents,
  );
  const wareneinsatz = summe(
    ctx,
    "Wareneinsatz Aufwand",
    linien.map((linie) => linie.weAufwand),
    ergebnis.umsatz.summeWareneinsatzAufwandCents,
  );
  const auszahlungWare = summe(
    ctx,
    "Wareneinsatz Zahlung",
    linien.map((linie) => linie.weZahlung),
    ergebnis.umsatz.summeWareneinsatzZahlungCents,
  );
  const einzahlungKunden = summe(
    ctx,
    "Kundenzahlungen",
    linien.map((linie) => linie.einzahlung),
    ergebnis.umsatz.summeEinzahlungCents,
  );
  const ustTimed = summe(
    ctx,
    "Umsatzsteuer zeitlich",
    linien.map((linie) => linie.ust),
    ergebnis.umsatz.umsatzsteuerCents,
  );
  const vorsteuerWare = summe(
    ctx,
    "Vorsteuer Wareneinsatz",
    linien.map((linie) => linie.vorsteuer),
    ergebnis.umsatz.vorsteuerCents,
  );

  const stellen = ergebnis.personal.stellen.map((stelle, index) =>
    personalStelle(ctx, eingabe.personal[index]!, stelle.aufwandCents),
  );
  const personal = summe(ctx, "Personal", stellen, ergebnis.personal.summeAufwandCents);

  const kosten = ergebnis.kosten.positionen.map((position, index) =>
    kostenposition(ctx, eingabe.kosten[index]!, umsatz, position),
  );
  const laufend = summe(
    ctx,
    "Laufende Kosten Aufwand",
    kosten.map((position) => position.aufwand),
    ergebnis.kosten.summeAufwandCents,
  );
  const kostenZahlung = summe(
    ctx,
    "Laufende Kosten Zahlung",
    kosten.map((position) => position.auszahlung),
    ergebnis.kosten.summeAuszahlungCents,
  );
  const vorsteuerKosten = summe(
    ctx,
    "Vorsteuer laufende Kosten",
    kosten.map((position) => position.vorsteuer),
    ergebnis.kosten.vorsteuerCents,
  );
  const raumReihen = kosten.filter((_, index) => {
    const kategorie = plan.laufendeKosten[index]?.kategorie;
    return kategorie === "miete" || kategorie === "nebenkosten";
  });
  const ohneRaum = kosten.filter((_, index) => !raumReihen.includes(kosten[index]!));
  const raumEngine = leer();
  const ohneEngine = leer();
  ergebnis.kosten.positionen.forEach((position, index) => {
    const ziel =
      plan.laufendeKosten[index]?.kategorie === "miete" ||
      plan.laufendeKosten[index]?.kategorie === "nebenkosten"
        ? raumEngine
        : ohneEngine;
    position.aufwandCents.forEach((wert, monat) => {
      ziel[monat] = (ziel[monat] ?? 0) + wert;
    });
  });
  const raum = summe(
    ctx,
    "Raumkosten",
    raumReihen.map((position) => position.aufwand),
    raumEngine,
  );
  const laufendOhneRaum = summe(
    ctx,
    "Laufende Kosten ohne Raum",
    ohneRaum.map((position) => position.aufwand),
    ohneEngine,
  );

  const einmal = ergebnis.kosten.einmalig.map((posten, index) =>
    einmalPosten(ctx, eingabe.einmal[index]!, posten),
  );
  const gruendung = summe(
    ctx,
    "Gründung und Anlauf Aufwand",
    einmal.map((posten) => posten.aufwand),
    ergebnis.kosten.summeEinmalAufwandCents,
  );
  const einmalZahlung = summe(
    ctx,
    "Gründung und Anlauf Zahlung",
    einmal.map((posten) => posten.auszahlung),
    ergebnis.kosten.summeEinmalAuszahlungCents,
  );
  const vorsteuerEinmal = summe(
    ctx,
    "Vorsteuer Gründung und Anlauf",
    einmal.map((posten) => posten.vorsteuer),
    ergebnis.kosten.vorsteuerEinmalCents,
  );

  const anlagen = ergebnis.investitionen.anlagen.map((anlage, index) =>
    anlageReihe(ctx, eingabe.anlagen[index]!, anlage),
  );
  const abschreibung = summe(
    ctx,
    "Abschreibungen",
    anlagen.map((anlage) => anlage.afa),
    ergebnis.investitionen.summeAbschreibungCents,
  );
  const sofort = summe(
    ctx,
    "Sofortaufwand",
    anlagen.map((anlage) => anlage.sofort),
    ergebnis.investitionen.summeSofortaufwandCents,
  );
  const vorsteuerAnlage = summe(
    ctx,
    "Vorsteuer Anlagen und Waren",
    anlagen.map((anlage) => anlage.vorsteuer),
    ergebnis.investitionen.vorsteuerCents,
  );
  const waren = warenReihe(ctx);
  const auszahlungInvest = summe(
    ctx,
    "Investitionen Zahlung",
    [...anlagen.map((anlage) => anlage.auszahlung), waren.auszahlung],
    ergebnis.investitionen.summeAuszahlungCents,
  );

  const darlehen = ergebnis.finanzierung.darlehen.map((posten, index) =>
    darlehenReihe(ctx, eingabe.darlehen[index]!, posten),
  );
  const zinsen = summe(
    ctx,
    "Zinsen",
    darlehen.map((posten) => posten.zins),
    ergebnis.finanzierung.summeZinsCents,
  );
  const tilgung = summe(
    ctx,
    "Tilgung",
    darlehen.map((posten) => posten.tilgung),
    ergebnis.finanzierung.summeTilgungCents,
  );
  const restschuld = summe(
    ctx,
    "Restschuld",
    darlehen.map((posten) => posten.rest),
    ergebnis.finanzierung.summeRestschuldCents,
  );
  const darlehenAus = summe(
    ctx,
    "Darlehensauszahlung",
    darlehen.map((posten) => posten.auszahlung),
    ergebnis.finanzierung.summeDarlehenAuszahlungCents,
  );
  const finanzaufwand = summe(
    ctx,
    "Finanzierungsaufwand",
    darlehen.map((posten) => posten.finanz),
    ergebnis.finanzierung.summeFinanzierungsaufwandCents,
  );

  const eigen = eigenkapital(ctx);
  const zuschuss = zuschuesse(ctx);
  const einlagen = summe(ctx, "Einlagen", eigen, ergebnis.finanzierung.summeEinlagenCents);
  const zuschussZahlung = summe(
    ctx,
    "Zuschüsse Zahlung",
    zuschuss.map((posten) => posten.zahlung),
    ergebnis.finanzierung.summeZuschussCents,
  );
  const zuschussErtrag = summe(
    ctx,
    "Zuschüsse Ertrag",
    zuschuss.map((posten) => posten.ertrag),
    ergebnis.finanzierung.summeZuschussErtragCents,
  );

  const vorsteuer = summe(
    ctx,
    "Vorsteuer gesamt",
    [vorsteuerWare, vorsteuerKosten, vorsteuerEinmal, vorsteuerAnlage, waren.vorsteuer],
    ergebnis.umsatzsteuer.vorsteuerCents,
  );
  const zahllast = monatsCent(
    rechnung,
    "Umsatzsteuer-Zahllast",
    Array.from({ length: N }, (_, index) => `${zelle(ustTimed, index)}-${zelle(vorsteuer, index)}`),
    ergebnis.umsatzsteuer.zahllastCents,
  );
  const ustZahlung = ustZahlungen(ctx, zahllast, ergebnis.umsatzsteuer.zahlungCents);

  const betrieb = monatsCent(
    rechnung,
    "Betriebsergebnis",
    Array.from({ length: N }, (_, index) =>
      [
        zelle(umsatz, index),
        `-(${zelle(wareneinsatz, index)})`,
        `-(${zelle(personal, index)})`,
        `-(${zelle(laufend, index)})`,
        `-(${zelle(gruendung, index)})`,
        `-(${zelle(sofort, index)})`,
        `-(${zelle(abschreibung, index)})`,
        `-(${zelle(zinsen, index)})`,
        `-(${zelle(finanzaufwand, index)})`,
        `+(${zelle(zuschussErtrag, index)})`,
      ].join(""),
    ),
    ergebnis.uebersicht.betriebsergebnisCents,
    "ergebnis",
  );

  ctx.betrieb = betrieb;
  const steuer = baueSteuer(ctx, betrieb);
  const entnahmen = entnahmeReihe(ctx);
  const auszahlungKosten = summe(
    ctx,
    "Auszahlung Kosten gesamt",
    [kostenZahlung, einmalZahlung],
    ergebnis.uebersicht.auszahlungenKostenCents,
  );
  const auszahlungPersonal = personal;

  const einzahlungen = monatsCent(
    rechnung,
    "Einzahlungen",
    Array.from({ length: N }, (_, index) =>
      [
        zelle(einzahlungKunden, index),
        zelle(einlagen, index),
        zelle(darlehenAus, index),
        zelle(zuschussZahlung, index),
        zufluss(zelle(ustZahlung, index)),
        zufluss(zelle(steuer.est, index)),
        zufluss(zelle(steuer.gewst, index)),
        zufluss(zelle(steuer.kst, index)),
      ].join("+"),
    ),
    ergebnis.uebersicht.einzahlungenKundenCents.map(
      (_, index) =>
        (ergebnis.uebersicht.einzahlungenKundenCents[index] ?? 0) +
        (ergebnis.uebersicht.einlagenCents[index] ?? 0) +
        (ergebnis.uebersicht.darlehensauszahlungCents[index] ?? 0) +
        (ergebnis.uebersicht.zuschuesseZahlungCents[index] ?? 0) +
        Math.max(-(ergebnis.uebersicht.umsatzsteuerZahlungCents[index] ?? 0), 0) +
        Math.max(-(ergebnis.uebersicht.steuerEinkommenZahlungCents[index] ?? 0), 0) +
        Math.max(-(ergebnis.uebersicht.steuerGewerbeZahlungCents[index] ?? 0), 0) +
        Math.max(-(ergebnis.uebersicht.steuerKoerperschaftZahlungCents[index] ?? 0), 0),
    ),
    "ergebnis",
  );
  const auszahlungen = monatsCent(
    rechnung,
    "Auszahlungen",
    Array.from({ length: N }, (_, index) =>
      [
        zelle(auszahlungWare, index),
        zelle(auszahlungPersonal, index),
        zelle(auszahlungKosten, index),
        zelle(auszahlungInvest, index),
        zelle(zinsen, index),
        zelle(tilgung, index),
        abfluss(zelle(ustZahlung, index)),
        abfluss(zelle(steuer.est, index)),
        abfluss(zelle(steuer.gewst, index)),
        abfluss(zelle(steuer.kst, index)),
        zelle(entnahmen, index),
      ].join("+"),
    ),
    leer().map((_, index) => {
      const u = ergebnis.uebersicht;
      return (
        (u.auszahlungenWareneinsatzCents[index] ?? 0) +
        (u.auszahlungenPersonalCents[index] ?? 0) +
        (u.auszahlungenKostenCents[index] ?? 0) +
        (u.auszahlungenInvestitionenCents[index] ?? 0) +
        (u.auszahlungenZinsenCents[index] ?? 0) +
        (u.auszahlungenTilgungCents[index] ?? 0) +
        Math.max(u.umsatzsteuerZahlungCents[index] ?? 0, 0) +
        Math.max(u.steuerEinkommenZahlungCents[index] ?? 0, 0) +
        Math.max(u.steuerGewerbeZahlungCents[index] ?? 0, 0) +
        Math.max(u.steuerKoerperschaftZahlungCents[index] ?? 0, 0) +
        (u.entnahmenCents[index] ?? 0)
      );
    }),
    "ergebnis",
  );
  const anfangCents = leer();
  const endeCents = leer();
  for (let index = 0; index < N; index += 1) {
    anfangCents[index] = index === 0 ? 0 : (endeCents[index - 1] ?? 0);
    endeCents[index] =
      (anfangCents[index] ?? 0) +
      (einzahlungen.cents[index] ?? 0) -
      (auszahlungen.cents[index] ?? 0);
  }
  const anfang = monatsCent(
    rechnung,
    "Anfangsbestand",
    Array.from({ length: N }, () => "0"),
    anfangCents,
  );
  const endeZeile = anfang.zeile + 1;
  for (let index = 1; index < N; index += 1) {
    rechnung.setze(anfang.zeile, index + 2, {
      formel: rechnung.lokal(endeZeile, index + 1),
      ergebnis: anfangCents[index] ?? 0,
      format: "cent",
      stil: "formel",
    });
  }
  const ende = monatsCent(
    rechnung,
    "Endbestand",
    Array.from(
      { length: N },
      (_, index) =>
        `${zelle(anfang, index)}+${zelle(einzahlungen, index)}-${zelle(auszahlungen, index)}`,
    ),
    endeCents,
    "ergebnis",
  );
  if (ende.zeile !== endeZeile) {
    throw new Error("Der Endbestand muss direkt auf den Anfangsbestand folgen.");
  }

  const kapitalInvest = kapitalAusAnlagen(
    ctx,
    "Kapital Investitionen",
    anlagen.filter((anlage) => anlage.herkunft === "investition"),
  );
  const kapitalGruendung = kapitalNetto(ctx, "Kapital Gründungskosten", [
    ...eingabe.anlagen.filter((anlage) => anlage.herkunft === "gruendung"),
    ...eingabe.einmal.filter((posten) => posten.herkunft === "gruendung"),
  ]);
  const kapitalAnlauf = kapitalNetto(ctx, "Kapital Anlaufkosten", [
    ...eingabe.anlagen.filter((anlage) => anlage.herkunft === "anlauf"),
    ...eingabe.einmal.filter((posten) => posten.herkunft === "anlauf"),
  ]);
  const kapitalWaren = monatsCent(
    rechnung,
    "Kapital Waren-Erstbestand",
    Array.from({ length: N }, (_, index) => (index === 0 ? fCent(ctx.skalare.waren) : "0")),
    monatEinmal(plan.kapitalbedarf.betriebsmittel.warenErstbestandNettoCents ?? 0),
  );
  const kapitalMittel = monatsCent(
    rechnung,
    "Kapital Betriebsmittel",
    Array.from({ length: N }, (_, index) =>
      index === 0 ? fCent(ctx.skalare.betriebsmittel) : "0",
    ),
    monatEinmal(plan.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents),
  );
  const kapitalReserve = monatsCent(
    rechnung,
    "Kapital Reserve",
    Array.from({ length: N }, (_, index) => (index === 0 ? fCent(ctx.skalare.reserve) : "0")),
    monatEinmal(plan.kapitalbedarf.betriebsmittel.liquiditaetsreserveCents),
  );
  const kapitalEigen = summe(
    ctx,
    "Kapital Eigenmittel",
    eigen,
    ergebnis.finanzierung.summeEinlagenCents,
  );
  const kapitalDarlehen = kapitalNominal(ctx);
  const kapitalZuschuss = zuschussZahlung;

  return {
    parameter,
    rechnung,
    steuer: steuerBlatt,
    umsatz,
    wareneinsatz,
    personal,
    raum,
    laufendOhneRaum,
    gruendung,
    sofort,
    finanzaufwand,
    zuschussErtrag,
    abschreibung,
    zinsen,
    betriebsergebnis: betrieb,
    einzahlungKunden,
    auszahlungWare,
    auszahlungPersonal,
    auszahlungKosten,
    auszahlungInvest,
    auszahlungZins: zinsen,
    auszahlungTilgung: tilgung,
    ustZahlung,
    einlagen,
    darlehenAus,
    zuschussZahlung,
    entnahmen,
    estZahlung: steuer.est,
    gewstZahlung: steuer.gewst,
    kstZahlung: steuer.kst,
    ruecklage: steuer.ruecklage,
    ruecklageKumuliert: steuer.ruecklageKumuliert,
    steuerAufwand: steuer.aufwand,
    anfang,
    einzahlungen,
    auszahlungen,
    ende,
    restschuld,
    kapitalInvest,
    kapitalGruendung,
    kapitalAnlauf,
    kapitalWaren,
    kapitalMittel,
    kapitalReserve,
    kapitalEigen,
    kapitalDarlehen,
    kapitalZuschuss,
    anlagen,
    darlehen,
    linien: linien.map((linie) => ({ name: linie.name, netto: linie.netto })),
    personen: steuer.personen,
    monate: ergebnis.monate,
  };
}

interface Ctx {
  plan: Finanzplan;
  eingabe: EingabeModell;
  ergebnis: Planberechnung;
  parameter: Blatt;
  rechnung: Blatt;
  steuer: Blatt;
  skalare: Skalare;
  jahrZeile: number;
  monatZeile: number;
  betrieb?: Reihe;
}

function baueParameter(skalare: Skalare, monate: readonly IsoMonth[]): Blatt {
  const blatt = new Blatt("Parameter");
  blatt.zeile({
    text: "Parameter und Monatsachse. Die Achse folgt dem Startmonat auf dem Blatt Eingaben.",
    stil: "hinweis",
  });
  blatt.zeile(
    { text: "Planmonat ab 0" },
    ...Array.from({ length: N }, (_, index) => ({ zahl: index, format: "ganzzahl" as const })),
  );
  const indexZeile = 2;
  const datum = blatt.zeile(
    { text: "Datum" },
    ...monate.map((_, index) => ({
      formel: `EDATE(DATE(${skalare.startJahr},${skalare.startMonat},1),${blatt.lokal(indexZeile, index + 2)})`,
      ergebnis: monate[index] ?? "",
      stil: "formel" as const,
    })),
  );
  blatt.zeile(
    { text: "Kalenderjahr" },
    ...monate.map((monat, index) => ({
      formel: `YEAR(${blatt.lokal(datum, index + 2)})`,
      ergebnis: parseIsoMonth(monat).year,
      format: "ganzzahl" as const,
      stil: "formel" as const,
    })),
  );
  blatt.zeile(
    { text: "Kalendermonat" },
    ...monate.map((monat, index) => ({
      formel: `MONTH(${blatt.lokal(datum, index + 2)})`,
      ergebnis: parseIsoMonth(monat).month,
      format: "ganzzahl" as const,
      stil: "formel" as const,
    })),
  );
  blatt.breite(1, 28);
  return blatt;
}

function umsatzLinie(
  ctx: Ctx,
  linie: UmsatzZellen,
  engine: Planberechnung["umsatz"]["linien"][number],
): {
  name: string;
  netto: Reihe;
  weAufwand: Reihe;
  weZahlung: Reihe;
  einzahlung: Reihe;
  ust: Reihe;
  vorsteuer: Reihe;
} {
  const vor = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} vor Verschiebung`,
    Array.from({ length: N }, (_, index) => umsatzVor(ctx, linie, index)),
    engine.nettoCents,
  );
  const netto = monatsCent(
    ctx.rechnung,
    linie.bezeichnung,
    Array.from({ length: N }, (_, index) => umsatzFinal(ctx, linie, vor, index)),
    engine.nettoCents,
  );
  const we = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Wareneinsatz`,
    Array.from({ length: N }, (_, index) => wareneinsatzAufwand(ctx, linie, zelle(netto, index))),
    engine.wareneinsatzAufwandCents,
  );
  const weRechnung = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Wareneinsatz Rechnung`,
    Array.from({ length: N }, (_, index) => wareneinsatzRechnung(ctx, linie, zelle(netto, index))),
    engine.wareneinsatzRechnungCents,
  );
  const ustEntstehung = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Umsatzsteuer Entstehung`,
    Array.from({ length: N }, (_, index) =>
      fWenn(`${ctx.skalare.klein}=1`, "0", fSatz(zelle(netto, index), linie.ust)),
    ),
    engine.umsatzsteuerCents,
  );
  const ust = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Umsatzsteuer`,
    Array.from({ length: N }, (_, index) =>
      zeitlich(ctx, ustEntstehung, linie.ziel, index, `${ctx.skalare.ist}=1`),
    ),
    engine.umsatzsteuerCents,
  );
  const brutto = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Rechnung`,
    Array.from(
      { length: N },
      (_, index) => `${zelle(netto, index)}+${zelle(ustEntstehung, index)}`,
    ),
    engine.rechnungBruttoCents,
  );
  const einzahlung = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Einzahlung`,
    Array.from({ length: N }, (_, index) => zeitlich(ctx, brutto, linie.ziel, index, "TRUE")),
    engine.einzahlungCents,
  );
  const vorsteuer = monatsCent(
    ctx.rechnung,
    `${linie.bezeichnung} Vorsteuer`,
    Array.from({ length: N }, (_, index) => wareneinsatzVorsteuer(ctx, linie, zelle(netto, index))),
    engine.vorsteuerCents,
  );
  void weRechnung;
  return {
    name: linie.bezeichnung,
    netto,
    weAufwand: we,
    weZahlung: weRechnung,
    einzahlung,
    ust,
    vorsteuer,
  };
}

function umsatzVor(ctx: Ctx, linie: UmsatzZellen, index: number): string {
  const aktiv = fAktiv(linie.aktivVon, linie.aktivBis, index);
  if (linie.art === "monatsumsatz" && linie.geld) {
    const unscaled = fCent(linie.geld.basis);
    const scaled = fWenn(
      fUndShift0(ctx, "<>"),
      fRund(`(${unscaled})*(${ctx.skalare.umsatzHebel})`),
      unscaled,
    );
    const ov = linie.geld.overrides[index] ?? "";
    const ovWert = fWenn(
      fUndShift0(ctx, "<>"),
      fRund(`(${fCent(ov)})*(${ctx.skalare.umsatzHebel})`),
      fCent(ov),
    );
    const geld = geldFormel(linie.geld, index, monat(ctx, index), scaled, ov, ovWert);
    const nach = fWenn(
      `${ctx.skalare.shift}>0`,
      fRund(`(${geld})*(${ctx.skalare.umsatzHebel})`),
      geld,
    );
    return fWenn(aktiv, nach, "0");
  }
  const menge = linie.menge!;
  const preis = linie.preis!;
  const mengeWert = geldFormel(
    menge,
    index,
    monat(ctx, index),
    `(${menge.basis})`,
    menge.overrides[index] ?? "",
    `(${menge.overrides[index]})`,
  );
  const preisWert = geldFormel(
    preis,
    index,
    monat(ctx, index),
    fCent(preis.basis),
    preis.overrides[index] ?? "",
    fCent(preis.overrides[index] ?? ""),
  );
  return fWenn(aktiv, fRund(`(${mengeWert})*(${ctx.skalare.umsatzHebel})*(${preisWert})`), "0");
}

function umsatzFinal(ctx: Ctx, linie: UmsatzZellen, vor: Reihe, index: number): string {
  const menge = fWenn(`${linie.faktorMenge}=""`, ctx.skalare.umsatzGlobal, linie.faktorMenge);
  const preis = fWenn(`${linie.faktorPreis}=""`, "1", linie.faktorPreis);
  const verschoben = verschiebe(vor, index, ctx.skalare.shift);
  if (linie.art === "menge_mal_preis") {
    return fWenn(
      `${ctx.skalare.shift}>0`,
      fRund(`(${verschoben})*(${menge})`),
      fRund(`(${umsatzVor(ctx, linie, index)})*(${menge})*(${preis})`),
    );
  }
  return fRund(`(${verschoben})*(${menge})`);
}

function fUndShift0(ctx: Ctx, vergleich: "<>"): string {
  return `AND(${ctx.skalare.shift}=0,${ctx.skalare.umsatzHebel}${vergleich}1)`;
}

function wareneinsatzAufwand(ctx: Ctx, linie: UmsatzZellen, netto: string): string {
  const quote = fWenn(
    `${linie.weArt}=1`,
    fSatzKlemme(`(${linie.weQuote})+(${ctx.skalare.warePunkte})`, 0, 5),
    "0",
  );
  const we = fSatz(netto, quote);
  const vorsteuer = fSatz(we, linie.weUst);
  return fWenn(`${ctx.skalare.vorsteuer}=1`, we, `(${we})+(${vorsteuer})`);
}

function wareneinsatzRechnung(ctx: Ctx, linie: UmsatzZellen, netto: string): string {
  const quote = fWenn(
    `${linie.weArt}=1`,
    fSatzKlemme(`(${linie.weQuote})+(${ctx.skalare.warePunkte})`, 0, 5),
    "0",
  );
  const we = fSatz(netto, quote);
  return `(${we})+${fSatz(we, linie.weUst)}`;
}

function wareneinsatzVorsteuer(ctx: Ctx, linie: UmsatzZellen, netto: string): string {
  const quote = fWenn(
    `${linie.weArt}=1`,
    fSatzKlemme(`(${linie.weQuote})+(${ctx.skalare.warePunkte})`, 0, 5),
    "0",
  );
  const we = fSatz(netto, quote);
  return fWenn(`${ctx.skalare.vorsteuer}=1`, fSatz(we, linie.weUst), "0");
}

function personalStelle(ctx: Ctx, stelle: PersonalZellen, aufwand: number[]): Reihe {
  const faktor = fWenn(`${stelle.faktor}=""`, ctx.skalare.personalGlobal, stelle.faktor);
  return monatsCent(
    ctx.rechnung,
    stelle.bezeichnung,
    Array.from({ length: N }, (_, index) => {
      const aktiv = fAktiv(stelle.eintritt, stelle.austritt, index);
      const brutto = fRund(
        `(${skaliertesGeld(stelle.geld, ctx.skalare.personalHebel, index, monat(ctx, index))})*(${faktor})`,
      );
      const sonderRoh =
        stelle.sonder
          .map((sonder) => fWenn(`${sonder.index}=${index}`, fCent(sonder.betrag), "0"))
          .join("+") || "0";
      const sonder = fRund(
        `(${fWenn(`${ctx.skalare.personalHebel}<>1`, fRund(`(${sonderRoh})*(${ctx.skalare.personalHebel})`), sonderRoh)})*(${faktor})`,
      );
      const neben = fSatz(`(${brutto})+(${sonder})`, stelle.neben);
      return fWenn(aktiv, `(${brutto})+(${sonder})+(${neben})`, "0");
    }),
    aufwand,
  );
}

function kostenposition(
  ctx: Ctx,
  position: KostenZellen,
  umsatz: Reihe,
  engine: Planberechnung["kosten"]["positionen"][number],
): { aufwand: Reihe; auszahlung: Reihe; vorsteuer: Reihe } {
  const faktor = fWenn(`${position.faktor}=""`, ctx.skalare.kostenGlobal, position.faktor);
  const zuschlag = fWenn(`${position.zuschlag}=""`, "0", fCent(position.zuschlag));
  const netto = monatsCent(
    ctx.rechnung,
    `${position.bezeichnung} netto`,
    Array.from({ length: N }, (_, index) => {
      const aktiv = fAktiv(position.aktivVon, position.aktivBis, index);
      const basis =
        position.art === "fix" && position.geld
          ? skaliertesGeld(position.geld, ctx.skalare.kostenHebel, index, monat(ctx, index))
          : fSatz(
              zelle(umsatz, index),
              fSatzKlemme(`(${position.quote})*(${ctx.skalare.kostenHebel})`, 0, 5),
            );
      return fWenn(aktiv, `(${fRund(`(${basis})*(${faktor})`)})+(${zuschlag})`, "0");
    }),
    engine.aufwandCents,
  );
  const teile = (index: number) =>
    teileBetrag(
      zelle(netto, index),
      position.ust,
      position.betriebsausgabe,
      position.privatanteil,
      ctx.skalare.vorsteuer,
    );
  const aufwand = monatsCent(
    ctx.rechnung,
    `${position.bezeichnung} Aufwand`,
    Array.from({ length: N }, (_, index) => teile(index).aufwand),
    engine.aufwandCents,
  );
  const rechnung = monatsCent(
    ctx.rechnung,
    `${position.bezeichnung} Rechnung`,
    Array.from({ length: N }, (_, index) => teile(index).rechnung),
    engine.rechnungBruttoCents,
  );
  const vorsteuer = monatsCent(
    ctx.rechnung,
    `${position.bezeichnung} Vorsteuer`,
    Array.from({ length: N }, (_, index) => teile(index).vorsteuer),
    engine.vorsteuerCents,
  );
  const auszahlung = monatsCent(
    ctx.rechnung,
    `${position.bezeichnung} Auszahlung`,
    Array.from({ length: N }, (_, index) => zeitlich(ctx, rechnung, position.ziel, index, "TRUE")),
    engine.auszahlungCents,
  );
  return { aufwand, auszahlung, vorsteuer };
}

function einmalPosten(
  ctx: Ctx,
  posten: EingabeModell["einmal"][number],
  engine: Planberechnung["kosten"]["einmalig"][number],
): { aufwand: Reihe; auszahlung: Reihe; vorsteuer: Reihe } {
  const netto = fWenn(`${posten.monat}=""`, "0", fCent(posten.netto));
  const formel = (index: number, teil: "aufwand" | "vorsteuer" | "rechnung") =>
    fWenn(
      `${posten.monat}=${index}`,
      teileBetrag(netto, posten.ust, "1", "0", ctx.skalare.vorsteuer)[teil],
      "0",
    );
  const aufwand = monatsCent(
    ctx.rechnung,
    `${posten.bezeichnung} Aufwand`,
    Array.from({ length: N }, (_, index) => formel(index, "aufwand")),
    engine.aufwandCents,
  );
  const rechnung = monatsCent(
    ctx.rechnung,
    `${posten.bezeichnung} Rechnung`,
    Array.from({ length: N }, (_, index) => formel(index, "rechnung")),
    engine.rechnungBruttoCents,
  );
  const vorsteuer = monatsCent(
    ctx.rechnung,
    `${posten.bezeichnung} Vorsteuer`,
    Array.from({ length: N }, (_, index) => formel(index, "vorsteuer")),
    engine.vorsteuerCents,
  );
  const auszahlung = monatsCent(
    ctx.rechnung,
    `${posten.bezeichnung} Auszahlung`,
    Array.from({ length: N }, (_, index) => zeitlich(ctx, rechnung, posten.ziel, index, "TRUE")),
    engine.auszahlungCents,
  );
  return { aufwand, auszahlung, vorsteuer };
}

function anlageReihe(
  ctx: Ctx,
  anlage: AnlageZellen,
  engine: Planberechnung["investitionen"]["anlagen"][number],
): AnlageReihe & { vorsteuer: Reihe; finanz?: never; herkunft: AnlageZellen["herkunft"] } {
  const netto = fCent(anlage.netto);
  const vorsteuerBetrag = fSatz(netto, anlage.ust);
  const sofort = `(${netto})<(${fCent(ctx.skalare.sofortGrenze)})`;
  const aktivierung = fWenn(`${ctx.skalare.vorsteuer}=1`, netto, `(${netto})+(${vorsteuerBetrag})`);
  const monate = fWenn(
    sofort,
    "0",
    fWenn(`${anlage.methode}=2`, "1", fWenn(`${anlage.methode}=3`, "60", anlage.dauer)),
  );
  const bemessung = fWenn(sofort, "0", `MAX(0,(${aktivierung})-${fCent(anlage.rest)})`);
  const verteilt = fVerteilt(bemessung, `MAX(${monate},1)`);
  const regulaer = skalar(
    ctx.rechnung,
    `${anlage.bezeichnung} AfA regulär`,
    fWenn(`(${monate})<1`, "0", verteilt.regulaer),
    0,
  );
  const letzte = skalar(
    ctx.rechnung,
    `${anlage.bezeichnung} AfA letzte`,
    fWenn(`(${monate})<1`, "0", verteilt.letzte),
    0,
  );
  const afa = monatsCent(
    ctx.rechnung,
    `${anlage.bezeichnung} Abschreibung`,
    Array.from({ length: N }, (_, index) => {
      const offset = `${index}-(${anlage.afaStart})`;
      return fWenn(
        `OR(${sofort},${anlage.afaStart}="",(${monate})<1,${offset}<0,${offset}>=(${monate}))`,
        "0",
        fWenn(`${offset}=(${monate})-1`, letzte, regulaer),
      );
    }),
    engine.abschreibungCents,
  );
  const sofortReihe = monatsCent(
    ctx.rechnung,
    `${anlage.bezeichnung} Sofortaufwand`,
    Array.from({ length: N }, (_, index) =>
      fWenn(`AND(${sofort},${anlage.kauf}=${index})`, aktivierung, "0"),
    ),
    engine.sofortaufwandCents,
  );
  const zeileBuch = ctx.rechnung.zeilen.length + 1;
  const buchwert = monatsCent(
    ctx.rechnung,
    `${anlage.bezeichnung} Buchwert`,
    Array.from({ length: N }, (_, index) => {
      const afaZelle = `INDEX(${zeilenBereich(ctx.rechnung.ref(afa.zeile, 2), ctx.rechnung.ref(afa.zeile, 37))},1,${index + 1})`;
      const vorher = index === 0 ? "0" : ctx.rechnung.lokal(zeileBuch, index + 1);
      return fWenn(
        `${anlage.kauf}=""`,
        "0",
        fWenn(
          `${anlage.kauf}=${index}`,
          fWenn(sofort, "0", `(${aktivierung})-(${afaZelle})`),
          fWenn(`${anlage.kauf}<${index}`, `(${vorher})-(${afaZelle})`, "0"),
        ),
      );
    }),
    engine.buchwertCents,
  );
  const brutto = `(${netto})+(${vorsteuerBetrag})`;
  const zahlIndex = `(${anlage.kauf})+(${anlage.ziel})`;
  const auszahlung = monatsCent(
    ctx.rechnung,
    `${anlage.bezeichnung} Auszahlung`,
    Array.from({ length: N }, (_, index) =>
      fWenn(`AND(${anlage.kauf}<>"",${zahlIndex}=${index},${zahlIndex}<=35)`, brutto, "0"),
    ),
    engine.auszahlungCents,
  );
  const vorsteuer = monatsCent(
    ctx.rechnung,
    `${anlage.bezeichnung} Vorsteuer`,
    Array.from({ length: N }, (_, index) =>
      fWenn(`AND(${ctx.skalare.vorsteuer}=1,${anlage.kauf}=${index})`, vorsteuerBetrag, "0"),
    ),
    engine.vorsteuerCents,
  );
  return {
    name: anlage.bezeichnung,
    herkunft: anlage.herkunft,
    afa,
    sofort: sofortReihe,
    buchwert,
    auszahlung,
    vorsteuer,
  };
}

function darlehenReihe(
  ctx: Ctx,
  darlehen: DarlehenZellen,
  engine: Planberechnung["finanzierung"]["darlehen"][number],
): DarlehenReihe & { finanz: Reihe } {
  const nominal = fCent(darlehen.nominal);
  const tilgMonate = `MAX((${darlehen.laufzeit})-(${darlehen.frei}),0)`;
  const rate = fVerteilt(nominal, `MAX(${tilgMonate},1)`);
  const regulaer = skalar(
    ctx.rechnung,
    `${darlehen.bezeichnung} Tilgung regulär`,
    fWenn(`(${tilgMonate})<1`, "0", rate.regulaer),
    0,
  );
  const letzte = skalar(
    ctx.rechnung,
    `${darlehen.bezeichnung} Tilgung letzte`,
    fWenn(`(${tilgMonate})<1`, "0", rate.letzte),
    0,
  );
  const r = `(${darlehen.zins})/12`;
  const annuitaet = skalar(
    ctx.rechnung,
    `${darlehen.bezeichnung} Annuität`,
    fWenn(
      `OR(${darlehen.art}<>1,(${tilgMonate})<1)`,
      "0",
      fWenn(
        `${darlehen.zins}=0`,
        regulaer,
        fRund(`(${nominal})*${r}*POWER(1+${r},${tilgMonate})/(POWER(1+${r},${tilgMonate})-1)`),
      ),
    ),
    annuitaetCents(
      engine.nominalCents,
      engine.nominalzinsPa,
      Math.max(engine.laufzeitMonate - engine.tilgungsfreieMonate, 0),
    ),
  );
  const first = skalar(
    ctx.rechnung,
    `${darlehen.bezeichnung} erste Auszahlung`,
    darlehen.tranchen.length === 0
      ? "-1"
      : `MIN(${darlehen.tranchen.map((tranche) => tranche.index).join(",")})`,
    0,
  );
  const restZeile = ctx.rechnung.zeilen.length + 4;
  const zugang = (index: number) =>
    darlehen.tranchen
      .map((tranche) => fWenn(`${tranche.index}=${index}`, fCent(tranche.betrag), "0"))
      .join("+") || "0";
  const zinsFormeln: string[] = [];
  const tilgungFormeln: string[] = [];
  const restFormeln: string[] = [];
  const ausFormeln: string[] = [];
  const finanzFormeln: string[] = [];
  for (let index = 0; index < N; index += 1) {
    const offset = `${index}-(${first})`;
    const beginn = index === 0 ? "0" : ctx.rechnung.lokal(restZeile, index + 1);
    const istRate = `AND(${offset}>=1,${offset}<=${darlehen.laufzeit})`;
    const inGrace = `AND(${istRate},${offset}<=${darlehen.frei})`;
    const zins = fWenn(
      `AND(${istRate},NOT(AND(${inGrace},${darlehen.zinsInFrei}=0)))`,
      fZinsMonat(beginn, darlehen.zins),
      "0",
    );
    const nach = `(${beginn})+(${zugang(index)})`;
    const geplant = fWenn(`${offset}-(${darlehen.frei})=${tilgMonate}`, letzte, regulaer);
    const tilgung = fWenn(
      `NOT(${istRate})`,
      "0",
      fWenn(
        `${offset}=${darlehen.laufzeit}`,
        nach,
        fWenn(
          `OR(${inGrace},${tilgMonate}=0,${darlehen.art}=3)`,
          "0",
          fWenn(
            `${darlehen.art}=2`,
            `MIN(MAX(${geplant},0),${nach})`,
            fWenn(`${darlehen.art}=1`, `MIN(MAX((${annuitaet})-(${zins}),0),${nach})`, "0"),
          ),
        ),
      ),
    );
    const bar = fSatz(zugang(index), darlehen.anteil);
    const gebuehr = `(${fCent(darlehen.gebuehren)})+(${fCent(darlehen.disagio)})`;
    zinsFormeln.push(zins);
    tilgungFormeln.push(tilgung);
    restFormeln.push(`(${nach})-(${tilgung})`);
    ausFormeln.push(fWenn(`${offset}=0`, `(${bar})-(${gebuehr})`, bar));
    finanzFormeln.push(
      fWenn(
        `${offset}=0`,
        `(${zugang(index)})-(${bar})+(${gebuehr})`,
        `(${zugang(index)})-(${bar})`,
      ),
    );
  }
  const zins = monatsCent(
    ctx.rechnung,
    `${darlehen.bezeichnung} Zins`,
    zinsFormeln,
    engine.zinsCents,
  );
  const tilgungReihe = monatsCent(
    ctx.rechnung,
    `${darlehen.bezeichnung} Tilgung`,
    tilgungFormeln,
    engine.tilgungCents,
  );
  const rateReihe = monatsCent(
    ctx.rechnung,
    `${darlehen.bezeichnung} Rate`,
    Array.from({ length: N }, (_, index) => `${zelle(zins, index)}+${zelle(tilgungReihe, index)}`),
    engine.rateCents,
  );
  const rest = monatsCent(
    ctx.rechnung,
    `${darlehen.bezeichnung} Restschuld`,
    restFormeln,
    engine.restschuldCents,
  );
  if (rest.zeile !== restZeile)
    throw new Error("Die Restschuld muss an der vorgesehenen Zeile stehen.");
  const auszahlung = monatsCent(
    ctx.rechnung,
    `${darlehen.bezeichnung} Auszahlung`,
    ausFormeln,
    engine.auszahlungCents,
  );
  const finanz = monatsCent(
    ctx.rechnung,
    `${darlehen.bezeichnung} Finanzierungsaufwand`,
    finanzFormeln,
    engine.finanzierungsaufwandCents,
  );
  void roundCents;
  void verteilteRaten;
  return {
    name: darlehen.bezeichnung,
    zins,
    tilgung: tilgungReihe,
    rate: rateReihe,
    rest,
    auszahlung,
    finanz,
  };
}

function warenReihe(ctx: Ctx): { auszahlung: Reihe; vorsteuer: Reihe } {
  const bestand = ctx.ergebnis.investitionen.warenbestand;
  const netto = fCent(ctx.skalare.waren);
  const vorsteuerBetrag = fSatz(netto, ctx.skalare.warenSatz);
  const brutto = `(${netto})+(${vorsteuerBetrag})`;
  const auszahlung = monatsCent(
    ctx.rechnung,
    "Waren-Erstbestand Auszahlung",
    Array.from({ length: N }, (_, index) =>
      index === 0 ? fWenn(`(${netto})=0`, "0", brutto) : "0",
    ),
    bestand?.auszahlungCents ?? leer(),
  );
  const vorsteuer = monatsCent(
    ctx.rechnung,
    "Waren-Erstbestand Vorsteuer",
    Array.from({ length: N }, (_, index) =>
      index === 0
        ? fWenn(`AND(${ctx.skalare.vorsteuer}=1,(${netto})<>0)`, vorsteuerBetrag, "0")
        : "0",
    ),
    bestand?.vorsteuerCents ?? leer(),
  );
  return { auszahlung, vorsteuer };
}

function eigenkapital(ctx: Ctx): Reihe[] {
  return ctx.eingabe.eigenkapital.map((posten, index) =>
    monatsCent(
      ctx.rechnung,
      posten.bezeichnung,
      Array.from({ length: N }, (_, monat) =>
        fWenn(`${posten.index}=${monat}`, fCent(posten.betrag), "0"),
      ),
      ctx.ergebnis.finanzierung.eigenkapital[index]?.einzahlungCents ?? leer(),
    ),
  );
}

function zuschuesse(ctx: Ctx): { zahlung: Reihe; ertrag: Reihe }[] {
  return ctx.eingabe.zuschuesse.map((zuschuss, index) => {
    const engine = ctx.ergebnis.finanzierung.zuschuesse[index];
    const zahlung = monatsCent(
      ctx.rechnung,
      zuschuss.bezeichnung,
      Array.from({ length: N }, (_, monat) => zuschussMonat(zuschuss, monat)),
      engine?.betragCents ?? leer(),
    );
    const ertrag = monatsCent(
      ctx.rechnung,
      `${zuschuss.bezeichnung} Ertrag`,
      Array.from({ length: N }, (_, monat) =>
        fWenn(`${zuschuss.steuerfrei}=1`, "0", zelle(zahlung, monat)),
      ),
      engine?.ertragCents ?? leer(),
    );
    return { zahlung, ertrag };
  });
}

function zuschussMonat(zuschuss: ZuschussZellen, index: number): string {
  if (zuschuss.art === "frei") {
    return (
      zuschuss.positionen
        .map((posten) => fWenn(`${posten.index}=${index}`, fCent(posten.betrag), "0"))
        .join("+") || "0"
    );
  }
  const relativ = `${index}-(${zuschuss.start})`;
  const phase1 = fWenn(
    `AND(${relativ}>=0,${relativ}<${zuschuss.phase1})`,
    `(${fCent(zuschuss.alg!)})+(${fCent(zuschuss.pauschale!)})`,
    "0",
  );
  const phase2 = fWenn(
    `AND(${zuschuss.phase2An}=1,${relativ}>=${zuschuss.phase1},${relativ}<${zuschuss.phase1}+${zuschuss.phase2})`,
    fCent(zuschuss.pauschale!),
    "0",
  );
  return `(${phase1})+(${phase2})`;
}

function ustZahlungen(ctx: Ctx, zahllast: Reihe, cents: number[]): Reihe {
  const ziel = (index: number) => {
    const kalender = monat(ctx, index);
    const extra = fWenn(`${ctx.skalare.dauerfrist}=1`, "1", "0");
    const quartal = `${index}+ROUNDUP(${kalender}/3,0)*3-${kalender}+1+(${extra})`;
    const monatlich = `${index}+1+(${extra})`;
    return fWenn(
      `${ctx.skalare.klein}=1`,
      "-1",
      fWenn(`${ctx.skalare.viertel}=1`, quartal, monatlich),
    );
  };
  return monatsCent(
    ctx.rechnung,
    "Umsatzsteuer-Zahlung",
    Array.from({ length: N }, (_, index) => {
      const teile = Array.from({ length: N }, (_, herkunft) =>
        fWenn(`${ziel(herkunft)}=${index}`, zelle(zahllast, herkunft), "0"),
      );
      return teile.join("+");
    }),
    cents,
  );
}

function entnahmeReihe(ctx: Ctx): Reihe {
  const kapital = `OR(${ctx.skalare.rechtsform}="gmbh",${ctx.skalare.rechtsform}="ug")`;
  const formeln = Array.from({ length: N }, (_, index) => {
    const teile = ctx.eingabe.personen.flatMap((person) =>
      [person.lebenshaltung, person.kranken, person.pflege, person.alter, person.sonstige]
        .filter((geld): geld is GeldZellen => geld != null)
        .map((geld) =>
          geldFormel(
            geld,
            index,
            monat(ctx, index),
            fCent(geld.basis),
            geld.overrides[index] ?? "",
            fCent(geld.overrides[index] ?? ""),
          ),
        ),
    );
    const summeBedarf = teile.length ? teile.join("+") : "0";
    return fWenn(kapital, "0", summeBedarf);
  });
  return monatsCent(
    ctx.rechnung,
    "Privatentnahmen",
    formeln,
    ctx.ergebnis.uebersicht.entnahmenCents,
  );
}

interface SteuerErgebnis {
  est: Reihe;
  gewst: Reihe;
  kst: Reihe;
  ruecklage: Reihe;
  ruecklageKumuliert: Reihe;
  aufwand: Reihe;
  personen: PersonReihe[];
}

function baueSteuer(ctx: Ctx, betrieb: Reihe): SteuerErgebnis {
  const blatt = ctx.steuer;
  blatt.zeile({
    text: "Steuerberechnung in Cent. Vier Kalenderjahre ab dem Startjahr, auch wenn das letzte leer bleibt.",
    stil: "hinweis",
  });
  const tarif = tarifParameter(ctx.skalare);
  const jahrBereich = zeilenBereich(
    ctx.parameter.ref(ctx.jahrZeile, 2),
    ctx.parameter.ref(ctx.jahrZeile, 37),
  );
  const gewinnBereich = zeilenBereich(
    ctx.rechnung.ref(betrieb.zeile, 2),
    ctx.rechnung.ref(betrieb.zeile, 37),
  );
  const startJahr = `YEAR(DATE(${ctx.skalare.startJahr},${ctx.skalare.startMonat},1))`;
  const kapital = `OR(${ctx.skalare.rechtsform}="gmbh",${ctx.skalare.rechtsform}="ug")`;
  const gewerbe = `AND(${ctx.skalare.rechtsform}<>"",${ctx.skalare.rechtsform}<>"freiberufler")`;
  const jahre = [0, 1, 2, 3].map((offset) => {
    const jahrFormel = `(${startJahr})+${offset}`;
    const jahrZelle = skalar(blatt, `Jahr ${offset + 1}`, jahrFormel, 0, "ganzzahl");
    const monate = skalar(
      blatt,
      `Monate im Plan ${offset + 1}`,
      `COUNTIF(${jahrBereich},${jahrZelle})`,
      0,
      "ganzzahl",
    );
    const gewinn = skalar(
      blatt,
      `Gewinn ${offset + 1}`,
      `SUMIF(${jahrBereich},${jahrZelle},${gewinnBereich})`,
      0,
    );
    const abgerundet = skalar(
      blatt,
      `Gewerbeertrag abgerundet ${offset + 1}`,
      fWenn(
        `OR(NOT(${gewerbe}),(${gewinn})<=0,${ctx.skalare.hebesatz}="")`,
        "0",
        `INT((${gewinn})/${fCent(ctx.skalare.abrundung)})*${fCent(ctx.skalare.abrundung)}`,
      ),
      0,
    );
    const frei = fWenn(kapital, fCent(ctx.skalare.freiKapital), fCent(ctx.skalare.freiPersonen));
    const freibetrag = skalar(blatt, `Freibetrag ${offset + 1}`, `MIN(${frei},${abgerundet})`, 0);
    const massgebend = skalar(
      blatt,
      `Maßgebender Ertrag ${offset + 1}`,
      `(${abgerundet})-(${freibetrag})`,
      0,
    );
    const messExact = `INT((${massgebend})*ROUND((${ctx.skalare.messzahl})*1000,0)/1000)`;
    const messbetrag = skalar(blatt, `Messbetrag ${offset + 1}`, `INT((${messExact})/100)*100`, 0);
    const gewst = skalar(
      blatt,
      `Gewerbesteuer ${offset + 1}`,
      fWenn(
        `(${messbetrag})=0`,
        "0",
        `INT((${messbetrag})/100*ROUND((${ctx.skalare.hebesatz})*1000,0)/100000)*100`,
      ),
      0,
    );
    const kstEuro = fWenn(
      `OR(NOT(${kapital}),(${gewinn})<=0)`,
      "0",
      `INT(INT((${gewinn})/100)*ROUND((${ctx.skalare.kstSatz})*100,0)/100)`,
    );
    const kst = skalar(blatt, `Körperschaftsteuer ${offset + 1}`, `(${kstEuro})*100`, 0);
    const kstSoli = skalar(
      blatt,
      `Soli auf Körperschaftsteuer ${offset + 1}`,
      fSoli(kst, ctx.skalare.soliSatz, ctx.skalare.soliMild, ctx.skalare.soliFrei, "0", true),
      0,
    );
    return {
      jahrZelle,
      monate,
      gewinn,
      abgerundet,
      freibetrag,
      massgebend,
      messbetrag,
      gewst,
      kst,
      kstSoli,
      offset,
    };
  });

  const personen = personSteuer(ctx, blatt, jahre, tarif, kapital, gewerbe);
  const est = jahre.map((_jahr, index) =>
    skalar(
      blatt,
      `Einkommensteuer ${index + 1}`,
      personen.length ? personen.map((person) => person.est[index] ?? "0").join("+") : "0",
      ctx.ergebnis.steuern.jahre[index]?.einkommensteuerCents ?? 0,
    ),
  );
  const soli = jahre.map((_jahr, index) =>
    skalar(
      blatt,
      `Solidaritätszuschlag Personen ${index + 1}`,
      personen.length ? personen.map((person) => person.soli[index] ?? "0").join("+") : "0",
      ctx.ergebnis.steuern.jahre[index]?.solidaritaetszuschlagCents ?? 0,
    ),
  );
  const kist = jahre.map((_jahr, index) =>
    skalar(
      blatt,
      `Kirchensteuer ${index + 1}`,
      personen.length ? personen.map((person) => person.kist[index] ?? "0").join("+") : "0",
      ctx.ergebnis.steuern.jahre[index]?.kirchensteuerCents ?? 0,
    ),
  );
  const estPaket = jahre.map((_jahr, index) =>
    skalar(
      blatt,
      `Paket Einkommensteuer ${index + 1}`,
      `(${est[index]})+(${soli[index]})+(${kist[index]})`,
      0,
    ),
  );
  const kstPaket = jahre.map((jahr, index) =>
    skalar(
      blatt,
      `Paket Körperschaftsteuer ${index + 1}`,
      `(${jahr.kst})+(${jahr.kstSoli})`,
      ctx.ergebnis.steuern.jahre[index]
        ? (ctx.ergebnis.steuern.jahre[index]?.koerperschaftsteuerCents ?? 0) +
            (ctx.ergebnis.steuern.jahre[index]?.koerperschaftsteuerSoliCents ?? 0)
        : 0,
    ),
  );
  const last = jahre.map((jahr, index) =>
    skalar(
      blatt,
      `Steuerlast ${index + 1}`,
      `(${estPaket[index]})+(${jahr.gewst})+(${kstPaket[index]})`,
      ctx.ergebnis.steuern.jahre[index]?.steuerLastCents ?? 0,
    ),
  );

  const estZahlung = zahlungsReihe(
    ctx,
    "Einkommensteuer-Zahlung",
    estPaket,
    [3, 6, 9, 12],
    ctx.ergebnis.uebersicht.steuerEinkommenZahlungCents,
  );
  const gewstZahlung = zahlungsReihe(
    ctx,
    "Gewerbesteuer-Zahlung",
    jahre.map((jahr) => jahr.gewst),
    [2, 5, 8, 11],
    ctx.ergebnis.uebersicht.steuerGewerbeZahlungCents,
  );
  const kstZahlung = zahlungsReihe(
    ctx,
    "Körperschaftsteuer-Zahlung",
    kstPaket,
    [3, 6, 9, 12],
    ctx.ergebnis.uebersicht.steuerKoerperschaftZahlungCents,
  );
  const aufwand = verteilteSteuer(
    ctx,
    "Steueraufwand",
    last,
    jahre.map((jahr) => jahr.jahrZelle),
    ctx.ergebnis.steuern.jahre.map((jahr) => jahr.steuerLastCents),
  );
  const ruecklageCents = ctx.ergebnis.steuern.monate.map((monat) => monat.ruecklageCents);
  const ruecklage = monatsCent(
    ctx.rechnung,
    "Steuerrücklage",
    Array.from({ length: N }, (_, index) =>
      jahre
        .map((jahr, jahrIndex) =>
          fWenn(
            `${jahrZelle(ctx, index)}=${jahr.jahrZelle}`,
            ruecklageMonat(last[jahrIndex] ?? "0", jahr.monate, monat(ctx, index)),
            "0",
          ),
        )
        .join("+"),
    ),
    ruecklageCents,
  );
  const kumuliertCents = ctx.ergebnis.steuern.monate.map((monat) => monat.ruecklageKumuliertCents);
  const kumuliertZeile = ctx.rechnung.zeilen.length + 1;
  const ruecklageKumuliert = monatsCent(
    ctx.rechnung,
    "Steuerrücklage kumuliert",
    Array.from({ length: N }, (_, index) =>
      index === 0
        ? zelle(ruecklage, 0)
        : `${ctx.rechnung.lokal(kumuliertZeile, index + 1)}+${zelle(ruecklage, index)}`,
    ),
    kumuliertCents,
  );

  const personReihen: PersonReihe[] = personen.map((person) => ({
    name: person.name,
    anteil: person.anteil,
    gewinn: monatsCent(
      ctx.rechnung,
      `${person.name} Gewinnanteil`,
      Array.from({ length: N }, (_, index) => person.gewinnMonat(index)),
      person.gewinnCents,
    ),
    steuer: verteilteSteuer(
      ctx,
      `${person.name} Steuer`,
      person.summeJahr,
      jahre.map((jahr) => jahr.jahrZelle),
      person.summeCents,
    ),
    lebenshaltung: person.lebenshaltung,
    vorsorge: person.vorsorge,
  }));

  void est;
  return {
    est: estZahlung,
    gewst: gewstZahlung,
    kst: kstZahlung,
    ruecklage,
    ruecklageKumuliert: ruecklageKumuliert,
    aufwand,
    personen: personReihen,
  };
}

interface PersonSteuer {
  name: string;
  anteil: number;
  est: string[];
  soli: string[];
  kist: string[];
  summeJahr: string[];
  summeCents: number[];
  gewinnMonat: (index: number) => string;
  gewinnCents: number[];
  lebenshaltung: Reihe;
  vorsorge: Reihe;
}

function personSteuer(
  ctx: Ctx,
  blatt: Blatt,
  jahre: { jahrZelle: string; gewinn: string; messbetrag: string; gewst: string }[],
  tarif: TarifParameter,
  kapital: string,
  gewerbe: string,
): PersonSteuer[] {
  const personen = ctx.eingabe.personen.filter((person) => person.anteil);
  const summeAnteile = personen.map((person) => person.anteil).join("+") || "0";
  const skaliert = personen.map((person) =>
    skalar(
      blatt,
      `${person.name} Tausendstel`,
      fSkaliert(person.anteil, summeAnteile),
      0,
      "ganzzahl",
    ),
  );
  const enginePersonen = ctx.ergebnis.steuern.jahre[0]?.personen ?? [];
  return personen.map((person, personIndex) => {
    const letzter = personIndex === personen.length - 1;
    const gewinnJahr = jahre.map((jahr, jahrIndex) => {
      const vorher = personen.slice(0, personIndex).map(() => "0");
      return skalar(
        blatt,
        `${person.name} Gewinn ${jahrIndex + 1}`,
        fWenn(
          kapital,
          "0",
          letzter
            ? `(${jahr.gewinn})-(${vorher.join("+") || "0"})`
            : fAnteil(jahr.gewinn, skaliert[personIndex] ?? "0", null),
        ),
        ctx.ergebnis.steuern.jahre[jahrIndex]?.personen[personIndex]?.gewinnanteilCents ?? 0,
      );
    });
    const messAnteil = jahre.map((jahr, jahrIndex) =>
      anteilEuro(
        blatt,
        `${person.name} Messbetrag ${jahrIndex + 1}`,
        jahr.messbetrag,
        skaliert,
        personen,
        personIndex,
        letzter,
        kapital,
      ),
    );
    const gewstAnteil = jahre.map((jahr, jahrIndex) =>
      anteilEuro(
        blatt,
        `${person.name} Gewerbesteuer ${jahrIndex + 1}`,
        jahr.gewst,
        skaliert,
        personen,
        personIndex,
        letzter,
        kapital,
      ),
    );
    const satz = fWenn(
      `${person.kirchensteuer}=0`,
      "0",
      fWenn(
        `OR(${ctx.skalare.bundesland}="Bayern",${ctx.skalare.bundesland}="Baden-Württemberg")`,
        ctx.skalare.kistBayern,
        ctx.skalare.kistUebrige,
      ),
    );
    const est: string[] = [];
    const soli: string[] = [];
    const kist: string[] = [];
    const summeJahr: string[] = [];
    const summeCents: number[] = [];
    jahre.forEach((_jahr, jahrIndex) => {
      const engine = ctx.ergebnis.steuern.jahre[jahrIndex]?.personen[personIndex];
      const weitere = fCent(person.weitere);
      const kinder = fWenn(
        `(${person.kinder})<=0`,
        "0",
        `ROUND((${person.kinder})*2,0)*((${fCent(ctx.skalare.kinderFreibetrag)})+(${fCent(ctx.skalare.bea)}))`,
      );
      const zvE = `(${gewinnJahr[jahrIndex]})+(${weitere})-(${kinder})`;
      const zvEEuro = fWenn(`(${zvE})>0`, `INT((${zvE})/100)`, "0");
      const tarifCent = fEinkommensteuerCent(zvEEuro, person.splitting, tarif);
      const tarifZelle = skalar(
        blatt,
        `${person.name} Tarif ${jahrIndex + 1}`,
        fWenn(kapital, "0", tarifCent),
        engine?.tariflicheEinkommensteuerCents ?? 0,
      );
      const posGew = fWenn(
        `AND(${gewerbe},(${gewinnJahr[jahrIndex]})>0)`,
        `INT((${gewinnJahr[jahrIndex]})/100)`,
        "0",
      );
      const posWeiter = fWenn(`(${weitere})>0`, `INT((${weitere})/100)`, "0");
      const posEink = `(${posGew})+(${posWeiter})`;
      const vierfach = `INT((${messAnteil[jahrIndex]})/100)*ROUND(${ctx.skalare.anrechnungFaktor},0)`;
      const estEuro = `INT((${tarifZelle})/100)`;
      const hoechst = fWenn(
        `OR((${estEuro})<=0,(${posGew})<=0,(${posEink})<=0)`,
        "0",
        `INT((${estEuro})*MIN(${posGew},${posEink})/(${posEink}))`,
      );
      const anrechnung = `MAX(0,MIN(${vierfach},INT((${gewstAnteil[jahrIndex]})/100),${hoechst},${estEuro}))*100`;
      const estZelle = skalar(
        blatt,
        `${person.name} Einkommensteuer ${jahrIndex + 1}`,
        fWenn(kapital, "0", `(${tarifZelle})-(${anrechnung})`),
        engine?.einkommensteuerCents ?? 0,
      );
      const soliZelle = skalar(
        blatt,
        `${person.name} Soli ${jahrIndex + 1}`,
        fWenn(
          kapital,
          "0",
          fSoli(
            estZelle,
            ctx.skalare.soliSatz,
            ctx.skalare.soliMild,
            fCent(ctx.skalare.soliFrei),
            person.splitting,
            false,
          ),
        ),
        engine?.solidaritaetszuschlagCents ?? 0,
      );
      const kistZelle = skalar(
        blatt,
        `${person.name} Kirchensteuer ${jahrIndex + 1}`,
        fWenn(kapital, "0", fKirchensteuer(tarifZelle, satz)),
        engine?.kirchensteuerCents ?? 0,
      );
      const summe = skalar(
        blatt,
        `${person.name} Steuer gesamt ${jahrIndex + 1}`,
        `(${estZelle})+(${soliZelle})+(${kistZelle})+(${gewstAnteil[jahrIndex]})`,
        (engine?.einkommensteuerCents ?? 0) +
          (engine?.solidaritaetszuschlagCents ?? 0) +
          (engine?.kirchensteuerCents ?? 0) +
          (engine?.gewerbesteuerAnteilCents ?? 0),
      );
      est.push(estZelle);
      soli.push(soliZelle);
      kist.push(kistZelle);
      summeJahr.push(summe);
      summeCents.push(
        (engine?.einkommensteuerCents ?? 0) +
          (engine?.solidaritaetszuschlagCents ?? 0) +
          (engine?.kirchensteuerCents ?? 0) +
          (engine?.gewerbesteuerAnteilCents ?? 0),
      );
    });
    const gewinnCents = ctx.ergebnis.uebersicht.betriebsergebnisCents.map((gewinn) => {
      const teile = verteileCache(
        gewinn,
        personen.map((eintrag) => eintragAnteil(eintrag)),
      );
      return teile[personIndex] ?? 0;
    });
    const lebenshaltung = geldSumme(
      ctx,
      `${person.name} Lebenshaltung`,
      [person.lebenshaltung].filter((geld): geld is GeldZellen => geld != null),
    );
    const vorsorge = geldSumme(
      ctx,
      `${person.name} Vorsorge`,
      [person.kranken, person.pflege, person.alter, person.sonstige].filter(
        (geld): geld is GeldZellen => geld != null,
      ),
    );
    void enginePersonen;
    return {
      name: person.name,
      anteil: 0,
      est,
      soli,
      kist,
      summeJahr,
      summeCents,
      gewinnMonat: (index) =>
        fWenn(
          kapital,
          "0",
          letzter
            ? `(${zelleBetrieb(ctx, index)})-(${
                personen
                  .slice(0, personIndex)
                  .map(() => "0")
                  .join("+") || "0"
              })`
            : fAnteil(zelleBetrieb(ctx, index), skaliert[personIndex] ?? "0", null),
        ),
      gewinnCents,
      lebenshaltung,
      vorsorge,
    };
  });
}

function anteilEuro(
  blatt: Blatt,
  label: string,
  gesamt: string,
  skaliert: string[],
  personen: { name: string }[],
  index: number,
  letzter: boolean,
  kapital: string,
): string {
  const euro = `INT((${gesamt})/100)`;
  const vorher = personen.slice(0, index).map(() => "0");
  const teil = letzter
    ? `(${euro})-(${vorher.join("+") || "0"})`
    : fAnteil(euro, skaliert[index] ?? "0", null);
  return skalar(blatt, label, fWenn(kapital, "0", `(${teil})*100`), 0);
}

function eintragAnteil(person: { anteil: string }): number {
  void person;
  return 0;
}

function verteileCache(gesamt: number, anteile: number[]): number[] {
  if (anteile.length === 0 || anteile.every((anteil) => anteil === 0)) return anteile.map(() => 0);
  const summe = anteile.reduce((total, anteil) => total + anteil, 0);
  if (gesamt === 0 || summe === 0) return anteile.map(() => 0);
  const skaliert = anteile.map((anteil) => Math.round((anteil / summe) * 1_000_000));
  const teile = skaliert.map((anteil, index) =>
    index === skaliert.length - 1 ? 0 : Math.trunc((gesamt * anteil) / 1_000_000),
  );
  const benutzt = teile.slice(0, -1).reduce((total, teil) => total + teil, 0);
  teile[teile.length - 1] = gesamt - benutzt;
  return teile;
}

function zahlungsReihe(
  ctx: Ctx,
  label: string,
  paket: string[],
  monate: number[],
  cents: number[],
): Reihe {
  return monatsCent(
    ctx.rechnung,
    label,
    Array.from({ length: N }, (_, index) =>
      paket
        .map((betrag, jahrIndex) => {
          const vor = jahrIndex === 0 ? "0" : paket[jahrIndex - 1]!;
          const jahr = `(YEAR(DATE(${ctx.skalare.startJahr},${ctx.skalare.startMonat},1))+${jahrIndex})`;
          const abschluss = fWenn(
            `AND(${jahrZelle(ctx, index)}=${jahr}+1,${monat(ctx, index)}=${ctx.skalare.abschluss})`,
            `(${betrag})-(${vor})`,
            "0",
          );
          const voraus =
            jahrIndex === 0
              ? "0"
              : monate
                  .map((termin, quartal) =>
                    fWenn(
                      `AND(${jahrZelle(ctx, index)}=${jahr},${monat(ctx, index)}=${termin})`,
                      fViertel(vor, quartal as 0 | 1 | 2 | 3),
                      "0",
                    ),
                  )
                  .join("+");
          return `(${abschluss})+(${voraus})`;
        })
        .join("+"),
    ),
    cents,
  );
}

function verteilteSteuer(
  ctx: Ctx,
  label: string,
  lasten: string[],
  jahre: string[],
  _jahresCents: number[],
): Reihe {
  const cents = leer();
  ctx.ergebnis.monate.forEach((monat, index) => {
    const jahr = parseIsoMonth(monat).year;
    const treffer = ctx.ergebnis.steuern.jahre.find((eintrag) => eintrag.jahr === jahr);
    if (!treffer) return;
    const indizes = ctx.ergebnis.monate
      .map((eintrag, monatIndex) => (parseIsoMonth(eintrag).year === jahr ? monatIndex : -1))
      .filter((monatIndex) => monatIndex >= 0);
    const teile = verteileGleich(treffer.steuerLastCents, indizes.length);
    const position = indizes.indexOf(index);
    cents[index] = teile[position] ?? 0;
  });
  void _jahresCents;
  return monatsCent(
    ctx.rechnung,
    label,
    Array.from({ length: N }, (_, index) =>
      lasten
        .map((last, jahrIndex) => {
          const jahr = jahre[jahrIndex] ?? "0";
          const anzahl = `COUNTIF(${zeilenBereich(ctx.parameter.ref(ctx.jahrZeile, 2), ctx.parameter.ref(ctx.jahrZeile, 37))},${jahr})`;
          const erste = `MATCH(${jahr},${zeilenBereich(ctx.parameter.ref(ctx.jahrZeile, 2), ctx.parameter.ref(ctx.jahrZeile, 37))},0)`;
          const verteilt = fVerteilt(last, `MAX(${anzahl},1)`);
          return fWenn(
            `OR(${anzahl}<1,${jahrZelle(ctx, index)}<>${jahr})`,
            "0",
            fWenn(`${index + 1}=(${erste})+(${anzahl})-1`, verteilt.letzte, verteilt.regulaer),
          );
        })
        .join("+"),
    ),
    cents,
  );
}

function verteileGleich(summe: number, monate: number): number[] {
  if (monate < 1) return [];
  const { regulaer, letzte } = verteilteRaten(summe, monate);
  const werte = Array.from({ length: monate }, () => regulaer);
  werte[monate - 1] = letzte;
  return werte;
}

function ruecklageMonat(steuer: string, monate: string, kalenderMonat: string): string {
  const euro = `INT((${steuer})/100)`;
  const rest = `(${steuer})-(${euro})*100`;
  const basis = `INT((${euro})/12)`;
  const voll = `(${monate})=12`;
  const dezember = fWenn(voll, `(${euro})-(${basis})*11`, basis);
  return fWenn(
    `${kalenderMonat}=12`,
    `(${dezember})*100+${fWenn(voll, rest, "0")}`,
    `(${basis})*100`,
  );
}

function tarifParameter(skalare: Skalare): TarifParameter {
  return {
    grundfreibetragCent: fCent(skalare.grundfreibetrag),
    zone2Bis: skalare.zone2Bis,
    zone3Bis: skalare.zone3Bis,
    zone4Bis: skalare.zone4Bis,
    zone3Schwelle: skalare.zone3Schwelle,
    zone2Faktor: skalare.zone2Faktor,
    zone2Summand: skalare.zone2Summand,
    zone3Faktor: skalare.zone3Faktor,
    zone3Summand: skalare.zone3Summand,
    zone3Konstante: skalare.zone3Konstante,
    zone4Abzug: skalare.zone4Abzug,
    zone5Abzug: skalare.zone5Abzug,
    spitzen: skalare.spitzen,
    reichen: skalare.reichen,
  };
}

function geldSumme(ctx: Ctx, label: string, gelder: GeldZellen[]): Reihe {
  return monatsCent(
    ctx.rechnung,
    label,
    Array.from(
      { length: N },
      (_, index) =>
        gelder
          .map((geld) =>
            geldFormel(
              geld,
              index,
              monat(ctx, index),
              fCent(geld.basis),
              geld.overrides[index] ?? "",
              fCent(geld.overrides[index] ?? ""),
            ),
          )
          .join("+") || "0",
    ),
    leer(),
  );
}

function kapitalAusAnlagen(ctx: Ctx, label: string, anlagen: AnlageReihe[]): Reihe {
  const quelle = ctx.eingabe.anlagen.filter((anlage) =>
    anlagen.some(
      (reihe) => reihe.name === anlage.bezeichnung && reihe.herkunft === anlage.herkunft,
    ),
  );
  const teile =
    label === "Kapital Investitionen"
      ? ctx.plan.kapitalbedarf.investitionen.map((posten) => ({
          monat: posten.anschaffungsmonat,
          betrag: posten.nettoCents,
        }))
      : [];
  return monatsCent(
    ctx.rechnung,
    label,
    Array.from(
      { length: N },
      (_, index) =>
        quelle
          .map((anlage) => fWenn(`${anlage.kauf}=${index}`, fCent(anlage.netto), "0"))
          .join("+") || "0",
    ),
    postenCents(ctx.ergebnis.monate, teile),
  );
}

function kapitalNetto(
  ctx: Ctx,
  label: string,
  posten: { netto: string; kauf?: string; monat?: string; herkunft?: string }[],
): Reihe {
  const liste =
    label === "Kapital Gründungskosten"
      ? ctx.plan.kapitalbedarf.gruendungskosten
      : ctx.plan.kapitalbedarf.anlaufkosten;
  return monatsCent(
    ctx.rechnung,
    label,
    Array.from(
      { length: N },
      (_, index) =>
        posten
          .map((eintrag) =>
            fWenn(`${eintrag.kauf ?? eintrag.monat}=${index}`, fCent(eintrag.netto), "0"),
          )
          .join("+") || "0",
    ),
    postenCents(
      ctx.ergebnis.monate,
      liste.map((eintrag) => ({ monat: eintrag.monat, betrag: eintrag.nettoCents })),
    ),
  );
}

function postenCents(
  monate: readonly IsoMonth[],
  teile: { monat: IsoMonth; betrag: number }[],
): number[] {
  const werte = leer();
  for (const teil of teile) {
    const index = monate.indexOf(teil.monat);
    if (index >= 0) werte[index] = (werte[index] ?? 0) + teil.betrag;
  }
  return werte;
}

function kapitalNominal(ctx: Ctx): Reihe {
  const cents = leer();
  ctx.plan.finanzierung.darlehen.forEach((darlehen) => {
    darlehen.auszahlungen.forEach((tranche) => {
      const index = ctx.ergebnis.monate.indexOf(tranche.monat);
      if (index >= 0) cents[index] = (cents[index] ?? 0) + tranche.betragCents;
    });
  });
  return monatsCent(
    ctx.rechnung,
    "Kapital Darlehen nominal",
    Array.from(
      { length: N },
      (_, index) =>
        ctx.eingabe.darlehen
          .flatMap((darlehen) =>
            darlehen.tranchen.map((tranche) =>
              fWenn(`${tranche.index}=${index}`, fCent(tranche.betrag), "0"),
            ),
          )
          .join("+") || "0",
    ),
    cents,
  );
}

function geldFormel(
  geld: GeldZellen,
  index: number,
  kalenderMonat: string,
  basis: string,
  overrideZelle: string,
  overrideWert: string,
): string {
  const abstand = `${index}-(${geld.bezug})`;
  const wachstum = fWachstum(geld.modus, geld.rate, abstand);
  const saison = `INDEX(${zeilenBereich(geld.saisonVon, geld.saisonBis)},1,${kalenderMonat})`;
  const kern =
    geld.einheit === "euro"
      ? fRund(`(${basis})*(${wachstum})*(${saison})`)
      : `((${basis})*(${wachstum})*(${saison}))`;
  return fWenn(`${overrideZelle}=""`, kern, overrideWert);
}

function skaliertesGeld(
  geld: GeldZellen,
  hebel: string,
  index: number,
  kalenderMonat: string,
): string {
  const basis = fCent(geld.basis);
  const scaled = fWenn(`${hebel}<>1`, fRund(`(${basis})*(${hebel})`), basis);
  const ov = geld.overrides[index] ?? "";
  const ovWert = fWenn(`${hebel}<>1`, fRund(`(${fCent(ov)})*(${hebel})`), fCent(ov));
  return geldFormel(geld, index, kalenderMonat, scaled, ov, ovWert);
}

function teileBetrag(
  netto: string,
  satz: string,
  betriebsausgabe: string,
  privat: string,
  vorsteuer: string,
): { aufwand: string; vorsteuer: string; rechnung: string } {
  const anteil = fWenn(`${betriebsausgabe}=1`, `1-(${privat})`, "0");
  const betriebsnetto = fSatz(netto, anteil);
  const vor = fWenn(`${vorsteuer}=1`, fSatz(betriebsnetto, satz), "0");
  const aufwand = fWenn(
    `${vorsteuer}=1`,
    betriebsnetto,
    `(${betriebsnetto})+${fSatz(betriebsnetto, satz)}`,
  );
  const rechnung = `(${netto})+${fSatz(netto, satz)}`;
  return { aufwand, vorsteuer: vor, rechnung };
}

function zeitlich(
  ctx: Ctx,
  quelle: Reihe,
  zielMonate: string,
  index: number,
  bedingung: string,
): string {
  const bereich = zeilenBereich(
    ctx.rechnung.ref(quelle.zeile, 2),
    ctx.rechnung.ref(quelle.zeile, 37),
  );
  return fWenn(
    `NOT(${bedingung})`,
    zelle(quelle, index),
    fWenn(`${index}<${zielMonate}`, "0", `INDEX(${bereich},1,${index}-(${zielMonate})+1)`),
  );
}

function verschiebe(quelle: Reihe, index: number, shift: string): string {
  const bereich = zeilenBereich(
    quelle.blatt.ref(quelle.zeile, 2),
    quelle.blatt.ref(quelle.zeile, 37),
  );
  return fWenn(
    `${shift}<=0`,
    zelle(quelle, index),
    fWenn(`${index}<${shift}`, "0", `INDEX(${bereich},1,${index}-(${shift})+1)`),
  );
}

function zufluss(ausdruck: string): string {
  return fWenn(`(${ausdruck})<0`, `-(${ausdruck})`, "0");
}

function abfluss(ausdruck: string): string {
  return fWenn(`(${ausdruck})>0`, ausdruck, "0");
}

function zelle(reihe: Reihe, index: number): string {
  return reihe.blatt.ref(reihe.zeile, index + 2);
}

function monat(ctx: Ctx, index: number): string {
  return ctx.parameter.ref(ctx.monatZeile, index + 2);
}

function jahrZelle(ctx: Ctx, index: number): string {
  return ctx.parameter.ref(ctx.jahrZeile, index + 2);
}

function zelleBetrieb(ctx: Ctx, index: number): string {
  if (!ctx.betrieb) return "0";
  return zelle(ctx.betrieb, index);
}

function summe(ctx: Ctx, label: string, reihen: Reihe[], cents: readonly number[]): Reihe {
  if (reihen.length === 0)
    return monatsCent(
      ctx.rechnung,
      label,
      Array.from({ length: N }, () => "0"),
      cents,
    );
  return monatsCent(
    ctx.rechnung,
    label,
    Array.from({ length: N }, (_, index) => reihen.map((reihe) => zelle(reihe, index)).join("+")),
    cents,
  );
}

function skalar(
  blatt: Blatt,
  label: string,
  formel: string,
  ergebnis: number,
  format: "cent" | "ganzzahl" | "zahl" = "cent",
): string {
  const zeile = blatt.zeile({ text: label }, { formel, ergebnis, format, stil: "formel" });
  return blatt.ref(zeile, 2);
}

function leer(): number[] {
  return Array.from({ length: N }, () => 0);
}

function monatEinmal(cent: number): number[] {
  const werte = leer();
  werte[0] = cent;
  return werte;
}
