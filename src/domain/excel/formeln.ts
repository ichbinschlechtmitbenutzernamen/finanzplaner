/** Excel-Formeln in der englischen OOXML-Schreibweise. Beträge in den Hilfsblättern sind Cent. */

export function fWenn(bedingung: string, dann: string, sonst: string): string {
  return `IF(${bedingung},${dann},${sonst})`;
}

export function fUnd(...teile: string[]): string {
  return `AND(${teile.join(",")})`;
}

export function fOder(...teile: string[]): string {
  return `OR(${teile.join(",")})`;
}

export function fRund(ausdruck: string): string {
  return `ROUND(${ausdruck},0)`;
}

export function fMin(...teile: string[]): string {
  return `MIN(${teile.join(",")})`;
}

export function fMax(...teile: string[]): string {
  return `MAX(${teile.join(",")})`;
}

/** Kaufmännische Rundung von Cent mal Satz. Entspricht roundRate für die Sätze des Plans. */
export function fSatz(cent: string, satz: string): string {
  return fWenn(fOder(`(${cent})=0`, `(${satz})=0`), "0", fRund(`(${cent})*(${satz})`));
}

/** Monatszins = Restschuld mal Jahreszins durch 12. */
export function fZinsMonat(rest: string, jahreszins: string): string {
  return fWenn(
    fOder(`(${rest})=0`, `(${jahreszins})=0`),
    "0",
    fRund(`(${rest})*(${jahreszins})/12`),
  );
}

/** Euro-Eingabe in Cent. */
export function fCent(euroZelle: string): string {
  return fRund(`(${euroZelle})*100`);
}

/**
 * Gleichmäßige Raten. Die ersten Monate bekommen den gerundeten Anteil,
 * der letzte den Rest. Wird der Rest negativ, wird abgerundet.
 * `monate` muss mindestens 1 sein; der Aufrufer fängt 0 ab.
 */
export function fVerteilt(summe: string, monate: string): { regulaer: string; letzte: string } {
  const rund = fRund(`(${summe})/(${monate})`);
  const rest = `(${summe})-(${rund})*((${monate})-1)`;
  const ab = `INT((${summe})/(${monate}))`;
  const regulaer = fWenn(`(${monate})<=1`, summe, fWenn(`(${rest})<0`, ab, rund));
  const letzte = fWenn(
    `(${monate})<=1`,
    summe,
    fWenn(`(${rest})<0`, `(${summe})-(${ab})*((${monate})-1)`, rest),
  );
  return { regulaer, letzte };
}

/** Zahlungsziel in Tagen auf ganze Monate. Bis 14 Tage bleibt der Leistungsmonat. */
export function fZahlungsziel(tage: string): string {
  return fWenn(`(${tage})<=14`, "0", `ROUNDUP(((${tage})-14)/30,0)`);
}

/**
 * Wachstum: 0 keines, 1 monatlich aufgezinst, 2 Jahressprung.
 * Abstand ist die Zahl der Monate seit dem Bezugsmonat.
 */
export function fWachstum(modus: string, rate: string, abstand: string): string {
  return fWenn(
    `${modus}=0`,
    "1",
    fWenn(
      `${modus}=2`,
      `POWER(1+(${rate}),INT((${abstand})/12))`,
      `POWER(1+(${rate}),(${abstand})/12)`,
    ),
  );
}

/** Satz auf 12 Nachkommastellen, dann in die Grenzen klemmen. */
export function fSatzKlemme(ausdruck: string, min: number, max: number): string {
  return fMin(`${max}`, fMax(`${min}`, `ROUND((${ausdruck})*1000000000000,0)/1000000000000`));
}

/**
 * Tarif § 32a EStG 2026 in vollen Euro, abgerundet.
 * `x` ist das zu versteuernde Einkommen in Euro, ohne Splitting.
 */
export function fTarifEuro(x: string, p: TarifParameter): string {
  const gfb = `INT((${p.grundfreibetragCent})/100)`;
  const dy = `((${x})-(${gfb}))`;
  const dz = `((${x})-(${p.zone3Schwelle}))`;
  const zone2 = `MAX(0,INT(((${p.zone2Faktor})*${dy}+(${p.zone2Summand})*1000000)*${dy}/10000000000))`;
  const zone3 = `MAX(0,INT((((${p.zone3Faktor})*${dz}+(${p.zone3Summand})*1000000)*${dz}+(${p.zone3Konstante})*100000000)/10000000000))`;
  const zone4 = fLinear(x, p.spitzen, p.zone4Abzug);
  const zone5 = fLinear(x, p.reichen, p.zone5Abzug);
  return fWenn(
    `(${x})<=(${gfb})`,
    "0",
    fWenn(
      `(${x})<=(${p.zone2Bis})`,
      zone2,
      fWenn(`(${x})<=(${p.zone3Bis})`, zone3, fWenn(`(${x})<=(${p.zone4Bis})`, zone4, zone5)),
    ),
  );
}

