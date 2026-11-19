import { parseIsoMonth } from "../months.ts";
import type {
  Finanzplan,
  IsoMonth,
  Person,
  SozialversicherungEingabe,
  SozialversicherungParameter,
} from "../types.ts";
import { roundCents, roundRate } from "./round.ts";
import { ruecklageJeMonat, verteileNachAnteilen } from "./steuer.ts";
import type {
  JahresVorsorge,
  PersonalBlock,
  SteuerBlock,
  VorsorgeBlock,
  VorsorgePerson,
} from "./types.ts";

export type { JahresVorsorge, VorsorgeBlock, VorsorgePerson };

/**
 * Kranken-, Pflege-, Renten- und Arbeitslosenversicherung.
 * Die Bemessung ist der Gewinnanteil oder, wo ein Geschäftsführergehalt geplant ist, dieses Gehalt.
 * Die Beiträge hängen nicht von der Steuer ab. Die Rücklage wird danach ergänzt.
 */
export function berechneVorsorge(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  betriebsergebnisCents: readonly number[],
  personal: PersonalBlock,
): VorsorgeBlock {
  const parameter = plan.parameter.sozialversicherung;
  const gewinn = gewinnJePerson(plan, monate, betriebsergebnisCents);
  return {
    personen: plan.stammdaten.personen
      .filter((person) => person.lebensbedarf != null)
      .map((person) => personVorsorge(plan, person, monate, personal, gewinn, parameter)),
  };
}

/** Hängt die Einkommensteuerrücklage an, nachdem der Steuerkern die Vorsorge abgezogen hat. */
export function ergaenzeSteuerruecklage(
  vorsorge: VorsorgeBlock,
  monate: readonly IsoMonth[],
  steuern: SteuerBlock,
): void {
  for (const person of vorsorge.personen) {
    person.estRuecklageCents = ruecklageDerPerson(person.personId, monate, steuern);
  }
}

export function vorsorgeNachJahr(
  person: VorsorgePerson,
  monate: readonly IsoMonth[],
): Map<number, JahresVorsorge> {
  const nachJahr = new Map<number, JahresVorsorge>();
  monate.forEach((monat, index) => {
    const jahr = parseIsoMonth(monat).year;
    const eintrag = nachJahr.get(jahr) ?? { jahr, kvCents: 0, pvCents: 0, rvCents: 0, avCents: 0 };
    eintrag.kvCents += person.kvCents[index] ?? 0;
    eintrag.pvCents += person.pvCents[index] ?? 0;
    eintrag.rvCents += person.rvCents[index] ?? 0;
    eintrag.avCents += person.avCents[index] ?? 0;
    nachJahr.set(jahr, eintrag);
  });
  return nachJahr;
}

/**
 * Abziehbare Vorsorgeaufwendungen eines Kalenderjahres.
 * Basis-Kranken- und Pflegeversicherung in voller Höhe, Rentenversicherung bis zum Höchstbetrag,
 * Arbeitslosenversicherung nur im Rest des sonstigen Vorsorgehöchstbetrags.
 */
export function vorsorgeAbzugCents(
  jahr: JahresVorsorge,
  splitting: boolean,
  parameter: SozialversicherungParameter,
): { kvPvCents: number; renteCents: number; arbeitslosCents: number; abzugCents: number } {
  const kvPvCents = jahr.kvCents + jahr.pvCents;
  const deckel = parameter.altersvorsorgeHoechstbetragCents * (splitting ? 2 : 1);
  const renteCents = Math.min(jahr.rvCents, deckel);
  const rest = Math.max(0, parameter.sonstigeVorsorgeHoechstbetragCents - kvPvCents);
  const arbeitslosCents = Math.min(jahr.avCents, rest);
  return {
    kvPvCents,
    renteCents,
    arbeitslosCents,
    abzugCents: kvPvCents + renteCents + arbeitslosCents,
  };
}

/**
 * § 345b SGB III: im Kalenderjahr der Aufnahme und im folgenden Kalenderjahr
 * ist die beitragspflichtige Einnahme die halbe Bezugsgröße.
 */
export function halbeStartphase(plan: Finanzplan, monat: IsoMonth): boolean {
  const start = plan.stammdaten.gruendungsmonat ?? plan.startMonat;
  if (!start) return false;
  const gründungsjahr = parseIsoMonth(start).year;
  const jahr = parseIsoMonth(monat).year;
  return jahr === gründungsjahr || jahr === gründungsjahr + 1;
}

