import type { Finanzplan, Id, SzenarioId } from "../types.ts";

export interface UmsatzFaktor {
  /** Bei festem Monatsumsatz der Faktor auf den Betrag, bei Menge × Preis der Faktor auf die Menge. */
  menge: number;
  /** Nur bei Menge × Preis. 1, wenn der Fall keinen eigenen Preisfaktor setzt. */
  preis: number;
}

export interface KostenFaktor {
  faktor: number;
  zuschlagCents: number;
}

export interface SzenarioFaktoren {
  umsatzGlobal: number;
  kostenGlobal: number;
  personalGlobal: number;
  umsatz: Map<Id, UmsatzFaktor>;
  kosten: Map<Id, KostenFaktor>;
  personal: Map<Id, number>;
}

/**
 * Best und Worst sind Faktoren auf der Basis, nicht aufeinander.
 * Ein liniengenauer Faktor ersetzt den globalen und wird nicht zusätzlich mit ihm multipliziert.
 * Die Ansicht „base“ ignoriert alle Anpassungen. Der Real Case ohne Anpassung ist damit die Basis.
 */
export function szenarioFaktoren(plan: Finanzplan, szenario: SzenarioId): SzenarioFaktoren {
  if (szenario === "base") {
    return {
      umsatzGlobal: 1,
      kostenGlobal: 1,
      personalGlobal: 1,
      umsatz: new Map(),
      kosten: new Map(),
      personal: new Map(),
    };
  }

  const faktoren: SzenarioFaktoren = {
    umsatzGlobal: 1,
    kostenGlobal: 1,
    personalGlobal: 1,
    umsatz: new Map(),
    kosten: new Map(),
    personal: new Map(),
  };

  for (const anpassung of plan.szenarien[szenario].anpassungen) {
    if (anpassung.ziel === "global") {
      if (anpassung.umsatzFaktor !== undefined) faktoren.umsatzGlobal = anpassung.umsatzFaktor;
      if (anpassung.kostenFaktor !== undefined) faktoren.kostenGlobal = anpassung.kostenFaktor;
      if (anpassung.personalFaktor !== undefined) {
        faktoren.personalGlobal = anpassung.personalFaktor;
      }
      continue;
    }
    if (anpassung.ziel === "umsatzposition") {
      faktoren.umsatz.set(anpassung.positionId, {
        menge: anpassung.mengenFaktor ?? 1,
        preis: anpassung.preisFaktor ?? 1,
      });
      continue;
    }
    if (anpassung.ziel === "kostenposition") {
      faktoren.kosten.set(anpassung.positionId, {
        faktor: anpassung.faktor ?? 1,
        zuschlagCents: anpassung.zuschlagCents ?? 0,
      });
      continue;
    }
    faktoren.personal.set(anpassung.positionId, anpassung.gehaltsFaktor);
  }

  return faktoren;
}

export function umsatzFaktor(faktoren: SzenarioFaktoren, positionId: Id): UmsatzFaktor {
  return faktoren.umsatz.get(positionId) ?? { menge: faktoren.umsatzGlobal, preis: 1 };
}

export function kostenFaktor(faktoren: SzenarioFaktoren, positionId: Id): KostenFaktor {
  return faktoren.kosten.get(positionId) ?? { faktor: faktoren.kostenGlobal, zuschlagCents: 0 };
}

export function personalFaktor(faktoren: SzenarioFaktoren, positionId: Id): number {
  return faktoren.personal.get(positionId) ?? faktoren.personalGlobal;
}
