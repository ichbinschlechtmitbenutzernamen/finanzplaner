import { useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { Finanzplan } from "../domain/types.ts";
import { lesePlanJson, meldungZuDateiFehler } from "./plan-datei.ts";

/** Liest eine JSON-Datei. Liegt schon ein eigener Plan vor, wird erst nachgefragt. */
export function usePlanDatei(ersetzt: boolean, onUebernehmen: (plan: Finanzplan) => void) {
  const eingabe = useRef<HTMLInputElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [bereit, setBereit] = useState<Finanzplan | null>(null);

  function oeffnen() {
    setFehler(null);
    eingabe.current?.click();
  }

  async function beiDatei(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const plan = lesePlanJson(await file.text());
      if (ersetzt) setBereit(plan);
      else onUebernehmen(plan);
    } catch (ursache) {
      setBereit(null);
      setFehler(meldungZuDateiFehler(ursache));
    }
  }

  function abbrechen() {
    setBereit(null);
  }

  function bestaetigen() {
    if (!bereit) return;
    const plan = bereit;
    setBereit(null);
    onUebernehmen(plan);
  }

  return { eingabe, fehler, bereit, oeffnen, beiDatei, abbrechen, bestaetigen };
}

export function PlanDateiEingabe({
  eingabe,
  onDatei,
}: {
  eingabe: RefObject<HTMLInputElement | null>;
  onDatei: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      ref={eingabe}
      className="datei-eingabe"
      type="file"
      accept=".json,application/json"
      aria-hidden="true"
      tabIndex={-1}
      onChange={(event) => {
        void onDatei(event);
      }}
    />
  );
}
