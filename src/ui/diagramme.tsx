import { type ReactElement, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { isIsoMonth } from "../domain/months.ts";
import {
  kontostandVerlauf,
  kostenstruktur,
  kumuliertesErgebnis,
  mittelherkunftVerwendung,
  umsatzGegenKosten,
  type Kostenanteil,
  type MittelGruppe,
  type MittelSegment,
  type Zeitmodus,
} from "../domain/reports/diagramme.ts";
import type { Berichte } from "../domain/reports/typen.ts";
import { formatEuro, formatEuroAchse, formatMonatKurz, formatMonatLang } from "./format.ts";

/**
 * Diagramme für den Überblick. Das PDF zeichnet dieselben Zahlenreihen als Vektoren.
 * Die Zahlen kommen aus den Berichten.
 */

export interface DiagrammFest {
  breite: number;
  hoehe: number;
}

interface DiagrammProps {
  berichte: Berichte;
  modus: Zeitmodus;
  fest?: DiagrammFest;
}

const TICK = { fill: "#5e6872", fontSize: 12 };
const RAND = { top: 28, right: 28, left: 0, bottom: 0 };
const GITTER = "#e4ddd2";

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

type BalkenZeile = { name: string } & Record<string, string | number>;

export function UmsatzKostenDiagramm({ berichte, modus, fest }: DiagrammProps) {
  const daten = umsatzGegenKosten(berichte, modus).map((punkt) => ({
    name: achsenName(punkt.schluessel),
    umsatzCents: punkt.umsatzCents,
    kostenCents: punkt.kostenCents,
  }));
  return (
    <DiagrammKarte
      titel="Umsatz gegen Kosten"
      notiz="Kosten sind Wareneinsatz, Personal, Raumkosten, sonstige Kosten, Abschreibungen, Zinsen und Steuern."
      fest={fest}
      chart={
        <LineChart data={daten} {...masse(fest)} margin={RAND}>
          {grundgeruest(modus)}
          <Line
            dataKey="umsatzCents"
            name="Umsatz"
            stroke={farbe("umsatz")}
            strokeWidth={2}
            dot={modus === "planjahre"}
            isAnimationActive={false}
          />
          <Line
            dataKey="kostenCents"
            name="Kosten"
            stroke={farbe("kosten")}
            strokeWidth={2}
            dot={modus === "planjahre"}
            isAnimationActive={false}
          />
          <Tooltip content={EuroTooltip} />
          <Legend />
        </LineChart>
      }
    />
  );
}

export function KontostandDiagramm({ berichte, modus, fest }: DiagrammProps) {
  const verlauf = kontostandVerlauf(berichte, modus);
  const daten = verlauf.punkte.map((punkt) => ({
    name: achsenName(punkt.schluessel),
    standCents: punkt.standCents,
  }));
  const minimum = verlauf.punkte.find((punkt) => punkt.istMinimumDerReihe);
  const monat = verlauf.tiefsterKontostandMonat
    ? formatMonatLang(verlauf.tiefsterKontostandMonat)
    : null;
  const notiz =
    modus === "monate"
      ? `Nullinie bei 0 €. Markiert ist der tiefste Monatsendstand${monat ? ` im ${monat}` : ""}: ${formatEuro(verlauf.tiefsterKontostandCents)}. Kontokorrentbedarf ${formatEuro(verlauf.kontokorrentbedarfCents)}.`
      : `Die Punkte sind die Stände am Ende des Planjahres. Der tiefste Monatsendstand${monat ? ` im ${monat}` : ""} ist ${formatEuro(verlauf.tiefsterKontostandCents)}, der Kontokorrentbedarf ${formatEuro(verlauf.kontokorrentbedarfCents)}.`;
  return (
    <DiagrammKarte
      titel="Kontostand"
      notiz={notiz}
      fest={fest}
      chart={
        <LineChart data={daten} {...masse(fest)} margin={RAND}>
          {grundgeruest(modus, { mitNull: true })}
          <ReferenceLine y={0} stroke="#8a8175" strokeDasharray="4 4" />
          <Line
            dataKey="standCents"
            name="Kontostand"
            stroke={farbe("kontostand")}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {minimum ? (
            <ReferenceDot
              x={achsenName(minimum.schluessel)}
              y={minimum.standCents}
              r={6}
              fill="#9f1d1d"
              stroke="#fffcf8"
              strokeWidth={2}
              ifOverflow="visible"
              label={
                modus === "monate"
                  ? { value: "Tiefpunkt", position: "top", fill: "#9f1d1d", fontSize: 12 }
                  : {
                      value: "niedrigster Jahresendstand",
                      position: "top",
                      fill: "#9f1d1d",
                      fontSize: 12,
                    }
              }
            />
          ) : null}
          <Tooltip content={EuroTooltip} />
          <Legend />
        </LineChart>
      }
    />
  );
}

export function ErgebnisDiagramm({ berichte, modus, fest }: DiagrammProps) {
  const daten = kumuliertesErgebnis(berichte, modus).map((punkt) => ({
    name: achsenName(punkt.schluessel),
    kumuliertCents: punkt.kumuliertCents,
  }));
  return (
    <DiagrammKarte
      titel="Kumuliertes Ergebnis"
      notiz="Laufende Summe des Ergebnisses nach Steuern seit dem Gründungsmonat."
      fest={fest}
      chart={
        <LineChart data={daten} {...masse(fest)} margin={RAND}>
          {grundgeruest(modus, { mitNull: true })}
          <ReferenceLine y={0} stroke="#8a8175" strokeDasharray="4 4" />
          <Line
            dataKey="kumuliertCents"
            name="Ergebnis nach Steuern, kumuliert"
            stroke={farbe("ergebnis")}
            strokeWidth={2}
            dot={modus === "planjahre"}
            isAnimationActive={false}
          />
          <Tooltip content={EuroTooltip} />
          <Legend />
        </LineChart>
      }
    />
  );
}

export function KostenstrukturDiagramm({ berichte, modus, fest }: DiagrammProps) {
  const punkte = kostenstruktur(berichte, modus);
  const { zeilen, serien } = anteileZuBalken(punkte);
  return (
    <DiagrammKarte
      titel="Kostenstruktur"
      notiz="Gestapelte Aufwandszeilen der Rentabilitätsvorschau. Negative sonstige Kosten sind Erträge, zum Beispiel Zuschüsse."
      fest={fest}
      chart={
        <BarChart data={zeilen} {...masse(fest)} margin={RAND} stackOffset="sign">
          {grundgeruest(modus)}
          <BarStack stackId="kosten" radius={[3, 3, 0, 0]}>
            {serien.map((serie) => (
              <Bar
                key={serie.id}
                dataKey={serie.id}
                name={serie.bezeichnung}
                fill={farbe(serie.id)}
                isAnimationActive={false}
              />
            ))}
          </BarStack>
          <Tooltip content={EuroTooltip} />
          <Legend />
        </BarChart>
      }
    />
  );
}

export function FinanzierungDiagramm({ berichte, modus, fest }: DiagrammProps) {
  const gruppen =
    modus === "monate"
      ? [summeMittel(mittelherkunftVerwendung(berichte, modus))]
      : mittelherkunftVerwendung(berichte, modus);
  const { zeilen, serien } = mittelZuBalken(gruppen);
  const deckung = `${berichte.kapital.deckung.bezeichnung}: ${formatEuro(berichte.kapital.deckung.betragCents)}`;
  const notiz =
    modus === "monate"
      ? `Mittelherkunft ist die Finanzierung, Mittelverwendung der Kapitalbedarf, als Summe im Horizont. ${deckung}.`
      : `Mittelherkunft ist die Finanzierung, Mittelverwendung der Kapitalbedarf, je Planjahr. ${deckung}.`;
  if (zeilen.length === 0) {
    return (
      <section className="diagramm-karte" aria-label="Mittelherkunft und Mittelverwendung">
        <h3>Mittelherkunft und Mittelverwendung</h3>
        <p className="diagramm-notiz">{notiz} Im Horizont sind keine Mittel erfasst.</p>
      </section>
    );
  }
  return (
    <DiagrammKarte
      titel="Mittelherkunft und Mittelverwendung"
      notiz={notiz}
      fest={fest}
      chart={
        <BarChart data={zeilen} {...masse(fest)} margin={RAND}>
          {grundgeruest(modus, { alleBeschriftungen: true })}
          <BarStack stackId="mittel" radius={[3, 3, 0, 0]}>
            {serien.map((serie) => (
              <Bar
                key={serie.id}
                dataKey={serie.id}
                name={serie.bezeichnung}
                fill={farbe(serie.id)}
                isAnimationActive={false}
              />
            ))}
          </BarStack>
          <Tooltip content={EuroTooltip} />
          <Legend />
        </BarChart>
      }
    />
  );
}

function DiagrammKarte({
  titel,
  notiz,
  fest,
  chart,
}: {
  titel: string;
  notiz: string;
  fest?: DiagrammFest;
  chart: ReactNode;
}) {
  return (
    <section className="diagramm-karte" aria-label={titel}>
      <h3>{titel}</h3>
      <p className="diagramm-notiz">{notiz}</p>
      {fest ? (
        <div className="diagramm-fest" style={{ width: fest.breite, height: fest.hoehe }}>
          {chart}
        </div>
      ) : (
        <div className="diagramm-flaeche">
          <ResponsiveContainer width="100%" height={320}>
            {chart as ReactElement}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function grundgeruest(
  modus: Zeitmodus,
  optionen?: { mitNull?: boolean; alleBeschriftungen?: boolean },
) {
  const alle = modus === "planjahre" || optionen?.alleBeschriftungen === true;
  return (
    <>
      <CartesianGrid stroke={GITTER} vertical={false} />
      <XAxis
        dataKey="name"
        tick={TICK}
        interval={alle ? 0 : "preserveStartEnd"}
        minTickGap={alle ? 0 : 20}
        axisLine={{ stroke: GITTER }}
        tickLine={false}
      />
      <YAxis
        tick={TICK}
        width={78}
        tickFormatter={(wert) => formatEuroAchse(Number(wert))}
        axisLine={false}
        tickLine={false}
        domain={optionen?.mitNull ? [nullEinbeziehen, nullEinbeziehenOben] : undefined}
      />
    </>
  );
}

function nullEinbeziehen(min: number): number {
  return Math.min(0, min);
}

function nullEinbeziehenOben(max: number): number {
  return Math.max(0, max);
}

function masse(fest: DiagrammFest | undefined): { width?: number; height?: number } {
  if (!fest) return {};
  return { width: fest.breite, height: fest.hoehe };
}

function achsenName(schluessel: string): string {
  if (!isIsoMonth(schluessel)) return schluessel;
  return formatMonatKurz(schluessel);
}

function farbe(id: string): string {
  return FARBE[id] ?? "#5e6872";
}

function anteileZuBalken(punkte: { schluessel: string; anteile: Kostenanteil[] }[]): {
  zeilen: BalkenZeile[];
  serien: { id: string; bezeichnung: string }[];
} {
  const serien = new Map<string, string>();
  for (const punkt of punkte) {
    for (const anteil of punkt.anteile) serien.set(anteil.id, anteil.bezeichnung);
  }
  const zeilen = punkte.map((punkt) => {
    const zeile: BalkenZeile = { name: achsenName(punkt.schluessel) };
    for (const anteil of punkt.anteile) zeile[anteil.id] = anteil.betragCents;
    return zeile;
  });
  const sichtbar = [...serien]
    .filter(([id]) => zeilen.some((zeile) => zeile[id] !== 0))
    .map(([id, bezeichnung]) => ({ id, bezeichnung }));
  return { zeilen, serien: sichtbar };
}

function mittelZuBalken(gruppen: readonly MittelGruppe[]): {
  zeilen: BalkenZeile[];
  serien: { id: string; bezeichnung: string }[];
} {
  const serien = new Map<string, string>();
  for (const gruppe of gruppen) {
    for (const segment of [...gruppe.herkunft, ...gruppe.verwendung]) {
      serien.set(segment.id, segment.bezeichnung);
    }
  }
  const zeilen = gruppen.flatMap((gruppe) => {
    const summe = gruppe.schluessel === "Summe";
    return [
      balkenZeile(
        summe ? "Mittelherkunft" : `${achsenName(gruppe.schluessel)} · Herkunft`,
        gruppe.herkunft,
      ),
      balkenZeile(
        summe ? "Mittelverwendung" : `${achsenName(gruppe.schluessel)} · Verwendung`,
        gruppe.verwendung,
      ),
    ];
  });
  const sichtbar = [...serien]
    .filter(([id]) => zeilen.some((zeile) => typeof zeile[id] === "number" && zeile[id] !== 0))
    .map(([id, bezeichnung]) => ({ id, bezeichnung }));
  return { zeilen, serien: sichtbar };
}

function balkenZeile(name: string, segmente: readonly MittelSegment[]): BalkenZeile {
  const zeile: BalkenZeile = { name };
  for (const segment of segmente) {
    if (segment.betragCents !== 0) zeile[segment.id] = segment.betragCents;
  }
  return zeile;
}

function summeMittel(gruppen: readonly MittelGruppe[]): MittelGruppe {
  return {
    schluessel: "Summe",
    herkunft: summeSegmente(gruppen.map((gruppe) => gruppe.herkunft)),
    verwendung: summeSegmente(gruppen.map((gruppe) => gruppe.verwendung)),
  };
}

function summeSegmente(listen: readonly (readonly MittelSegment[])[]): MittelSegment[] {
  const map = new Map<string, MittelSegment>();
  for (const liste of listen) {
    for (const segment of liste) {
      const bisher = map.get(segment.id);
      if (bisher) bisher.betragCents += segment.betragCents;
      else map.set(segment.id, { ...segment });
    }
  }
  return [...map.values()];
}

function EuroTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  return (
    <div className="diagramm-tooltip">
      <p>{label}</p>
      <ul>
        {payload.map((eintrag, index) => {
          const cents = centsAusTooltip(eintrag.value);
          if (cents == null) return null;
          return (
            <li key={`${String(eintrag.dataKey)}-${index}`} style={{ color: eintrag.color }}>
              <span>{eintrag.name}</span>
              <strong>{formatEuro(cents)}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function centsAusTooltip(wert: unknown): number | null {
  if (typeof wert === "number" && Number.isFinite(wert)) return wert;
  if (typeof wert === "string" && wert.trim() !== "" && Number.isFinite(Number(wert))) {
    return Number(wert);
  }
  if (Array.isArray(wert) && wert.length >= 2) {
    const oben = Number(wert[wert.length - 1]);
    const unten = Number(wert[0]);
    if (Number.isFinite(oben) && Number.isFinite(unten)) return oben - unten;
  }
  return null;
}
