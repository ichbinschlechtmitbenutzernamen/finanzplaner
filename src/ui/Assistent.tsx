import { useState } from "react";
import { ASSISTENT_STATIONEN } from "../domain/types.ts";
import type { AssistentStation, Finanzplan } from "../domain/types.ts";
import {
  STATION_LABEL,
  geheWeiter,
  geheZurueck,
  naechsteStation,
  springeZu,
  stationFaelltWeg,
  vorherigeStation,
  waehleWeg,
} from "../domain/assistent/stationen.ts";
import { leseUmsatz, leseVorhaben } from "../domain/assistent/lesen.ts";
import { pruefeUmsatz, pruefeVorhaben } from "../domain/assistent/schreiben.ts";
import type { Berichte } from "../domain/reports/typen.ts";
import {
  PersoenlichStation,
  UmsatzStation,
  VorhabenStation,
  WareneinsatzStation,
} from "./assistent/station-grund.tsx";
import {
  FinanzierungStation,
  InvestitionStation,
  KostenStation,
  PersonalStation,
  ZusammenfassungStation,
} from "./assistent/station-betrieb.tsx";
import type { PlanAendern } from "./assistent/typen.ts";

export function Startauswahl({
  onAssistent,
  onTabelle,
}: {
  onAssistent: () => void;
  onTabelle: () => void;
}) {
  return (
    <section className="startwahl" aria-labelledby="startwahl-titel">
      <p className="eyebrow">Neuer Plan</p>
      <h2 id="startwahl-titel">Wie möchten Sie beginnen?</h2>
      <p className="hinweis">
        Der Assistent führt durch dieselben Eingaben wie die Tabelle. Sie können jederzeit wechseln,
        ohne etwas zu verlieren.
      </p>
      <div className="startwahl-aktionen">
        <button type="button" className="primaer" onClick={onAssistent}>
          Assistent starten
        </button>
        <button type="button" onClick={onTabelle}>
          Direkt zur Tabelle
        </button>
      </div>
    </section>
  );
}

export function Assistent({
  plan,
  berichte,
  onAendern,
  onUeberblick,
}: {
  plan: Finanzplan;
  berichte: Berichte | null;
  onAendern: PlanAendern;
  onUeberblick: () => void;
}) {
  const [meldungen, setMeldungen] = useState<string[]>([]);
  const station = plan.assistent?.station ?? "vorhaben";
  const rechtsform = plan.stammdaten.rechtsform;
  const vorher = vorherigeStation(station, rechtsform);
  const naechste = naechsteStation(station, rechtsform);

  function weiter() {
    const fehler = pruefeStation(station, plan);
    setMeldungen(fehler);
    if (fehler.length > 0) return;
    onAendern((aktuell) => geheWeiter(aktuell));
  }

  return (
    <div className="assistent">
      <nav className="stationen" aria-label="Stationen">
        {ASSISTENT_STATIONEN.map((eintrag, index) => {
          const uebersprungen = stationFaelltWeg(eintrag, rechtsform);
          const erledigt = plan.assistent?.erledigt.includes(eintrag) ?? false;
          return (
            <button
              key={eintrag}
              type="button"
              aria-current={eintrag === station ? "step" : undefined}
              data-uebersprungen={uebersprungen ? "true" : undefined}
              className={erledigt ? "erledigt" : undefined}
              onClick={() => {
                setMeldungen([]);
                onAendern((aktuell) => springeZu(aktuell, eintrag));
              }}
            >
              <span>{index + 1}</span>
              {STATION_LABEL[eintrag]}
              {uebersprungen ? <small>entfällt</small> : null}
            </button>
          );
        })}
      </nav>
      <Station
        plan={plan}
        berichte={berichte}
        station={station}
        onAendern={onAendern}
        onUeberblick={() => {
          onAendern((aktuell) => geheWeiter(aktuell));
          onUeberblick();
        }}
      />
      {meldungen.length > 0 ? (
        <ul className="fehler" role="alert">
          {meldungen.map((meldung) => (
            <li key={meldung}>{meldung}</li>
          ))}
        </ul>
      ) : null}
      {station === "zusammenfassung" ? null : (
        <div className="assistent-nav">
          <button
            type="button"
            onClick={() => onAendern((aktuell) => geheZurueck(aktuell))}
            disabled={!vorher}
          >
            Zurück
          </button>
          <button type="button" className="primaer" onClick={weiter} disabled={!naechste}>
            {naechste ? `Weiter: ${STATION_LABEL[naechste]}` : "Weiter"}
          </button>
        </div>
      )}
    </div>
  );
}

function Station({
  plan,
  berichte,
  station,
  onAendern,
  onUeberblick,
}: {
  plan: Finanzplan;
  berichte: Berichte | null;
  station: AssistentStation;
  onAendern: PlanAendern;
  onUeberblick: () => void;
}) {
  if (station === "vorhaben") return <VorhabenStation plan={plan} onAendern={onAendern} />;
  if (station === "persoenlich") return <PersoenlichStation plan={plan} onAendern={onAendern} />;
  if (station === "umsatz") return <UmsatzStation plan={plan} onAendern={onAendern} />;
  if (station === "wareneinsatz") return <WareneinsatzStation plan={plan} onAendern={onAendern} />;
  if (station === "personal") return <PersonalStation plan={plan} onAendern={onAendern} />;
  if (station === "kosten") return <KostenStation plan={plan} onAendern={onAendern} />;
  if (station === "investitionen") return <InvestitionStation plan={plan} onAendern={onAendern} />;
  if (station === "finanzierung") return <FinanzierungStation plan={plan} onAendern={onAendern} />;
  return <ZusammenfassungStation plan={plan} berichte={berichte} onUeberblick={onUeberblick} />;
}

function pruefeStation(station: AssistentStation, plan: Finanzplan): string[] {
  if (station === "vorhaben") return pruefeVorhaben(leseVorhaben(plan));
  if (station === "umsatz") return pruefeUmsatz(leseUmsatz(plan));
  if (station === "persoenlich" && stationFaelltWeg(station, plan.stammdaten.rechtsform)) return [];
  return [];
}

export function waehleAssistent(plan: Finanzplan): Finanzplan {
  return waehleWeg(plan, "assistent");
}

export function waehleTabelle(plan: Finanzplan): Finanzplan {
  return waehleWeg(plan, "tabelle");
}
