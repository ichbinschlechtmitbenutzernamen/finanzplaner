import { useCallback, useEffect, useState } from "react";
import { zeigeStartauswahl } from "./domain/assistent/stationen.ts";
import { createDraftFinanzplan } from "./domain/empty-plan.ts";
import type { Finanzplan } from "./domain/types.ts";
import { beispielplaene, beispielplanById } from "./fixtures/index.ts";
import { PlanArbeitsflaeche, type ReiterId } from "./ui/PlanArbeitsflaeche.tsx";
import { anzeigename } from "./ui/plan-datei.ts";
import { NEUER_PLAN, gleicheRoute, hashFuer, parseRoute, type PlanReiter } from "./ui/route.ts";
import { Startseite } from "./ui/Startseite.tsx";
import { loescheSicherungsstand, merkeSicherung } from "./ui/sicherung.ts";
import { ladePlan, loeschePlan, speicherePlan } from "./ui/speicher.ts";

function anfangFuer(id: string): Finanzplan | null {
  const gespeichert = ladePlan(id);
  if (gespeichert) return gespeichert;
  if (id === NEUER_PLAN) return createDraftFinanzplan({ id: "plan-neu" });
  return null;
}

function reiterNachStand(plan: Finanzplan): PlanReiter {
  return zeigeStartauswahl(plan) ? "assistent" : "ueberblick";
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [frische, setFrische] = useState(0);
  const [anfang, setAnfang] = useState(() => (route.art === "plan" ? anfangFuer(route.id) : null));

  useEffect(() => {
    const onHash = () => {
      const naechste = parseRoute(window.location.hash);
      setRoute((bisher) => {
        if (gleicheRoute(bisher, naechste)) return bisher;
        if (naechste.art === "plan" && (bisher.art !== "plan" || bisher.id !== naechste.id)) {
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
    const ziel = hashFuer(route);
    if (window.location.hash.replace(/^#/, "") !== ziel) window.location.hash = ziel;
  }, [route]);

  const planSlot = route.art === "plan" ? route.id : null;
  const speichern = useCallback(
    (plan: Finanzplan) => {
      if (!planSlot) return;
      speicherePlan(planSlot, plan);
    },
    [planSlot],
  );

  function oeffne(id: string, plan: Finanzplan | null, reiter: ReiterId) {
    setRoute({ art: "plan", id, reiter });
    setAnfang(plan);
    setFrische((wert) => wert + 1);
  }

  function neuenPlanAnlegen() {
    loeschePlan(NEUER_PLAN);
    loescheSicherungsstand(NEUER_PLAN);
    oeffne(NEUER_PLAN, createDraftFinanzplan({ id: "plan-neu" }), "assistent");
  }

  function weiterMitPlan() {
    const gespeichert = ladePlan(NEUER_PLAN);
    if (!gespeichert) return;
    oeffne(NEUER_PLAN, gespeichert, reiterNachStand(gespeichert));
  }

  function planGeladen(plan: Finanzplan) {
    speicherePlan(NEUER_PLAN, plan);
    merkeSicherung(NEUER_PLAN, new Date().toISOString());
    oeffne(NEUER_PLAN, plan, reiterNachStand(plan));
  }

  if (route.art === "start") {
    const gespeichert = ladePlan(NEUER_PLAN);
    return (
      <Startseite
        beispiele={beispielplaene}
        eigenerPlan={
          gespeichert
            ? { name: anzeigename(gespeichert), geaendertAm: gespeichert.geaendertAm }
            : null
        }
        onWeiter={weiterMitPlan}
        onNeu={neuenPlanAnlegen}
        onBeispiel={(id) => oeffne(id, anfangFuer(id), "ueberblick")}
        onLaden={planGeladen}
      />
    );
  }

  const planId = route.id;

  return (
    <PlanArbeitsflaeche
      key={`${planId}-${frische}`}
      anfangsplan={
        planId === NEUER_PLAN
          ? (anfang ?? createDraftFinanzplan({ id: "plan-neu" }))
          : (anfang ?? beispielplanById(planId).plan)
      }
      beispiele={beispielplaene}
      beispielId={planId}
      reiter={route.reiter}
      onBeispiel={(id) => oeffne(id, anfangFuer(id), route.reiter)}
      onNeu={() => oeffne(NEUER_PLAN, anfangFuer(NEUER_PLAN), "assistent")}
      onStart={() => setRoute({ art: "start" })}
      onReiter={(reiter) => setRoute({ art: "plan", id: planId, reiter })}
      onSpeichern={speichern}
      onZuruecksetzen={() => {
        loeschePlan(planId);
        loescheSicherungsstand(planId);
        setAnfang(planId === NEUER_PLAN ? createDraftFinanzplan({ id: "plan-neu" }) : null);
        setFrische((wert) => wert + 1);
      }}
      onPlanUebernehmen={planGeladen}
    />
  );
}
