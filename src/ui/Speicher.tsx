import { useEffect, useState, type ReactNode } from "react";
import type { Finanzplan } from "../domain/types.ts";
import { Bestaetigung } from "./Bestaetigung.tsx";
import { formatZeitpunkt } from "./format.ts";
import {
  anzeigename,
  dateinameFuerPlan,
  ladeDateiHerunter,
  sicherePlanJson,
} from "./plan-datei.ts";
import {
  bewerteErinnerung,
  erinnerungGeschlossen,
  ladeArbeitSeit,
  ladeLetzteSicherung,
  merkeSicherung,
  schliesseErinnerung,
} from "./sicherung.ts";
import { PlanDateiEingabe, usePlanDatei } from "./usePlanDatei.tsx";

function uhrJetzt(): Date {
  return new Date();
}

export function useSpeicher({
  plan,
  planId,
  aktiv,
  jetzt = uhrJetzt,
  onUebernehmen,
}: {
  plan: Finanzplan;
  planId: string;
  aktiv: boolean;
  jetzt?: () => Date;
  onUebernehmen: (plan: Finanzplan) => void;
}): { sichern: () => void; laden: () => void; knoten: ReactNode } {
  const datei = usePlanDatei(aktiv, onUebernehmen);
  const [tick, setTick] = useState(0);
  const zeit = jetzt();
  const bewertung = aktiv
    ? bewerteErinnerung({
        erstelltAm: plan.erstelltAm,
        geaendertAm: plan.geaendertAm,
        letzteSicherung: ladeLetzteSicherung(planId),
        arbeitSeit: ladeArbeitSeit(planId),
        jetzt: zeit.getTime(),
      })
    : null;
  const zeigen =
    bewertung != null && bewertung.faellig && !erinnerungGeschlossen(planId, bewertung.schluessel);

  useEffect(() => {
    if (!bewertung?.ungesichert || bewertung.faellig) return;
    const id = window.setTimeout(() => setTick((wert) => wert + 1), 60_000);
    return () => window.clearTimeout(id);
  }, [bewertung?.ungesichert, bewertung?.faellig, bewertung?.schluessel, tick]);

  function sichern() {
    const zeitpunkt = jetzt();
    ladeDateiHerunter(dateinameFuerPlan(plan, zeitpunkt), sicherePlanJson(plan));
    if (!aktiv) return;
    merkeSicherung(planId, zeitpunkt.toISOString());
    setTick((wert) => wert + 1);
  }

  function schliessen() {
    if (!bewertung) return;
    schliesseErinnerung(planId, bewertung.schluessel);
    setTick((wert) => wert + 1);
  }

  const dateiKnoten = (
    <>
      {datei.fehler ? (
        <p className="fehler" role="alert">
          {datei.fehler}
        </p>
      ) : null}
      <PlanDateiEingabe eingabe={datei.eingabe} onDatei={datei.beiDatei} />
      {datei.bereit ? (
        <Bestaetigung
          titel="Plan laden"
          text={`Die Datei ersetzt „${anzeigename(plan)}“ in diesem Browser, zuletzt geändert am ${formatZeitpunkt(plan.geaendertAm)}.`}
          bestaetigen="Plan ersetzen"
          gefahr
          onBestaetigen={datei.bestaetigen}
          onAbbrechen={datei.abbrechen}
        />
      ) : null}
    </>
  );

  if (!aktiv) {
    return { sichern, laden: datei.oeffnen, knoten: dateiKnoten };
  }

  const zuletzt = bewertung?.letzteSicherung
    ? formatZeitpunkt(bewertung.letzteSicherung)
    : "noch nicht";

  const knoten = (
    <>
      <p className="speicher-hinweis">
        Dieser Plan liegt nur in diesem Browser. Mit „Plan sichern“ schreiben Sie eine Datei, die
        Sie später wieder laden können.
      </p>
      {zeigen ? (
        <p className="erinnerung" role="status">
          <span>Zuletzt gesichert: {zuletzt} – </span>
          <button type="button" onClick={sichern}>
            jetzt sichern
          </button>
          <button type="button" onClick={schliessen}>
            Schließen
          </button>
        </p>
      ) : null}
      {dateiKnoten}
    </>
  );

  return { sichern, laden: datei.oeffnen, knoten };
}
