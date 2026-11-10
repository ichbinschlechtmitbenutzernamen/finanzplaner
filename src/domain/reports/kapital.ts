import { monthIndex } from "../months.ts";
import { summeCents } from "../calc/index.ts";
import type { Planberechnung } from "../calc/types.ts";
import type { Finanzplan, IsoMonth } from "../types.ts";
import { leereCents, type Planjahr } from "./planjahr.ts";
import type { Deckungsart, KapitalPosten, Kapitalbedarfsplan } from "./typen.ts";

const HINWEIS =
  "Der Bedarf verwendet die erfassten Nettobeträge. Umsatzsteuer auf Anschaffungen ist kein eigener Posten, sie läuft im Liquiditätsplan. Betriebsmittelbedarf und Reserve stehen im ersten Planmonat und sind kein Zahlungsstrom. Der Betriebsmittelbedarf ist nur die manuelle Eingabe. Darlehen zählen mit dem Nominal. Liegt die Auszahlung wegen Disagio, Gebühren oder Auszahlungskurs darunter, steht die Differenz nachrichtlich und der Liquiditätsplan enthält den geringeren Zufluss.";

/** Kapitalbedarf und Finanzierung, Summen und der Monat, in dem der Posten anfällt. */
export function kapitalbedarfsplan(
  plan: Finanzplan,
  ergebnis: Planberechnung,
  jahre: readonly Planjahr[],
): Kapitalbedarfsplan {
  const start = ergebnis.startMonat;
  const laenge = ergebnis.monate.length;
  const bedarf = [
    posten(
      "investitionen",
      "Investitionen",
      plan.kapitalbedarf.investitionen.map((item) => ({
        monat: item.anschaffungsmonat,
        betragCents: item.nettoCents,
      })),
      start,
      laenge,
      jahre,
    ),
    posten(
      "gruendungskosten",
      "Gründungskosten",
      plan.kapitalbedarf.gruendungskosten.map((item) => ({
        monat: item.monat,
        betragCents: item.nettoCents,
      })),
      start,
      laenge,
      jahre,
    ),
    posten(
      "anlaufkosten",
      "Anlaufkosten",
      plan.kapitalbedarf.anlaufkosten.map((item) => ({
        monat: item.monat,
        betragCents: item.nettoCents,
      })),
      start,
      laenge,
      jahre,
    ),
    posten(
      "waren-erstbestand",
      "Waren-Erstbestand",
      [
        {
          monat: start,
          betragCents: plan.kapitalbedarf.betriebsmittel.warenErstbestandNettoCents ?? 0,
        },
      ],
      start,
      laenge,
      jahre,
      "Netto, Vorrat. Kein Aufwand und keine Abschreibung.",
    ),
    posten(
      "betriebsmittel",
      "Betriebsmittel",
      [{ monat: start, betragCents: plan.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents }],
      start,
      laenge,
      jahre,
      "Manuelle Eingabe, keine Ableitung aus dem Umsatz.",
    ),
    posten(
      "reserve",
      "Reserve",
      [{ monat: start, betragCents: plan.kapitalbedarf.betriebsmittel.liquiditaetsreserveCents }],
      start,
      laenge,
      jahre,
      "Liquiditätsreserve, kein Zahlungsstrom.",
    ),
  ];
  const finanzierung = [
    posten(
      "eigenmittel",
      "Eigenmittel",
      plan.finanzierung.eigenkapital.map((item) => ({
        monat: item.monat,
        betragCents: item.betragCents,
      })),
      start,
      laenge,
      jahre,
    ),
    posten(
      "darlehen",
      "Darlehen",
      plan.finanzierung.darlehen.flatMap((darlehen) =>
        darlehen.auszahlungen.map((tranche) => ({
          monat: tranche.monat,
          betragCents: tranche.betragCents,
        })),
      ),
      start,
      laenge,
      jahre,
      "Nominal, nicht die geminderte Auszahlung.",
    ),
    postenAusReihe(
      "zuschuesse",
      "Zuschüsse",
      ergebnis.finanzierung.summeZuschussCents,
      jahre,
      "Zufluss im Plan, steuerfrei und steuerpflichtig.",
    ),
  ];

  const summeBedarf = summePosten("summe-bedarf", "Summe Kapitalbedarf", bedarf, jahre);
  const summeFinanzierung = summePosten(
    "summe-finanzierung",
    "Summe Finanzierung",
    finanzierung,
    jahre,
  );
  const deckungMonate = summeFinanzierung.monateCents.map(
    (wert, index) => wert - (summeBedarf.monateCents[index] ?? 0),
  );
  const deckungCents = summeFinanzierung.betragCents - summeBedarf.betragCents;
  const nominal = finanzierung.find((item) => item.id === "darlehen")?.betragCents ?? 0;
  const auszahlung = summeCents(ergebnis.finanzierung.summeDarlehenAuszahlungCents);

  return {
    bedarf,
    summeBedarf,
    finanzierung,
    summeFinanzierung,
    deckung: {
      id: "deckung",
      bezeichnung: deckungBezeichnung(deckungCents),
      betragCents: deckungCents,
      monateCents: deckungMonate,
      planjahreCents: jahre.map((jahr) =>
        summeBereich(deckungMonate, jahr.vonIndex, jahr.bisIndex),
      ),
      ausserhalbCents: summeFinanzierung.ausserhalbCents - summeBedarf.ausserhalbCents,
    },
    deckungArt: deckungArt(deckungCents),
    darlehenAbzugCents: nominal - auszahlung,
    hinweis: HINWEIS,
  };
}

