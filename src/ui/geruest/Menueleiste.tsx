import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export interface MenueEintrag {
  id: string;
  label: string;
  disabled?: boolean;
  /** Öffnet ein Untermenü statt einer Aktion. */
  unter?: "beispiele" | "variante";
  trennung?: boolean;
  onWaehlen?: () => void;
}

interface MenueSpalte {
  id: "datei" | "bearbeiten" | "ansicht" | "hilfe";
  label: string;
  eintraege: readonly MenueEintrag[];
}

interface Offen {
  menu: MenueSpalte["id"];
  unter: MenueEintrag["unter"] | null;
}

interface MenueleisteProps {
  spalten: readonly MenueSpalte[];
  beispiele: readonly MenueEintrag[];
  varianten: readonly MenueEintrag[];
}

/**
 * Menüleiste mit den Rollen menubar, menu und menuitem.
 * Pfeile bewegen, Enter und Leertaste lösen aus, Escape schließt.
 * Der Fokus kehrt zum Auslöser zurück. Die Kürzelspalte bleibt leer, bis Paket H sie füllt.
 */
export function Menueleiste({ spalten, beispiele, varianten }: MenueleisteProps) {
  const [offen, setOffen] = useState<Offen | null>(null);
  const [index, setIndex] = useState(0);
  const wurzel = useRef<HTMLDivElement>(null);
  const knopf = useRef<Record<string, HTMLButtonElement | null>>({});
  const fokusItem = useRef<string | null>(null);

  function unterEintraege(unter: NonNullable<MenueEintrag["unter"]>): readonly MenueEintrag[] {
    return unter === "beispiele" ? beispiele : varianten;
  }

  useEffect(() => {
    if (!offen) return;
    const menuId = offen.unter
      ? `menu-${offen.unter === "beispiele" ? "beispiele" : "variante"}`
      : `menu-${offen.menu}`;
    const menu = document.getElementById(menuId);
    const gemerkt = fokusItem.current;
    fokusItem.current = null;
    if (gemerkt) {
      menu?.querySelector<HTMLButtonElement>(`[data-menue="${CSS.escape(gemerkt)}"]`)?.focus();
      return;
    }
    menu?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [offen]);

  useEffect(() => {
    if (!offen) return;
    function zu(event: MouseEvent) {
      if (wurzel.current && event.target instanceof Node && wurzel.current.contains(event.target)) {
        return;
      }
      setOffen(null);
    }
    document.addEventListener("mousedown", zu);
    return () => document.removeEventListener("mousedown", zu);
  }, [offen]);

  function oeffne(menu: MenueSpalte["id"], unter: Offen["unter"] = null) {
    fokusItem.current = null;
    setOffen({ menu, unter });
    setIndex(spalten.findIndex((spalte) => spalte.id === menu));
  }

  function schliesse(fokusZurueck: boolean) {
    const menu = offen?.menu;
    setOffen(null);
    if (fokusZurueck && menu) {
      queueMicrotask(() => knopf.current[`leiste-${menu}`]?.focus());
    }
  }

  function schliesseUnter() {
    if (!offen?.unter) return;
    fokusItem.current = offen.unter === "beispiele" ? "beispiele" : "variante";
    setOffen({ menu: offen.menu, unter: null });
  }

  function aktiviere(eintrag: MenueEintrag) {
    if (eintrag.disabled) return;
    if (eintrag.unter) {
      fokusItem.current = null;
      setOffen((bisher) => (bisher ? { menu: bisher.menu, unter: eintrag.unter ?? null } : bisher));
      return;
    }
    const menu = offen?.menu;
    setOffen(null);
    eintrag.onWaehlen?.();
    if (menu) queueMicrotask(() => knopf.current[`leiste-${menu}`]?.focus());
  }

  function aufMenuleiste(event: ReactKeyboardEvent<HTMLButtonElement>, id: MenueSpalte["id"]) {
    const position = spalten.findIndex((spalte) => spalte.id === id);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const naechste = spalten[(position + delta + spalten.length) % spalten.length];
      if (!naechste) return;
      setIndex(spalten.findIndex((spalte) => spalte.id === naechste.id));
      knopf.current[`leiste-${naechste.id}`]?.focus();
      if (offen) oeffne(naechste.id);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const naechste = event.key === "Home" ? spalten[0] : spalten[spalten.length - 1];
      if (!naechste) return;
      setIndex(spalten.findIndex((spalte) => spalte.id === naechste.id));
      knopf.current[`leiste-${naechste.id}`]?.focus();
      if (offen) oeffne(naechste.id);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      oeffne(id);
      return;
    }
    if (event.key === "Escape" && offen) {
      event.preventDefault();
      schliesse(true);
    }
  }

  function aufEintrag(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    liste: readonly MenueEintrag[],
    eintrag: MenueEintrag,
    unter: boolean,
  ) {
    const frei = liste.filter((kandidat) => !kandidat.disabled);
    const position = frei.findIndex((kandidat) => kandidat.id === eintrag.id);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (frei.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const naechste = frei[(position + delta + frei.length) % frei.length];
      if (!naechste) return;
      knopf.current[unter ? `unter-${naechste.id}` : naechste.id]?.focus();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const naechste = event.key === "Home" ? frei[0] : frei[frei.length - 1];
      if (!naechste) return;
      knopf.current[unter ? `unter-${naechste.id}` : naechste.id]?.focus();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!unter && eintrag.unter) {
        aktiviere(eintrag);
        return;
      }
      if (!unter && offen) {
        const positionLeiste = spalten.findIndex((spalte) => spalte.id === offen.menu);
        const naechste = spalten[(positionLeiste + 1) % spalten.length];
        if (naechste) oeffne(naechste.id);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (unter) {
        schliesseUnter();
        return;
      }
      if (offen) {
        const positionLeiste = spalten.findIndex((spalte) => spalte.id === offen.menu);
        const naechste = spalten[(positionLeiste - 1 + spalten.length) % spalten.length];
        if (naechste) oeffne(naechste.id);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (unter) schliesseUnter();
      else schliesse(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      aktiviere(eintrag);
    }
  }

  return (
    <div className="menueleiste" role="menubar" aria-label="Menü" ref={wurzel}>
      {spalten.map((spalte, position) => {
        const geoeffnet = offen?.menu === spalte.id;
        return (
          <div className="menue-punkt" key={spalte.id}>
            <button
              type="button"
              role="menuitem"
              className="menue-ausloeser"
              ref={(element) => {
                knopf.current[`leiste-${spalte.id}`] = element;
              }}
              aria-haspopup="menu"
              aria-expanded={geoeffnet}
              aria-controls={geoeffnet ? `menu-${spalte.id}` : undefined}
              tabIndex={index === position ? 0 : -1}
              onClick={() => {
                if (geoeffnet && !offen?.unter) schliesse(false);
                else oeffne(spalte.id);
              }}
              onKeyDown={(event) => aufMenuleiste(event, spalte.id)}
            >
              {spalte.label}
            </button>
            {geoeffnet ? (
              <div
                className="menue-popup"
                role="menu"
                id={`menu-${spalte.id}`}
                aria-label={spalte.label}
              >
                {spalte.eintraege.map((eintrag) => (
                  <MenuePunkt
                    key={eintrag.id}
                    eintrag={eintrag}
                    unterOffen={offen?.unter === eintrag.unter && eintrag.unter != null}
                    setzenRef={(element) => {
                      knopf.current[eintrag.id] = element;
                    }}
                    onTaste={(event) => aufEintrag(event, spalte.eintraege, eintrag, false)}
                    onAktivieren={() => aktiviere(eintrag)}
                  >
                    {eintrag.unter && offen?.unter === eintrag.unter ? (
                      <div
                        className="menue-unter"
                        role="menu"
                        aria-label={eintrag.label}
                        id={`menu-${eintrag.id}`}
                      >
                        {unterEintraege(eintrag.unter).map((kind) => (
                          <MenuePunkt
                            key={kind.id}
                            eintrag={kind}
                            setzenRef={(element) => {
                              knopf.current[`unter-${kind.id}`] = element;
                            }}
                            onTaste={(event) =>
                              aufEintrag(
                                event,
                                unterEintraege(eintrag.unter ?? "beispiele"),
                                kind,
                                true,
                              )
                            }
                            onAktivieren={() => aktiviere(kind)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </MenuePunkt>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MenuePunkt({
  eintrag,
  unterOffen = false,
  setzenRef,
  onTaste,
  onAktivieren,
  children,
}: {
  eintrag: MenueEintrag;
  unterOffen?: boolean;
  setzenRef: (element: HTMLButtonElement | null) => void;
  onTaste: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onAktivieren: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={eintrag.unter ? "menue-unter-wrap" : undefined}>
      <button
        type="button"
        role="menuitem"
        className={eintrag.trennung ? "menue-eintrag menue-trennung" : "menue-eintrag"}
        data-menue={eintrag.id}
        ref={(element) => setzenRef(element)}
        disabled={eintrag.disabled}
        aria-haspopup={eintrag.unter ? "menu" : undefined}
        aria-expanded={eintrag.unter ? unterOffen : undefined}
        aria-controls={eintrag.unter && unterOffen ? `menu-${eintrag.id}` : undefined}
        onKeyDown={onTaste}
        onClick={onAktivieren}
      >
        <span>{eintrag.label}</span>
        <span className="menue-kuerzel" aria-hidden="true" />
        {eintrag.unter ? (
          <span className="menue-pfeil" aria-hidden="true">
            ›
          </span>
        ) : null}
      </button>
      {children}
    </div>
  );
}

export type { MenueSpalte };
