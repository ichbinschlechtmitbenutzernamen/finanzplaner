import { useMemo, useState } from "react";
import {
  ueberblickKpis,
  type UeberblickKpis,
  type Zeitmodus,
} from "../domain/reports/diagramme.ts";
import type { Berichte } from "../domain/reports/typen.ts";
import {
  ErgebnisDiagramm,
  FinanzierungDiagramm,
  KontostandDiagramm,
  KostenstrukturDiagramm,
  UmsatzKostenDiagramm,
} from "./diagramme.tsx";
import { formatEuro, formatMonatKurz, formatMonatLang, formatProzent } from "./format.ts";

export function Ueberblick({ berichte }: { berichte: Berichte }) {
  const [modus, setModus] = useState<Zeitmodus>("monate");
  const kpis = useMemo(() => ueberblickKpis(berichte), [berichte]);

  return (
    <div className="ueberblick">
      <p className="hinweis">
        Kennzahlen und Diagramme stammen aus den Berichten. Ein Planjahr sind zwölf Monate ab dem
        Gründungsmonat, nicht das Kalenderjahr.
      </p>
      <div className="kpi-raster">
        <JahresKachel
          titel="Umsatz"
          kpis={kpis}
          wert={(jahr) => jahr.umsatzCents}
          gesamt={kpis.gesamt.umsatzCents}
        />
        <JahresKachel
          titel="Ergebnis nach Steuern"
          kpis={kpis}
          wert={(jahr) => jahr.ergebnisNachSteuernCents}
          gesamt={kpis.gesamt.ergebnisNachSteuernCents}
        />
        <section className="kpi" aria-label="Break-even-Monat">
          <h3>Break-even-Monat</h3>
          <p className="kpi-wert">
            {kpis.breakEven.erreicht && kpis.breakEven.monat
              ? formatMonatLang(kpis.breakEven.monat)
              : "nicht erreicht"}
          </p>
          <p className="kpi-sub">
            {kpis.breakEven.planmonat
              ? `Planmonat ${kpis.breakEven.planmonat}, erstes positives Ergebnis nach Steuern`
              : "Kein Monat mit Ergebnis nach Steuern über 0"}
          </p>
        </section>
        <section className="kpi" aria-label="Niedrigster Kontostand">
          <h3>Niedrigster Kontostand</h3>
          <p className={wertKlasse("kpi-wert", kpis.tiefsterKontostandCents)}>
            {formatEuro(kpis.tiefsterKontostandCents)}
          </p>
          <p className="kpi-sub">
            {kpis.tiefsterKontostandMonat
              ? formatMonatLang(kpis.tiefsterKontostandMonat)
              : "kein Monat"}
          </p>
          <p className="kpi-folge">
            Kapitalbedarf aus dem Kontostand (Kontokorrent){" "}
            {formatEuro(kpis.kontokorrentbedarfCents)}
          </p>
        </section>
        <TragfaehigkeitKachel kpis={kpis} />
        <section className="kpi" aria-label="Eigenkapitalquote">
          <h3>Eigenkapitalquote</h3>
          <p className="kpi-wert">{formatQuote(kpis.eigenkapitalquote)}</p>
          <p className="kpi-sub">
            {formatEuro(kpis.eigenmittelCents)} Eigenmittel von {formatEuro(kpis.finanzierungCents)}{" "}
            Finanzierung
          </p>
        </section>
        <JahresKachel
          titel="Rohertragsquote"
          kpis={kpis}
          wert={(jahr) => jahr.rohertragsquote}
          gesamt={kpis.gesamt.rohertragsquote}
          quote
        />
        <JahresKachel
          titel="Personalkostenquote"
          kpis={kpis}
          wert={(jahr) => jahr.personalkostenquote}
          gesamt={kpis.gesamt.personalkostenquote}
          quote
        />
      </div>

      <div className="zeit-schalter" role="group" aria-label="Zeitraum der Diagramme">
        <span className="zeit-label">Diagramme</span>
        <button type="button" aria-pressed={modus === "monate"} onClick={() => setModus("monate")}>
          Monate
        </button>
        <button
          type="button"
          aria-pressed={modus === "planjahre"}
          onClick={() => setModus("planjahre")}
        >
          Planjahre
        </button>
        <p className="zeit-hinweis">
          {modus === "monate"
            ? "Jeder Punkt ist ein Planmonat."
            : "Jeder Punkt fasst ein Planjahr zusammen."}
        </p>
      </div>

      <UmsatzKostenDiagramm berichte={berichte} modus={modus} />
      <KontostandDiagramm berichte={berichte} modus={modus} />
      <ErgebnisDiagramm berichte={berichte} modus={modus} />
      <KostenstrukturDiagramm berichte={berichte} modus={modus} />
      <FinanzierungDiagramm berichte={berichte} modus={modus} />
    </div>
  );
}

