import { beispielplaene } from "../fixtures/index.ts";

/** Dieselben Reiter wie `REITER` in der Planarbeitsfläche, in derselben Reihenfolge. */
export const PLAN_REITER = [
  "assistent",
  "ueberblick",
  "szenarien",
  "pruefung",
  "eingaben",
  "rentabilitaet",
  "liquiditaet",
  "kapital",
  "anlagen",
  "tragfaehigkeit",
] as const;

export type PlanReiter = (typeof PLAN_REITER)[number];

export const NEUER_PLAN = "neu";
export const START_HASH = "start";

const BEISPIEL_IDS = new Set(beispielplaene.map((eintrag) => eintrag.id));
const REITER_IDS = new Set<string>(PLAN_REITER);

export type Route = { art: "start" } | { art: "plan"; id: string; reiter: PlanReiter };

/** Leerer Hash und `#start` sind die Startseite. Bekannte Beispiel-Links bleiben gültig. */
export function parseRoute(hash: string): Route {
  const roh = hash.replace(/^#/, "").trim();
  if (roh === "" || roh === START_HASH || roh.startsWith(`${START_HASH}/`)) {
    return { art: "start" };
  }
  const [id, reiterRoh] = roh.split("/");
  if (!id || (id !== NEUER_PLAN && !BEISPIEL_IDS.has(id))) return { art: "start" };
  const reiter = REITER_IDS.has(reiterRoh ?? "")
    ? (reiterRoh as PlanReiter)
    : id === NEUER_PLAN
      ? "assistent"
      : "ueberblick";
  return { art: "plan", id, reiter };
}

export function hashFuer(route: Route): string {
  if (route.art === "start") return START_HASH;
  return `${route.id}/${route.reiter}`;
}

export function gleicheRoute(links: Route, rechts: Route): boolean {
  if (links.art === "start" || rechts.art === "start") return links.art === rechts.art;
  return links.id === rechts.id && links.reiter === rechts.reiter;
}
