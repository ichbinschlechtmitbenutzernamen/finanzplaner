import type { EinmalZiel } from "../domain/eingabe/plan-aendern.ts";
import { roundCents, roundRate } from "../domain/calc/round.ts";
import { istAktiv, mengeImMonat, monatsbetragCents } from "../domain/calc/monatswert.ts";
import { addMonths } from "../domain/months.ts";
import type { Planjahr } from "../domain/reports/planjahr.ts";
import type {
  Finanzplan,
  IsoMonth,
  MengenVorgabe,
  MonatswertVorgabe,
  Zuschuss,
} from "../domain/types.ts";
import { formatProzent } from "./format.ts";
import {
  euroZeile,
  kopfZeile,
  planjahrSummen,
  summenZeile,
  type TabellenZeile,
} from "./zeilen-modell.ts";

const LEBEN: {
  feld:
    | "lebenshaltung"
    | "krankenversicherung"
    | "pflegeversicherung"
    | "altersvorsorge"
    | "sonstigeVersicherungen";
  label: string;
}[] = [
  { feld: "lebenshaltung", label: "Lebenshaltung" },
  { feld: "krankenversicherung", label: "Krankenversicherung" },
  { feld: "pflegeversicherung", label: "Pflegeversicherung" },
  { feld: "altersvorsorge", label: "Altersvorsorge" },
  { feld: "sonstigeVersicherungen", label: "Sonstige Versicherungen" },
];

/** Eingabezeilen: bearbeitbare Regeln und einmalige Beträge, plus nachgerechnete Summen. */
export function eingabeZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  jahre: readonly Planjahr[],
): TabellenZeile[] {
  const start = plan.startMonat;
  if (!start) return [];
  const laenge = monate.length;
  const umsatz = umsatzZeilen(plan, monate, start, jahre);
  const personal = personalZeilen(plan, monate, start, jahre);
  const kosten = kostenZeilen(plan, monate, start, jahre, umsatz.netto);
  const investitionen = listenZeilen(plan, monate, jahre);
  const finanzierung = finanzierungZeilen(plan, monate, jahre);
  const leben = lebenZeilen(plan, monate, start, jahre);

  return [
    kopfZeile("kopf-umsatz", "Umsatz", laenge),
    ...umsatz.zeilen,
    summenZeile("summe-umsatz", "Summe Umsatz", umsatz.summe, laenge, jahre),
    ...warenBlock(umsatz.waren, laenge, jahre),
    kopfZeile("kopf-personal", "Personal", laenge),
    ...personal.zeilen,
    summenZeile("summe-personal", "Summe Personal, Brutto", personal.summe, laenge, jahre),
    kopfZeile("kopf-kosten", "Laufende Kosten", laenge),
    ...kosten.zeilen,
    summenZeile("summe-kosten", "Summe laufende Kosten", kosten.summe, laenge, jahre),
    kopfZeile("kopf-invest", "Investitionen, Gründung und Anlauf", laenge),
    ...investitionen,
    kopfZeile("kopf-finanzierung", "Finanzierung", laenge),
    ...finanzierung,
    ...leben,
  ];
}

export function planMonate(plan: Finanzplan): IsoMonth[] {
  if (!plan.startMonat) return [];
  return Array.from({ length: plan.horizontMonate }, (_, index) =>
    addMonths(plan.startMonat as IsoMonth, index),
  );
}

function warenBlock(
  waren: TabellenZeile[],
  laenge: number,
  jahre: readonly Planjahr[],
): TabellenZeile[] {
  if (waren.length === 0) return [];
  return [
    kopfZeile("kopf-ware", "Wareneinsatz", laenge),
    ...waren,
    summenZeile("summe-ware", "Summe Wareneinsatz", waren, laenge, jahre),
  ];
}

function umsatzZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  jahre: readonly Planjahr[],
): { zeilen: TabellenZeile[]; summe: TabellenZeile[]; waren: TabellenZeile[]; netto: number[] } {
  const zeilen: TabellenZeile[] = [];
  const summe: TabellenZeile[] = [];
  const waren: TabellenZeile[] = [];
  const netto = monate.map(() => 0);

  for (const position of plan.umsatzplanung) {
    const aktiv = (monat: IsoMonth) => istAktiv(monat, position.aktivVon, position.aktivBis);
    const erlaubt = monate.map(aktiv);
    let erloes: (number | null)[];
    if (position.art === "monatsumsatz") {
      erloes = reihe(position.monatsumsatz, monate, start, aktiv);
      const zeile = euroZeile(
        {
          id: `umsatz-${position.id}`,
          bezeichnung: position.bezeichnung,
          ebene: 1,
          rolle: "normal",
          werte: erloes,
          bearbeitbar: erlaubt,
          serie: { art: "umsatz", id: position.id },
        },
        jahre,
      );
      zeilen.push(zeile);
      summe.push(zeile);
    } else {
      const menge = mengenReihe(position.mengeProMonat, monate, start, aktiv);
      const preis = reihe(position.preisNetto, monate, start, aktiv);
      erloes = monate.map((_, index) => {
        if (!erlaubt[index]) return null;
        return roundCents((menge[index] ?? 0) * (preis[index] ?? 0));
      });
      zeilen.push(
        {
          id: `menge-${position.id}`,
          bezeichnung: `Menge ${position.bezeichnung}`,
          ebene: 1,
          rolle: "normal",
          kopf: false,
          werte: menge,
          planjahre: planjahrSummen(menge, jahre),
          bearbeitbar: erlaubt,
          einheit: "menge",
          serie: { art: "menge", id: position.id },
        },
        euroZeile(
          {
            id: `preis-${position.id}`,
            bezeichnung: `Preis ${position.bezeichnung}`,
            ebene: 1,
            rolle: "normal",
            werte: preis,
            bearbeitbar: erlaubt,
            serie: { art: "preis", id: position.id },
          },
          jahre,
        ),
      );
      const erloesZeile = euroZeile(
        {
          id: `erloes-${position.id}`,
          bezeichnung: position.bezeichnung,
          ebene: 1,
          rolle: "summe",
          werte: erloes,
          bearbeitbar: erlaubt.map(() => false),
        },
        jahre,
      );
      zeilen.push(erloesZeile);
      summe.push(erloesZeile);
    }

    erloes.forEach((wert, index) => {
      netto[index] = (netto[index] ?? 0) + (wert ?? 0);
    });

    if (position.wareneinsatz.art === "prozent_vom_umsatz") {
      const quote = position.wareneinsatz.quote;
      const werte = erloes.map((wert) => (wert == null ? null : roundRate(wert, quote)));
      waren.push(
        euroZeile(
          {
            id: `ware-${position.id}`,
            bezeichnung: `${position.bezeichnung}, ${formatProzent(quote)}`,
            ebene: 1,
            rolle: "normal",
            werte,
            bearbeitbar: werte.map(() => false),
          },
          jahre,
        ),
      );
    }
  }

  return { zeilen, summe, waren, netto };
}

function personalZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  jahre: readonly Planjahr[],
): { zeilen: TabellenZeile[]; summe: TabellenZeile[] } {
  const zeilen: TabellenZeile[] = [];
  const summe: TabellenZeile[] = [];
  for (const stelle of plan.personal) {
    const aktiv = (monat: IsoMonth) => istAktiv(monat, stelle.eintritt, stelle.austritt);
    const brutto = euroZeile(
      {
        id: `personal-${stelle.id}`,
        bezeichnung: `${stelle.bezeichnung}, Brutto`,
        ebene: 1,
        rolle: "normal",
        werte: reihe(stelle.brutto, monate, start, aktiv),
        bearbeitbar: monate.map(aktiv),
        serie: { art: "personal", id: stelle.id },
      },
      jahre,
    );
    zeilen.push(brutto);
    summe.push(brutto);
    const sonder = stelle.sonderzahlungen ?? [];
    if (sonder.length > 0) {
      const werte = monate.map((monat) => {
        const betrag = sonder
          .filter((eintrag) => eintrag.monat === monat)
          .reduce((gesamt, eintrag) => gesamt + eintrag.bruttoCents, 0);
        return betrag === 0 ? null : betrag;
      });
      const sonderZeile = euroZeile(
        {
          id: `sonder-${stelle.id}`,
          bezeichnung: `${stelle.bezeichnung}, Sonderzahlung`,
          ebene: 1,
          rolle: "nachricht",
          werte,
          bearbeitbar: werte.map(() => false),
        },
        jahre,
      );
      zeilen.push(sonderZeile);
      summe.push(sonderZeile);
    }
  }
  return { zeilen, summe };
}

function kostenZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  jahre: readonly Planjahr[],
  umsatzNetto: readonly number[],
): { zeilen: TabellenZeile[]; summe: TabellenZeile[] } {
  const zeilen: TabellenZeile[] = [];
  const summe: TabellenZeile[] = [];
  for (const position of plan.laufendeKosten) {
    const aktiv = (monat: IsoMonth) => istAktiv(monat, position.aktivVon, position.aktivBis);
    if (position.art === "fix") {
      const zeile = euroZeile(
        {
          id: `kosten-${position.id}`,
          bezeichnung: position.bezeichnung,
          ebene: 1,
          rolle: "normal",
          werte: reihe(position.betrag, monate, start, aktiv),
          bearbeitbar: monate.map(aktiv),
          serie: { art: "kosten", id: position.id },
        },
        jahre,
      );
      zeilen.push(zeile);
      summe.push(zeile);
      continue;
    }
    const zeile = euroZeile(
      {
        id: `kosten-${position.id}`,
        bezeichnung: `${position.bezeichnung}, ${formatProzent(position.umsatzquote)} vom Umsatz`,
        ebene: 1,
        rolle: "nachricht",
        werte: monate.map((monat, index) =>
          aktiv(monat) ? roundRate(umsatzNetto[index] ?? 0, position.umsatzquote) : null,
        ),
        bearbeitbar: monate.map(() => false),
      },
      jahre,
    );
    zeilen.push(zeile);
    summe.push(zeile);
  }
  return { zeilen, summe };
}

function listenZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  jahre: readonly Planjahr[],
): TabellenZeile[] {
  const laenge = monate.length;
  const invest = plan.kapitalbedarf.investitionen.map((posten) =>
    einmalBetrag(
      `invest-${posten.id}`,
      posten.bezeichnung,
      posten.anschaffungsmonat,
      posten.nettoCents,
      monate,
      jahre,
      { art: "investition", id: posten.id },
    ),
  );
  const gruendung = plan.kapitalbedarf.gruendungskosten.map((posten) =>
    einmalBetrag(
      `gruendung-${posten.id}`,
      posten.bezeichnung,
      posten.monat,
      posten.nettoCents,
      monate,
      jahre,
      { art: "gruendung", id: posten.id },
    ),
  );
  const anlauf = plan.kapitalbedarf.anlaufkosten.map((posten) =>
    einmalBetrag(
      `anlauf-${posten.id}`,
      posten.bezeichnung,
      posten.monat,
      posten.nettoCents,
      monate,
      jahre,
      { art: "anlauf", id: posten.id },
    ),
  );
  const mittel = plan.kapitalbedarf.betriebsmittel;
  const erster = monate[0];
  const bestand = [
    erster
      ? einmalBetrag(
          "betriebsmittel",
          "Betriebsmittelbedarf",
          erster,
          mittel.betriebsmittelbedarfCents,
          monate,
          jahre,
          { art: "betriebsmittel", feld: "betriebsmittelbedarfCents" },
        )
      : null,
    erster
      ? einmalBetrag(
          "reserve",
          "Liquiditätsreserve",
          erster,
          mittel.liquiditaetsreserveCents,
          monate,
          jahre,
          { art: "betriebsmittel", feld: "liquiditaetsreserveCents" },
        )
      : null,
    erster
      ? einmalBetrag(
          "warenbestand",
          "Waren-Erstbestand",
          erster,
          mittel.warenErstbestandNettoCents ?? 0,
          monate,
          jahre,
          { art: "betriebsmittel", feld: "warenErstbestandNettoCents" },
        )
      : null,
  ].filter((zeile) => zeile != null);
  const details = [...invest, ...gruendung, ...anlauf, ...bestand];
  return [
    ...details,
    summenZeile("summe-invest", "Summe Investitionen und Start", details, laenge, jahre),
  ];
}

function finanzierungZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  jahre: readonly Planjahr[],
): TabellenZeile[] {
  const eigen = plan.finanzierung.eigenkapital.map((posten) =>
    einmalBetrag(
      `ek-${posten.id}`,
      posten.bezeichnung,
      posten.monat,
      posten.betragCents,
      monate,
      jahre,
      { art: "eigenkapital", id: posten.id },
    ),
  );
  const darlehen = plan.finanzierung.darlehen.map((posten) => {
    const werte = monate.map((monat) => {
      const treffer = posten.auszahlungen.filter((eintrag) => eintrag.monat === monat);
      if (treffer.length === 0) return null;
      return treffer.reduce((summe, eintrag) => summe + eintrag.betragCents, 0);
    });
    return euroZeile(
      {
        id: `darlehen-${posten.id}`,
        bezeichnung: posten.bezeichnung,
        ebene: 1,
        rolle: "normal",
        werte,
        bearbeitbar: werte.map((wert) => wert != null),
        einmalImMonat: (monat) =>
          posten.auszahlungen.some((eintrag) => eintrag.monat === monat)
            ? { art: "darlehen", id: posten.id, monat }
            : null,
      },
      jahre,
    );
  });
  const zuschuesse = plan.finanzierung.zuschuesse.map((zuschuss) =>
    zuschussZeile(zuschuss, monate, jahre),
  );
  const details = [...eigen, ...darlehen, ...zuschuesse];
  return [
    ...details,
    summenZeile("summe-finanzierung", "Summe Finanzierung", details, monate.length, jahre),
  ];
}

