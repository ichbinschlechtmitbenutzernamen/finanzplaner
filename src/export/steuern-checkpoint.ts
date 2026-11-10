import type { Planberechnung, SteuerJahr, SteuerPersonJahr } from "../domain/calc/types.ts";
import type { CheckpointBlatt } from "./checkpoint.ts";

type Zelle = string | number | null;

export interface SteuerCheckpointPlan {
  blatt: string;
  ergebnis: Planberechnung;
}

const HINWEIS_RUECKLAGE =
  "Die Rücklage ist eine Empfehlung je Monat (Jahressteuer durch 12) und keine Zahlung. Die Steuer des ersten Jahres wird im September des Folgejahres gezahlt. Danach sind die Viertel Vorauszahlungen auf die Steuer des Vorjahres, die Differenz folgt im September darauf.";

/** Blätter mit Jahresrechnung und Monatszahlungen für die Beispiele des dritten Schritts. */
export function steuerCheckpointBlaetter(
  plaene: readonly SteuerCheckpointPlan[],
): CheckpointBlatt[] {
  return [
    lesen(plaene),
    kernzahlen(plaene),
    ...plaene.flatMap((plan) => [jahre(plan), monate(plan)]),
  ];
}

function lesen(plaene: readonly SteuerCheckpointPlan[]): CheckpointBlatt {
  const zeilen: Zelle[][] = [
    ["Steuern und Rechtsformen, Schritt 3"],
    [
      "Fiktive Beispielpläne, nicht für einen Antrag. Beträge in Euro. Quellen und Regeln stehen in docs/steuern.md.",
    ],
    [],
    ["Rechenweg, in jeder Jahresübersicht von oben nach unten"],
    ["Gewinn", "Betriebsergebnis vor Ertragsteuern. Gewerbesteuer ist keine Betriebsausgabe."],
    [
      "zvE",
      "Gewinnanteil plus weitere Einkünfte, minus Kinderfreibetrag und BEA, auf volle Euro abgerundet.",
    ],
    [
      "ESt",
      "Tarif § 32a EStG 2026, beim Splitting das Doppelte der Steuer auf das halbe Einkommen.",
    ],
    [
      "Soli",
      "5,5 Prozent, Freigrenze 20.350 Euro, darüber höchstens 11,9 Prozent des Unterschieds. Beim Splitting ist die Freigrenze doppelt. Auf die Körperschaftsteuer immer 5,5 Prozent.",
    ],
    [
      "KiSt",
      "8 Prozent in Bayern und Baden-Württemberg, sonst 9 Prozent, nur wenn Kirchensteuer im Steuerprofil steht. Basis ist die tarifliche Einkommensteuer ohne § 35.",
    ],
    [
      "Gewerbeertrag",
      "Gewinn, auf volle 100 Euro abgerundet, bei Personenunternehmen abzüglich 24.500 Euro Freibetrag.",
    ],
    ["Messbetrag", "3,5 Prozent des maßgebenden Ertrags, auf volle Euro abgerundet."],
    ["GewSt", "Messbetrag mal Hebesatz. Der Hebesatz ist die einzige Eingabe."],
    [
      "Anrechnung",
      "Das 4,0-fache des Messbetrags, höchstens die Gewerbesteuer und höchstens der Ermäßigungshöchstbetrag.",
    ],
    [
      "KSt",
      "15 Prozent des auf volle Euro abgerundeten Gewinns, plus Solidaritätszuschlag darauf. Kein Freibetrag, keine Anrechnung.",
    ],
    [],
    [
      "Zahlungsmonat des ersten Jahres",
      String(plaene[0]?.ergebnis.steuern.abschlusszahlungMonat ?? ""),
    ],
    [HINWEIS_RUECKLAGE],
    [],
    ["Beispiele"],
    ...plaene.map((plan) => [
      plan.blatt,
      plan.ergebnis.firmenname,
      plan.ergebnis.rechtsform ?? "",
      plan.ergebnis.startMonat,
    ]),
  ];
  return { name: "Lesen", kopfzeile: 0, zeilen };
}

