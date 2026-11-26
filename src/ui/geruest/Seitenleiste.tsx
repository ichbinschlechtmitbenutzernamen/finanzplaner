import { useId, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { STATION_LABEL, stationFaelltWeg } from "../../domain/assistent/stationen.ts";
import type { AssistentStation, Rechtsform } from "../../domain/types.ts";
import { ASSISTENT_STATIONEN } from "../../domain/types.ts";
import { HAUPTREITER, hauptVon, reiterVon, type HauptId, type ReiterId } from "../navigation.ts";
import type { PruefStufe } from "../../domain/checks/typen.ts";
import { Symbol, type SymbolName } from "./symbole.tsx";

const SCHLUESSEL = "finanzplaner.leiste";

const SCHIENE: readonly { id: HauptId | "start"; label: string; symbol: SymbolName }[] = [
  { id: "start", label: "Startseite", symbol: "start" },
  { id: "eingeben", label: "Eingeben", symbol: "eingeben" },
  { id: "ergebnisse", label: "Ergebnisse", symbol: "ergebnisse" },
  { id: "pruefen", label: "Prüfen", symbol: "pruefen" },
  { id: "szenarien", label: "Szenarien", symbol: "szenarien" },
];

export function leseLeisteOffen(): boolean {
  try {
    return localStorage.getItem(SCHLUESSEL) !== "zu";
  } catch {
    return true;
  }
}

export function merkeLeisteOffen(offen: boolean): void {
  localStorage.setItem(SCHLUESSEL, offen ? "auf" : "zu");
}

interface SeitenleisteProps {
  offen: boolean;
  onOffen: (offen: boolean) => void;
  reiter: ReiterId;
  onReiter: (id: ReiterId) => void;
  onHaupt: (id: HauptId) => void;
  onStation: (station: AssistentStation) => void;
  onStart?: () => void;
  station: AssistentStation | null;
  startwahl: boolean;
  stationenGesperrt: boolean;
  rechtsform: Rechtsform | undefined;
  meldungen: number;
  zaehler: PruefStufe | "keine";
}

/** Baum im Explorer-Stil. Eingeklappt bleibt eine Schiene mit den Hauptbereichen. */
export function Seitenleiste(props: SeitenleisteProps) {
  if (!props.offen) return <Schiene {...props} />;
  return <Baum {...props} />;
}

function Schiene({
  onOffen,
  reiter,
  onHaupt,
  onStart,
  startwahl,
  meldungen,
  zaehler,
}: SeitenleisteProps) {
  const aktiv = startwahl ? null : hauptVon(reiter).id;

  function waehle(id: (typeof SCHIENE)[number]["id"]) {
    if (id === "start") {
      onStart?.();
      return;
    }
    onHaupt(id);
  }

  function onTaste(event: ReactKeyboardEvent<HTMLElement>) {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    const knoepfe = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const position = knoepfe.indexOf(document.activeElement as HTMLButtonElement);
    if (position < 0) return;
    event.preventDefault();
    const letzter = knoepfe.length - 1;
    const naechste =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? letzter
          : event.key === "ArrowDown"
            ? Math.min(position + 1, letzter)
            : Math.max(position - 1, 0);
    knoepfe[naechste]?.focus();
  }

  return (
    <nav className="schiene" aria-label="Bereiche" onKeyDown={onTaste}>
      <button
        type="button"
        className="schiene-knopf"
        aria-label="Seitenleiste aufklappen"
        title="Seitenleiste aufklappen"
        onClick={() => onOffen(true)}
      >
        <Symbol name="aufklappen" />
      </button>
      {SCHIENE.map((eintrag) => {
        const aktuell = eintrag.id !== "start" && eintrag.id === aktiv;
        const name =
          eintrag.id === "pruefen"
            ? `Prüfen, ${meldungen} ${meldungen === 1 ? "Meldung" : "Meldungen"}`
            : eintrag.label;
        return (
          <button
            key={eintrag.id}
            type="button"
            className="schiene-knopf"
            aria-label={name}
            title={eintrag.label}
            aria-current={aktuell ? "page" : undefined}
            onClick={() => waehle(eintrag.id)}
          >
            <Symbol name={eintrag.symbol} />
            {eintrag.id === "pruefen" ? (
              <span className={`pruef-zaehler pruef-${zaehler} schiene-badge`} aria-hidden="true">
                {meldungen}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function Baum({
  onOffen,
  reiter,
  onReiter,
  onStation,
  onStart,
  station,
  startwahl,
  stationenGesperrt,
  rechtsform,
  meldungen,
  zaehler,
}: SeitenleisteProps) {
  const basis = useId();
  const [gruppen, setGruppen] = useState({ eingeben: true, ergebnisse: true });
  const ergebnisse = HAUPTREITER.find((eintrag) => eintrag.id === "ergebnisse");

  function umschalten(gruppe: "eingeben" | "ergebnisse") {
    setGruppen((bisher) => ({ ...bisher, [gruppe]: !bisher[gruppe] }));
  }

  function onTaste(event: ReactKeyboardEvent<HTMLDivElement>) {
    const taste = event.key;
    if (
      taste !== "ArrowDown" &&
      taste !== "ArrowUp" &&
      taste !== "ArrowRight" &&
      taste !== "ArrowLeft" &&
      taste !== "Home" &&
      taste !== "End" &&
      taste !== "Enter" &&
      taste !== " "
    ) {
      return;
    }
    const eintraege = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'),
    ].filter((knopf) => !knopf.disabled);
    const position = eintraege.indexOf(document.activeElement as HTMLButtonElement);
    if (position < 0) return;
    const knopf = eintraege[position];
    if (!knopf) return;
    event.preventDefault();
    if (taste === "ArrowDown" || taste === "ArrowUp" || taste === "Home" || taste === "End") {
      const letzter = eintraege.length - 1;
      const naechste =
        taste === "Home"
          ? 0
          : taste === "End"
            ? letzter
            : taste === "ArrowDown"
              ? Math.min(position + 1, letzter)
              : Math.max(position - 1, 0);
      eintraege[naechste]?.focus();
      return;
    }
    const gruppe = knopf.getAttribute("data-gruppe");
    if (taste === "ArrowRight") {
      if (gruppe === "eingeben" && !gruppen.eingeben) umschalten("eingeben");
      else if (gruppe === "ergebnisse" && !gruppen.ergebnisse) umschalten("ergebnisse");
      else eintraege[position + 1]?.focus();
      return;
    }
    if (taste === "ArrowLeft") {
      if (gruppe === "eingeben" && gruppen.eingeben) umschalten("eingeben");
      else if (gruppe === "ergebnisse" && gruppen.ergebnisse) umschalten("ergebnisse");
      else {
        for (let cursor = position - 1; cursor >= 0; cursor -= 1) {
          if (eintraege[cursor]?.hasAttribute("data-gruppe")) {
            eintraege[cursor]?.focus();
            break;
          }
        }
      }
      return;
    }
    if (gruppe === "eingeben" || gruppe === "ergebnisse") umschalten(gruppe);
    else knopf.click();
  }

  return (
    <nav className="seitenleiste" aria-label="Bereiche">
      <div className="seitenleiste-kopf">
        <span>Bereiche</span>
        <button
          type="button"
          className="leiste-pfeil"
          aria-label="Seitenleiste einklappen"
          title="Seitenleiste einklappen"
          onClick={() => onOffen(false)}
        >
          <Symbol name="einklappen" />
        </button>
      </div>
      <div className="baum" role="tree" aria-label="Bereiche" onKeyDown={onTaste}>
        <button type="button" role="treeitem" aria-level={1} onClick={() => onStart?.()}>
          Startseite
        </button>
        <button
          type="button"
          role="treeitem"
          aria-level={1}
          aria-expanded={gruppen.eingeben}
          data-gruppe="eingeben"
          onClick={() => umschalten("eingeben")}
        >
          Eingeben
        </button>
        {gruppen.eingeben ? (
          <div role="group" aria-label="Eingeben">
            {ASSISTENT_STATIONEN.map((eintrag) => {
              const weg = stationFaelltWeg(eintrag, rechtsform);
              const name = STATION_LABEL[eintrag];
              return (
                <button
                  key={eintrag}
                  type="button"
                  role="treeitem"
                  aria-level={2}
                  className="baum-kind"
                  aria-current={
                    !startwahl &&
                    !stationenGesperrt &&
                    reiter === "assistent" &&
                    station === eintrag
                      ? "page"
                      : undefined
                  }
                  disabled={stationenGesperrt}
                  onClick={() => onStation(eintrag)}
                >
                  {name}
                  {weg ? <small>entfällt</small> : null}
                </button>
              );
            })}
            <button
              type="button"
              role="treeitem"
              aria-level={2}
              className="baum-kind"
              aria-current={!startwahl && reiter === "eingaben" ? "page" : undefined}
              onClick={() => onReiter("eingaben")}
            >
              Alle Eingaben
            </button>
          </div>
        ) : null}
        <button
          type="button"
          role="treeitem"
          aria-level={1}
          aria-expanded={gruppen.ergebnisse}
          data-gruppe="ergebnisse"
          onClick={() => umschalten("ergebnisse")}
        >
          Ergebnisse
        </button>
        {gruppen.ergebnisse && ergebnisse ? (
          <div role="group" aria-label="Ergebnisse">
            {ergebnisse.kinder.map((id) => {
              const eintrag = reiterVon(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="treeitem"
                  aria-level={2}
                  aria-current={!startwahl && reiter === id ? "page" : undefined}
                  title={eintrag.fach ?? undefined}
                  aria-describedby={eintrag.fach ? `${basis}-${id}` : undefined}
                  onClick={() => onReiter(id)}
                >
                  {eintrag.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <button
          type="button"
          role="treeitem"
          aria-level={1}
          aria-current={!startwahl && reiter === "pruefung" ? "page" : undefined}
          onClick={() => onReiter("pruefung")}
        >
          Prüfen
          <span
            className={`pruef-zaehler pruef-${zaehler}`}
            aria-label={`${meldungen} ${meldungen === 1 ? "Meldung" : "Meldungen"}`}
          >
            {meldungen}
          </span>
        </button>
        <button
          type="button"
          role="treeitem"
          aria-level={1}
          aria-current={!startwahl && reiter === "szenarien" ? "page" : undefined}
          onClick={() => onReiter("szenarien")}
        >
          Szenarien
        </button>
      </div>
      <div className="sr-nur">
        {ergebnisse?.kinder.map((id) => {
          const eintrag = reiterVon(id);
          if (!eintrag.fach) return null;
          return (
            <span key={id} id={`${basis}-${id}`}>
              {eintrag.fach}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
