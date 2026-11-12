import type {
  AssistentFortschritt,
  AssistentStation,
  AssistentWeg,
  Finanzplan,
  PersonRolle,
  Rechtsform,
} from "../types.ts";
import { ASSISTENT_STATIONEN } from "../types.ts";
import { istKapitalgesellschaft } from "../reports/planjahr.ts";

export const STATION_LABEL: Record<AssistentStation, string> = {
  vorhaben: "Vorhaben",
  persoenlich: "Persönliches",
  umsatz: "Umsatz",
  wareneinsatz: "Wareneinsatz",
  personal: "Personal",
  kosten: "Laufende Kosten",
  investitionen: "Investitionen",
  finanzierung: "Finanzierung",
  zusammenfassung: "Zusammenfassung",
};

/** Ein neuer Entwurf ohne gewählten Weg zeigt die Startauswahl. */
export function zeigeStartauswahl(plan: Finanzplan): boolean {
  return plan.assistent != null && plan.assistent.weg == null;
}

/**
 * Persönliches (Lebenshaltung, Vorsorge, Kirchensteuer, Gründungszuschuss)
 * gibt es im Assistenten nur bei Personenunternehmen. GmbH und UG überspringen die Station.
 */
export function stationFaelltWeg(
  station: AssistentStation,
  rechtsform: Rechtsform | undefined,
): boolean {
  return station === "persoenlich" && istKapitalgesellschaft(rechtsform);
}

export function naechsteStation(
  station: AssistentStation,
  rechtsform: Rechtsform | undefined,
): AssistentStation | null {
  const start = ASSISTENT_STATIONEN.indexOf(station);
  for (let index = start + 1; index < ASSISTENT_STATIONEN.length; index += 1) {
    const kandidat = ASSISTENT_STATIONEN[index];
    if (kandidat && !stationFaelltWeg(kandidat, rechtsform)) return kandidat;
  }
  return null;
}

export function vorherigeStation(
  station: AssistentStation,
  rechtsform: Rechtsform | undefined,
): AssistentStation | null {
  const start = ASSISTENT_STATIONEN.indexOf(station);
  for (let index = start - 1; index >= 0; index -= 1) {
    const kandidat = ASSISTENT_STATIONEN[index];
    if (kandidat && !stationFaelltWeg(kandidat, rechtsform)) return kandidat;
  }
  return null;
}

export function standardRollen(
  rechtsform: Rechtsform,
  anzahl: number,
  index: number,
): PersonRolle[] {
  if (rechtsform === "einzelunternehmen") return ["inhaber"];
  if (rechtsform === "freiberufler") return ["freiberufler"];
  if (rechtsform === "gbr" || rechtsform === "ohg") return ["gesellschafter"];
  if (rechtsform === "kg") return index === 0 ? ["komplementaer"] : ["kommanditist"];
  if (anzahl === 1 || index === 0) return ["gesellschafter", "geschaeftsfuehrer"];
  return ["gesellschafter"];
}

function standVon(plan: Finanzplan): AssistentFortschritt {
  // Ein Entwurf ohne Weg ist die Startauswahl. Fehlt der Fortschritt ganz,
  // ist es ein bestehender Plan: der Assistent öffnet sich, ohne neu zu fragen.
  return plan.assistent ?? { station: "vorhaben", erledigt: [], weg: "assistent" };
}

export function waehleWeg(plan: Finanzplan, weg: AssistentWeg): Finanzplan {
  const stand = standVon(plan);
  return { ...plan, assistent: { ...stand, weg } };
}

export function springeZu(plan: Finanzplan, station: AssistentStation): Finanzplan {
  const stand = standVon(plan);
  return { ...plan, assistent: { ...stand, station } };
}

/** Markiert die sichtbare Station als erledigt und geht zur nächsten, die für die Rechtsform gilt. */
export function geheWeiter(plan: Finanzplan): Finanzplan {
  const stand = standVon(plan);
  const rechtsform = plan.stammdaten.rechtsform;
  const erledigt =
    stationFaelltWeg(stand.station, rechtsform) || stand.erledigt.includes(stand.station)
      ? stand.erledigt.filter((station) => !stationFaelltWeg(station, rechtsform))
      : [...stand.erledigt, stand.station];
  const naechste = naechsteStation(stand.station, rechtsform) ?? stand.station;
  return { ...plan, assistent: { ...stand, erledigt, station: naechste } };
}

export function geheZurueck(plan: Finanzplan): Finanzplan {
  const stand = standVon(plan);
  const vorher = vorherigeStation(stand.station, plan.stammdaten.rechtsform);
  if (!vorher) return plan;
  return { ...plan, assistent: { ...stand, station: vorher } };
}

/** Nimmt eine übersprungene Station aus dem Fortschritt, wenn die Rechtsform sie nicht mehr zeigt. */
export function bereinigeFortschritt(plan: Finanzplan): Finanzplan {
  if (!plan.assistent) return plan;
  const rechtsform = plan.stammdaten.rechtsform;
  const erledigt = plan.assistent.erledigt.filter(
    (station) => !stationFaelltWeg(station, rechtsform),
  );
  const station = stationFaelltWeg(plan.assistent.station, rechtsform)
    ? (naechsteStation(plan.assistent.station, rechtsform) ?? plan.assistent.station)
    : plan.assistent.station;
  return { ...plan, assistent: { ...plan.assistent, erledigt, station } };
}

export function neueId(prefix: string): string {
  const zufall = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  return `${prefix}-${zufall}`;
}
