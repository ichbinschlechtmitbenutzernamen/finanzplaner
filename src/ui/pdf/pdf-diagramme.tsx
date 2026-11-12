import React, { type ReactNode } from "react";
import { Circle, Line, Polyline, Rect, Svg, Text, View } from "@react-pdf/renderer";

void React;
import type { PdfDiagramme } from "../../domain/pdf/modell.ts";
import { HOCH_BREITE, stil } from "./pdf-stil.ts";
import { achse, euro, monatKurz, monatLang } from "./zahlen.ts";

const BREITE = HOCH_BREITE;
const HOEHE = 196;
const LINKS = 48;
const RECHTS = 10;
const OBEN = 8;
const UNTEN = 26;

const FARBE: Record<string, string> = {
  umsatz: "#1f4d45",
  kosten: "#b8612e",
  kontostand: "#1f4d45",
  ergebnis: "#245f8a",
  wareneinsatz: "#b8612e",
  personal: "#1f4d45",
  raumkosten: "#6e8b74",
  "sonstige-kosten": "#c4a035",
  abschreibungen: "#5c6b7a",
  zinsen: "#7a3e0b",
  steuern: "#9f1d1d",
  eigenmittel: "#1f4d45",
  darlehen: "#245f8a",
  zuschuesse: "#6e8b74",
  investitionen: "#b8612e",
  gruendungskosten: "#7a3e0b",
  anlaufkosten: "#c4a035",
  "waren-erstbestand": "#8a5a44",
  betriebsmittel: "#5c6b7a",
  reserve: "#3d6b8a",
};

function farbe(id: string): string {
  return FARBE[id] ?? "#5c6b7a";
}

interface Bereich {
  min: number;
  max: number;
}

function bereichVon(werte: readonly number[], mitNull: boolean): Bereich {
  const basis = mitNull ? [0] : [];
  const alle = [...werte, ...basis];
  let min = Math.min(...alle);
  let max = Math.max(...alle);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const polster = (max - min) * 0.08;
  return { min: min - polster, max: max + polster };
}

function xVon(index: number, anzahl: number): number {
  const nutz = BREITE - LINKS - RECHTS;
  if (anzahl <= 1) return LINKS + nutz / 2;
  return LINKS + (index / (anzahl - 1)) * nutz;
}

function yVon(wert: number, bereich: Bereich): number {
  const nutz = HOEHE - OBEN - UNTEN;
  const anteil = (wert - bereich.min) / (bereich.max - bereich.min || 1);
  return OBEN + (1 - anteil) * nutz;
}

function ticks(bereich: Bereich): number[] {
  return Array.from({ length: 5 }, (_, index) => {
    const anteil = index / 4;
    return bereich.min + (bereich.max - bereich.min) * anteil;
  });
}

function SvgText({
  x,
  y,
  children,
  anker = "start",
}: {
  x: number;
  y: number;
  children: string;
  anker?: "start" | "middle" | "end";
}) {
  return (
    <Text
      x={x}
      y={y}
      textAnchor={anker}
      fill="#5e6872"
      style={{ fontSize: 7, fontFamily: "Finanz" } as never}
    >
      {children}
    </Text>
  );
}

function Achsen({
  bereich,
  beschriftungen,
}: {
  bereich: Bereich;
  beschriftungen: readonly { x: number; text: string }[];
}) {
  const nullY = yVon(0, bereich);
  const zeigtNull = 0 >= bereich.min && 0 <= bereich.max;
  return (
    <>
      {ticks(bereich).map((tick) => {
        const y = yVon(tick, bereich);
        return (
          <Line
            key={tick}
            x1={LINKS}
            x2={BREITE - RECHTS}
            y1={y}
            y2={y}
            stroke="#e4ddd2"
            strokeWidth={0.4}
          />
        );
      })}
      {zeigtNull ? (
        <Line
          x1={LINKS}
          x2={BREITE - RECHTS}
          y1={nullY}
          y2={nullY}
          stroke="#8a8175"
          strokeWidth={0.8}
          strokeDasharray="3 2"
        />
      ) : null}
      {ticks(bereich).map((tick) => (
        <SvgText key={`t-${tick}`} x={LINKS - 4} y={yVon(tick, bereich) + 2} anker="end">
          {achse(tick)}
        </SvgText>
      ))}
      {beschriftungen.map((eintrag, index) =>
        eintrag.text ? (
          <SvgText key={`${eintrag.text}-${index}`} x={eintrag.x} y={HOEHE - 6} anker="middle">
            {eintrag.text}
          </SvgText>
        ) : null,
      )}
    </>
  );
}

