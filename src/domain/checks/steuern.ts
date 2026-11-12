import type { Berichte } from "../reports/typen.ts";
import type { Finanzplan, PruefSchwellen } from "../types.ts";
import { formatAnzahl, formatEuro, formatMonat } from "./format.ts";
import type { Pruefmeldung } from "./typen.ts";

interface Kalenderumsatz {
  jahr: number;
  umsatzCents: number;
  monate: number;
}

/**
 * Kleinunternehmer nach § 19 UStG ab 2025: höchstens 25.000 € netto im Vorjahr
 * und höchstens 100.000 € netto im laufenden Kalenderjahr. Die Grenzen sind Schwellen.
 */
export function pruefeSteuern(
  plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  if (plan.umsatzsteuer.regime !== "kleinunternehmer") return [];
  const jahre = kalenderumsatz(berichte);
  const meldungen: Pruefmeldung[] = [];
  const erster = berichte.monate[0];
  if (erster) {
    const startjahr = Number(erster.slice(0, 4));
    meldungen.push({
      id: "steuern-ku-vorjahr-offen",
      stufe: "hinweis",
      kategorie: "steuern",
      text: `Das Kalenderjahr ${startjahr - 1} vor dem Planstart ist nicht erfasst.`,
      begruendung: `Die Kleinunternehmerregelung setzt im Vorjahr höchstens ${formatEuro(schwellen.kleinunternehmerVorjahrCents)} Nettoumsatz voraus (§ 19 UStG). ${startjahr - 1} liegt vor ${formatMonat(erster)} und ist im Plan nicht enthalten.`,
      ziel: {
        assistent: { station: "vorhaben", feld: "kleinunternehmer" },
      },
    });
  }

  for (let index = 0; index < jahre.length - 1; index += 1) {
    const vorjahr = jahre[index];
    const folge = jahre[index + 1];
    if (!vorjahr || !folge || vorjahr.umsatzCents <= schwellen.kleinunternehmerVorjahrCents) {
      continue;
    }
    meldungen.push({
      id: `steuern-ku-vorjahr-${vorjahr.jahr}`,
      stufe: "fehler",
      kategorie: "steuern",
      text: `Kleinunternehmer, aber der Nettoumsatz ${vorjahr.jahr} liegt über der Vorjahresgrenze.`,
      begruendung: `Nettoumsatz ${vorjahr.jahr}: ${formatEuro(vorjahr.umsatzCents)} in ${formatAnzahl(vorjahr.monate, "Planmonat", "Planmonaten")}. Die Vorjahresgrenze beträgt ${formatEuro(schwellen.kleinunternehmerVorjahrCents)} (§ 19 UStG). ${folge.jahr} kann deshalb nicht mehr unter die Kleinunternehmerregelung fallen.`,
      ziel: {
        assistent: { station: "vorhaben", feld: "kleinunternehmer" },
        tabelle: { ansicht: "eingaben", zeileId: umsatzZeile(plan) },
      },
    });
  }

  for (const jahr of jahre) {
    if (jahr.umsatzCents <= schwellen.kleinunternehmerLaufendCents) continue;
    meldungen.push({
      id: `steuern-ku-laufend-${jahr.jahr}`,
      stufe: "fehler",
      kategorie: "steuern",
      text: `Kleinunternehmer, aber der Nettoumsatz ${jahr.jahr} liegt über der Grenze des laufenden Jahres.`,
      begruendung: `Nettoumsatz ${jahr.jahr}: ${formatEuro(jahr.umsatzCents)} in ${formatAnzahl(jahr.monate, "Planmonat", "Planmonaten")}. Die Grenze des laufenden Kalenderjahres beträgt ${formatEuro(schwellen.kleinunternehmerLaufendCents)} (§ 19 UStG).`,
      ziel: {
        assistent: { station: "vorhaben", feld: "kleinunternehmer" },
        tabelle: { ansicht: "eingaben", zeileId: umsatzZeile(plan) },
      },
    });
  }
  return meldungen;
}

function kalenderumsatz(berichte: Berichte): Kalenderumsatz[] {
  const umsatz = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  const map = new Map<number, Kalenderumsatz>();
  berichte.monate.forEach((monat, index) => {
    const jahr = Number(monat.slice(0, 4));
    const bisher = map.get(jahr) ?? { jahr, umsatzCents: 0, monate: 0 };
    bisher.umsatzCents += umsatz?.monateCents[index] ?? 0;
    bisher.monate += 1;
    map.set(jahr, bisher);
  });
  return [...map.values()].sort((links, rechts) => links.jahr - rechts.jahr);
}

function umsatzZeile(plan: Finanzplan): string {
  const erste = plan.umsatzplanung[0];
  if (!erste) return "kopf-umsatz";
  return erste.art === "menge_mal_preis" ? `menge-${erste.id}` : `umsatz-${erste.id}`;
}
