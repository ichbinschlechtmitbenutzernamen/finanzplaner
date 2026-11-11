import { useCallback, useEffect, useState } from "react";
import { beispielplaene, beispielplanById } from "./fixtures/index.ts";
import { PlanArbeitsflaeche, REITER, type ReiterId } from "./ui/PlanArbeitsflaeche.tsx";
import { ladePlan, loeschePlan, speicherePlan } from "./ui/speicher.ts";

const REITER_IDS = new Set<string>(REITER.map((eintrag) => eintrag.id));

interface Route {
  id: string;
  reiter: ReiterId;
}

function readRoute(): Route {
  const [id, reiter] = window.location.hash.replace(/^#/, "").split("/");
  return {
    id: beispielplanById(id ?? "").id,
    reiter: REITER_IDS.has(reiter ?? "") ? (reiter as ReiterId) : "eingaben",
  };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [frische, setFrische] = useState(0);
  const [anfang, setAnfang] = useState(() => ladePlan(route.id));
  const beispiel = beispielplanById(route.id);

  useEffect(() => {
    const onHash = () => {
      const naechste = readRoute();
      setRoute((bisher) => {
        if (bisher.id !== naechste.id) {
          setAnfang(ladePlan(naechste.id));
          setFrische((wert) => wert + 1);
        }
        return naechste;
      });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const ziel = `${route.id}/${route.reiter}`;
    if (window.location.hash.replace(/^#/, "") !== ziel) window.location.hash = ziel;
  }, [route]);

  const speichern = useCallback(
    (plan: Parameters<typeof speicherePlan>[1]) => {
      speicherePlan(route.id, plan);
    },
    [route.id],
  );

  return (
    <PlanArbeitsflaeche
      key={`${beispiel.id}-${frische}`}
      anfangsplan={anfang ?? beispiel.plan}
      beispiele={beispielplaene}
      beispielId={beispiel.id}
      reiter={route.reiter}
      onBeispiel={(id) => {
        setRoute((bisher) => ({ ...bisher, id }));
        setAnfang(ladePlan(id));
        setFrische((wert) => wert + 1);
      }}
      onReiter={(reiter) => setRoute((bisher) => ({ ...bisher, reiter }))}
      onSpeichern={speichern}
      onZuruecksetzen={() => {
        loeschePlan(route.id);
        setAnfang(null);
        setFrische((wert) => wert + 1);
      }}
    />
  );
}
