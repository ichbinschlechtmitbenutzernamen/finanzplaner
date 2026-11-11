import type { EinmalZiel, SerieZiel } from "../domain/eingabe/plan-aendern.ts";
import type { Planjahr } from "../domain/reports/planjahr.ts";

export type ZeilenRolle = "normal" | "summe" | "ergebnis" | "nachricht";

export interface TabellenZeile {
  id: string;
  bezeichnung: string;
  ebene: number;
  rolle: ZeilenRolle;
  /** Abschnittsüberschrift ohne Beträge. */
  kopf: boolean;
  werte: (number | null)[];
  planjahre: number[];
  bearbeitbar: boolean[];
  einheit: "euro" | "menge" | "leer";
  serie?: SerieZiel;
  einmal?: EinmalZiel;
  /** Darlehen und freie Zuschüsse haben je Monat ein eigenes Ziel. */
  einmalImMonat?: (monat: string) => EinmalZiel | null;
}

export function summeBereich(werte: readonly (number | null)[], von: number, bis: number): number {
  let summe = 0;
  for (let index = von; index < bis; index += 1) summe += werte[index] ?? 0;
  return summe;
}

export function planjahrSummen(
  werte: readonly (number | null)[],
  jahre: readonly Planjahr[],
): number[] {
  return jahre.map((jahr) => summeBereich(werte, jahr.vonIndex, jahr.bisIndex));
}

export function kopfZeile(id: string, bezeichnung: string, laenge: number): TabellenZeile {
  return {
    id,
    bezeichnung,
    ebene: 0,
    rolle: "normal",
    kopf: true,
    werte: Array.from({ length: laenge }, () => null),
    planjahre: [],
    bearbeitbar: Array.from({ length: laenge }, () => false),
    einheit: "leer",
  };
}

export function euroZeile(
  felder: Omit<TabellenZeile, "einheit" | "planjahre" | "kopf"> & { kopf?: boolean },
  jahre: readonly Planjahr[],
): TabellenZeile {
  return {
    ...felder,
    kopf: felder.kopf ?? false,
    einheit: "euro",
    planjahre: planjahrSummen(felder.werte, jahre),
  };
}

export function summenZeile(
  id: string,
  bezeichnung: string,
  teile: readonly TabellenZeile[],
  laenge: number,
  jahre: readonly Planjahr[],
): TabellenZeile {
  const werte = Array.from({ length: laenge }, (_, index) =>
    teile.reduce(
      (summe, teil) => summe + (teil.einheit === "euro" ? (teil.werte[index] ?? 0) : 0),
      0,
    ),
  );
  return euroZeile(
    {
      id,
      bezeichnung,
      ebene: 0,
      rolle: "summe",
      werte,
      bearbeitbar: werte.map(() => false),
    },
    jahre,
  );
}