function kernzahlen(plaene: readonly SteuerCheckpointPlan[]): CheckpointBlatt {
  const zeilen: Zelle[][] = [
    ["Kernzahlen je Kalenderjahr"],
    [
      "Steuerlast ist festgesetzte Einkommensteuer, Soli, Kirchensteuer, Gewerbesteuer und Körperschaftsteuer samt Soli.",
    ],
    [],
    [
      "Beispiel",
      "Jahr",
      "Monate",
      "Rumpfjahr",
      "Gewinn",
      "Einkommensteuer",
      "Soli",
      "Kirchensteuer",
      "Gewerbesteuer",
      "Anrechnung",
      "Körperschaftsteuer",
      "Soli auf KSt",
      "Steuerlast",
      "im Plan gezahlt",
      "offen",
      "Rücklage im Plan",
    ],
  ];
  for (const plan of plaene) {
    for (const jahr of plan.ergebnis.steuern.jahre) {
      zeilen.push([
        plan.blatt,
        String(jahr.jahr),
        String(jahr.monateImPlan),
        jahr.rumpf ? "ja" : "nein",
        euro(jahr.gewinnCents),
        euro(jahr.einkommensteuerCents),
        euro(jahr.solidaritaetszuschlagCents),
        euro(jahr.kirchensteuerCents),
        euro(jahr.gewerbesteuerCents),
        euro(summeAnrechnung(jahr)),
        euro(jahr.koerperschaftsteuerCents),
        euro(jahr.koerperschaftsteuerSoliCents),
        euro(jahr.steuerLastCents),
        euro(gezahlt(jahr)),
        euro(offen(jahr)),
        euro(jahr.ruecklageImPlanCents),
      ]);
    }
  }
  return { name: "Kernzahlen", kopfzeile: 3, zeilen };
}

function jahre(plan: SteuerCheckpointPlan): CheckpointBlatt {
  const zeilen: Zelle[][] = [
    [`${plan.blatt} – Jahre`],
    [
      `${plan.ergebnis.planName} · ${plan.ergebnis.szenarioBezeichnung} · ${plan.ergebnis.rechtsform ?? "ohne Rechtsform"}`,
    ],
    ["Fiktiver Beispielplan. Beträge in Euro. Die Herleitung steht in der dritten Spalte."],
    [],
  ];
  for (const jahr of plan.ergebnis.steuern.jahre) {
    zeilen.push(
      [
        `Kalenderjahr ${jahr.jahr}`,
        null,
        jahr.rumpf ? "Rumpfjahr, keine Hochrechnung" : "Volles Kalenderjahr im Plan",
      ],
      ["Monate im Plan", String(jahr.monateImPlan), `${jahr.vonMonat} bis ${jahr.bisMonat}`],
      ["Gewinn", euro(jahr.gewinnCents), "Summe Betriebsergebnis vor Ertragsteuern"],
      ["Gewerbeertrag", euro(jahr.gewerbeertragCents), "Bei Freiberuf 0"],
      [
        "Gewerbeertrag abgerundet",
        euro(jahr.gewerbeertragAbgerundetCents),
        "Auf volle 100 Euro nach unten",
      ],
      [
        "Freibetrag",
        euro(jahr.freibetragCents),
        "24.500 Euro bei Personenunternehmen, 0 bei GmbH und UG",
      ],
      [
        "Maßgebender Gewerbeertrag",
        euro(jahr.massgebenderErtragCents),
        "Abgerundeter Ertrag minus Freibetrag, mindestens 0",
      ],
      ["Messbetrag", euro(jahr.messbetragCents), "3,5 Prozent, auf volle Euro abgerundet"],
      [
        "Hebesatz",
        jahr.hebesatz == null ? "keiner" : `${jahr.hebesatz} %`,
        "Prozent der Gemeinde, einzige Gewerbesteuer-Eingabe",
      ],
      [
        "Gewerbesteuer",
        euro(jahr.gewerbesteuerCents),
        "Messbetrag mal Hebesatz, auf volle Euro abgerundet",
      ],
      [
        "Körperschaftsteuer",
        euro(jahr.koerperschaftsteuerCents),
        "15 Prozent des Gewinns, nur GmbH und UG",
      ],
      [
        "Solidaritätszuschlag auf KSt",
        euro(jahr.koerperschaftsteuerSoliCents),
        "5,5 Prozent, ohne Freigrenze",
      ],
    );
    if (jahr.personen.length === 0) {
      zeilen.push([
        "Personensteuer",
        0,
        "Bei der GmbH und UG Privatsache der Gesellschafter und hier nicht gerechnet",
      ]);
    }
    for (const person of jahr.personen) zeilen.push(...personZeilen(person));
    zeilen.push(
      ["Steuerlast", euro(jahr.steuerLastCents), "Festgesetzte Steuern des Jahres"],
      [
        "davon im Plan gezahlt",
        euro(gezahlt(jahr)),
        "Vorauszahlungen und Abschluss im Horizont, Erstattung negativ",
      ],
      ["davon noch nicht fällig", euro(offen(jahr)), "Termine nach dem letzten Planmonat"],
      [
        "Rücklage im Plan",
        euro(jahr.ruecklageImPlanCents),
        "Summe der monatlichen Empfehlung, keine Zahlung",
      ],
      [],
    );
  }
  return { name: sheetName(`${plan.blatt} Jahre`), kopfzeile: 0, zeilen };
}