function LinienDiagramm({
  serien,
  beschriftungen,
  mitNull,
  markierung,
}: {
  serien: { name: string; farbe: string; werte: number[] }[];
  beschriftungen: string[];
  mitNull: boolean;
  markierung?: { index: number; name: string };
}) {
  const werte = serien.flatMap((serie) => serie.werte);
  const bereich = bereichVon(werte, mitNull);
  const labels = beschriftungen.map((text, index) => ({
    x: xVon(index, beschriftungen.length),
    text,
  }));
  return (
    <Svg width={BREITE} height={HOEHE} viewBox={`0 0 ${BREITE} ${HOEHE}`}>
      <Achsen bereich={bereich} beschriftungen={labels} />
      {serien.map((serie) => (
        <Polyline
          key={serie.name}
          points={serie.werte
            .map((wert, index) => `${xVon(index, serie.werte.length)},${yVon(wert, bereich)}`)
            .join(" ")}
          fill="none"
          stroke={serie.farbe}
          strokeWidth={1.4}
        />
      ))}
      {markierung ? (
        <Circle
          cx={xVon(markierung.index, beschriftungen.length)}
          cy={yVon(serien[0]?.werte[markierung.index] ?? 0, bereich)}
          r={3.2}
          fill="#9f1d1d"
          stroke="#fffcf8"
          strokeWidth={1}
        />
      ) : null}
      {markierung ? (
        <SvgText
          x={
            xVon(markierung.index, beschriftungen.length) > BREITE - 64
              ? xVon(markierung.index, beschriftungen.length) - 6
              : xVon(markierung.index, beschriftungen.length)
          }
          y={Math.max(10, yVon(serien[0]?.werte[markierung.index] ?? 0, bereich) - 6)}
          anker={xVon(markierung.index, beschriftungen.length) > BREITE - 64 ? "end" : "middle"}
        >
          {markierung.name}
        </SvgText>
      ) : null}
    </Svg>
  );
}

interface BalkenGruppe {
  name: string;
  segmente: { id: string; bezeichnung: string; betragCents: number }[];
}

function stapelBereich(gruppen: readonly BalkenGruppe[]): Bereich {
  let min = 0;
  let max = 0;
  for (const gruppe of gruppen) {
    let plus = 0;
    let minus = 0;
    for (const segment of gruppe.segmente) {
      if (segment.betragCents >= 0) plus += segment.betragCents;
      else minus += segment.betragCents;
    }
    max = Math.max(max, plus);
    min = Math.min(min, minus);
  }
  return bereichVon([min, max], true);
}

