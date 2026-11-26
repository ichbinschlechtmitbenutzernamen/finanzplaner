import type { PruefStufe } from "../domain/checks/typen.ts";
import { findeZeile } from "../domain/reports/planjahr.ts";
import type { Berichte, Tragfaehigkeit } from "../domain/reports/typen.ts";
import type { Finanzplan } from "../domain/types.ts";
import { formatEuro, formatMonatLang } from "./format.ts";

/** Reiter, den ein Klick auf die Kennzahl öffnet. */
export type LeistenZiel =
  "ueberblick" | "rentabilitaet" | "liquiditaet" | "tragfaehigkeit" | "pruefung" | "kapital";

export type LeistenTon = "negativ" | "fehler" | "warnung" | "ja" | "nein" | "offen";

export interface LeistenTeil {
  text: string;
  ton?: LeistenTon;
}

export interface LeistenKennzahl {
  id: "kontostand" | "ergebnis" | "break-even" | "tragfaehigkeit" | "pruefung" | "kapital";
  name: string;
  teile: LeistenTeil[];
  title: string;
  ziel: LeistenZiel;
  /** Auf schmalen Bildschirmen sichtbar, ohne „mehr“. */
  kern: boolean;
}

const STRICH = "–";

const ERKLAERUNG: Record<LeistenKennzahl["id"], string> = {
  kontostand:
    "Der niedrigste Stand auf dem Geschäftskonto im Planzeitraum. Liegt er unter null, reicht das Geld in diesem Monat nicht.",
  ergebnis:
    "Was nach allen Kosten und Steuern in jedem Planjahr übrig bleibt. Ein Planjahr sind zwölf Monate ab dem Gründungsmonat.",
  "break-even":
    "Der erste Monat, in dem nach Steuern ein Plus bleibt. „Nicht erreicht“ heißt, dass es diesen Monat im Planzeitraum nicht gibt.",
  tragfaehigkeit: "Ob das verfügbare Einkommen im zweiten Planjahr für den privaten Bedarf reicht.",
  pruefung:
    "Wie viele Fehler und Warnungen die Prüfung im aktiven Szenario findet. Hinweise zählen hier nicht mit.",
  kapital: "Wie viel Geld Sie für Investitionen, die Gründung, den Anlauf und den Start brauchen.",
};

/**
 * Wahr, sobald ein Betrag erfasst ist. Vorlagen ohne Zahl und ein leerer Entwurf zählen nicht,
 * damit die Leiste nicht warnt, bevor etwas eingetragen ist.
 */
export function planHatKennzahlen(plan: Finanzplan): boolean {
  if (plan.umsatzplanung.length > 0) return true;
  if (plan.personal.length > 0) return true;
  if (plan.laufendeKosten.length > 0) return true;
  if (plan.kapitalbedarf.investitionen.length > 0) return true;
  if (plan.kapitalbedarf.gruendungskosten.length > 0) return true;
  if (plan.kapitalbedarf.anlaufkosten.length > 0) return true;
  const mittel = plan.kapitalbedarf.betriebsmittel;
  if (mittel.betriebsmittelbedarfCents > 0) return true;
  if (mittel.liquiditaetsreserveCents > 0) return true;
  if ((mittel.warenErstbestandNettoCents ?? 0) > 0) return true;
  if (plan.finanzierung.eigenkapital.some((posten) => posten.betragCents > 0)) return true;
  if (plan.finanzierung.darlehen.length > 0) return true;
  if (plan.finanzierung.zuschuesse.length > 0) return true;
  return plan.stammdaten.personen.some(personHatBetrag);
}

export function leisteKennzahlen(
  berichte: Berichte | null,
  meldungen: readonly { stufe: PruefStufe }[],
  leer: boolean,
): LeistenKennzahl[] {
  const roh = rohwerte(berichte, meldungen);
  if (leer || !berichte) {
    return roh.map((kennzahl) => ({
      ...kennzahl,
      teile: [{ text: STRICH }],
      title: `${kennzahl.title} Solange der Plan keine Beträge enthält, steht hier ein Strich.`,
    }));
  }
  return roh;
}

function rohwerte(
  berichte: Berichte | null,
  meldungen: readonly { stufe: PruefStufe }[],
): LeistenKennzahl[] {
  return [
    kontostand(berichte),
    ergebnis(berichte),
    breakEven(berichte),
    tragfaehigkeitWert(berichte),
    pruefung(meldungen),
    kapital(berichte),
  ];
}