function personZeilen(person: SteuerPersonJahr): Zelle[][] {
  return [
    [`Person ${person.name}`, `${person.anteil * 100} %`, "Anteil am Gewinn"],
    ["Gewinnanteil", euro(person.gewinnanteilCents), "Gewinn mal Anteil"],
    ["Weitere Einkünfte", euro(person.weitereEinkuenfteCents), "Jahresbetrag, auch im Rumpfjahr"],
    [
      "Kinderfreibetrag und BEA",
      euro(person.kinderabzugCents),
      "Je halbem Freibetrag ein Elternteil, ohne Günstigerprüfung zum Kindergeld",
    ],
    [
      "Summe der Einkünfte",
      euro(person.summeEinkuenfteCents),
      "Gewinnanteil plus weitere Einkünfte",
    ],
    [
      "zu versteuerndes Einkommen",
      euro(person.zvECents),
      "Nach Kinderfreibetrag, danach auf volle Euro",
    ],
    [
      "zvE in vollen Euro",
      person.zvEEuro,
      person.splitting ? "Splitting: Steuer auf die Hälfte, mal zwei" : "Grundtarif",
    ],
    [
      "tarifliche ESt",
      euro(person.tariflicheEinkommensteuerCents),
      "§ 32a EStG, vor § 35. Die Kirchensteuer rechnet hierauf",
    ],
    [
      "positive gewerbliche Einkünfte",
      person.positiveGewerblicheEuro,
      "Volle Euro, nur wenn der Gewinn positiv und gewerblich ist",
    ],
    [
      "positive Einkünfte",
      person.positiveEinkuenfteEuro,
      "Nenner des Ermäßigungshöchstbetrags, negative andere Einkünfte zählen nicht mit",
    ],
    [
      "4,0-faches des Messbetrags",
      euro(person.anrechnungVierfachCents),
      "Anteiliger Messbetrag mal 4",
    ],
    [
      "Ermäßigungshöchstbetrag",
      euro(person.ermaessigungshoechstbetragCents),
      "Tarifliche ESt mal gewerbliche durch alle positiven Einkünfte",
    ],
    [
      "Anrechnung § 35",
      euro(person.anrechnungCents),
      "Minimum aus Vierfachem, Gewerbesteueranteil, Höchstbetrag und ESt",
    ],
    ["festgesetzte ESt", euro(person.einkommensteuerCents), "Tarifliche ESt minus Anrechnung"],
    [
      "Solidaritätszuschlag",
      euro(person.solidaritaetszuschlagCents),
      "Auf die festgesetzte ESt, mit Freigrenze und Gleitzone",
    ],
    [
      "Kirchensteuersatz",
      `${Math.round(person.kirchensteuerSatz * 1000) / 10} %`.replace(".", ","),
      "0, wenn keine Kirchensteuer",
    ],
    ["Kirchensteuer", euro(person.kirchensteuerCents), "Satz mal tarifliche ESt, ohne § 35"],
  ];
}

