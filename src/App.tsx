import { useCallback, useEffect, useState } from "react";
import { createDraftFinanzplan } from "./domain/empty-plan.ts";
import { beispielplaene, beispielplanById } from "./fixtures/index.ts";
import { PlanArbeitsflaeche, REITER, type ReiterId } from "./ui/PlanArbeitsflaeche.tsx";
import { ladePlan, loeschePlan, speicherePlan } from "./ui/speicher.ts";

const REITER_IDS = new Set<string>(REITER.map((eintrag) => eintrag.id));
const NEUER_PLAN = "neu";

interface Route {
  id: string;
  reiter: ReiterId;
}

function readRoute(): Route {
  const [id, reiter] = window.location.hash.replace(/^#/, "").split("/");
  const neu = id === NEUER_PLAN;
  return {
    id: neu ? NEUER_PLAN : beispielplanById(id ?? "").id,
    reiter: REITER_IDS.has(reiter ?? "") ? (reiter as ReiterId) : neu ? "assistent" : "ueberblick",
  };
}

function anfangFuer(id: string) {
  const gespeichert = ladePlan(id);
  if (gespeichert) return gespeichert;
  if (id === NEUER_PLAN) return createDraftFinanzplan({ id: "plan-neu" });
  return null;
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [frische, setFrische] = useState(0);
  const [anfang, setAnfang] = useState(() => anfangFuer(route.id));
  const beispiel = beispielplanById(route.id);

  useEffect(() => {
    const onHash = () => {
      const naechste = readRoute();
      setRoute((bisher) => {
        if (bisher.id !== naechste.id) {
          setAnfang(anfangFuer(naechste.id));
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
      key={`${route.id}-${frische}`}
      anfangsplan={
        route.id === NEUER_PLAN
          ? (anfang ?? createDraftFinanzplan({ id: "plan-neu" }))
          : (anfang ?? beispiel.plan)
      }
      beispiele={beispielplaene}
      beispielId={route.id}
      reiter={route.reiter}
      onBeispiel={(id) => {
        setRoute((bisher) => ({ ...bisher, id }));
        setAnfang(anfangFuer(id));
        setFrische((wert) => wert + 1);
      }}
      onNeu={() => {
        setRoute({ id: NEUER_PLAN, reiter: "assistent" });
        setAnfang(anfangFuer(NEUER_PLAN));
        setFrische((wert) => wert + 1);
      }}
      onReiter={(reiter) => setRoute((bisher) => ({ ...bisher, reiter }))}
      onSpeichern={speichern}
      onZuruecksetzen={() => {
        loeschePlan(route.id);
        setAnfang(route.id === NEUER_PLAN ? createDraftFinanzplan({ id: "plan-neu" }) : null);
        setFrische((wert) => wert + 1);
      }}
    />
  );
}
