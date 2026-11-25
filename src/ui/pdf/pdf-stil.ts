import { StyleSheet } from "@react-pdf/renderer";
import { farben } from "../design-tokens.ts";

export const HOCH_BREITE = 520;
export const QUER_BREITE = 784;

/** A4 in Punkt, wie @react-pdf/renderer die Seite aufbaut. */
export const A4_KURZ = 595.28;
export const A4_LANG = 841.89;

const RAND_HOCH = { oben: 46, unten: 38, seite: 36 } as const;
const RAND_QUER = { oben: 42, unten: 34, seite: 28 } as const;

/** Nutzhöhe zwischen den Seitenrändern. Tabellen müssen darunter bleiben. */
export const NUTZ_HOCH = A4_LANG - RAND_HOCH.oben - RAND_HOCH.unten;
export const NUTZ_QUER = A4_KURZ - RAND_QUER.oben - RAND_QUER.unten;
export const BREITE_HOCH = A4_KURZ - RAND_HOCH.seite * 2;
export const BREITE_QUER = A4_LANG - RAND_QUER.seite * 2;

/** Roboto, eingebettet als „Finanz“. Überschriften und Tabellenköpfe sind fett und in der Akzentfarbe. */
const seite = {
  fontFamily: "Finanz",
  fontSize: 9,
  color: farben.text,
  paddingTop: RAND_HOCH.oben,
  paddingBottom: RAND_HOCH.unten,
  paddingHorizontal: RAND_HOCH.seite,
} as const;

export const stil = StyleSheet.create({
  seite,
  seiteQuer: {
    ...seite,
    paddingTop: RAND_QUER.oben,
    paddingBottom: RAND_QUER.unten,
    paddingHorizontal: RAND_QUER.seite,
  },
  kopf: {
    position: "absolute",
    top: 16,
    left: 36,
    right: 36,
    fontSize: 8,
    color: farben.textGedaempft,
    borderBottom: `0.6pt solid ${farben.linie}`,
    paddingBottom: 3,
  },
  kopfQuer: {
    position: "absolute",
    top: 14,
    left: 28,
    right: 28,
    fontSize: 8,
    color: farben.textGedaempft,
    borderBottom: `0.6pt solid ${farben.linie}`,
    paddingBottom: 3,
  },
  fuss: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 8,
    color: farben.textGedaempft,
    textAlign: "center",
  },
  fussQuer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    fontSize: 8,
    color: farben.textGedaempft,
    textAlign: "center",
  },
  h1: {
    fontSize: 16,
    fontWeight: 700,
    color: farben.akzent,
    marginBottom: 6,
  },
  h2: {
    fontSize: 11,
    fontWeight: 700,
    color: farben.akzent,
    marginBottom: 4,
    marginTop: 8,
  },
  absatz: {
    fontSize: 9,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  meta: {
    fontSize: 9,
    color: farben.textGedaempft,
    marginBottom: 2,
  },
  hinweis: {
    fontSize: 8,
    color: farben.textGedaempft,
    marginTop: 8,
    lineHeight: 1.35,
  },
  legende: {
    fontSize: 7.5,
    color: farben.textGedaempft,
    marginBottom: 4,
  },
  warnung: {
    marginTop: 10,
    marginBottom: 8,
    padding: 8,
    backgroundColor: farben.warnungHintergrund,
    border: `1.5pt solid ${farben.fehler}`,
  },
  warnungTitel: {
    fontSize: 11,
    fontWeight: 700,
    color: farben.fehler,
    marginBottom: 3,
  },
  block: {
    marginBottom: 8,
  },
  tabelle: {
    marginTop: 4,
    borderTop: `0.4pt solid ${farben.linie}`,
    borderLeft: `0.4pt solid ${farben.linie}`,
  },
  kopfzeile: {
    flexDirection: "row",
    backgroundColor: farben.akzent,
  },
  zeile: {
    flexDirection: "row",
  },
  tocZeile: {
    flexDirection: "row",
    marginBottom: 3,
    paddingBottom: 1,
  },
  tocTitel: {
    flex: 1,
    fontSize: 9,
  },
  tocSeite: {
    width: 28,
    fontSize: 9,
    textAlign: "right",
  },
  diagramm: {
    marginTop: 6,
    marginBottom: 8,
  },
  diagrammTitel: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
  },
  legendenZeile: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
  },
  legendeneintrag: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 2,
  },
  legendFarbe: {
    width: 8,
    height: 8,
    marginRight: 3,
  },
  legendText: {
    fontSize: 7.5,
    color: farben.textGedaempft,
  },
});
