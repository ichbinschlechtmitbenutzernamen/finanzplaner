import { parseIsoMonth } from "../months.ts";
import type {
  Bundesland,
  Finanzplan,
  IsoMonth,
  Person,
  Rechtsform,
  Steuerparameter,
  Steuerprofil,
} from "../types.ts";
import { ABSCHLUSSZAHLUNG_MONAT_STANDARD } from "../types.ts";
import { summe } from "./reihe.ts";
import type {
  BerechnungHinweis,
  SteuerBlock,
  SteuerJahr,
  SteuerMonat,
  SteuerPersonJahr,
} from "./types.ts";
import { einkommensteuerCents, kirchensteuerCents, solidaritaetszuschlagCents } from "./tarif.ts";

/**
 * Ertragsteuern eines Plans.
 * Gewerbesteuer und Körperschaftsteuer sind keine Betriebsausgaben.
 * Die Einkommensteuer der Personen ist privat und steht trotzdem in der Liquidität.
 */

export const STEUERRUECKLAGE_HINWEIS =
  "Bestenfalls jeden Monat Budget zur Bildung einer Steuerrücklage verwenden, damit die Steuerlast in der Liquidität berücksichtigt ist.";

const EST_MONATE = [3, 6, 9, 12] as const;
const GEWST_MONATE = [2, 5, 8, 11] as const;

interface GesellschaftSteuer {
  gewerbeertragCents: number;
  abgerundetCents: number;
  freibetragCents: number;
  massgebendCents: number;
  messbetragCents: number;
  gewerbesteuerCents: number;
}

export function berechneErtragsteuer(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  betriebsergebnisCents: readonly number[],
  progressionsvorbehaltCents: readonly number[],
): SteuerBlock {
  const abschlusszahlungMonat =
    plan.steuerplanung?.abschlusszahlungMonat ?? ABSCHLUSSZAHLUNG_MONAT_STANDARD;
  const rechtsform = plan.stammdaten.rechtsform;
  const hinweise: BerechnungHinweis[] = [];
  if (!rechtsform) {
    return {
      art: "keine",
      abschlusszahlungMonat,
      jahre: [],
      monate: leereMonate(monate),
      hinweise: [
        {
          code: "steuer_ohne_rechtsform",
          message:
            "Ohne Rechtsform wird keine Einkommen-, Gewerbe- oder Körperschaftsteuer gerechnet.",
        },
      ],
    };
  }

  const art = istKapitalgesellschaft(rechtsform) ? "koerperschaftsteuer" : "einkommensteuer";
  const jahre = gruppiereJahre(monate).map((gruppe) =>
    steuerJahr(
      plan,
      rechtsform,
      gruppe.jahr,
      gruppe.indizes,
      monate,
      betriebsergebnisCents,
      progressionsvorbehaltCents,
    ),
  );

  const zahlung = baueZahlungen(jahre, monate, abschlusszahlungMonat);
  for (const jahr of jahre) {
    const imJahr = zahlung.monate.filter((monat) => monat.monat.startsWith(`${jahr.jahr}-`));
    jahr.ruecklageImPlanCents = summe(imJahr.map((monat) => monat.ruecklageCents));
  }

  if (rechtsform !== "freiberufler" && plan.stammdaten.gewerbesteuerHebesatz == null) {
    hinweise.push({
      code: "steuer_ohne_hebesatz",
      message: "Ohne Gewerbesteuer-Hebesatz wird keine Gewerbesteuer gerechnet.",
    });
  }
  hinweise.push({ code: "steuer_ruecklage", message: STEUERRUECKLAGE_HINWEIS });
  const rumpf = jahre.filter((jahr) => jahr.rumpf);
  if (rumpf.length > 0) {
    hinweise.push({
      code: "steuer_rumpfjahr",
      message: rumpf
        .map(
          (jahr) =>
            `Rumpfjahr ${jahr.jahr} umfasst ${jahr.monateImPlan} von 12 Monaten (${jahr.vonMonat} bis ${jahr.bisMonat}). Versteuert wird der bekannte Gewinn ohne Hochrechnung. Kinderfreibeträge und weitere Einkünfte bleiben Jahresbeträge. Vorauszahlungen nach dem letzten Planmonat stehen als offen.`,
        )
        .join(" "),
    });
  }
  hinweise.push({
    code: "steuer_vorauszahlung",
    message:
      "Die Steuer des ersten Kalenderjahres wird geschlossen im Zahlungsmonat des zweiten Kalenderjahres gezahlt. Ab dem zweiten Kalenderjahr sind die Vorauszahlungen je ein Viertel der für dasselbe Jahr geplanten Steuer, Einkommen- und Körperschaftsteuer im März, Juni, September und Dezember, Gewerbesteuer im Februar, Mai, August und November. Der letzte Termin trägt den Rundungsrest. Eine Nachzahlung gegen das Vorjahr wird nicht zusätzlich angesetzt: im Plan entsprechen die Vorauszahlungen der geplanten Steuer, die Differenz ist null, soweit alle vier Termine im Horizont liegen.",
  });

  const offen = jahre.reduce(
    (total, jahr) =>
      total +
      jahr.einkommensteuerOffenCents +
      jahr.gewerbesteuerOffenCents +
      jahr.koerperschaftsteuerOffenCents,
    0,
  );
  if (offen > 0) {
    hinweise.push({
      code: "steuer_offen",
      message: `Steuertermine nach dem letzten Planmonat bleiben offen: ${offen} Cent. Sie werden nicht in den Horizont vorgezogen.`,
    });
  }

  return { art, abschlusszahlungMonat, jahre, monate: zahlung.monate, hinweise };
}

