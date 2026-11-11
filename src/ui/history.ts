export interface Verlauf<T> {
  vergangenheit: T[];
  gegenwart: T;
  zukunft: T[];
}

export type VerlaufAktion<T> = { typ: "setzen"; wert: T } | { typ: "zurueck" } | { typ: "vor" };

const GRENZE = 50;

export function verlaufAnfang<T>(wert: T): Verlauf<T> {
  return { vergangenheit: [], gegenwart: wert, zukunft: [] };
}

export function verlaufReduzieren<T>(zustand: Verlauf<T>, aktion: VerlaufAktion<T>): Verlauf<T> {
  if (aktion.typ === "setzen") {
    if (Object.is(aktion.wert, zustand.gegenwart)) return zustand;
    return {
      vergangenheit: [...zustand.vergangenheit, zustand.gegenwart].slice(-GRENZE),
      gegenwart: aktion.wert,
      zukunft: [],
    };
  }
  if (aktion.typ === "zurueck") {
    const vorher = zustand.vergangenheit.at(-1);
    if (vorher === undefined) return zustand;
    return {
      vergangenheit: zustand.vergangenheit.slice(0, -1),
      gegenwart: vorher,
      zukunft: [zustand.gegenwart, ...zustand.zukunft],
    };
  }
  const naechste = zustand.zukunft[0];
  if (naechste === undefined) return zustand;
  return {
    vergangenheit: [...zustand.vergangenheit, zustand.gegenwart].slice(-GRENZE),
    gegenwart: naechste,
    zukunft: zustand.zukunft.slice(1),
  };
}
