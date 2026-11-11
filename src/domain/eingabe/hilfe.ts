import { mengeImMonat, monatsbetragCents } from "../calc/monatswert.ts";
import { roundCents } from "../calc/round.ts";
import { monthIndex } from "../months.ts";
import type {
  IsoMonth,
  MengenVorgabe,
  MonatFaktoren,
  MonatswertVorgabe,
  Wachstum,
  Wachstumsbezug,
} from "../types.ts";

export class EingabeFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EingabeFehler";
  }
}

interface Punkt {
  monat: IsoMonth;
  wert: number;
}

interface Stand {
  basis: number;
  bezugsmonat?: IsoMonth;
  wachstum?: Wachstum;
  saison?: { faktoren: MonatFaktoren };
  overrides: Punkt[];
}

const MAX_RATE = 10;

export function fortschreibenMonatswert(
  vorgabe: MonatswertVorgabe,
  planStart: IsoMonth,
  monate: readonly IsoMonth[],
  vonIndex: number,
  erlaubt: readonly boolean[],
): MonatswertVorgabe {
  const stand = standAusMonatswert(vorgabe);
  const naechste = fortschreiben(
    stand,
    (monat) => monatsbetragCents(vorgabe, monat, planStart),
    monate,
    vonIndex,
    erlaubt,
  );
  return monatswertAus(vorgabe, naechste);
}

export function wachstumMonatswert(
  vorgabe: MonatswertVorgabe,
  planStart: IsoMonth,
  monate: readonly IsoMonth[],
  vonIndex: number,
  rate: number,
  bezug: Wachstumsbezug,
  erlaubt: readonly boolean[],
): MonatswertVorgabe {
  const naechste = wachstumAnwenden(
    (monat) => monatsbetragCents(vorgabe, monat, planStart),
    roundCents,
    monate,
    vonIndex,
    rate,
    bezug,
    erlaubt,
  );
  return monatswertAus(vorgabe, naechste);
}

export function saisonMonatswert(
  vorgabe: MonatswertVorgabe,
  faktoren: MonatFaktoren,
): MonatswertVorgabe {
  return monatswertAus(vorgabe, saisonAnwenden(standAusMonatswert(vorgabe), faktoren));
}

/** `wertCents` null nimmt die Überschreibung zurück. Die Regel gilt dann wieder. */
export function setzeMonatswert(
  vorgabe: MonatswertVorgabe,
  monat: IsoMonth,
  wertCents: number | null,
): MonatswertVorgabe {
  return monatswertAus(
    vorgabe,
    setzePunkt(standAusMonatswert(vorgabe), monat, wertCents, roundCents),
  );
}

export function einfuegenMonatswert(
  vorgabe: MonatswertVorgabe,
  monate: readonly IsoMonth[],
  vonIndex: number,
  werteCents: readonly (number | null)[],
  erlaubt: readonly boolean[],
): MonatswertVorgabe {
  return monatswertAus(
    vorgabe,
    werteSetzen(standAusMonatswert(vorgabe), monate, vonIndex, werteCents, erlaubt, roundCents),
  );
}

export function fortschreibenMenge(
  vorgabe: MengenVorgabe,
  planStart: IsoMonth,
  monate: readonly IsoMonth[],
  vonIndex: number,
  erlaubt: readonly boolean[],
): MengenVorgabe {
  const stand = standAusMenge(vorgabe);
  return mengeAus(
    vorgabe,
    fortschreiben(
      stand,
      (monat) => mengeImMonat(vorgabe, monat, planStart),
      monate,
      vonIndex,
      erlaubt,
    ),
  );
}

export function wachstumMenge(
  vorgabe: MengenVorgabe,
  planStart: IsoMonth,
  monate: readonly IsoMonth[],
  vonIndex: number,
  rate: number,
  bezug: Wachstumsbezug,
  erlaubt: readonly boolean[],
): MengenVorgabe {
  return mengeAus(
    vorgabe,
    wachstumAnwenden(
      (monat) => mengeImMonat(vorgabe, monat, planStart),
      rundeMenge,
      monate,
      vonIndex,
      rate,
      bezug,
      erlaubt,
    ),
  );
}

