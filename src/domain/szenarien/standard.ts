import { BASIS_SZENARIO_ID, type PlanSzenarien, type SzenarioHebel } from "../types.ts";

/** Hebel, die den Basisplan nicht verändern. */
export function neutralerHebel(): SzenarioHebel {
  return {
    umsatzFaktor: 1,
    umsatzstartMonate: 0,
    wareneinsatzPunkte: 0,
    personalFaktor: 1,
    kostenFaktor: 1,
  };
}

/**
 * Vorsichtig und Optimistisch. Der Nutzer darf sie umbenennen, ändern und löschen.
 * Die Ids bleiben stabil, solange die Einträge nicht gelöscht und neu angelegt werden.
 */
export function standardPlanSzenarien(): PlanSzenarien {
  return {
    aktivId: BASIS_SZENARIO_ID,
    eintraege: [
      {
        id: "szenario-vorsichtig",
        art: "abweichung",
        name: "Vorsichtig",
        hebel: {
          umsatzFaktor: 0.8,
          umsatzstartMonate: 3,
          wareneinsatzPunkte: 0,
          personalFaktor: 1,
          kostenFaktor: 1,
        },
      },
      {
        id: "szenario-optimistisch",
        art: "abweichung",
        name: "Optimistisch",
        hebel: {
          umsatzFaktor: 1.2,
          umsatzstartMonate: 0,
          wareneinsatzPunkte: 0,
          personalFaktor: 1,
          kostenFaktor: 1,
        },
      },
    ],
  };
}
