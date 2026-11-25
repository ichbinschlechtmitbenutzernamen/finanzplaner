import React from "react";
import { Text, View } from "@react-pdf/renderer";

void React;
import type { Planjahr } from "../../domain/reports/planjahr.ts";
import type { IsoMonth } from "../../domain/types.ts";
import {
  DICHTE_JAHR,
  DICHTE_MONAT,
  JAHRES_LABEL,
  MONATS_LABEL,
  type TabellenDichte,
} from "./pdf-layout.ts";
import { HOCH_BREITE, QUER_BREITE, stil } from "./pdf-stil.ts";
import type { ZellenZeile } from "./zeilen.ts";
import { euroZahl, monatKurz } from "./zahlen.ts";

function hintergrund(rolle: ZellenZeile["rolle"], kopf: boolean): string {
  if (kopf) return "#1f4d45";
  if (rolle === "ergebnis") return "#e7f0ec";
  if (rolle === "summe") return "#f3eee4";
  return "#fffcf8";
}

function Zelle({
  text,
  breite,
  kopf = false,
  rechts = false,
  rolle = "normal",
  einzug = false,
  dichte,
}: {
  text: string;
  breite: number;
  kopf?: boolean;
  rechts?: boolean;
  rolle?: ZellenZeile["rolle"];
  einzug?: boolean;
  dichte: TabellenDichte;
}) {
  const negativ = text.startsWith("-");
  return (
    <View
      style={{
        width: breite,
        paddingTop: dichte.polster,
        paddingBottom: dichte.polster,
        paddingLeft: einzug ? 8 : 2,
        paddingRight: 2,
        backgroundColor: hintergrund(rolle, kopf),
        borderRight: "0.4pt solid #d9d0c4",
        borderBottom: "0.4pt solid #d9d0c4",
      }}
    >
      <Text
        style={{
          fontSize: dichte.schrift,
          fontWeight: kopf || rolle === "ergebnis" || rolle === "summe" ? 700 : 400,
          textAlign: rechts ? "right" : "left",
          color: kopf ? "#fffcf8" : negativ ? "#9f1d1d" : "#1c2430",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export function JahresTabelle({
  zeilen,
  jahre,
  dichte = DICHTE_JAHR,
}: {
  zeilen: readonly ZellenZeile[];
  jahre: readonly Planjahr[];
  dichte?: TabellenDichte;
}) {
  const label = JAHRES_LABEL;
  const spalte = (HOCH_BREITE - label) / (jahre.length + 1);
  return (
    <View style={stil.tabelle} wrap={false}>
      <View style={stil.kopfzeile} wrap={false}>
        <Zelle text="Posten" breite={label} kopf dichte={dichte} />
        {jahre.map((jahr) => (
          <Zelle
            key={jahr.nummer}
            text={jahr.bezeichnung}
            breite={spalte}
            kopf
            rechts
            dichte={dichte}
          />
        ))}
        <Zelle text="Horizont" breite={spalte} kopf rechts dichte={dichte} />
      </View>
      {zeilen.map((zeile, index) => (
        <View key={`${zeile.bezeichnung}-${index}`} style={stil.zeile} wrap={false}>
          <Zelle
            text={zeile.bezeichnung}
            breite={label}
            rolle={zeile.rolle}
            einzug={zeile.einzug}
            dichte={dichte}
          />
          {jahre.map((jahr, jahrIndex) => (
            <Zelle
              key={jahr.nummer}
              text={euroZahl(zeile.planjahreCents[jahrIndex] ?? 0)}
              breite={spalte}
              rechts
              rolle={zeile.rolle}
              dichte={dichte}
            />
          ))}
          <Zelle
            text={euroZahl(zeile.summeCents)}
            breite={spalte}
            rechts
            rolle={zeile.rolle}
            dichte={dichte}
          />
        </View>
      ))}
    </View>
  );
}

export function MonatsTabelle({
  zeilen,
  monate,
  jahr,
  dichte = DICHTE_MONAT,
}: {
  zeilen: readonly ZellenZeile[];
  monate: readonly IsoMonth[];
  jahr: Planjahr;
  dichte?: TabellenDichte;
}) {
  const label = MONATS_LABEL;
  const jahrBreite = 52;
  const anzahl = Math.max(jahr.bisIndex - jahr.vonIndex, 1);
  const monatBreite = (QUER_BREITE - label - jahrBreite) / anzahl;
  const spalten = monate.slice(jahr.vonIndex, jahr.bisIndex);
  return (
    <View style={stil.tabelle} wrap={false}>
      <View style={stil.kopfzeile} wrap={false}>
        <Zelle text="Posten" breite={label} kopf dichte={dichte} />
        {spalten.map((monat) => (
          <Zelle
            key={monat}
            text={monatKurz(monat)}
            breite={monatBreite}
            kopf
            rechts
            dichte={dichte}
          />
        ))}
        <Zelle text="Jahr" breite={jahrBreite} kopf rechts dichte={dichte} />
      </View>
      {zeilen.map((zeile, index) => (
        <View key={`${zeile.bezeichnung}-${index}`} style={stil.zeile} wrap={false}>
          <Zelle
            text={zeile.bezeichnung}
            breite={label}
            rolle={zeile.rolle}
            einzug={zeile.einzug}
            dichte={dichte}
          />
          {spalten.map((_, offset) => (
            <Zelle
              key={offset}
              text={euroZahl(zeile.monateCents[jahr.vonIndex + offset] ?? 0)}
              breite={monatBreite}
              rechts
              rolle={zeile.rolle}
              dichte={dichte}
            />
          ))}
          <Zelle
            text={euroZahl(zeile.planjahreCents[jahr.nummer - 1] ?? 0)}
            breite={jahrBreite}
            rechts
            rolle={zeile.rolle}
            dichte={dichte}
          />
        </View>
      ))}
    </View>
  );
}

export function EinfacheTabelle({
  kopf,
  zeilen,
  breiten,
  dichte = DICHTE_JAHR,
}: {
  kopf: readonly string[];
  zeilen: readonly (readonly string[])[];
  breiten: readonly number[];
  dichte?: TabellenDichte;
}) {
  return (
    <View style={stil.tabelle} wrap={false}>
      <View style={stil.kopfzeile} wrap={false}>
        {kopf.map((text, index) => (
          <Zelle
            key={index}
            text={text}
            breite={breiten[index] ?? 60}
            kopf
            rechts={index > 0}
            dichte={dichte}
          />
        ))}
      </View>
      {zeilen.map((zeile, zeilenIndex) => (
        <View key={zeilenIndex} style={stil.zeile} wrap={false}>
          {zeile.map((text, index) => (
            <Zelle
              key={index}
              text={text}
              breite={breiten[index] ?? 60}
              rechts={index > 0}
              dichte={dichte}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