export function saisonMenge(vorgabe: MengenVorgabe, faktoren: MonatFaktoren): MengenVorgabe {
  return mengeAus(vorgabe, saisonAnwenden(standAusMenge(vorgabe), faktoren));
}

export function setzeMenge(
  vorgabe: MengenVorgabe,
  monat: IsoMonth,
  wert: number | null,
): MengenVorgabe {
  return mengeAus(vorgabe, setzePunkt(standAusMenge(vorgabe), monat, wert, rundeMenge));
}

export function einfuegenMenge(
  vorgabe: MengenVorgabe,
  monate: readonly IsoMonth[],
  vonIndex: number,
  werte: readonly (number | null)[],
  erlaubt: readonly boolean[],
): MengenVorgabe {
  return mengeAus(
    vorgabe,
    werteSetzen(standAusMenge(vorgabe), monate, vonIndex, werte, erlaubt, rundeMenge),
  );
}

export function rundeMenge(wert: number): number {
  return Math.round(wert * 1_000_000) / 1_000_000;
}

function fortschreiben(
  stand: Stand,
  wertImMonat: (monat: IsoMonth) => number,
  monate: readonly IsoMonth[],
  vonIndex: number,
  erlaubt: readonly boolean[],
): Stand {
  const anker = ankerMonat(monate, vonIndex, erlaubt);
  const wert = wertImMonat(anker);
  const start = monate[0];
  const behalten =
    start == null
      ? []
      : stand.overrides.filter((punkt) => {
          const index = monthIndex(start, punkt.monat);
          return index >= 0 && index < vonIndex && erlaubt[index] === true;
        });
  const overrides = [...behalten];
  for (let index = vonIndex; index < monate.length; index += 1) {
    const monat = monate[index];
    if (!monat || erlaubt[index] !== true) continue;
    overrides.push({ monat, wert });
  }
  return { ...stand, overrides: sortiert(overrides) };
}

function wachstumAnwenden(
  wertImMonat: (monat: IsoMonth) => number,
  runden: (wert: number) => number,
  monate: readonly IsoMonth[],
  vonIndex: number,
  rate: number,
  bezug: Wachstumsbezug,
  erlaubt: readonly boolean[],
): Stand {
  if (!(rate > -1) || rate > MAX_RATE) {
    throw new EingabeFehler("Die Rate muss über −100 % und höchstens 1.000 % liegen.");
  }
  const anker = ankerMonat(monate, vonIndex, erlaubt);
  const jahresrate = bezug === "monat" ? (1 + rate) ** 12 - 1 : rate;
  if (!(jahresrate > -1) || jahresrate > MAX_RATE) {
    throw new EingabeFehler(
      "Die Rate ist zu hoch. Pro Monat sind ungefähr 21 Prozent der Höchstwert, pro Jahr 1.000 Prozent.",
    );
  }
  const links: Punkt[] = [];
  for (let index = 0; index < vonIndex; index += 1) {
    const monat = monate[index];
    if (!monat || erlaubt[index] !== true) continue;
    links.push({ monat, wert: runden(wertImMonat(monat)) });
  }
  return {
    basis: runden(wertImMonat(anker)),
    bezugsmonat: anker,
    wachstum: {
      jahresrate,
      modus: bezug === "monat" ? "compound_monthly" : "yearly_step",
      eingabe: { rate, bezug },
    },
    overrides: sortiert(links),
  };
}

function saisonAnwenden(stand: Stand, faktoren: MonatFaktoren): Stand {
  if (faktoren.length !== 12 || faktoren.some((faktor) => faktor < 0 || faktor > MAX_RATE)) {
    throw new EingabeFehler("Saison braucht zwölf Faktoren zwischen 0 und 10.");
  }
  return { ...stand, saison: { faktoren: [...faktoren] as MonatFaktoren }, overrides: [] };
}

