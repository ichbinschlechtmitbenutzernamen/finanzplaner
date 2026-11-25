import { StyleSheet } from "@react-pdf/renderer";
import { farben } from "../design-tokens.ts";

export const HOCH_BREITE = 520;
export const QUER_BREITE = 784;

/** Roboto, eingebettet als „Finanz“. Überschriften und Tabellenköpfe sind fett und in der Akzentfarbe. */
const seite = {
  fontFamily: "Finanz",
  fontSize: 9,
  color: farben.text,
  paddingTop: 46,
  paddingBottom: 38,
  paddingHorizontal: 36,
} as const;

export const stil = StyleSheet.create({
  seite,
  seiteQuer: {
    ...seite,
    paddingTop: 42,
    paddingBottom: 34,
    paddingHorizontal: 28,
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
