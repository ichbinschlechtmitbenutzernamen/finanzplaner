import type { Planberechnung } from "../calc/types.ts";
import type { Finanzplan } from "../types.ts";
import { anlagenplan, darlehensplaene } from "./anlagen.ts";
import { kapitalbedarfsplan } from "./kapital.ts";
import { kennzahlen } from "./kennzahlen.ts";
import { liquiditaetsplan } from "./liquiditaet.ts";
import { planjahreVon } from "./planjahr.ts";
import { rentabilitaetsvorschau } from "./rentabilitaet.ts";
import { tragfaehigkeit } from "./tragfaehigkeit.ts";
import type { Berichte } from "./typen.ts";

/**
 * Baut alle Berichte aus einem Plan und seinem Rechenergebnis.
 * Die Strukturen werden nicht in den Plan zurückgeschrieben.
 */
export function erstelleBerichte(plan: Finanzplan, ergebnis: Planberechnung): Berichte {
  const planjahre = planjahreVon(ergebnis.monate);
  const rentabilitaet = rentabilitaetsvorschau(ergebnis, planjahre);
  const liquiditaet = liquiditaetsplan(ergebnis, planjahre);
  const kapital = kapitalbedarfsplan(plan, ergebnis, planjahre);
  return {
    planId: ergebnis.planId,
    planName: ergebnis.planName,
    firmenname: ergebnis.firmenname,
    rechtsform: ergebnis.rechtsform,
    szenario: ergebnis.szenario,
    szenarioBezeichnung: ergebnis.szenarioBezeichnung,
    startMonat: ergebnis.startMonat,
    monate: [...ergebnis.monate],
    planjahre,
    rentabilitaet,
    liquiditaet,
    kapital,
    anlagen: anlagenplan(ergebnis, planjahre),
    darlehen: darlehensplaene(ergebnis, planjahre),
    tragfaehigkeit: tragfaehigkeit(plan, ergebnis, planjahre),
    kennzahlen: kennzahlen(ergebnis.monate, planjahre, rentabilitaet, liquiditaet, kapital),
  };
}