export function gewerbesteuer(
  gewinnCents: number,
  parameter: Steuerparameter,
  hebesatz: number | null,
  freibetragCents: number,
): GesellschaftSteuer {
  if (gewinnCents <= 0 || hebesatz == null) {
    return {
      gewerbeertragCents: gewinnCents,
      abgerundetCents: 0,
      freibetragCents: 0,
      massgebendCents: 0,
      messbetragCents: 0,
      gewerbesteuerCents: 0,
    };
  }
  const abrundung = parameter.gewerbeertragAbrundungCents;
  const abgerundetCents = Math.floor(gewinnCents / abrundung) * abrundung;
  const freibetrag = Math.min(freibetragCents, abgerundetCents);
  const massgebendCents = abgerundetCents - freibetrag;
  const messzahlMillis = BigInt(Math.round(parameter.gewerbesteuerMesszahl * 1000));
  const messExact = (BigInt(massgebendCents) * messzahlMillis) / 1000n;
  const messbetragCents = Number((messExact / 100n) * 100n);
  const hebesatzTausendstel = Math.round(hebesatz * 1000);
  const messEuro = messbetragCents / 100;
  const gewstEuro = Math.floor((messEuro * hebesatzTausendstel) / 100_000);
  return {
    gewerbeertragCents: gewinnCents,
    abgerundetCents,
    freibetragCents: freibetrag,
    massgebendCents,
    messbetragCents,
    gewerbesteuerCents: gewstEuro * 100,
  };
}

