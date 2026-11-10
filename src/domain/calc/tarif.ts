import type { EinkommensteuerTarif, Steuerparameter } from "../types.ts";

/**
 * Einkommensteuer nach § 32a Abs. 1 EStG und Solidaritätszuschlag nach § 3 und § 4 SolZG.
 * Gerechnet wird in vollen Euro, das Ergebnis steht in Cent.
 * Der Steuerbetrag wird auf den nächsten vollen Euro abgerundet, Bruchteile eines Cents
 * beim Solidaritätszuschlag und bei der Kirchensteuer entfallen.
 */

export interface TarifEingabe {
  /** Zu versteuerndes Einkommen in vollen Euro, bereits abgerundet. Negativ wird wie 0 behandelt. */
  zvEEuro: number;
  splitting: boolean;
  parameter: Steuerparameter;
}

export interface TarifErgebnis {
  tariflicheEinkommensteuerCents: number;
  /** Zone 1 bis 5, 0 wenn das Einkommen nicht positiv ist. */
  zone: 0 | 1 | 2 | 3 | 4 | 5;
}

/** Tarifliche Einkommensteuer in Cent, nach Abrundung auf volle Euro. */
export function einkommensteuerCents(eingabe: TarifEingabe): TarifErgebnis {
  const zvE = Math.trunc(eingabe.zvEEuro);
  if (zvE <= 0) return { tariflicheEinkommensteuerCents: 0, zone: 0 };
  const tarif = grundtarif(zvE, eingabe.splitting, eingabe.parameter);
  return { tariflicheEinkommensteuerCents: tarif.euro * 100, zone: tarif.zone };
}

/**
 * Solidaritätszuschlag auf eine festgesetzte Einkommensteuer.
 * Unter der Freigrenze 0. Darüber der kleinere Betrag aus 5,5 Prozent der Steuer
 * und 11,9 Prozent des Unterschieds zur Freigrenze. Beim Splitting ist die Freigrenze doppelt.
 * Auf die Körperschaftsteuer den vollen Satz ohne Freigrenze mit `ohneFreigrenze`.
 */
export function solidaritaetszuschlagCents(
  bemessungCents: number,
  parameter: Steuerparameter,
  optionen: { splitting?: boolean; ohneFreigrenze?: boolean } = {},
): number {
  if (bemessungCents <= 0) return 0;
  const satz = millis(parameter.solidaritaetszuschlagSatz);
  const voll = anteilCents(bemessungCents, satz);
  if (optionen.ohneFreigrenze) return voll;
  const freigrenze = optionen.splitting
    ? parameter.solidaritaetszuschlagFreigrenzeCents * 2
    : parameter.solidaritaetszuschlagFreigrenzeCents;
  if (bemessungCents <= freigrenze) return 0;
  const milderung = anteilCents(
    bemessungCents - freigrenze,
    millis(parameter.solidaritaetszuschlagMilderungSatz),
  );
  return Math.min(voll, milderung);
}

/**
 * Kirchensteuer auf die übergebene Einkommensteuer.
 * Nach § 51a Abs. 2 EStG ist das die Steuer ohne die Anrechnung des § 35.
 * Satz 0 lässt sie entfallen.
 */
export function kirchensteuerCents(einkommensteuerCents: number, satz: number): number {
  if (einkommensteuerCents <= 0 || satz <= 0) return 0;
  return anteilCents(einkommensteuerCents, millis(satz));
}

function grundtarif(
  euro: number,
  splitting: boolean,
  parameter: Steuerparameter,
): { euro: number; zone: 1 | 2 | 3 | 4 | 5 } {
  if (!splitting) return formel(euro, parameter);
  const haelfte = Math.floor(euro / 2);
  const tarif = formel(haelfte, parameter);
  return { euro: tarif.euro * 2, zone: tarif.zone };
}

function formel(x: number, parameter: Steuerparameter): { euro: number; zone: 1 | 2 | 3 | 4 | 5 } {
  const tarif = parameter.einkommensteuerTarif;
  const grundfreibetrag = Math.floor(parameter.einkommensteuerGrundfreibetragCents / 100);
  if (x <= grundfreibetrag) return { euro: 0, zone: 1 };
  if (x <= tarif.zone2BisEuro) {
    return { euro: zone2(x - grundfreibetrag, tarif), zone: 2 };
  }
  if (x <= tarif.zone3BisEuro) {
    return { euro: zone3(x - tarif.zone3SchwelleEuro, tarif), zone: 3 };
  }
  if (x <= tarif.zone4BisEuro) {
    return {
      euro: linear(x, parameter.einkommensteuerSpitzensteuersatz, tarif.zone4AbzugHundertstel),
      zone: 4,
    };
  }
  return {
    euro: linear(x, parameter.einkommensteuerReichensteuersatz, tarif.zone5AbzugHundertstel),
    zone: 5,
  };
}

/** (faktor/100 · y + summand) · y, y = überschreitender Betrag / 10.000. Abgerundet auf volle Euro. */
function zone2(ueberschreitung: number, tarif: EinkommensteuerTarif): number {
  const dy = BigInt(ueberschreitung);
  const faktor = BigInt(tarif.zone2FaktorHundertstel);
  const summand = BigInt(tarif.zone2Summand);
  const zaehler = (faktor * dy + summand * 1_000_000n) * dy;
  return abrunden(zaehler, 10_000_000_000n);
}

/** (faktor/100 · z + summand) · z + konstante/100. Abgerundet auf volle Euro. */
function zone3(ueberschreitung: number, tarif: EinkommensteuerTarif): number {
  const dz = BigInt(ueberschreitung);
  const faktor = BigInt(tarif.zone3FaktorHundertstel);
  const summand = BigInt(tarif.zone3Summand);
  const konstante = BigInt(tarif.zone3KonstanteHundertstel);
  const zaehler = (faktor * dz + summand * 1_000_000n) * dz + konstante * 100_000_000n;
  return abrunden(zaehler, 10_000_000_000n);
}

/** satz · x − Abzug, Abzug in Hundertstel Euro. Abgerundet auf volle Euro. */
function linear(x: number, satz: number, abzugHundertstel: number): number {
  const hundertstel = BigInt(Math.round(satz * 100));
  const zaehler = hundertstel * BigInt(x) - BigInt(abzugHundertstel);
  return abrunden(zaehler, 100n);
}

function abrunden(zaehler: bigint, nenner: bigint): number {
  if (zaehler <= 0n) return 0;
  return Number(zaehler / nenner);
}

/** Satz als Tausendstel, 0,055 wird 55 und 0,119 wird 119. Bruchteile eines Cents entfallen. */
function millis(satz: number): bigint {
  return BigInt(Math.round(satz * 1000));
}

function anteilCents(cents: number, satzMillis: bigint): number {
  if (cents <= 0 || satzMillis <= 0n) return 0;
  return Number((BigInt(Math.trunc(cents)) * satzMillis) / 1000n);
}
