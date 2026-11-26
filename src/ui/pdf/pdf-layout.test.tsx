import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import { erstellePdfDokument } from "../../domain/pdf/modell.ts";
import type { Planjahr } from "../../domain/reports/planjahr.ts";
import { NUTZ_QUER } from "./pdf-stil.ts";
import {
  DICHTE_MONAT,
  monatsGruppen,
  monatsReihen,
  tabelleHoehe,
  textZeilen,
} from "./pdf-layout.ts";
import { pdfDokumentBaum } from "./pdf-dokument.tsx";
import { EinfacheTabelle, JahresTabelle, MonatsTabelle } from "./pdf-tabelle.tsx";
import type { ZellenZeile } from "./zeilen.ts";

const DATUM = new Date("2026-11-12T12:00:00.000Z");

const TABELLEN = new Set<unknown>([MonatsTabelle, JahresTabelle, EinfacheTabelle]);

interface GeseheneTabelle {
  art: "monat" | "jahr" | "einfach";
  wrap: boolean;
  huelle: boolean;
  ueberschrift: string;
  serie: string;
  monate: number;
  jahrNummer: number;
  seite: number;
  seiteQuer: boolean;
}

interface Seite {
  quer: boolean;
  texte: string[];
}

function textInhalt(knoten: ReactNode): string {
  if (knoten == null || typeof knoten === "boolean") return "";
  if (typeof knoten === "string" || typeof knoten === "number") return String(knoten);
  if (Array.isArray(knoten)) return knoten.map((eintrag) => textInhalt(eintrag)).join("");
  if (!isValidElement(knoten)) return "";
  return textInhalt((knoten.props as { children?: ReactNode }).children);
}

function untersuche(dokumentKnoten: ReactNode): { tabellen: GeseheneTabelle[]; seiten: Seite[] } {
  const tabellen: GeseheneTabelle[] = [];
  const seiten: Seite[] = [];
  const zustand = {
    seite: -1,
    wrapTiefe: 0,
    ueberschrift: "",
    serie: "",
  };

  const lauf = (knoten: ReactNode) => {
    if (knoten == null || typeof knoten === "boolean") return;
    if (Array.isArray(knoten)) {
      knoten.forEach(lauf);
      return;
    }
    if (!isValidElement(knoten)) return;
    const element = knoten as ReactElement<Record<string, unknown>>;
    const typ: unknown = element.type;
    if (typ === Symbol.for("react.fragment")) {
      lauf(element.props.children as ReactNode);
      return;
    }
    if (TABELLEN.has(typ)) {
      const gerendert = (typ as (props: Record<string, unknown>) => { props: { wrap?: boolean } })(
        element.props,
      );
      const art = typ === MonatsTabelle ? "monat" : typ === JahresTabelle ? "jahr" : "einfach";
      const jahr = element.props.jahr as Planjahr | undefined;
      tabellen.push({
        art,
        wrap: gerendert.props.wrap === false,
        huelle: zustand.wrapTiefe > 0,
        ueberschrift: zustand.ueberschrift,
        serie: zustand.serie,
        monate: jahr ? jahr.bisIndex - jahr.vonIndex : 0,
        jahrNummer: jahr?.nummer ?? 0,
        seite: zustand.seite,
        seiteQuer: zustand.seite >= 0 ? (seiten[zustand.seite]?.quer ?? false) : false,
      });
      const seite = seiten[zustand.seite];
      if (seite) seite.texte.push(art);
      return;
    }
    if (typeof typ === "function") {
      lauf((typ as (props: unknown) => ReactNode)(element.props));
      return;
    }
    if (typ === "PAGE") {
      const index = seiten.length;
      seiten.push({
        quer: element.props.orientation === "landscape",
        texte: [],
      });
      const vorher = zustand.seite;
      zustand.seite = index;
      lauf(element.props.children as ReactNode);
      zustand.seite = vorher;
      return;
    }
    if (typ === "TEXT") {
      const inhalt = textInhalt(element.props.children as ReactNode);
      const style = element.props.style as { fontSize?: number } | undefined;
      if (style?.fontSize === 16 || style?.fontSize === 11) {
        zustand.ueberschrift = inhalt;
        if (style.fontSize === 16 && inhalt.includes("Monate")) zustand.serie = inhalt;
        const seite = seiten[zustand.seite];
        if (seite && inhalt) seite.texte.push(inhalt);
      }
    }
    if (typ === "VIEW" && element.props.wrap === false) {
      zustand.wrapTiefe += 1;
      lauf(element.props.children as ReactNode);
      zustand.wrapTiefe -= 1;
      return;
    }
    lauf(element.props.children as ReactNode);
  };

  lauf(dokumentKnoten);
  return { tabellen, seiten };
}

function zeile(bezeichnung: string, einzug = false): ZellenZeile {
  return {
    bezeichnung,
    monateCents: [],
    planjahreCents: [],
    summeCents: 0,
    rolle: "normal",
    bestand: false,
    einzug,
  };
}