function steuerJahr(
  plan: Finanzplan,
  rechtsform: Rechtsform,
  jahr: number,
  indizes: number[],
  monate: readonly IsoMonth[],
  betriebsergebnisCents: readonly number[],
  progressionsvorbehaltCents: readonly number[],
): SteuerJahr {
  const parameter = plan.parameter.steuer;
  const gewinnCents = summe(indizes.map((index) => betriebsergebnisCents[index] ?? 0));
  const progressionCents = summe(indizes.map((index) => progressionsvorbehaltCents[index] ?? 0));
  const kapital = istKapitalgesellschaft(rechtsform);
  const gewerbe = rechtsform !== "freiberufler";
  const freibetrag = kapital
    ? parameter.gewerbesteuerFreibetragKapitalCents
    : parameter.gewerbesteuerFreibetragPersonenCents;
  const hebesatz = plan.stammdaten.gewerbesteuerHebesatz ?? null;
  const gesellschaft = gewerbe
    ? gewerbesteuer(gewinnCents, parameter, hebesatz, freibetrag)
    : gewerbesteuer(0, parameter, null, 0);

  const kst = kapital ? koerperschaftsteuer(gewinnCents, parameter) : { kstCents: 0, soliCents: 0 };
  const personen = kapital
    ? []
    : personenDesJahres(plan, gewinnCents, progressionCents, gesellschaft, gewerbe);

  const einkommensteuerCents = summe(personen.map((person) => person.einkommensteuerCents));
  const soliPersonen = summe(personen.map((person) => person.solidaritaetszuschlagCents));
  const kirchensteuerCents = summe(personen.map((person) => person.kirchensteuerCents));
  const einkommenPaket = einkommensteuerCents + soliPersonen + kirchensteuerCents;
  const kstPaket = kst.kstCents + kst.soliCents;
  const von = monate[indizes[0] ?? 0] ?? `${jahr}-01`;
  const bis = monate[indizes[indizes.length - 1] ?? 0] ?? von;

  return {
    jahr,
    vonMonat: von,
    bisMonat: bis,
    monateImPlan: indizes.length,
    rumpf: indizes.length !== 12,
    gewinnCents,
    progressionsvorbehaltCents: progressionCents,
    gewerbeertragCents: gesellschaft.gewerbeertragCents,
    gewerbeertragAbgerundetCents: gesellschaft.abgerundetCents,
    freibetragCents: gesellschaft.freibetragCents,
    massgebenderErtragCents: gesellschaft.massgebendCents,
    messbetragCents: gesellschaft.messbetragCents,
    hebesatz: gewerbe ? hebesatz : null,
    gewerbesteuerCents: gesellschaft.gewerbesteuerCents,
    koerperschaftsteuerCents: kst.kstCents,
    koerperschaftsteuerSoliCents: kst.soliCents,
    personen,
    einkommensteuerCents,
    solidaritaetszuschlagCents: soliPersonen,
    kirchensteuerCents,
    steuerLastCents: einkommenPaket + gesellschaft.gewerbesteuerCents + kstPaket,
    einkommensteuerGezahltCents: 0,
    gewerbesteuerGezahltCents: 0,
    koerperschaftsteuerGezahltCents: 0,
    einkommensteuerOffenCents: einkommenPaket,
    gewerbesteuerOffenCents: gesellschaft.gewerbesteuerCents,
    koerperschaftsteuerOffenCents: kstPaket,
    ruecklageImPlanCents: 0,
  };
}

function personenDesJahres(
  plan: Finanzplan,
  gewinnCents: number,
  progressionCents: number,
  gesellschaft: GesellschaftSteuer,
  gewerbe: boolean,
): SteuerPersonJahr[] {
  const personen = plan.stammdaten.personen.filter((person) => person.anteil > 0);
  if (personen.length === 0) return [];
  const anteile = personen.map((person) => person.anteil);
  const gewinnAnteile = verteile(gewinnCents, anteile);
  const progressionAnteile = verteile(progressionCents, anteile);
  // Messbetrag und Gewerbesteuer sind volle Euro. Verteilt wird der Eurobetrag,
  // damit die Summe der Anteile dem festgesetzten Betrag entspricht.
  const messAnteile = verteile(Math.floor(gesellschaft.messbetragCents / 100), anteile).map(
    (euro) => euro * 100,
  );
  const gewstAnteile = verteile(Math.floor(gesellschaft.gewerbesteuerCents / 100), anteile).map(
    (euro) => euro * 100,
  );
  return personen.map((person, index) =>
    personJahr(
      person,
      plan.stammdaten.bundesland,
      plan.parameter.steuer,
      gewinnAnteile[index] ?? 0,
      progressionAnteile[index] ?? 0,
      messAnteile[index] ?? 0,
      gewstAnteile[index] ?? 0,
      gewerbe,
    ),
  );
}

