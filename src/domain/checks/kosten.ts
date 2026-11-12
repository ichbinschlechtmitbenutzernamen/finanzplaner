import { RECHTSFORM_LABEL } from "../labels.ts";
import type { Berichte } from "../reports/typen.ts";
import type { Finanzplan, PruefSchwellen } from "../types.ts";
import { formatEuro, formatProzent } from "./format.ts";
import type { Pruefmeldung, PruefStufe } from "./typen.ts";

/** Wareneinsatz, Personalquote, fehlende typische Posten und Geschäftsführergehalt. */
export function pruefeKosten(
  plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  return [
    ...pruefeWareneinsatz(plan, berichte, schwellen),
    ...pruefePersonalquote(berichte, schwellen),
    ...pruefeFehlendePosten(plan),
    ...pruefeGeschaeftsfuehrer(plan),
  ];
}

function pruefeWareneinsatz(
  plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  const meldungen: Pruefmeldung[] = [];
  const umsatz = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  const ware = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "wareneinsatz");
  const umsatzCents = umsatz?.summeCents ?? 0;
  const wareCents = ware?.summeCents ?? 0;
  const quote = umsatzCents > 0 ? wareCents / umsatzCents : null;
  const gesamt =
    quote != null && quote > schwellen.wareneinsatzHoch
      ? wareMeldung({
          id: "kosten-wareneinsatz",
          quote,
          schwellen,
          text:
            quote > schwellen.wareneinsatzGrenze
              ? "Der Wareneinsatz liegt über der Grenze vom Umsatz."
              : "Der Wareneinsatz ist ungewöhnlich hoch.",
          begruendung: `Wareneinsatz ${formatEuro(wareCents)} bei Umsatz ${formatEuro(umsatzCents)}, Quote ${formatProzent(quote)}. Hinweis ab ${formatProzent(schwellen.wareneinsatzHoch)}, stärkere Meldung ab ${formatProzent(schwellen.wareneinsatzGrenze)}.`,
          zeileId: plan.umsatzplanung.some(
            (linie) => linie.wareneinsatz.art === "prozent_vom_umsatz",
          )
            ? "summe-ware"
            : "kopf-umsatz",
          feld: "wareneinsatz",
        })
      : null;
  if (gesamt) meldungen.push(gesamt);

  const linien = plan.umsatzplanung.filter((linie) => {
    return (
      linie.wareneinsatz.art === "prozent_vom_umsatz" &&
      linie.wareneinsatz.quote > schwellen.wareneinsatzHoch
    );
  });
  const nurGesamt = linien.length === 1 && gesamt != null;
  if (nurGesamt) return meldungen;
  for (const linie of linien) {
    if (linie.wareneinsatz.art !== "prozent_vom_umsatz") continue;
    const satz = linie.wareneinsatz.quote;
    meldungen.push(
      wareMeldung({
        id: `kosten-wareneinsatz-${linie.id}`,
        quote: satz,
        schwellen,
        text:
          satz > schwellen.wareneinsatzGrenze
            ? `Der Wareneinsatz von „${linie.bezeichnung}“ liegt über der Grenze.`
            : `Der Wareneinsatz von „${linie.bezeichnung}“ ist ungewöhnlich hoch.`,
        begruendung: `Die Linie „${linie.bezeichnung}“ setzt ${formatProzent(satz)} vom Nettoumsatz als Ware an. Hinweis ab ${formatProzent(schwellen.wareneinsatzHoch)}, stärkere Meldung ab ${formatProzent(schwellen.wareneinsatzGrenze)}.`,
        zeileId: `ware-${linie.id}`,
        feld: `ware-${linie.id}`,
      }),
    );
  }
  return meldungen;
}

function wareMeldung(angabe: {
  id: string;
  quote: number;
  schwellen: PruefSchwellen;
  text: string;
  begruendung: string;
  zeileId: string;
  feld: string;
}): Pruefmeldung {
  const stufe: PruefStufe =
    angabe.quote > angabe.schwellen.wareneinsatzGrenze ? "warnung" : "hinweis";
  return {
    id: angabe.id,
    stufe,
    kategorie: "kosten",
    text: angabe.text,
    begruendung: angabe.begruendung,
    ziel: {
      tabelle: { ansicht: "eingaben", zeileId: angabe.zeileId },
      assistent: { station: "wareneinsatz", feld: angabe.feld },
    },
  };
}

