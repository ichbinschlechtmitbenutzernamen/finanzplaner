import type { Berichte } from "../reports/typen.ts";
import type { Finanzplan } from "../types.ts";
import { pruefeFinanzierung } from "./finanzierung.ts";
import { pruefeKosten } from "./kosten.ts";
import { pruefeLiquiditaet } from "./liquiditaet.ts";
import { standardSchwellen } from "./schwellen.ts";
import { pruefeSteuern } from "./steuern.ts";
import { pruefeTragfaehigkeit } from "./tragfaehigkeit.ts";
import {
  KATEGORIE_TEXT,
  STUFE_TEXT,
  sortiereMeldungen,
  type ExportPruefmeldung,
  type Pruefmeldung,
} from "./typen.ts";
import { pruefeUmsatz } from "./umsatz.ts";

/**
 * Prüft einen Plan gegen die gespeicherten Schwellen.
 * Die Berichte bleiben unverändert. Die Meldungen werden nicht in den Plan geschrieben.
 */
export function pruefePlan(plan: Finanzplan, berichte: Berichte): Pruefmeldung[] {
  const schwellen = plan.pruefung?.schwellen ?? standardSchwellen();
  return sortiereMeldungen([
    ...pruefeLiquiditaet(plan, berichte, schwellen),
    ...pruefeTragfaehigkeit(plan, berichte, schwellen),
    ...pruefeUmsatz(plan, berichte, schwellen),
    ...pruefeKosten(plan, berichte, schwellen),
    ...pruefeSteuern(plan, berichte, schwellen),
    ...pruefeFinanzierung(plan, berichte, schwellen),
  ]);
}

/**
 * Liefert die Meldungen in einer flachen Form für einen späteren Export.
 * PDF und Excel können Fehler damit vermerken. Der Export selbst bleibt möglich,
 * auch wenn Meldungen der Stufe Fehler dabei sind.
 */
export function meldungenFuerExport(plan: Finanzplan, berichte: Berichte): ExportPruefmeldung[] {
  return pruefePlan(plan, berichte).map((meldung) => ({
    id: meldung.id,
    stufe: meldung.stufe,
    stufeText: STUFE_TEXT[meldung.stufe],
    kategorie: meldung.kategorie,
    kategorieText: KATEGORIE_TEXT[meldung.kategorie],
    text: meldung.text,
    begruendung: meldung.begruendung,
    tabelle: meldung.ziel.tabelle
      ? `${meldung.ziel.tabelle.ansicht}:${meldung.ziel.tabelle.zeileId}`
      : null,
    assistentFeld: meldung.ziel.assistent
      ? `${meldung.ziel.assistent.station}:${meldung.ziel.assistent.feld}`
      : null,
  }));
}
