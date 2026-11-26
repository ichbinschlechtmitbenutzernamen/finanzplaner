import { useLayoutEffect, useRef, useState } from "react";
import type { LeistenKennzahl, LeistenZiel } from "../kennzahlen-leiste.ts";

interface StatusleisteProps {
  kennzahlen: readonly LeistenKennzahl[];
  leer: boolean;
  onKennzahl: (ziel: LeistenZiel) => void;
  variante: string;
  speicher: "Gesichert" | "Nicht gesichert";
}

/**
 * Kompakte Kennzahlen. Was nicht in die Zeile passt, steht hinter „mehr“.
 * Ohne gemessene Breite (Tests) bleiben die Kernkennzahlen sichtbar, der Rest im Popover.
 */
export function Statusleiste({
  kennzahlen,
  leer,
  onKennzahl,
  variante,
  speicher,
}: StatusleisteProps) {
  const links = useRef<HTMLDivElement>(null);
  const mass = useRef<HTMLDivElement>(null);
  const [sichtbar, setSichtbar] = useState<readonly string[] | null>(null);
  const [mehr, setMehr] = useState(false);
  const signatur = kennzahlen
    .map((kennzahl) => `${kennzahl.id}:${kennzahl.teile.map((teil) => teil.text).join("|")}`)
    .join(";");

  useLayoutEffect(() => {
    const bereich = links.current;
    const vorlage = mass.current;
    if (!bereich || !vorlage) return;
    const zeile = bereich;
    const massstab = vorlage;

    function messen() {
      const knoten = [...massstab.querySelectorAll<HTMLElement>("[data-mass]")];
      const breiten = knoten.map((knotenTeil) => knotenTeil.offsetWidth);
      const verfuegbar = zeile.clientWidth;
      const mehrBreite = massstab.querySelector<HTMLElement>("[data-mass-mehr]")?.offsetWidth ?? 48;
      const kern = kennzahlen.filter((kennzahl) => kennzahl.kern).map((kennzahl) => kennzahl.id);
      let ids: string[];
      if (verfuegbar === 0 || breiten.every((breite) => breite === 0)) {
        ids = kern;
      } else {
        const luecke = 6;
        const gesamt = breiten.reduce((summe, breite) => summe + breite + luecke, 0);
        if (gesamt <= verfuegbar) {
          ids = kennzahlen.map((kennzahl) => kennzahl.id);
        } else {
          ids = [];
          let summe = mehrBreite + 8;
          for (let cursor = 0; cursor < kennzahlen.length; cursor += 1) {
            const breite = (breiten[cursor] ?? 0) + luecke;
            if (summe + breite > verfuegbar) break;
            summe += breite;
            const kennzahl = kennzahlen[cursor];
            if (kennzahl) ids.push(kennzahl.id);
          }
          if (ids.length === 0 && kennzahlen[0]) ids.push(kennzahlen[0].id);
        }
      }
      setSichtbar((bisher) =>
        bisher && bisher.length === ids.length && bisher.every((id, stelle) => id === ids[stelle])
          ? bisher
          : ids,
      );
    }

    messen();
    if (typeof ResizeObserver !== "function") return;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(bereich);
    return () => beobachter.disconnect();
  }, [signatur, kennzahlen]);

  const ids =
    sichtbar ?? kennzahlen.filter((kennzahl) => kennzahl.kern).map((kennzahl) => kennzahl.id);
  const inline = kennzahlen.filter((kennzahl) => ids.includes(kennzahl.id));
  const rest = kennzahlen.filter((kennzahl) => !ids.includes(kennzahl.id));

  function waehle(kennzahl: LeistenKennzahl) {
    if (leer) return;
    onKennzahl(kennzahl.ziel);
    setMehr(false);
  }

  return (
    <footer className="statusleiste">
      <div className="status-links" ref={links} role="group" aria-label="Kennzahlen">
        <div className="status-mass" ref={mass} aria-hidden="true">
          {kennzahlen.map((kennzahl) => (
            <span key={kennzahl.id} data-mass="" className="status-kennzahl">
              <KennzahlText kennzahl={kennzahl} />
            </span>
          ))}
          <span data-mass-mehr="" className="status-mehr">
            mehr
          </span>
        </div>
        <div className="status-zeile">
          {inline.map((kennzahl) => (
            <KennzahlKnopf
              key={kennzahl.id}
              kennzahl={kennzahl}
              leer={leer}
              onWaehlen={() => waehle(kennzahl)}
            />
          ))}
          {rest.length > 0 ? (
            <button
              type="button"
              className="status-mehr"
              aria-expanded={mehr}
              aria-controls="status-mehr"
              onClick={() => setMehr((bisher) => !bisher)}
            >
              mehr
            </button>
          ) : null}
        </div>
        {mehr && rest.length > 0 ? (
          <div
            className="status-popover"
            id="status-mehr"
            role="group"
            aria-label="Weitere Kennzahlen"
          >
            {rest.map((kennzahl) => (
              <KennzahlKnopf
                key={kennzahl.id}
                kennzahl={kennzahl}
                leer={leer}
                onWaehlen={() => waehle(kennzahl)}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="status-rechts">
        <span className="status-variante">Angezeigte Variante: {variante}</span>
        <span className={speicher === "Gesichert" ? "status-gesichert" : "status-ungesichert"}>
          {speicher}
        </span>
      </div>
    </footer>
  );
}

function KennzahlKnopf({
  kennzahl,
  leer,
  onWaehlen,
}: {
  kennzahl: LeistenKennzahl;
  leer: boolean;
  onWaehlen: () => void;
}) {
  const wert = kennzahl.teile.map((teil) => teil.text).join(", ");
  return (
    <button
      type="button"
      className="status-kennzahl"
      title={kennzahl.title}
      aria-label={`${kennzahl.name}: ${wert}`}
      aria-disabled={leer || undefined}
      onClick={onWaehlen}
    >
      <KennzahlText kennzahl={kennzahl} />
    </button>
  );
}

function KennzahlText({ kennzahl }: { kennzahl: LeistenKennzahl }) {
  return (
    <>
      <span className="status-name">{kennzahl.name}</span>
      <span className="status-wert">
        {kennzahl.teile.map((teil, index) => (
          <span key={`${kennzahl.id}-${index}`}>
            {index > 0 ? <span className="status-trenner"> · </span> : null}
            <span className={teil.ton ? `status-${teil.ton}` : undefined}>{teil.text}</span>
          </span>
        ))}
      </span>
    </>
  );
}