function kontostand(berichte: Berichte | null): LeistenKennzahl {
  const cents = berichte?.kennzahlen.tiefsterLiquiditaetsstandCents;
  const monat = berichte?.kennzahlen.tiefsterLiquiditaetsstandMonat;
  const teile: LeistenTeil[] = [
    {
      text: cents == null ? STRICH : formatEuro(cents),
      ton: cents != null && cents < 0 ? "negativ" : undefined,
    },
  ];
  if (monat) teile.push({ text: formatMonatLang(monat) });
  return feld("kontostand", "Tiefster Kontostand", teile, "liquiditaet", true);
}

function ergebnis(berichte: Berichte | null): LeistenKennzahl {
  const teile: LeistenTeil[] = [];
  if (berichte) {
    const zeile = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
    for (const [index, jahr] of berichte.planjahre.slice(0, 3).entries()) {
      const cents = zeile.planjahreCents[index] ?? 0;
      teile.push({
        text: `Jahr ${jahr.nummer} ${formatEuro(cents)}`,
        ton: cents < 0 ? "negativ" : undefined,
      });
    }
  }
  if (teile.length === 0) teile.push({ text: STRICH });
  return feld("ergebnis", "Ergebnis nach Steuern", teile, "rentabilitaet", true);
}

function breakEven(berichte: Berichte | null): LeistenKennzahl {
  const bruch = berichte?.kennzahlen.breakEven;
  const text =
    bruch == null
      ? STRICH
      : bruch.erreicht && bruch.monat
        ? formatMonatLang(bruch.monat)
        : "nicht erreicht";
  return feld("break-even", "Break-even", [{ text }], "ueberblick", false);
}

function tragfaehigkeitWert(berichte: Berichte | null): LeistenKennzahl {
  return feld(
    "tragfaehigkeit",
    "Tragfähigkeit",
    berichte ? tragfaehigkeitTeile(berichte.tragfaehigkeit) : [{ text: STRICH }],
    "tragfaehigkeit",
    false,
  );
}

function tragfaehigkeitTeile(bericht: Tragfaehigkeit): LeistenTeil[] {
  if (!bericht.anwendbar) return [{ text: "nicht anwendbar", ton: "offen" }];
  const status = ampeln(bericht.alleTragfaehig);
  const betraege = bericht.personen
    .map((person) => person.planjahr2Cents)
    .filter((wert): wert is number => wert != null);
  if (betraege.length === 0) return [status];
  const tiefster = Math.min(...betraege);
  const betrag: LeistenTeil = {
    text: formatEuro(tiefster),
    ton: tiefster < 0 ? "negativ" : undefined,
  };
  if (betraege.length === 1) return [betrag, status];
  return [status, { text: `${betraege.length} Personen` }, betrag];
}

function ampeln(alle: boolean | null): LeistenTeil {
  if (alle === true) return { text: "tragfähig", ton: "ja" };
  if (alle === false) return { text: "nicht tragfähig", ton: "nein" };
  return { text: "ohne Bewertung", ton: "offen" };
}

function pruefung(meldungen: readonly { stufe: PruefStufe }[]): LeistenKennzahl {
  const fehler = meldungen.filter((meldung) => meldung.stufe === "fehler").length;
  const warnungen = meldungen.filter((meldung) => meldung.stufe === "warnung").length;
  return feld(
    "pruefung",
    "Prüfung",
    [
      { text: `${fehler} Fehler`, ton: fehler > 0 ? "fehler" : undefined },
      {
        text: `${warnungen} ${warnungen === 1 ? "Warnung" : "Warnungen"}`,
        ton: warnungen > 0 ? "warnung" : undefined,
      },
    ],
    "pruefung",
    true,
  );
}

function kapital(berichte: Berichte | null): LeistenKennzahl {
  const cents = berichte?.kapital.summeBedarf.betragCents;
  return feld(
    "kapital",
    "Kapitalbedarf",
    [{ text: cents == null ? STRICH : formatEuro(cents) }],
    "kapital",
    false,
  );
}

function feld(
  id: LeistenKennzahl["id"],
  name: string,
  teile: LeistenTeil[],
  ziel: LeistenZiel,
  kern: boolean,
): LeistenKennzahl {
  return { id, name, teile, title: ERKLAERUNG[id], ziel, kern };
}

function personHatBetrag(person: Finanzplan["stammdaten"]["personen"][number]): boolean {
  const leben = person.lebensbedarf;
  if (!leben) return false;
  if (leben.bloecke.some((block) => block.posten.some((posten) => posten.betrag.basisCents > 0))) {
    return true;
  }
  return (leben.sozialversicherung.privatbeitragCents ?? 0) > 0;
}