function personJahr(
  person: Person,
  bundesland: Bundesland | undefined,
  parameter: Steuerparameter,
  gewinnanteilCents: number,
  progressionCents: number,
  messbetragAnteilCents: number,
  gewerbesteuerAnteilCents: number,
  gewerbe: boolean,
): SteuerPersonJahr {
  const profil = person.steuerprofil;
  const weitere = profil?.weitereEinkuenfteJahrCents ?? 0;
  const kinderabzugCents = kinderAbzug(profil, parameter);
  const summeEinkuenfteCents = gewinnanteilCents + weitere;
  const zvECents = summeEinkuenfteCents - kinderabzugCents;
  const zvEEuro = zvECents > 0 ? Math.floor(zvECents / 100) : 0;
  const progressionEuro = euroAbgeschnitten(progressionCents);
  const splitting = profil?.splitting ?? false;
  const tarif = einkommensteuerCents({
    zvEEuro,
    splitting,
    progressionsvorbehaltEuro: progressionEuro,
    parameter,
  });
  const positiveGewerblicheEuro =
    gewerbe && gewinnanteilCents > 0 ? Math.floor(gewinnanteilCents / 100) : 0;
  const positiveWeitereEuro = weitere > 0 ? Math.floor(weitere / 100) : 0;
  const positiveEinkuenfteEuro = positiveGewerblicheEuro + positiveWeitereEuro;
  const anrechnung = anrechnung35(
    tarif.tariflicheEinkommensteuerCents,
    messbetragAnteilCents,
    gewerbesteuerAnteilCents,
    positiveGewerblicheEuro,
    positiveEinkuenfteEuro,
    parameter.gewerbesteuerAnrechnungFaktor,
  );
  const einkommensteuer = tarif.tariflicheEinkommensteuerCents - anrechnung.anrechnungCents;
  const soli = solidaritaetszuschlagCents(einkommensteuer, parameter, { splitting });
  const satz = kirchensteuerSatz(profil, bundesland, parameter);
  return {
    personId: person.id,
    name: person.name,
    anteil: person.anteil,
    gewinnanteilCents,
    weitereEinkuenfteCents: weitere,
    kinderabzugCents,
    summeEinkuenfteCents,
    zvECents,
    zvEEuro,
    splitting,
    kirchensteuerSatz: satz,
    progressionsvorbehaltEuro: progressionEuro,
    positiveGewerblicheEuro,
    positiveEinkuenfteEuro,
    tariflicheEinkommensteuerCents: tarif.tariflicheEinkommensteuerCents,
    messbetragAnteilCents,
    gewerbesteuerAnteilCents,
    anrechnungVierfachCents: anrechnung.vierfachCents,
    ermaessigungshoechstbetragCents: anrechnung.hoechstbetragCents,
    anrechnungCents: anrechnung.anrechnungCents,
    einkommensteuerCents: einkommensteuer,
    solidaritaetszuschlagCents: soli,
    kirchensteuerCents: kirchensteuerCents(einkommensteuer, satz),
  };
}

export function anrechnung35(
  tariflicheEinkommensteuerCents: number,
  messbetragCents: number,
  gewerbesteuerCents: number,
  positiveGewerblicheEuro: number,
  positiveEinkuenfteEuro: number,
  faktor: number,
): { vierfachCents: number; hoechstbetragCents: number; anrechnungCents: number } {
  const messEuro = Math.floor(messbetragCents / 100);
  const gewstEuro = Math.floor(gewerbesteuerCents / 100);
  const estEuro = Math.floor(tariflicheEinkommensteuerCents / 100);
  const faktorGanz = Math.round(faktor);
  const vierfachEuro = messEuro * faktorGanz;
  let hoechstEuro = 0;
  if (estEuro > 0 && positiveGewerblicheEuro > 0 && positiveEinkuenfteEuro > 0) {
    const quoteEuro = Math.min(positiveGewerblicheEuro, positiveEinkuenfteEuro);
    hoechstEuro = Number((BigInt(estEuro) * BigInt(quoteEuro)) / BigInt(positiveEinkuenfteEuro));
  }
  const anrechnungEuro = Math.min(vierfachEuro, gewstEuro, hoechstEuro, estEuro);
  return {
    vierfachCents: vierfachEuro * 100,
    hoechstbetragCents: hoechstEuro * 100,
    anrechnungCents: Math.max(0, anrechnungEuro) * 100,
  };
}