function personVorsorge(
  plan: Finanzplan,
  person: Person,
  monate: readonly IsoMonth[],
  personal: PersonalBlock,
  gewinn: Map<string, number[]>,
  parameter: SozialversicherungParameter,
): VorsorgePerson {
  const eingabe = person.lebensbedarf?.sozialversicherung;
  const gehalt = gehaltJeMonat(plan, person.id, personal);
  const art = gehalt ? "gehalt" : "gewinn";
  const roh = gehalt ?? durchschnitt(monate, gewinn.get(person.id) ?? leer(monate.length));
  const kv = leer(monate.length);
  const pv = leer(monate.length);
  const rv = leer(monate.length);
  const av = leer(monate.length);
  const bemessung = leer(monate.length);
  let mindest = false;
  if (eingabe) {
    monate.forEach((monat, index) => {
      const wert = roh[index] ?? 0;
      bemessung[index] = wert;
      if (
        eingabe.krankenversicherung === "gesetzlich" &&
        wert < parameter.kvMindestbemessungMonatCents
      ) {
        mindest = true;
      }
      const beitrag = beitraege(wert, eingabe, parameter, monat, plan);
      kv[index] = beitrag.kv;
      pv[index] = beitrag.pv;
      rv[index] = beitrag.rv;
      av[index] = beitrag.av;
    });
  }
  const ergebnis: VorsorgePerson = {
    personId: person.id,
    name: person.name,
    kvCents: kv,
    pvCents: pv,
    rvCents: rv,
    avCents: av,
    estRuecklageCents: leer(monate.length),
    bemessungCents: bemessung,
    bemessungArt: art,
    mindestbeitrag: mindest,
    herleitung: [],
    jahre: [],
  };
  ergebnis.jahre = [...vorsorgeNachJahr(ergebnis, monate).values()];
  ergebnis.herleitung = herleitung(ergebnis, eingabe, parameter, art);
  return ergebnis;
}

function beitraege(
  roh: number,
  eingabe: SozialversicherungEingabe,
  parameter: SozialversicherungParameter,
  monat: IsoMonth,
  plan: Finanzplan,
): { kv: number; pv: number; rv: number; av: number } {
  const kvPv = krankenPflege(roh, eingabe, parameter);
  return {
    kv: kvPv.kv,
    pv: kvPv.pv,
    rv: rente(roh, eingabe, parameter),
    av: arbeitslos(eingabe, parameter, monat, plan),
  };
}

function krankenPflege(
  roh: number,
  eingabe: SozialversicherungEingabe,
  parameter: SozialversicherungParameter,
): { kv: number; pv: number } {
  if (eingabe.krankenversicherung === "privat") {
    return { kv: eingabe.privatbeitragCents, pv: 0 };
  }
  const basis = klemme(
    roh,
    parameter.kvMindestbemessungMonatCents,
    parameter.kvHoechstbemessungMonatCents,
  );
  const kvSatz =
    (eingabe.krankengeldanspruch ? parameter.kvAllgemeinSatz : parameter.kvErmaessigtSatz) +
    parameter.kvZusatzbeitragSatz;
  const pvSatz = parameter.pvSatz + (eingabe.kinder ? 0 : parameter.pvKinderlosZuschlagSatz);
  return { kv: roundRate(basis, kvSatz), pv: roundRate(basis, pvSatz) };
}

function rente(
  roh: number,
  eingabe: SozialversicherungEingabe,
  parameter: SozialversicherungParameter,
): number {
  if (eingabe.rentenversicherung === "nein") return 0;
  if (eingabe.rentenversicherung === "freiwillig") {
    return roundRate(parameter.bezugsGroesseMonatCents, parameter.rvSatz);
  }
  const basis = klemme(
    Math.max(0, roh),
    parameter.rvMindestbemessungMonatCents,
    parameter.rvHoechstbemessungMonatCents,
  );
  return roundRate(basis, parameter.rvSatz);
}

function arbeitslos(
  eingabe: SozialversicherungEingabe,
  parameter: SozialversicherungParameter,
  monat: IsoMonth,
  plan: Finanzplan,
): number {
  if (!eingabe.arbeitslosenversicherung) return 0;
  const basis = halbeStartphase(plan, monat)
    ? roundCents(parameter.bezugsGroesseMonatCents / 2)
    : parameter.bezugsGroesseMonatCents;
  return roundRate(basis, parameter.avSatz);
}

