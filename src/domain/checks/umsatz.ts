import type { Berichte } from "../reports/typen.ts";
import type { Finanzplan, PruefSchwellen } from "../types.ts";
import { formatEuro, formatProzent, summeBereich } from "./format.ts";
import type { Pruefmeldung } from "./typen.ts";

/** Kein Umsatz, Start ohne Anlaufphase und sehr hohes Wachstum von Planjahr 1 auf 2. */
export function pruefeUmsatz(
  plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  const umsatz = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  const summe = umsatz?.summeCents ?? 0;
  const meldungen: Pruefmeldung[] = [];
  if (summe <= 0) {
    meldungen.push({
      id: "umsatz-fehlt",
      stufe: "fehler",
      kategorie: "umsatz",
      text: "Im Plan ist kein Umsatz erfasst.",
      begruendung: `Die Summe der Umsatzerlöse über ${berichte.monate.length} Monate ist ${formatEuro(summe)}.`,
      ziel: {
        tabelle: { ansicht: "eingaben", zeileId: umsatzZeile(plan) },
        assistent: { station: "umsatz", feld: "umsatz" },
      },
    });
    return meldungen;
  }

  const anlauf = pruefeAnlauf(berichte, schwellen, plan);
  if (anlauf) meldungen.push(anlauf);
  const wachstum = pruefeWachstum(berichte, schwellen, plan);
  if (wachstum) meldungen.push(wachstum);
  return meldungen;
}

function pruefeAnlauf(
  berichte: Berichte,
  schwellen: PruefSchwellen,
  plan: Finanzplan,
): Pruefmeldung | null {
  const umsatz = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  const jahr = berichte.planjahre[0];
  if (!umsatz || !jahr) return null;
  const laenge = jahr.bisIndex - jahr.vonIndex;
  const anlaufMonate = Math.min(schwellen.anlaufMonate, laenge - 1);
  if (anlaufMonate < 1) return null;
  const restVon = jahr.vonIndex + anlaufMonate;
  const restMonate = jahr.bisIndex - restVon;
  if (restMonate < 1) return null;
  const anlaufSumme = summeBereich(umsatz.monateCents, jahr.vonIndex, restVon);
  const restSumme = summeBereich(umsatz.monateCents, restVon, jahr.bisIndex);
  const anlaufSchnitt = anlaufSumme / anlaufMonate;
  const restSchnitt = restSumme / restMonate;
  if (anlaufSchnitt <= 0 || restSchnitt <= 0) return null;
  const anteil = anlaufSchnitt / restSchnitt;
  if (anteil < schwellen.anlaufAnteil) return null;
  return {
    id: "umsatz-anlauf",
    stufe: "hinweis",
    kategorie: "umsatz",
    text: "Der Umsatz startet ohne Anlaufphase auf vollem Niveau.",
    begruendung: `Die ersten ${anlaufMonate} Monate bringen im Schnitt ${formatEuro(anlaufSchnitt)}, die übrigen ${restMonate} Monate des Planjahres 1 im Schnitt ${formatEuro(restSchnitt)}. Das sind ${formatProzent(anteil)} des späteren Niveaus. Die Schwelle liegt bei ${formatProzent(schwellen.anlaufAnteil)}.`,
    ziel: {
      tabelle: { ansicht: "eingaben", zeileId: umsatzZeile(plan) },
      assistent: { station: "umsatz", feld: "umsatz" },
    },
  };
}

function pruefeWachstum(
  berichte: Berichte,
  schwellen: PruefSchwellen,
  plan: Finanzplan,
): Pruefmeldung | null {
  const umsatz = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  if (!umsatz) return null;
  const jahr1 = umsatz.planjahreCents[0] ?? 0;
  const jahr2 = umsatz.planjahreCents[1];
  if (jahr2 == null || jahr1 <= 0) return null;
  const wachstum = jahr2 / jahr1 - 1;
  if (wachstum <= schwellen.wachstumMax) return null;
  return {
    id: "umsatz-wachstum",
    stufe: "warnung",
    kategorie: "umsatz",
    text: "Der Umsatz wächst von Planjahr 1 nach Planjahr 2 sehr stark.",
    begruendung: `Umsatz Planjahr 1 ${formatEuro(jahr1)}, Planjahr 2 ${formatEuro(jahr2)}, Wachstum ${formatProzent(wachstum)}. Die Schwelle liegt bei ${formatProzent(schwellen.wachstumMax)}.`,
    ziel: {
      tabelle: { ansicht: "eingaben", zeileId: umsatzZeile(plan) },
      assistent: { station: "umsatz", feld: "umsatz" },
    },
  };
}

function umsatzZeile(plan: Finanzplan): string {
  const erste = plan.umsatzplanung[0];
  if (!erste) return "kopf-umsatz";
  return erste.art === "menge_mal_preis" ? `menge-${erste.id}` : `umsatz-${erste.id}`;
}