function koerperschaftsteuer(
  gewinnCents: number,
  parameter: Steuerparameter,
): { kstCents: number; soliCents: number } {
  if (gewinnCents <= 0) return { kstCents: 0, soliCents: 0 };
  const gewinnEuro = Math.floor(gewinnCents / 100);
  const satzHundert = Math.round(parameter.koerperschaftsteuerSatz * 100);
  const kstEuro = Math.floor((gewinnEuro * satzHundert) / 100);
  const kstCents = kstEuro * 100;
  return {
    kstCents,
    soliCents: solidaritaetszuschlagCents(kstCents, parameter, { ohneFreigrenze: true }),
  };
}

export function kirchensteuerSatz(
  profil: Steuerprofil | undefined,
  bundesland: Bundesland | undefined,
  parameter: Steuerparameter,
): number {
  if (!profil?.kirchensteuer) return 0;
  if (bundesland === "Bayern" || bundesland === "Baden-Württemberg") {
    return parameter.kirchensteuerSatzBayernBadenWuerttemberg;
  }
  return parameter.kirchensteuerSatzUebrigeLaender;
}

function kinderAbzug(profil: Steuerprofil | undefined, parameter: Steuerparameter): number {
  const anzahl = profil?.kinderfreibetraege ?? 0;
  if (anzahl <= 0) return 0;
  const halbe = Math.round(anzahl * 2);
  return (
    halbe * (parameter.kinderfreibetragJeElternteilCents + parameter.beaFreibetragJeElternteilCents)
  );
}

