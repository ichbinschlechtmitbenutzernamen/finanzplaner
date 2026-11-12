import type { Bestandszeile, Bewegungszeile, Zeilenrolle } from "../../domain/reports/planjahr.ts";
import type { KapitalPosten } from "../../domain/reports/typen.ts";

/** Eine Zeile, wie sie die Tabellen zeichnen. Die Cent-Werte stammen aus dem Bericht. */
export interface ZellenZeile {
  bezeichnung: string;
  monateCents: number[];
  planjahreCents: number[];
  /** Bei Bewegungen die Summe, bei Beständen der Wert am Horizontende. */
  summeCents: number;
  rolle: Zeilenrolle;
  bestand: boolean;
  einzug: boolean;
}

export function ausBewegung(
  zeilen: readonly Bewegungszeile[],
  unterzeilen: boolean,
  einzug = false,
): ZellenZeile[] {
  const ergebnis: ZellenZeile[] = [];
  for (const zeile of zeilen) {
    ergebnis.push({
      bezeichnung: zeile.bezeichnung,
      monateCents: zeile.monateCents,
      planjahreCents: zeile.planjahreCents,
      summeCents: zeile.summeCents,
      rolle: zeile.rolle,
      bestand: false,
      einzug,
    });
    if (unterzeilen && zeile.unterzeilen) {
      ergebnis.push(...ausBewegung(zeile.unterzeilen, true, true));
    }
  }
  return ergebnis;
}

export function ausBestand(zeile: Bestandszeile, einzug = false): ZellenZeile {
  return {
    bezeichnung: zeile.bezeichnung,
    monateCents: zeile.monateCents,
    planjahreCents: zeile.planjahreCents,
    summeCents: zeile.horizontWertCents,
    rolle: zeile.rolle,
    bestand: true,
    einzug,
  };
}

export function ausPosten(posten: KapitalPosten, rolle: Zeilenrolle = "normal"): ZellenZeile {
  return {
    bezeichnung: posten.bezeichnung,
    monateCents: posten.monateCents,
    planjahreCents: posten.planjahreCents,
    summeCents: posten.betragCents,
    rolle,
    bestand: false,
    einzug: false,
  };
}

export function nurDiese(
  zeilen: readonly Bewegungszeile[],
  ids: readonly string[],
): Bewegungszeile[] {
  const treffer = new Map<string, Bewegungszeile>();
  const sammeln = (liste: readonly Bewegungszeile[]) => {
    for (const zeile of liste) {
      treffer.set(zeile.id, zeile);
      if (zeile.unterzeilen) sammeln(zeile.unterzeilen);
    }
  };
  sammeln(zeilen);
  return ids.flatMap((id) => {
    const zeile = treffer.get(id);
    return zeile ? [zeile] : [];
  });
}
