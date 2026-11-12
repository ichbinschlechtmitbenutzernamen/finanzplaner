import {
  BASIS_SZENARIO_ID,
  type Finanzplan,
  type PlanSzenario,
  type SzenarioHebel,
} from "../types.ts";
import { aktivesSzenario, standAus } from "./anwenden.ts";
import { neutralerHebel } from "./standard.ts";

export function neueSzenarioId(): string {
  return `sz${crypto.randomUUID().replace(/-/g, "")}`;
}

export function setzeAktivesSzenario(plan: Finanzplan, aktivId: string): Finanzplan {
  const bekannt =
    aktivId === BASIS_SZENARIO_ID ||
    plan.planSzenarien.eintraege.some((eintrag) => eintrag.id === aktivId);
  return {
    ...plan,
    planSzenarien: {
      ...plan.planSzenarien,
      aktivId: bekannt ? aktivId : BASIS_SZENARIO_ID,
    },
  };
}

export function legeAbweichungAn(
  plan: Finanzplan,
  id: string,
  name: string,
  hebel: SzenarioHebel = neutralerHebel(),
): Finanzplan {
  return haengeAn(plan, { id, art: "abweichung", name, hebel });
}

/** Kopie des Basisplans, nicht der gerade aktiven Abweichung. */
export function legeKopieAn(plan: Finanzplan, id: string, name: string): Finanzplan {
  return haengeAn(plan, { id, art: "kopie", name, stand: standAus(plan) });
}

export function benenneSzenario(plan: Finanzplan, id: string, name: string): Finanzplan {
  return ersetze(plan, id, (eintrag) => ({ ...eintrag, name }));
}

export function setzeHebel(plan: Finanzplan, id: string, hebel: SzenarioHebel): Finanzplan {
  return ersetze(plan, id, (eintrag) =>
    eintrag.art === "abweichung" ? { ...eintrag, hebel } : eintrag,
  );
}

export function loescheSzenario(plan: Finanzplan, id: string): Finanzplan {
  return {
    ...plan,
    planSzenarien: {
      aktivId: plan.planSzenarien.aktivId === id ? BASIS_SZENARIO_ID : plan.planSzenarien.aktivId,
      eintraege: plan.planSzenarien.eintraege.filter((eintrag) => eintrag.id !== id),
    },
  };
}

/** Schreibt eine Bearbeitung der aktiven Kopie zurück. Der Basisplan bleibt stehen. */
export function schreibeKopie(behaelter: Finanzplan, bearbeitet: Finanzplan): Finanzplan {
  const aktiv = aktivesSzenario(behaelter);
  if (!aktiv || aktiv.art !== "kopie") return behaelter;
  const stand = standAus(bearbeitet);
  return {
    ...behaelter,
    planSzenarien: {
      ...behaelter.planSzenarien,
      eintraege: behaelter.planSzenarien.eintraege.map((eintrag) =>
        eintrag.id === aktiv.id && eintrag.art === "kopie" ? { ...eintrag, stand } : eintrag,
      ),
    },
  };
}

export function dupliziereSzenario(plan: Finanzplan, id: string, neueId: string): Finanzplan {
  const vorlage = plan.planSzenarien.eintraege.find((eintrag) => eintrag.id === id);
  if (!vorlage) return plan;
  const name = nameKopie(vorlage.name);
  if (vorlage.art === "abweichung") {
    return haengeAn(plan, {
      id: neueId,
      art: "abweichung",
      name,
      hebel: structuredClone(vorlage.hebel),
    });
  }
  return haengeAn(plan, {
    id: neueId,
    art: "kopie",
    name,
    stand: structuredClone(vorlage.stand),
  });
}

function haengeAn(plan: Finanzplan, eintrag: PlanSzenario): Finanzplan {
  return {
    ...plan,
    planSzenarien: {
      ...plan.planSzenarien,
      eintraege: [...plan.planSzenarien.eintraege, eintrag],
    },
  };
}

function ersetze(
  plan: Finanzplan,
  id: string,
  aendern: (eintrag: PlanSzenario) => PlanSzenario,
): Finanzplan {
  return {
    ...plan,
    planSzenarien: {
      ...plan.planSzenarien,
      eintraege: plan.planSzenarien.eintraege.map((eintrag) =>
        eintrag.id === id ? aendern(eintrag) : eintrag,
      ),
    },
  };
}

function nameKopie(name: string): string {
  const text = `Kopie von ${name}`;
  return text.length <= 120 ? text : text.slice(0, 120);
}