function baueZahlungen(
  jahre: SteuerJahr[],
  monate: readonly IsoMonth[],
  abschlusszahlungMonat: number,
): { monate: SteuerMonat[] } {
  const zeilen: SteuerMonat[] = monate.map((monat) => ({
    monat,
    einkommensteuerAbschlussCents: 0,
    einkommensteuerVorauszahlungCents: 0,
    gewerbesteuerAbschlussCents: 0,
    gewerbesteuerVorauszahlungCents: 0,
    koerperschaftsteuerAbschlussCents: 0,
    koerperschaftsteuerVorauszahlungCents: 0,
    einkommensteuerZahlungCents: 0,
    gewerbesteuerZahlungCents: 0,
    koerperschaftsteuerZahlungCents: 0,
    zahlungCents: 0,
    ruecklageCents: 0,
    ruecklageKumuliertCents: 0,
    zahlungKumuliertCents: 0,
  }));
  const indexNachMonat = new Map(monate.map((monat, index) => [monat, index]));

  jahre.forEach((jahr, jahrIndex) => {
    const estPaket =
      jahr.einkommensteuerCents + jahr.solidaritaetszuschlagCents + jahr.kirchensteuerCents;
    const kstPaket = jahr.koerperschaftsteuerCents + jahr.koerperschaftsteuerSoliCents;
    const gewst = jahr.gewerbesteuerCents;
    if (jahrIndex === 0) {
      const ziel = isoMonat(jahr.jahr + 1, abschlusszahlungMonat);
      const index = indexNachMonat.get(ziel);
      if (index == null) {
        jahr.einkommensteuerOffenCents = estPaket;
        jahr.gewerbesteuerOffenCents = gewst;
        jahr.koerperschaftsteuerOffenCents = kstPaket;
      } else {
        const zeile = zeilen[index];
        if (zeile) {
          zeile.einkommensteuerAbschlussCents += estPaket;
          zeile.gewerbesteuerAbschlussCents += gewst;
          zeile.koerperschaftsteuerAbschlussCents += kstPaket;
        }
        jahr.einkommensteuerGezahltCents = estPaket;
        jahr.gewerbesteuerGezahltCents = gewst;
        jahr.koerperschaftsteuerGezahltCents = kstPaket;
        jahr.einkommensteuerOffenCents = 0;
        jahr.gewerbesteuerOffenCents = 0;
        jahr.koerperschaftsteuerOffenCents = 0;
      }
    } else {
      const estTeile = viertel(estPaket);
      const gewstTeile = viertel(gewst);
      const kstTeile = viertel(kstPaket);
      const est = legeViertel(jahr, EST_MONATE, estTeile, indexNachMonat, zeilen, "einkommen");
      const gewerbeZahlung = legeViertel(
        jahr,
        GEWST_MONATE,
        gewstTeile,
        indexNachMonat,
        zeilen,
        "gewerbe",
      );
      const kst = legeViertel(jahr, EST_MONATE, kstTeile, indexNachMonat, zeilen, "koerperschaft");
      jahr.einkommensteuerGezahltCents = est.gezahlt;
      jahr.einkommensteuerOffenCents = est.offen;
      jahr.gewerbesteuerGezahltCents = gewerbeZahlung.gezahlt;
      jahr.gewerbesteuerOffenCents = gewerbeZahlung.offen;
      jahr.koerperschaftsteuerGezahltCents = kst.gezahlt;
      jahr.koerperschaftsteuerOffenCents = kst.offen;
    }

    const ruecklage = ruecklageJeMonat(jahr.steuerLastCents, jahr.monateImPlan === 12);
    for (const [monat, betrag] of ruecklage) {
      const index = indexNachMonat.get(isoMonat(jahr.jahr, monat));
      const zeile = index == null ? undefined : zeilen[index];
      if (zeile) zeile.ruecklageCents += betrag;
    }
  });

  let ruecklageStand = 0;
  let zahlungStand = 0;
  for (const zeile of zeilen) {
    zeile.einkommensteuerZahlungCents =
      zeile.einkommensteuerAbschlussCents + zeile.einkommensteuerVorauszahlungCents;
    zeile.gewerbesteuerZahlungCents =
      zeile.gewerbesteuerAbschlussCents + zeile.gewerbesteuerVorauszahlungCents;
    zeile.koerperschaftsteuerZahlungCents =
      zeile.koerperschaftsteuerAbschlussCents + zeile.koerperschaftsteuerVorauszahlungCents;
    zeile.zahlungCents =
      zeile.einkommensteuerZahlungCents +
      zeile.gewerbesteuerZahlungCents +
      zeile.koerperschaftsteuerZahlungCents;
    ruecklageStand += zeile.ruecklageCents;
    zahlungStand += zeile.zahlungCents;
    zeile.ruecklageKumuliertCents = ruecklageStand;
    zeile.zahlungKumuliertCents = zahlungStand;
  }
  return { monate: zeilen };
}

function legeViertel(
  jahr: SteuerJahr,
  termine: readonly number[],
  teile: readonly number[],
  indexNachMonat: Map<string, number>,
  zeilen: SteuerMonat[],
  art: "einkommen" | "gewerbe" | "koerperschaft",
): { gezahlt: number; offen: number } {
  let gezahlt = 0;
  let offen = 0;
  termine.forEach((monat, index) => {
    const betrag = teile[index] ?? 0;
    const ziel = indexNachMonat.get(isoMonat(jahr.jahr, monat));
    if (ziel == null) {
      offen += betrag;
      return;
    }
    const zeile = zeilen[ziel];
    if (!zeile) {
      offen += betrag;
      return;
    }
    if (art === "einkommen") zeile.einkommensteuerVorauszahlungCents += betrag;
    if (art === "gewerbe") zeile.gewerbesteuerVorauszahlungCents += betrag;
    if (art === "koerperschaft") zeile.koerperschaftsteuerVorauszahlungCents += betrag;
    gezahlt += betrag;
  });
  return { gezahlt, offen };
}