function posten(
  id: string,
  bezeichnung: string,
  teile: readonly { monat: IsoMonth; betragCents: number }[],
  start: IsoMonth,
  laenge: number,
  jahre: readonly Planjahr[],
  hinweis?: string,
): KapitalPosten {
  const monateCents = leereCents(laenge);
  let betragCents = 0;
  for (const teil of teile) {
    betragCents += teil.betragCents;
    const index = monthIndex(start, teil.monat);
    if (index >= 0 && index < laenge) {
      monateCents[index] = (monateCents[index] ?? 0) + teil.betragCents;
    }
  }
  return fertig(id, bezeichnung, betragCents, monateCents, jahre, hinweis);
}

function postenAusReihe(
  id: string,
  bezeichnung: string,
  monateCents: readonly number[],
  jahre: readonly Planjahr[],
  hinweis?: string,
): KapitalPosten {
  const kopie = [...monateCents];
  return fertig(id, bezeichnung, summeCents(kopie), kopie, jahre, hinweis);
}

function summePosten(
  id: string,
  bezeichnung: string,
  postenListe: readonly KapitalPosten[],
  jahre: readonly Planjahr[],
): KapitalPosten {
  const laenge = postenListe.reduce((max, item) => Math.max(max, item.monateCents.length), 0);
  const monateCents = leereCents(laenge);
  for (const item of postenListe) {
    item.monateCents.forEach((wert, index) => {
      monateCents[index] = (monateCents[index] ?? 0) + wert;
    });
  }
  const betragCents = postenListe.reduce((total, item) => total + item.betragCents, 0);
  return fertig(id, bezeichnung, betragCents, monateCents, jahre);
}

function fertig(
  id: string,
  bezeichnung: string,
  betragCents: number,
  monateCents: number[],
  jahre: readonly Planjahr[],
  hinweis?: string,
): KapitalPosten {
  return {
    id,
    bezeichnung,
    betragCents,
    monateCents,
    planjahreCents: jahre.map((jahr) => summeBereich(monateCents, jahr.vonIndex, jahr.bisIndex)),
    ausserhalbCents: betragCents - summeCents(monateCents),
    hinweis,
  };
}

function summeBereich(werte: readonly number[], von: number, bis: number): number {
  let summe = 0;
  for (let index = von; index < bis; index += 1) summe += werte[index] ?? 0;
  return summe;
}

function deckungArt(deckungCents: number): Deckungsart {
  if (deckungCents > 0) return "ueberdeckung";
  if (deckungCents < 0) return "deckungsluecke";
  return "ausgeglichen";
}

function deckungBezeichnung(deckungCents: number): string {
  if (deckungCents > 0) return "Überdeckung";
  if (deckungCents < 0) return "Deckungslücke";
  return "Deckung ausgeglichen";
}