function gewinnJePerson(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  betriebsergebnisCents: readonly number[],
): Map<string, number[]> {
  const personen = plan.stammdaten.personen.filter((person) => person.anteil > 0);
  const anteile = personen.map((person) => person.anteil);
  const reihen = new Map<string, number[]>(
    personen.map((person) => [person.id, leer(monate.length)]),
  );
  betriebsergebnisCents.forEach((gewinn, index) => {
    const teile = verteileNachAnteilen(gewinn, anteile);
    personen.forEach((person, personIndex) => {
      const reihe = reihen.get(person.id);
      if (reihe) reihe[index] = teile[personIndex] ?? 0;
    });
  });
  return reihen;
}

function gehaltJeMonat(
  plan: Finanzplan,
  personId: string,
  personal: PersonalBlock,
): number[] | null {
  const stellen = plan.personal.filter(
    (stelle) => stelle.personId === personId && stelle.rolle === "geschaeftsfuehrer",
  );
  if (stellen.length === 0) return null;
  const laenge = personal.stellen[0]?.bruttoCents.length ?? plan.horizontMonate;
  const werte = Array.from({ length: laenge }, () => 0);
  for (const stelle of stellen) {
    const ergebnis = personal.stellen.find((eintrag) => eintrag.id === stelle.id);
    if (!ergebnis) continue;
    ergebnis.bruttoCents.forEach((brutto, index) => {
      werte[index] = (werte[index] ?? 0) + brutto + (ergebnis.sonderzahlungCents[index] ?? 0);
    });
  }
  return werte;
}

/** Durchschnitt der im Plan liegenden Monate eines Kalenderjahres, auf ganze Cent gerundet. */
function durchschnitt(monate: readonly IsoMonth[], werte: readonly number[]): number[] {
  const gruppen = new Map<number, number[]>();
  monate.forEach((monat, index) => {
    const jahr = parseIsoMonth(monat).year;
    const liste = gruppen.get(jahr) ?? [];
    liste.push(index);
    gruppen.set(jahr, liste);
  });
  const ergebnis = werte.map(() => 0);
  for (const indizes of gruppen.values()) {
    const summe = indizes.reduce((total, index) => total + (werte[index] ?? 0), 0);
    const schnitt = indizes.length === 0 ? 0 : roundCents(summe / indizes.length);
    for (const index of indizes) ergebnis[index] = schnitt;
  }
  return ergebnis;
}

function ruecklageDerPerson(
  personId: string,
  monate: readonly IsoMonth[],
  steuern: SteuerBlock,
): number[] {
  const werte = monate.map(() => 0);
  for (const jahr of steuern.jahre) {
    const person = jahr.personen.find((eintrag) => eintrag.personId === personId);
    const last =
      (person?.einkommensteuerCents ?? 0) +
      (person?.solidaritaetszuschlagCents ?? 0) +
      (person?.kirchensteuerCents ?? 0);
    const monateDesJahres = ruecklageJeMonat(last, !jahr.rumpf);
    monate.forEach((monat, index) => {
      if (parseIsoMonth(monat).year !== jahr.jahr) return;
      werte[index] = monateDesJahres.get(parseIsoMonth(monat).month) ?? 0;
    });
  }
  return werte;
}

