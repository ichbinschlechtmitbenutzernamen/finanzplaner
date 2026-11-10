import type { IsoMonth } from "../types.ts";
import {
  BREAK_EVEN_DEFINITION,
  breakEvenMonat,
  findeZeile,
  quote,
  type Bewegungszeile,
  type Planjahr,
} from "./planjahr.ts";
import type {
  Jahresquote,
  Kapitalbedarfsplan,
  KapitaldienstJahr,
  Kennzahlen,
  Liquiditaetsplan,
  Rentabilitaetsvorschau,
} from "./typen.ts";

/** Kennzahlen aus Rentabilität, Liquidität und Kapitalbedarf. */
export function kennzahlen(
  monate: readonly IsoMonth[],
  jahre: readonly Planjahr[],
  rentabilitaet: Rentabilitaetsvorschau,
  liquiditaet: Liquiditaetsplan,
  kapital: Kapitalbedarfsplan,
): Kennzahlen {
  const umsatz = findeZeile(rentabilitaet.zeilen, "umsatz");
  const rohertrag = findeZeile(rentabilitaet.zeilen, "rohertrag");
  const nachSteuern = findeZeile(rentabilitaet.zeilen, "ergebnis-nach-steuern");
  const abschreibungen = findeZeile(rentabilitaet.zeilen, "abschreibungen");
  const zinsen = findeZeile(rentabilitaet.zeilen, "zinsen");
  const entnahmen = rentabilitaet.zeilen.find((zeile) => zeile.id === "privatentnahmen");
  const tilgung = liquiditaet.auszahlungen.unterzeilen?.find(
    (zeile) => zeile.id === "auszahlung-tilgung",
  );
  const eigenmittel = kapital.finanzierung.find((posten) => posten.id === "eigenmittel");
  const breakEven = breakEvenMonat(nachSteuern.monateCents, monate);

  return {
    breakEven: { ...breakEven, definition: BREAK_EVEN_DEFINITION },
    rohertragsquote: quoten(rohertrag, umsatz, jahre),
    umsatzrendite: quoten(nachSteuern, umsatz, jahre),
    kapitaldienstfaehigkeit: jahre.map((jahr, index) =>
      kapitaldienst(jahr.nummer, index, nachSteuern, abschreibungen, zinsen, entnahmen, tilgung),
    ),
    tiefsterLiquiditaetsstandCents: liquiditaet.tiefsterKontostandCents,
    tiefsterLiquiditaetsstandMonat: liquiditaet.tiefsterKontostandMonat,
    kontokorrentbedarfCents: liquiditaet.kontokorrentbedarfCents,
    eigenkapitalquote: quote(eigenmittel?.betragCents ?? 0, kapital.summeFinanzierung.betragCents),
    eigenmittelCents: eigenmittel?.betragCents ?? 0,
    finanzierungCents: kapital.summeFinanzierung.betragCents,
  };
}

function quoten(
  zaehler: Bewegungszeile,
  nenner: Bewegungszeile,
  jahre: readonly Planjahr[],
): { planjahre: Jahresquote[]; gesamt: Jahresquote } {
  return {
    planjahre: jahre.map((jahr, index) =>
      jahresquote(
        jahr.nummer,
        zaehler.planjahreCents[index] ?? 0,
        nenner.planjahreCents[index] ?? 0,
      ),
    ),
    gesamt: jahresquote(0, zaehler.summeCents, nenner.summeCents),
  };
}

function jahresquote(planjahr: number, zaehlerCents: number, nennerCents: number): Jahresquote {
  return { planjahr, zaehlerCents, nennerCents, quote: quote(zaehlerCents, nennerCents) };
}

function kapitaldienst(
  planjahr: number,
  index: number,
  nachSteuern: Bewegungszeile,
  abschreibungen: Bewegungszeile,
  zinsen: Bewegungszeile,
  entnahmen: Bewegungszeile | undefined,
  tilgung: Bewegungszeile | undefined,
): KapitaldienstJahr {
  const cashflowCents =
    (nachSteuern.planjahreCents[index] ?? 0) +
    (abschreibungen.planjahreCents[index] ?? 0) -
    (entnahmen?.planjahreCents[index] ?? 0);
  const kapitaldienstCents =
    (zinsen.planjahreCents[index] ?? 0) + (tilgung?.planjahreCents[index] ?? 0);
  return {
    planjahr,
    cashflowCents,
    kapitaldienstCents,
    quote: quote(cashflowCents, kapitaldienstCents),
  };
}