function pruefePersonalquote(berichte: Berichte, schwellen: PruefSchwellen): Pruefmeldung[] {
  const umsatz = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  const personal = berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "personal");
  if (!umsatz || !personal) return [];
  let hoechstes: { planjahr: number; quote: number; personal: number; umsatz: number } | null =
    null;
  for (let index = 0; index < umsatz.planjahreCents.length; index += 1) {
    const umsatzJahr = umsatz.planjahreCents[index] ?? 0;
    if (umsatzJahr <= 0) continue;
    const personalJahr = personal.planjahreCents[index] ?? 0;
    const quote = personalJahr / umsatzJahr;
    if (!hoechstes || quote > hoechstes.quote) {
      hoechstes = { planjahr: index + 1, quote, personal: personalJahr, umsatz: umsatzJahr };
    }
  }
  if (!hoechstes || hoechstes.quote <= schwellen.personalquoteMax) return [];
  const treffer = hoechstes;
  return [
    {
      id: "kosten-personalquote",
      stufe: "warnung",
      kategorie: "kosten",
      text: "Die Personalkostenquote ist sehr hoch.",
      begruendung: `Im Planjahr ${treffer.planjahr} steht Personalaufwand von ${formatEuro(treffer.personal)} einem Umsatz von ${formatEuro(treffer.umsatz)} gegenüber, Quote ${formatProzent(treffer.quote)}. Über den ganzen Horizont sind es ${formatEuro(personal.summeCents)} Personal bei ${formatEuro(umsatz.summeCents)} Umsatz. Die Schwelle liegt bei ${formatProzent(schwellen.personalquoteMax)}.`,
      ziel: {
        tabelle: { ansicht: "eingaben", zeileId: "summe-personal" },
        assistent: { station: "personal", feld: "personal" },
      },
    },
  ];
}

function pruefeFehlendePosten(plan: Finanzplan): Pruefmeldung[] {
  const meldungen: Pruefmeldung[] = [];
  if (!plan.laufendeKosten.some((posten) => posten.kategorie === "versicherung")) {
    meldungen.push({
      id: "kosten-versicherung-fehlt",
      stufe: "hinweis",
      kategorie: "kosten",
      text: "Es ist keine Versicherung erfasst.",
      begruendung:
        "Unter den laufenden Kosten gibt es 0 Posten der Kategorie Versicherung. Typisch sind Betriebshaftpflicht oder eine andere Sachversicherung.",
      ziel: {
        tabelle: { ansicht: "eingaben", zeileId: "kopf-kosten" },
        assistent: { station: "kosten", feld: "kosten-versicherung" },
      },
    });
  }
  if (!plan.laufendeKosten.some((posten) => posten.kategorie === "beratung_buchhaltung")) {
    meldungen.push({
      id: "kosten-steuerberatung-fehlt",
      stufe: "hinweis",
      kategorie: "kosten",
      text: "Es ist keine Steuerberatung oder Buchhaltung erfasst.",
      begruendung:
        "Unter den laufenden Kosten gibt es 0 Posten der Kategorie Buchhaltung und Steuerberatung. Ein Gründungsplan ohne diesen Posten lässt die laufende Beratung aus.",
      ziel: {
        tabelle: { ansicht: "eingaben", zeileId: "kopf-kosten" },
        assistent: { station: "kosten", feld: "kosten-steuerberatung" },
      },
    });
  }
  return meldungen;
}

function pruefeGeschaeftsfuehrer(plan: Finanzplan): Pruefmeldung[] {
  const rechtsform = plan.stammdaten.rechtsform;
  if (rechtsform !== "gmbh" && rechtsform !== "ug") return [];
  const gehalt = plan.personal.some(
    (stelle) =>
      stelle.rolle === "geschaeftsfuehrer" &&
      (stelle.brutto.basisCents > 0 ||
        (stelle.sonderzahlungen ?? []).some((sonder) => sonder.bruttoCents > 0)),
  );
  if (gehalt) return [];
  const label = RECHTSFORM_LABEL[rechtsform];
  return [
    {
      id: "kosten-gf-gehalt-fehlt",
      stufe: "warnung",
      kategorie: "kosten",
      text: `${label} ohne Geschäftsführergehalt.`,
      begruendung: `Bei ${label} ist das Gehalt der Geschäftsführung die Betriebsausgabe für den Lebensunterhalt. Im Personal ist keine Stelle mit der Rolle Geschäftsführung und einem Brutto über ${formatEuro(0)} erfasst.`,
      ziel: {
        tabelle: { ansicht: "eingaben", zeileId: "kopf-personal" },
        assistent: { station: "personal", feld: "personal-gf" },
      },
    },
  ];
}
