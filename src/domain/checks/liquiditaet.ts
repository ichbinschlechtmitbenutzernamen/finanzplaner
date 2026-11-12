import type { Berichte } from "../reports/typen.ts";
import type { Finanzplan, IsoMonth, PruefSchwellen } from "../types.ts";
import { formatAnzahl, formatEuro, formatMonat } from "./format.ts";
import type { Pruefmeldung } from "./typen.ts";

interface MonatStand {
  monat: IsoMonth;
  standCents: number;
}

/** Negativer Endbestand oder Bestand unter dem Mindeststand: der Kontokorrent ist nicht gedeckt. */
export function pruefeLiquiditaet(
  plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  return [...pruefeKontostand(berichte, schwellen), ...pruefeDarlehensvorlagen(plan)];
}

function pruefeKontostand(berichte: Berichte, schwellen: PruefSchwellen): Pruefmeldung[] {
  const min = schwellen.kontostandMinCents;
  const treffer: MonatStand[] = [];
  berichte.liquiditaet.endbestand.monateCents.forEach((stand, index) => {
    const monat = berichte.monate[index];
    if (monat && stand < min) treffer.push({ monat, standCents: stand });
  });
  if (treffer.length === 0) return [];

  const tiefster = treffer.reduce((bisher, monat) =>
    monat.standCents < bisher.standCents ? monat : bisher,
  );
  const namen = treffer
    .slice(0, 3)
    .map((monat) => `${formatMonat(monat.monat)} (${formatEuro(monat.standCents)})`);
  const weitere = treffer.length - namen.length;
  const liste = weitere > 0 ? `${namen.join(", ")} und ${weitere} weitere` : namen.join(", ");
  const bedarf =
    min === 0
      ? berichte.liquiditaet.kontokorrentbedarfCents
      : Math.max(0, min - tiefster.standCents);

  return [
    {
      id: "liquiditaet-kontostand",
      stufe: "fehler",
      kategorie: "liquiditaet",
      text: `Kontostand unter ${formatEuro(min)}, der Kontokorrentbedarf ist nicht gedeckt.`,
      begruendung: `Der Endbestand liegt in ${formatAnzahl(treffer.length, "Monat", "Monaten")} unter ${formatEuro(min)}: ${liste}. Am tiefsten ist er im ${formatMonat(tiefster.monat)} mit ${formatEuro(tiefster.standCents)}. Der Kontokorrentbedarf beträgt ${formatEuro(bedarf)}. Eine Kreditlinie ist im Plan nicht erfasst.`,
      ziel: {
        tabelle: { ansicht: "liquiditaet", zeileId: "endbestand", monat: tiefster.monat },
        assistent: { station: "zusammenfassung", feld: "liquiditaet" },
      },
    },
  ];
}

/** Darlehen mit Vorlage, deren Betrag, Laufzeit oder tilgungsfreie Zeit die Vorlage verlässt. */
export function pruefeDarlehensvorlagen(plan: Finanzplan): Pruefmeldung[] {
  const meldungen: Pruefmeldung[] = [];
  for (const darlehen of plan.finanzierung.darlehen) {
    if (!darlehen.vorlageId) continue;
    const vorlage = plan.parameter.darlehensvorlagen.find(
      (eintrag) => eintrag.id === darlehen.vorlageId,
    );
    if (!vorlage) continue;
    const gruende: string[] = [];
    if (
      darlehen.betragCents < vorlage.betragMinCents ||
      darlehen.betragCents > vorlage.betragMaxCents
    ) {
      gruende.push(
        `Betrag ${formatEuro(darlehen.betragCents)}, erlaubt sind ${formatEuro(vorlage.betragMinCents)} bis ${formatEuro(vorlage.betragMaxCents)}`,
      );
    }
    if (darlehen.laufzeitMonate > vorlage.laufzeitMaxMonate) {
      gruende.push(
        `Laufzeit ${darlehen.laufzeitMonate} Monate, höchstens ${vorlage.laufzeitMaxMonate} Monate`,
      );
    }
    if (darlehen.tilgungsfreieMonate > vorlage.tilgungsfreieMonateMax) {
      gruende.push(
        `tilgungsfrei ${darlehen.tilgungsfreieMonate} Monate, höchstens ${vorlage.tilgungsfreieMonateMax} Monate`,
      );
    }
    if (gruende.length === 0) continue;
    meldungen.push({
      id: `liquiditaet-vorlage-${darlehen.id}`,
      stufe: "warnung",
      kategorie: "liquiditaet",
      text: `Das Darlehen „${darlehen.bezeichnung}“ liegt außerhalb der Vorlage „${vorlage.bezeichnung}“.`,
      begruendung: `${gruende.join(". ")}.`,
      ziel: {
        tabelle: { ansicht: "eingaben", zeileId: `darlehen-${darlehen.id}` },
        assistent: { station: "finanzierung", feld: `darlehen-${darlehen.id}` },
      },
    });
  }
  return meldungen;
}