function JahresKachel({
  titel,
  kpis,
  wert,
  gesamt,
  quote = false,
}: {
  titel: string;
  kpis: UeberblickKpis;
  wert: (jahr: UeberblickKpis["planjahre"][number]) => number | null;
  gesamt: number | null;
  quote?: boolean;
}) {
  return (
    <section className="kpi breit" aria-label={titel}>
      <h3>{titel}</h3>
      <ol className="kpi-jahre">
        {kpis.planjahre.map((jahr) => {
          const zahl = wert(jahr);
          return (
            <li key={jahr.nummer}>
              <span>
                {jahr.bezeichnung}
                <small>
                  {formatMonatKurz(jahr.vonMonat)}–{formatMonatKurz(jahr.bisMonat)}
                </small>
              </span>
              <strong className={zahl != null && zahl < 0 ? "neg" : undefined}>
                {quote ? formatQuote(zahl) : formatEuro(zahl ?? 0)}
              </strong>
            </li>
          );
        })}
      </ol>
      <p className="kpi-sub">Horizont {quote ? formatQuote(gesamt) : formatEuro(gesamt ?? 0)}</p>
    </section>
  );
}

function TragfaehigkeitKachel({ kpis }: { kpis: UeberblickKpis }) {
  const status = tragfaehigkeitStatus(kpis);
  return (
    <section className="kpi" aria-label="Tragfähigkeit">
      <h3>Tragfähigkeit</h3>
      <p className={`kpi-status ${status.code}`}>{status.text}</p>
      {kpis.tragfaehigkeit.anwendbar ? (
        <ul className="kpi-personen">
          {kpis.tragfaehigkeit.personen.map((person) => (
            <li key={person.personId}>
              <span>{person.name}</span>
              <strong
                className={
                  person.planjahr2Cents != null && person.planjahr2Cents < 0 ? "neg" : undefined
                }
              >
                {person.planjahr2Cents == null ? "–" : formatEuro(person.planjahr2Cents)}
              </strong>
              <span>verfügbar im Planjahr 2</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="kpi-sub">{kpis.tragfaehigkeit.hinweis}</p>
      )}
    </section>
  );
}

function tragfaehigkeitStatus(kpis: UeberblickKpis): {
  code: "ja" | "nein" | "offen";
  text: string;
} {
  if (!kpis.tragfaehigkeit.anwendbar) return { code: "offen", text: "nicht anwendbar" };
  if (kpis.tragfaehigkeit.alleTragfaehig === true) return { code: "ja", text: "tragfähig" };
  if (kpis.tragfaehigkeit.alleTragfaehig === false)
    return { code: "nein", text: "nicht tragfähig" };
  return { code: "offen", text: "ohne Bewertung" };
}

function formatQuote(wert: number | null): string {
  if (wert == null) return "–";
  return formatProzent(wert);
}

function wertKlasse(klasse: string, cents: number): string {
  return cents < 0 ? `${klasse} neg` : klasse;
}