function monate(plan: SteuerCheckpointPlan): CheckpointBlatt {
  const zeilen: Zelle[][] = [
    [`${plan.blatt} – Monate`],
    [HINWEIS_RUECKLAGE],
    [
      "Beträge in Euro. Abschluss ist die Steuer des ersten Jahres oder später die Differenz zum Vorjahr. Vorauszahlung ist ein Viertel der Steuer des Vorjahres. Negativ ist eine Erstattung.",
    ],
    [],
    [
      "Monat",
      "ESt Abschluss",
      "ESt Vorauszahlung",
      "ESt Soli KiSt Zahlung",
      "GewSt Abschluss",
      "GewSt Vorauszahlung",
      "GewSt Zahlung",
      "KSt Abschluss",
      "KSt Vorauszahlung",
      "KSt Soli Zahlung",
      "Zahlung gesamt",
      "Rücklage",
      "Rücklage kumuliert",
      "Zahlungen kumuliert",
    ],
  ];
  for (const monat of plan.ergebnis.steuern.monate) {
    zeilen.push([
      monat.monat,
      euro(monat.einkommensteuerAbschlussCents),
      euro(monat.einkommensteuerVorauszahlungCents),
      euro(monat.einkommensteuerZahlungCents),
      euro(monat.gewerbesteuerAbschlussCents),
      euro(monat.gewerbesteuerVorauszahlungCents),
      euro(monat.gewerbesteuerZahlungCents),
      euro(monat.koerperschaftsteuerAbschlussCents),
      euro(monat.koerperschaftsteuerVorauszahlungCents),
      euro(monat.koerperschaftsteuerZahlungCents),
      euro(monat.zahlungCents),
      euro(monat.ruecklageCents),
      euro(monat.ruecklageKumuliertCents),
      euro(monat.zahlungKumuliertCents),
    ]);
  }
  const summeZahlung = plan.ergebnis.steuern.monate.reduce(
    (total, monat) => total + monat.zahlungCents,
    0,
  );
  const summeRuecklage = plan.ergebnis.steuern.monate.reduce(
    (total, monat) => total + monat.ruecklageCents,
    0,
  );
  zeilen.push([]);
  zeilen.push(["Summe Zahlungen im Plan", euro(summeZahlung)]);
  zeilen.push(["Summe Rücklage im Plan", euro(summeRuecklage)]);
  return { name: sheetName(`${plan.blatt} Monate`), kopfzeile: 4, zeilen };
}

function summeAnrechnung(jahr: SteuerJahr): number {
  return jahr.personen.reduce((total, person) => total + person.anrechnungCents, 0);
}

function gezahlt(jahr: SteuerJahr): number {
  return (
    jahr.einkommensteuerGezahltCents +
    jahr.gewerbesteuerGezahltCents +
    jahr.koerperschaftsteuerGezahltCents
  );
}

function offen(jahr: SteuerJahr): number {
  return (
    jahr.einkommensteuerOffenCents +
    jahr.gewerbesteuerOffenCents +
    jahr.koerperschaftsteuerOffenCents
  );
}

function euro(cents: number): number {
  return cents / 100;
}

function sheetName(name: string): string {
  return name.slice(0, 31);
}