/**
 * Erste drei Viertel auf volle Euro abgerundet, das vierte nimmt den Euro-Rest
 * und die übrig gebliebenen Cent. Die Summe bleibt der Jahresbetrag.
 */
export function viertel(betragCents: number): [number, number, number, number] {
  const euro = Math.floor(betragCents / 100);
  const restCents = betragCents - euro * 100;
  const basis = Math.floor(euro / 4);
  const letzter = euro - basis * 3;
  return [basis * 100, basis * 100, basis * 100, letzter * 100 + restCents];
}

/**
 * Jahressteuer / 12, abgerundet auf volle Euro.
 * In einem vollen Kalenderjahr erhält der Dezember den Rest, damit die Summe der Steuer entspricht.
 * Im Rumpfjahr bleibt jeder vorhandene Monat beim abgerundeten Zwölftel.
 */
export function ruecklageJeMonat(
  steuerLastCents: number,
  vollesJahr: boolean,
): Map<number, number> {
  const euro = Math.floor(steuerLastCents / 100);
  const restCents = steuerLastCents - euro * 100;
  const basis = Math.floor(euro / 12);
  const dezemberEuro = vollesJahr ? euro - basis * 11 : basis;
  const werte = new Map<number, number>();
  for (let monat = 1; monat <= 12; monat += 1) {
    const betrag = (monat === 12 ? dezemberEuro : basis) * 100;
    werte.set(monat, monat === 12 && vollesJahr ? betrag + restCents : betrag);
  }
  return werte;
}

function gruppiereJahre(monate: readonly IsoMonth[]): { jahr: number; indizes: number[] }[] {
  const gruppen = new Map<number, number[]>();
  monate.forEach((monat, index) => {
    const jahr = parseIsoMonth(monat).year;
    const liste = gruppen.get(jahr) ?? [];
    liste.push(index);
    gruppen.set(jahr, liste);
  });
  return [...gruppen.entries()].map(([jahr, indizes]) => ({ jahr, indizes }));
}

function verteile(gesamt: number, anteile: readonly number[]): number[] {
  if (anteile.length === 0) return [];
  const summeAnteile = anteile.reduce((total, anteil) => total + anteil, 0);
  if (gesamt === 0 || summeAnteile === 0) return anteile.map(() => 0);
  const skaliert = anteile.map((anteil) => Math.round((anteil / summeAnteile) * 1_000_000));
  const teile = skaliert.map((anteil, index) => {
    if (index === skaliert.length - 1) return 0;
    return Math.trunc((gesamt * anteil) / 1_000_000);
  });
  const benutzt = teile.slice(0, -1).reduce((total, teil) => total + teil, 0);
  teile[teile.length - 1] = gesamt - benutzt;
  return teile;
}

function leereMonate(monate: readonly IsoMonth[]): SteuerMonat[] {
  return monate.map((monat) => ({
    monat,
    einkommensteuerAbschlussCents: 0,
    einkommensteuerVorauszahlungCents: 0,
    gewerbesteuerAbschlussCents: 0,
    gewerbesteuerVorauszahlungCents: 0,
    koerperschaftsteuerAbschlussCents: 0,
    koerperschaftsteuerVorauszahlungCents: 0,
    einkommensteuerZahlungCents: 0,
    gewerbesteuerZahlungCents: 0,
    koerperschaftsteuerZahlungCents: 0,
    zahlungCents: 0,
    ruecklageCents: 0,
    ruecklageKumuliertCents: 0,
    zahlungKumuliertCents: 0,
  }));
}

function isoMonat(jahr: number, monat: number): IsoMonth {
  return `${String(jahr).padStart(4, "0")}-${String(monat).padStart(2, "0")}`;
}

function istKapitalgesellschaft(rechtsform: Rechtsform): boolean {
  return rechtsform === "gmbh" || rechtsform === "ug";
}

function euroAbgeschnitten(cents: number): number {
  if (cents >= 0) return Math.floor(cents / 100);
  return -Math.floor(-cents / 100);
}