function herleitung(
  person: VorsorgePerson,
  eingabe: SozialversicherungEingabe | undefined,
  parameter: SozialversicherungParameter,
  art: "gewinn" | "gehalt",
): string[] {
  if (!eingabe) return ["Kein Lebensbedarf erfasst. Abgaben und Steuern sind 0."];
  const zeilen: string[] = [];
  if (eingabe.krankenversicherung === "privat") {
    zeilen.push(
      `Privat versichert. Der Monatsbeitrag ${euro(eingabe.privatbeitragCents)} umfasst Kranken- und Pflegeversicherung und wird nicht aus den Beitragssätzen gerechnet.`,
    );
  } else {
    const satz =
      (eingabe.krankengeldanspruch ? parameter.kvAllgemeinSatz : parameter.kvErmaessigtSatz) +
      parameter.kvZusatzbeitragSatz;
    const pv = parameter.pvSatz + (eingabe.kinder ? 0 : parameter.pvKinderlosZuschlagSatz);
    zeilen.push(
      eingabe.krankengeldanspruch
        ? `Freiwillig gesetzlich versichert mit Krankengeld: ${prozent(parameter.kvAllgemeinSatz)} plus durchschnittlicher Zusatzbeitrag ${prozent(parameter.kvZusatzbeitragSatz)}, zusammen ${prozent(satz)}.`
        : `Freiwillig gesetzlich versichert ohne Krankengeld: ${prozent(parameter.kvErmaessigtSatz)} plus durchschnittlicher Zusatzbeitrag ${prozent(parameter.kvZusatzbeitragSatz)}, zusammen ${prozent(satz)}.`,
    );
    zeilen.push(
      eingabe.kinder
        ? `Pflegeversicherung ${prozent(parameter.pvSatz)}, ohne Kinderlosenzuschlag.`
        : `Pflegeversicherung ${prozent(pv)} einschließlich Kinderlosenzuschlag ${prozent(parameter.pvKinderlosZuschlagSatz)}.`,
    );
  }
  zeilen.push(
    art === "gehalt"
      ? "Bemessung ist das Geschäftsführergehalt dieser Person, weil eines geplant ist."
      : "Bemessung ist der durchschnittliche monatliche Gewinnanteil je Kalenderjahr. Ein Rumpfjahr wird nicht auf zwölf Monate hochgerechnet.",
  );
  zeilen.push(
    `Grenzen Kranken- und Pflegeversicherung: mindestens ${euro(parameter.kvMindestbemessungMonatCents)}, höchstens ${euro(parameter.kvHoechstbemessungMonatCents)} im Monat.`,
  );
  if (person.mindestbeitrag) {
    zeilen.push(
      "Der Mindestbeitrag greift: die Bemessung liegt in mindestens einem Monat unter der Mindestbemessung.",
    );
  }
  if (eingabe.rentenversicherung === "nein") {
    zeilen.push("Gesetzliche Rentenversicherung: nicht gewählt.");
  } else if (eingabe.rentenversicherung === "freiwillig") {
    zeilen.push(
      `Rentenversicherung freiwillig, Regelbeitrag ${prozent(parameter.rvSatz)} der Bezugsgröße ${euro(parameter.bezugsGroesseMonatCents)} = ${euro(roundRate(parameter.bezugsGroesseMonatCents, parameter.rvSatz))} im Monat.`,
    );
  } else {
    zeilen.push(
      `Rentenversicherung pflichtig, einkommensgerecht mit ${prozent(parameter.rvSatz)}, Grenzen ${euro(parameter.rvMindestbemessungMonatCents)} bis ${euro(parameter.rvHoechstbemessungMonatCents)}.`,
    );
  }
  if (eingabe.arbeitslosenversicherung) {
    zeilen.push(
      `Arbeitslosenversicherung auf Antrag, ${prozent(parameter.avSatz)} der Bezugsgröße. Im Gründungsjahr und im folgenden Kalenderjahr gilt die halbe Bezugsgröße.`,
    );
  } else {
    zeilen.push("Arbeitslosenversicherung: keine Antragspflichtversicherung.");
  }
  zeilen.push(
    `Erster Planmonat: Kranken- und Pflegeversicherung ${euro((person.kvCents[0] ?? 0) + (person.pvCents[0] ?? 0))}, Rentenversicherung ${euro(person.rvCents[0] ?? 0)}, Arbeitslosenversicherung ${euro(person.avCents[0] ?? 0)}.`,
  );
  zeilen.push(
    "Einkommensteuerrücklage: monatliches Zwölftel von Einkommensteuer, Solidaritätszuschlag und Kirchensteuer nach Abzug dieser Vorsorge. Sie ist nachrichtlich und mindert das verfügbare Einkommen nicht noch einmal, weil die festgesetzte Steuer schon abgezogen ist.",
  );
  return zeilen;
}

function klemme(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

function leer(laenge: number): number[] {
  return Array.from({ length: laenge }, () => 0);
}

function euro(cents: number): string {
  const negativ = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const ganz = Math.floor(abs / 100);
  const rest = abs % 100;
  const gruppen = ganz.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativ ? "-" : ""}${gruppen},${String(rest).padStart(2, "0")} €`;
}

function prozent(satz: number): string {
  const text = (satz * 100).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
  return `${text} %`;
}
