import type { Berichte } from "../domain/reports/typen.ts";
import type { Bestandszeile, Bewegungszeile } from "../domain/reports/planjahr.ts";
import type { TabellenZeile } from "./zeilen-modell.ts";

export type BerichtReiter =
  "rentabilitaet" | "liquiditaet" | "kapital" | "anlagen" | "tragfaehigkeit";

export function berichtZeilen(berichte: Berichte, reiter: BerichtReiter): TabellenZeile[] {
  switch (reiter) {
    case "rentabilitaet":
      return berichte.rentabilitaet.zeilen.flatMap((zeile) => ausBewegung(zeile, 0));
    case "liquiditaet":
      return [
        ausBestand(berichte.liquiditaet.anfangsbestand, 0),
        ...ausBewegung(berichte.liquiditaet.einzahlungen, 0),
        ...ausBewegung(berichte.liquiditaet.auszahlungen, 0),
        ausBestand(berichte.liquiditaet.endbestand, 0),
        ...ausBewegung(berichte.liquiditaet.steuerruecklage, 0),
        ausBestand(berichte.liquiditaet.steuerruecklageKumuliert, 0),
      ];
    case "kapital":
      return [
        ...berichte.kapital.bedarf.map((posten) =>
          ausPosten(
            posten.id,
            posten.bezeichnung,
            posten.monateCents,
            posten.planjahreCents,
            "normal",
          ),
        ),
        ausPosten(
          berichte.kapital.summeBedarf.id,
          berichte.kapital.summeBedarf.bezeichnung,
          berichte.kapital.summeBedarf.monateCents,
          berichte.kapital.summeBedarf.planjahreCents,
          "summe",
        ),
        ...berichte.kapital.finanzierung.map((posten) =>
          ausPosten(
            posten.id,
            posten.bezeichnung,
            posten.monateCents,
            posten.planjahreCents,
            "normal",
          ),
        ),
        ausPosten(
          berichte.kapital.summeFinanzierung.id,
          berichte.kapital.summeFinanzierung.bezeichnung,
          berichte.kapital.summeFinanzierung.monateCents,
          berichte.kapital.summeFinanzierung.planjahreCents,
          "summe",
        ),
        ausPosten(
          berichte.kapital.deckung.id,
          berichte.kapital.deckung.bezeichnung,
          berichte.kapital.deckung.monateCents,
          berichte.kapital.deckung.planjahreCents,
          "ergebnis",
        ),
      ];
    case "anlagen":
      return anlagenZeilen(berichte);
    case "tragfaehigkeit":
      return tragfaehigkeitZeilen(berichte);
    default: {
      const unerreichbar: never = reiter;
      return unerreichbar;
    }
  }
}

function ausBewegung(zeile: Bewegungszeile, ebene: number): TabellenZeile[] {
  const kinder = (zeile.unterzeilen ?? []).flatMap((unter) => ausBewegung(unter, ebene + 1));
  return [...kinder, bewegung(zeile, ebene)];
}

function bewegung(zeile: Bewegungszeile, ebene: number): TabellenZeile {
  return {
    id: zeile.id,
    bezeichnung: zeile.bezeichnung,
    ebene,
    rolle: zeile.rolle === "normal" ? "normal" : zeile.rolle,
    kopf: false,
    werte: zeile.monateCents,
    planjahre: zeile.planjahreCents,
    bearbeitbar: zeile.monateCents.map(() => false),
    einheit: "euro",
  };
}

function ausBestand(zeile: Bestandszeile, ebene: number): TabellenZeile {
  return {
    id: zeile.id,
    bezeichnung: zeile.bezeichnung,
    ebene,
    rolle: zeile.rolle === "normal" ? "normal" : zeile.rolle,
    kopf: false,
    werte: zeile.monateCents,
    planjahre: zeile.planjahreCents,
    bearbeitbar: zeile.monateCents.map(() => false),
    einheit: "euro",
  };
}

function ausPosten(
  id: string,
  bezeichnung: string,
  monate: readonly number[],
  planjahre: readonly number[],
  rolle: TabellenZeile["rolle"],
): TabellenZeile {
  return {
    id,
    bezeichnung,
    ebene: rolle === "normal" ? 1 : 0,
    rolle,
    kopf: false,
    werte: [...monate],
    planjahre: [...planjahre],
    bearbeitbar: monate.map(() => false),
    einheit: "euro",
  };
}

function anlagenZeilen(berichte: Berichte): TabellenZeile[] {
  const zeilen: TabellenZeile[] = [];
  for (const position of berichte.anlagen.positionen) {
    zeilen.push(
      kopf(position.id, `${position.bezeichnung} · ${position.kategorie}, ${position.methode}`),
    );
    zeilen.push(bewegung(position.abschreibung, 1));
    zeilen.push(ausBestand(position.buchwert, 1));
    zeilen.push(bewegung(position.sofortaufwand, 1));
    zeilen.push(bewegung(position.auszahlung, 1));
  }
  zeilen.push(bewegung(berichte.anlagen.summeAbschreibung, 0));
  zeilen.push(ausBestand(berichte.anlagen.summeBuchwert, 0));
  zeilen.push(bewegung(berichte.anlagen.summeSofortaufwand, 0));
  zeilen.push(...darlehenZeilen(berichte));
  return zeilen;
}

function darlehenZeilen(berichte: Berichte): TabellenZeile[] {
  const zeilen: TabellenZeile[] = [kopf("kopf-darlehen", "Darlehen")];
  for (const darlehen of berichte.darlehen.darlehen) {
    zeilen.push(
      kopf(
        `kopf-${darlehen.id}`,
        `${darlehen.bezeichnung} · ${darlehen.tilgungsart}, ${darlehen.laufzeitMonate} Monate`,
      ),
    );
    zeilen.push(bewegung(darlehen.auszahlung, 1));
    zeilen.push(bewegung(darlehen.zins, 1));
    zeilen.push(bewegung(darlehen.tilgung, 1));
    zeilen.push(bewegung(darlehen.rate, 1));
    zeilen.push(ausBestand(darlehen.restschuld, 1));
  }
  zeilen.push(bewegung(berichte.darlehen.summeZins, 0));
  zeilen.push(bewegung(berichte.darlehen.summeTilgung, 0));
  zeilen.push(ausBestand(berichte.darlehen.summeRestschuld, 0));
  return zeilen;
}

function tragfaehigkeitZeilen(berichte: Berichte): TabellenZeile[] {
  if (!berichte.tragfaehigkeit.anwendbar) return [];
  return berichte.tragfaehigkeit.personen.flatMap((person) => {
    const stand =
      person.tragfaehig == null
        ? "ohne Planjahr 2"
        : person.tragfaehig
          ? "tragfähig"
          : "nicht tragfähig";
    return [
      kopf(`kopf-${person.personId}`, `${person.name} · ${stand}`),
      bewegung(person.gewinnNachSteuern, 1),
      bewegung(person.lebenshaltung, 1),
      bewegung(person.vorsorge, 1),
      bewegung(person.verfuegbaresEinkommen, 1),
    ];
  });
}

function kopf(id: string, bezeichnung: string): TabellenZeile {
  return {
    id,
    bezeichnung,
    ebene: 0,
    rolle: "normal",
    kopf: true,
    werte: [],
    planjahre: [],
    bearbeitbar: [],
    einheit: "leer",
  };
}