function lebenZeilen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  jahre: readonly Planjahr[],
): TabellenZeile[] {
  const bloecke = plan.stammdaten.personen.flatMap((person) => {
    if (!person.lebensbedarf) return [];
    const zeilen = LEBEN.map((feld) => {
      const vorgabe = person.lebensbedarf?.[feld.feld];
      if (!vorgabe) return null;
      return euroZeile(
        {
          id: `leben-${person.id}-${feld.feld}`,
          bezeichnung: `${person.name}, ${feld.label}`,
          ebene: 1,
          rolle: "normal",
          werte: reihe(vorgabe, monate, start, () => true),
          bearbeitbar: monate.map(() => true),
          serie: { art: "leben", personId: person.id, feld: feld.feld },
        },
        jahre,
      );
    }).filter((zeile) => zeile != null);
    return [
      kopfZeile(`kopf-leben-${person.id}`, `Privatbedarf ${person.name}`, monate.length),
      ...zeilen,
      summenZeile(
        `summe-leben-${person.id}`,
        `Summe Privatbedarf ${person.name}`,
        zeilen,
        monate.length,
        jahre,
      ),
    ];
  });
  return bloecke;
}

function zuschussZeile(
  zuschuss: Zuschuss,
  monate: readonly IsoMonth[],
  jahre: readonly Planjahr[],
): TabellenZeile {
  const werte = zuschussWerte(zuschuss, monate);
  const frei = zuschuss.auszahlung.art === "frei" ? zuschuss.auszahlung : null;
  return euroZeile(
    {
      id: `zuschuss-${zuschuss.id}`,
      bezeichnung: zuschuss.bezeichnung,
      ebene: 1,
      rolle: "normal",
      werte,
      bearbeitbar: monate.map(
        (monat) => frei?.positionen.some((eintrag) => eintrag.monat === monat) ?? false,
      ),
      einmalImMonat: (monat) =>
        frei?.positionen.some((eintrag) => eintrag.monat === monat)
          ? { art: "zuschuss", id: zuschuss.id, monat }
          : null,
    },
    jahre,
  );
}

function zuschussWerte(zuschuss: Zuschuss, monate: readonly IsoMonth[]): (number | null)[] {
  const werte = monate.map(() => null as number | null);
  const auszahlung = zuschuss.auszahlung;
  if (auszahlung.art === "frei") {
    for (const position of auszahlung.positionen) {
      const index = monate.indexOf(position.monat);
      if (index >= 0) werte[index] = (werte[index] ?? 0) + position.betragCents;
    }
    return werte;
  }
  for (let index = 0; index < auszahlung.phase1Monate; index += 1) {
    setzen(
      werte,
      monate,
      addMonths(auszahlung.startMonat, index),
      auszahlung.alg1MonatlichCents + auszahlung.pauschaleCents,
    );
  }
  if (auszahlung.phase2Geplant) {
    for (let index = 0; index < auszahlung.phase2Monate; index += 1) {
      setzen(
        werte,
        monate,
        addMonths(auszahlung.startMonat, auszahlung.phase1Monate + index),
        auszahlung.pauschaleCents,
      );
    }
  }
  return werte;
}

function setzen(
  werte: (number | null)[],
  monate: readonly IsoMonth[],
  monat: IsoMonth,
  betrag: number,
): void {
  const index = monate.indexOf(monat);
  if (index >= 0) werte[index] = betrag;
}

function einmalBetrag(
  id: string,
  bezeichnung: string,
  monat: IsoMonth,
  betrag: number,
  monate: readonly IsoMonth[],
  jahre: readonly Planjahr[],
  einmal: EinmalZiel,
): TabellenZeile {
  const index = monate.indexOf(monat);
  const werte = monate.map((_, spalte) => (spalte === index ? betrag : null));
  return euroZeile(
    {
      id,
      bezeichnung,
      ebene: 1,
      rolle: "normal",
      werte,
      bearbeitbar: werte.map((wert) => wert != null),
      einmal,
    },
    jahre,
  );
}

function reihe(
  vorgabe: MonatswertVorgabe,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  aktiv: (monat: IsoMonth) => boolean,
): (number | null)[] {
  return monate.map((monat) => (aktiv(monat) ? monatsbetragCents(vorgabe, monat, start) : null));
}

function mengenReihe(
  vorgabe: MengenVorgabe,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  aktiv: (monat: IsoMonth) => boolean,
): (number | null)[] {
  return monate.map((monat) => (aktiv(monat) ? mengeImMonat(vorgabe, monat, start) : null));
}
