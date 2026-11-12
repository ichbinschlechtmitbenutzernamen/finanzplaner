import type { Finanzplan } from "../types.ts";
import { stationFaelltWeg, geheWeiter, waehleWeg } from "./stationen.ts";
import {
  AssistentFehler,
  setzeAbschluss,
  setzeFinanzierung,
  setzeInvestitionen,
  setzeKosten,
  setzePersoenlich,
  setzePersonal,
  setzeUmsatz,
  setzeVorhaben,
  setzeWareneinsatz,
  type AbschlussEingabe,
  type EinmalEingabe,
  type FinanzierungEingabe,
  type GruendungszuschussEingabe,
  type InvestitionEingabe,
  type KostenEingabe,
  type LebensbedarfEingabe,
  type StelleEingabe,
  type UmsatzEingabe,
  type VorhabenEingabe,
  type WareneinsatzEingabe,
} from "./schreiben.ts";

export interface AssistentDurchlauf {
  vorhaben: VorhabenEingabe;
  persoenlich?: {
    personen: LebensbedarfEingabe[];
    zuschuss: GruendungszuschussEingabe | null;
  };
  umsatz: UmsatzEingabe[];
  wareneinsatz: WareneinsatzEingabe[];
  personal: StelleEingabe[];
  kosten: KostenEingabe[];
  investitionen: {
    posten: InvestitionEingabe[];
    gruendungskosten: EinmalEingabe[];
    anlaufkosten: EinmalEingabe[];
  };
  finanzierung: FinanzierungEingabe;
  abschluss?: AbschlussEingabe;
}

/** Schreibt jede Station in den bestehenden Plan. GmbH und UG lassen Persönliches aus. */
export function spieleDurchlauf(plan: Finanzplan, schritte: AssistentDurchlauf): Finanzplan {
  let aktuell = waehleWeg(setzeVorhaben(plan, schritte.vorhaben), "assistent");
  aktuell = geheWeiter(aktuell);
  if (!stationFaelltWeg("persoenlich", aktuell.stammdaten.rechtsform)) {
    if (!schritte.persoenlich) throw new AssistentFehler("Persönliches fehlt.");
    aktuell = setzePersoenlich(
      aktuell,
      schritte.persoenlich.personen,
      schritte.persoenlich.zuschuss,
    );
    aktuell = geheWeiter(aktuell);
  }
  aktuell = setzeUmsatz(aktuell, schritte.umsatz);
  aktuell = geheWeiter(aktuell);
  aktuell = setzeWareneinsatz(aktuell, schritte.wareneinsatz);
  aktuell = geheWeiter(aktuell);
  aktuell = setzePersonal(aktuell, schritte.personal);
  aktuell = geheWeiter(aktuell);
  aktuell = setzeKosten(aktuell, schritte.kosten);
  aktuell = geheWeiter(aktuell);
  aktuell = setzeInvestitionen(aktuell, schritte.investitionen);
  aktuell = geheWeiter(aktuell);
  aktuell = setzeFinanzierung(aktuell, schritte.finanzierung);
  aktuell = geheWeiter(aktuell);
  aktuell = setzeAbschluss(aktuell, schritte.abschluss);
  return geheWeiter(aktuell);
}