function BalkenDiagramm({ gruppen }: { gruppen: readonly BalkenGruppe[] }) {
  const bereich = stapelBereich(gruppen);
  const legende = new Map<string, string>();
  for (const gruppe of gruppen) {
    for (const segment of gruppe.segmente) legende.set(segment.id, segment.bezeichnung);
  }
  const nutz = BREITE - LINKS - RECHTS;
  const schlitz = nutz / Math.max(gruppen.length, 1);
  const balken = Math.min(28, schlitz * 0.62);
  return (
    <View>
      <Svg width={BREITE} height={HOEHE} viewBox={`0 0 ${BREITE} ${HOEHE}`}>
        <Achsen
          bereich={bereich}
          beschriftungen={gruppen.map((gruppe, index) => ({
            x: LINKS + index * schlitz + schlitz / 2,
            text: gruppe.name,
          }))}
        />
        {gruppen.map((gruppe, index) => {
          const x = LINKS + index * schlitz + (schlitz - balken) / 2;
          let plus = 0;
          let minus = 0;
          return gruppe.segmente.map((segment) => {
            const start = segment.betragCents >= 0 ? plus : minus;
            const ende = start + segment.betragCents;
            if (segment.betragCents >= 0) plus = ende;
            else minus = ende;
            const y1 = yVon(start, bereich);
            const y2 = yVon(ende, bereich);
            const y = Math.min(y1, y2);
            const h = Math.max(Math.abs(y2 - y1), 0.4);
            return (
              <Rect
                key={`${gruppe.name}-${segment.id}`}
                x={x}
                y={y}
                width={balken}
                height={h}
                fill={farbe(segment.id)}
              />
            );
          });
        })}
      </Svg>
      <View style={stil.legendenZeile}>
        {[...legende.entries()].map(([id, name]) => (
          <View key={id} style={stil.legendeneintrag}>
            <View style={[stil.legendFarbe, { backgroundColor: farbe(id) }]} />
            <Text style={stil.legendText}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function monatsNamen(schluessel: readonly string[]): string[] {
  return schluessel.map((wert, index) => (index % 6 === 0 ? monatKurz(wert) : ""));
}

function Karte({ titel, notiz, children }: { titel: string; notiz: string; children: ReactNode }) {
  return (
    <View style={stil.diagramm} wrap={false}>
      <Text style={stil.diagrammTitel}>{titel}</Text>
      <Text style={stil.legende}>{notiz}</Text>
      {children}
    </View>
  );
}

export function DiagrammSeitenInhalt({ diagramme }: { diagramme: PdfDiagramme }) {
  const umsatz = diagramme.umsatzGegenKosten;
  const kontostand = diagramme.kontostand;
  const minimum = kontostand.punkte.findIndex((punkt) => punkt.istMinimumDerReihe);
  const tiefMonat = kontostand.tiefsterKontostandMonat
    ? monatLang(kontostand.tiefsterKontostandMonat)
    : null;
  const kostenSerien = new Map<string, { id: string; bezeichnung: string }>();
  for (const punkt of diagramme.kostenstruktur) {
    for (const anteil of punkt.anteile) kostenSerien.set(anteil.id, anteil);
  }
  return (
    <>
      <Karte
        titel="Umsatz gegen Kosten"
        notiz="Kosten sind Wareneinsatz, Personal, Raumkosten, sonstige Kosten, Abschreibungen, Zinsen und Steuern. Beträge in Euro."
      >
        <LinienDiagramm
          mitNull
          beschriftungen={monatsNamen(umsatz.map((punkt) => punkt.schluessel))}
          serien={[
            {
              name: "Umsatz",
              farbe: farbe("umsatz"),
              werte: umsatz.map((punkt) => punkt.umsatzCents),
            },
            {
              name: "Kosten",
              farbe: farbe("kosten"),
              werte: umsatz.map((punkt) => punkt.kostenCents),
            },
          ]}
        />
        <View style={stil.legendenZeile}>
          <Legende farbe={farbe("umsatz")} name="Umsatz" />
          <Legende farbe={farbe("kosten")} name="Kosten" />
        </View>
      </Karte>
      <Karte
        titel="Kontostand"
        notiz={`Nullinie bei 0 Euro. Der tiefste Monatsendstand${tiefMonat ? ` im ${tiefMonat}` : ""} ist ${euro(kontostand.tiefsterKontostandCents)}. Kontokorrentbedarf ${euro(kontostand.kontokorrentbedarfCents)}.`}
      >
        <LinienDiagramm
          mitNull
          beschriftungen={monatsNamen(kontostand.punkte.map((punkt) => punkt.schluessel))}
          serien={[
            {
              name: "Kontostand",
              farbe: farbe("kontostand"),
              werte: kontostand.punkte.map((punkt) => punkt.standCents),
            },
          ]}
          markierung={minimum >= 0 ? { index: minimum, name: "Tiefpunkt" } : undefined}
        />
      </Karte>
      <Karte
        titel="Kumuliertes Ergebnis"
        notiz="Laufende Summe des Ergebnisses nach Steuern seit dem Gründungsmonat. Beträge in Euro."
      >
        <LinienDiagramm
          mitNull
          beschriftungen={monatsNamen(
            diagramme.kumuliertesErgebnis.map((punkt) => punkt.schluessel),
          )}
          serien={[
            {
              name: "Ergebnis",
              farbe: farbe("ergebnis"),
              werte: diagramme.kumuliertesErgebnis.map((punkt) => punkt.kumuliertCents),
            },
          ]}
        />
      </Karte>
      <Karte
        titel="Kostenstruktur"
        notiz="Gestapelte Aufwandszeilen der Rentabilitätsvorschau je Planjahr. Negative sonstige Kosten sind Erträge."
      >
        <BalkenDiagramm
          gruppen={diagramme.kostenstruktur.map((punkt) => ({
            name: punkt.schluessel.replace("Planjahr ", "PJ "),
            segmente: punkt.anteile,
          }))}
        />
      </Karte>
      <Karte
        titel="Mittelherkunft und Mittelverwendung"
        notiz="Je Planjahr zwei Balken: H ist die Mittelherkunft, V die Mittelverwendung. Die Farben sind die Posten des Kapitalbedarfsplans."
      >
        <BalkenDiagramm
          gruppen={diagramme.mittelherkunft.flatMap((gruppe, index) => [
            { name: `${index + 1} H`, segmente: gruppe.herkunft },
            { name: `${index + 1} V`, segmente: gruppe.verwendung },
          ])}
        />
      </Karte>
    </>
  );
}

function Legende({ farbe: farbwert, name }: { farbe: string; name: string }) {
  return (
    <View style={stil.legendeneintrag}>
      <View style={[stil.legendFarbe, { backgroundColor: farbwert }]} />
      <Text style={stil.legendText}>{name}</Text>
    </View>
  );
}