function fLinear(x: string, satz: string, abzug: string): string {
  return `MAX(0,INT((ROUND((${satz})*100,0)*(${x})-(${abzug}))/100))`;
}

export interface TarifParameter {
  grundfreibetragCent: string;
  zone2Bis: string;
  zone3Bis: string;
  zone4Bis: string;
  zone3Schwelle: string;
  zone2Faktor: string;
  zone2Summand: string;
  zone3Faktor: string;
  zone3Summand: string;
  zone3Konstante: string;
  zone4Abzug: string;
  zone5Abzug: string;
  spitzen: string;
  reichen: string;
}

/** Tarif inklusive Splitting, Ergebnis in Cent. */
export function fEinkommensteuerCent(
  zvEEuro: string,
  splitting: string,
  p: TarifParameter,
): string {
  const haelfte = `INT((${zvEEuro})/2)`;
  const ohne = fTarifEuro(zvEEuro, p);
  const mit = `(${fTarifEuro(haelfte, p)})*2`;
  return `(${fWenn(`(${zvEEuro})<=0`, "0", fWenn(`${splitting}=1`, mit, ohne))})*100`;
}

/** Solidaritätszuschlag in Cent. Satz und Milderung als Dezimalsatz, Freigrenze in Cent. */
export function fSoli(
  bemessung: string,
  satz: string,
  milderung: string,
  freigrenze: string,
  splitting: string,
  ohneFreigrenze: boolean,
): string {
  const voll = `INT((${bemessung})*ROUND((${satz})*1000,0)/1000)`;
  if (ohneFreigrenze) return fWenn(`(${bemessung})<=0`, "0", voll);
  const grenze = fWenn(`${splitting}=1`, `(${freigrenze})*2`, freigrenze);
  const mild = `INT(((${bemessung})-(${grenze}))*ROUND((${milderung})*1000,0)/1000)`;
  return fWenn(
    `(${bemessung})<=0`,
    "0",
    fWenn(`(${bemessung})<=(${grenze})`, "0", fMin(voll, mild)),
  );
}

/** Kirchensteuer in Cent. Bruchteile eines Cents entfallen. */
export function fKirchensteuer(bemessung: string, satz: string): string {
  return fWenn(
    fOder(`(${bemessung})<=0`, `(${satz})<=0`),
    "0",
    `INT((${bemessung})*ROUND((${satz})*1000,0)/1000)`,
  );
}

/**
 * Anteil nach verteileNachAnteilen. Die letzte Person erhält den Rest.
 * `skaliert` ist der auf eine Million gerundete Anteil an der Summe.
 */
export function fAnteil(gesamt: string, skaliert: string, summeVorher: string | null): string {
  if (summeVorher == null) {
    return fWenn(`(${gesamt})=0`, "0", `TRUNC((${gesamt})*(${skaliert})/1000000)`);
  }
  return `(${gesamt})-(${summeVorher})`;
}

export function fSkaliert(anteil: string, summe: string): string {
  return fWenn(`(${summe})=0`, "0", fRund(`(${anteil})/(${summe})*1000000`));
}

/** Erste drei Viertel auf volle Euro, das vierte trägt den Rest. Index 0 bis 3. */
export function fViertel(betrag: string, index: 0 | 1 | 2 | 3): string {
  const euro = `INT((${betrag})/100)`;
  const rest = `(${betrag})-(${euro})*100`;
  const basis = `INT((${euro})/4)`;
  if (index < 3) return `(${basis})*100`;
  return `((${euro})-(${basis})*3)*100+(${rest})`;
}

/** Aktiv einschließlich von und bis. Leere Grenze lässt das Fenster offen. */
export function fAktiv(von: string, bis: string, index: number): string {
  return fUnd(fOder(`${von}=""`, `${index}>=${von}`), fOder(`${bis}=""`, `${index}<=${bis}`));
}