describe("PDF-Tabellenlayout", () => {
  it("teilt die Monatstabellen je Planjahr und markiert sie als nicht umbrechbar", () => {
    const dokument = erstellePdfDokument(beispielElektro, DATUM);
    const { tabellen, seiten } = untersuche(pdfDokumentBaum(dokument));
    const monate = tabellen.filter((tabelle) => tabelle.art === "monat");

    expect(monate.length).toBeGreaterThan(0);
    expect(monate.every((tabelle) => tabelle.monate === 12)).toBe(true);
    expect(monate.every((tabelle) => tabelle.wrap)).toBe(true);
    expect(monate.every((tabelle) => tabelle.huelle)).toBe(true);
    expect(monate.every((tabelle) => tabelle.seiteQuer)).toBe(true);
    expect(monate.every((tabelle) => tabelle.ueberschrift.includes("Planjahr"))).toBe(true);

    const serien = new Map<string, number[]>();
    for (const tabelle of monate) {
      const liste = serien.get(tabelle.serie) ?? [];
      liste.push(tabelle.jahrNummer);
      serien.set(tabelle.serie, liste);
    }
    expect(serien.size).toBeGreaterThan(1);
    for (const [name, jahre] of serien) {
      expect(name, name).toMatch(/Monate/);
      expect(jahre, name).toEqual([1, 2, 3]);
    }

    const mitJahres = seiten.filter((seite) => seite.texte.includes("jahr"));
    expect(
      mitJahres.some((seite) => seite.texte.filter((text) => text === "jahr").length >= 2),
    ).toBe(true);
    const monatsSeiten = seiten.filter((seite) => seite.texte.includes("monat"));
    expect(monatsSeiten).toHaveLength(1);
    expect(monatsSeiten[0]?.texte.filter((text) => text === "monat").length).toBe(monate.length);

    const deckblatt = seiten.find((seite) => seite.texte.includes("Gründerin oder Gründer"));
    expect(deckblatt).toBeTruthy();
    expect(
      deckblatt?.texte.some((text) => text === "jahr" || text === "monat" || text === "einfach"),
    ).toBe(false);
    const inhalt = seiten.find((seite) => seite.texte.includes("Inhaltsverzeichnis"));
    expect(inhalt?.texte.some((text) => text === "jahr" || text === "monat")).toBe(false);

    const vergleich = seiten.find((seite) => seite.texte.includes("Variantenvergleich"));
    expect(vergleich?.texte).toContain("Steuern");
    expect(vergleich?.quer).toBe(false);
  });

  it("lässt die Tragfähigkeit bei der GmbH weg und hält die übrigen Tabellen zusammen", () => {
    const { tabellen, seiten } = untersuche(
      pdfDokumentBaum(erstellePdfDokument(beispielGmbh, DATUM)),
    );
    expect(tabellen.every((tabelle) => tabelle.wrap && tabelle.huelle)).toBe(true);
    expect(tabellen.some((tabelle) => tabelle.serie.includes("Tragfähigkeit"))).toBe(false);
    expect(seiten.some((seite) => seite.texte.filter((text) => text === "jahr").length >= 2)).toBe(
      true,
    );
  });

  it("verkleinert eine Planjahr-Tabelle, die sonst höher als die Seite wäre", () => {
    const lang = "Einkommensteuer, Solidaritätszuschlag und Kirchensteuer";
    expect(textZeilen(lang, 100, 6.4)).toBeGreaterThan(1);
    const kurz = Array.from({ length: 8 }, (_, index) => zeile(`Umsatz ${index}`));
    const passend = monatsGruppen(kurz, 70);
    expect(passend.dichte.verkleinert).toBe(false);
    expect(passend.gruppen).toHaveLength(1);
    expect(passend.dichte.schrift).toBe(DICHTE_MONAT.schrift);

    const hoch = Array.from({ length: 70 }, (_, index) => zeile(`${lang} ${index}`, true));
    const eng = monatsGruppen(hoch, 70);
    expect(eng.dichte.verkleinert).toBe(true);
    expect(eng.dichte.schrift).toBeLessThan(DICHTE_MONAT.schrift);
    for (const gruppe of eng.gruppen) {
      expect(tabelleHoehe(monatsReihen(gruppe), eng.dichte) + 70).toBeLessThanOrEqual(NUTZ_QUER);
    }
  });

  it("zeichnet jede Monatstabelle mit vollständigem Kopf", () => {
    const dokument = erstellePdfDokument(beispielElektro, DATUM);
    const berichte = dokument.szenarien[0]?.berichte;
    const jahr = berichte?.planjahre[0];
    expect(jahr).toBeTruthy();
    if (!berichte || !jahr) return;
    const ansicht = MonatsTabelle({
      zeilen: [zeile("Umsatz")],
      monate: berichte.monate,
      jahr,
      dichte: DICHTE_MONAT,
    });
    expect(ansicht.props.wrap).toBe(false);
    const texte: string[] = [];
    const sammeln = (knoten: ReactNode) => {
      if (knoten == null || typeof knoten === "boolean") return;
      if (typeof knoten === "string" || typeof knoten === "number") {
        texte.push(String(knoten));
        return;
      }
      if (Array.isArray(knoten)) {
        knoten.forEach(sammeln);
        return;
      }
      if (!isValidElement(knoten)) return;
      const art = knoten.type as unknown;
      if (typeof art === "function") {
        sammeln((art as (props: unknown) => ReactNode)(knoten.props));
        return;
      }
      sammeln((knoten.props as { children?: ReactNode }).children);
    };
    sammeln(ansicht);
    expect(texte).toContain("Posten");
    expect(texte).toContain("Jahr");
    expect(texte.filter((text) => /^[A-ZÄÖÜ][a-zäöü]{2} \d{2}$/.test(text))).toHaveLength(12);
    expect(JahresTabelle({ zeilen: [zeile("Umsatz")], jahre: berichte.planjahre }).props.wrap).toBe(
      false,
    );
    expect(
      EinfacheTabelle({ kopf: ["A", "B"], zeilen: [["eins", "zwei"]], breiten: [40, 40] }).props
        .wrap,
    ).toBe(false);
  });
});