function setzePunkt(
  stand: Stand,
  monat: IsoMonth,
  wert: number | null,
  runden: (wert: number) => number,
): Stand {
  const ohne = stand.overrides.filter((punkt) => punkt.monat !== monat);
  if (wert == null) return { ...stand, overrides: ohne };
  if (wert < 0 || !Number.isFinite(wert)) {
    throw new EingabeFehler("Der Wert darf nicht negativ sein.");
  }
  return { ...stand, overrides: sortiert([...ohne, { monat, wert: runden(wert) }]) };
}

function werteSetzen(
  stand: Stand,
  monate: readonly IsoMonth[],
  vonIndex: number,
  werte: readonly (number | null)[],
  erlaubt: readonly boolean[],
  runden: (wert: number) => number,
): Stand {
  let naechste = stand;
  werte.forEach((wert, versatz) => {
    if (wert == null) return;
    const index = vonIndex + versatz;
    const monat = monate[index];
    if (!monat || erlaubt[index] !== true) return;
    naechste = setzePunkt(naechste, monat, wert, runden);
  });
  return naechste;
}

function ankerMonat(
  monate: readonly IsoMonth[],
  vonIndex: number,
  erlaubt: readonly boolean[],
): IsoMonth {
  const monat = monate[vonIndex];
  if (!monat || vonIndex < 0 || vonIndex >= monate.length) {
    throw new EingabeFehler("Der gewählte Monat liegt außerhalb des Plans.");
  }
  if (erlaubt[vonIndex] !== true) {
    throw new EingabeFehler("Dieser Monat ist für die Zeile nicht eingebbar.");
  }
  return monat;
}

function sortiert(punkte: Punkt[]): Punkt[] {
  return punkte.sort((links, rechts) => links.monat.localeCompare(rechts.monat));
}

function standAusMonatswert(vorgabe: MonatswertVorgabe): Stand {
  return {
    basis: vorgabe.basisCents,
    bezugsmonat: vorgabe.bezugsmonat,
    wachstum: vorgabe.wachstum,
    saison: vorgabe.saison,
    overrides: (vorgabe.monatsOverride ?? []).map((punkt) => ({
      monat: punkt.monat,
      wert: punkt.wertCents,
    })),
  };
}

function monatswertAus(alt: MonatswertVorgabe, stand: Stand): MonatswertVorgabe {
  const naechste: MonatswertVorgabe = { ...alt, basisCents: stand.basis };
  uebernehmen(naechste, stand);
  if (stand.overrides.length > 0) {
    naechste.monatsOverride = stand.overrides.map((punkt) => ({
      monat: punkt.monat,
      wertCents: punkt.wert,
    }));
  } else {
    delete naechste.monatsOverride;
  }
  return naechste;
}

function standAusMenge(vorgabe: MengenVorgabe): Stand {
  return {
    basis: vorgabe.basis,
    bezugsmonat: vorgabe.bezugsmonat,
    wachstum: vorgabe.wachstum,
    saison: vorgabe.saison,
    overrides: (vorgabe.monatsOverride ?? []).map((punkt) => ({
      monat: punkt.monat,
      wert: punkt.wert,
    })),
  };
}

function mengeAus(alt: MengenVorgabe, stand: Stand): MengenVorgabe {
  const naechste: MengenVorgabe = { ...alt, basis: stand.basis };
  uebernehmen(naechste, stand);
  if (stand.overrides.length > 0) {
    naechste.monatsOverride = stand.overrides.map((punkt) => ({
      monat: punkt.monat,
      wert: punkt.wert,
    }));
  } else {
    delete naechste.monatsOverride;
  }
  return naechste;
}

function uebernehmen(
  ziel: { bezugsmonat?: IsoMonth; wachstum?: Wachstum; saison?: { faktoren: MonatFaktoren } },
  stand: Stand,
): void {
  if (stand.bezugsmonat) ziel.bezugsmonat = stand.bezugsmonat;
  else delete ziel.bezugsmonat;
  if (stand.wachstum) ziel.wachstum = stand.wachstum;
  else delete ziel.wachstum;
  if (stand.saison) ziel.saison = stand.saison;
  else delete ziel.saison;
}
