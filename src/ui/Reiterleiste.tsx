import type { KeyboardEvent, ReactNode } from "react";

export interface ReiterKnopf {
  id: string;
  buttonId: string;
  ausgewaehlt: boolean;
  /** Genau ein Reiter je Leiste steht in der Tab-Reihenfolge. */
  tabStop: boolean;
  className?: string;
  onWaehlen: () => void;
  children: ReactNode;
}

/** Eine Reiterleiste. Pfeiltasten, Pos1 und Ende wechseln innerhalb dieser Ebene. */
export function Reiterleiste({
  label,
  className,
  eintraege,
}: {
  label: string;
  className: string;
  eintraege: readonly ReiterKnopf[];
}) {
  function onTaste(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    const ziel = event.target;
    if (!(ziel instanceof HTMLElement) || ziel.getAttribute("role") !== "tab") return;
    const index = eintraege.findIndex((eintrag) => eintrag.buttonId === ziel.id);
    if (index < 0) return;
    event.preventDefault();
    const letzter = eintraege.length - 1;
    const naechster =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? letzter
          : event.key === "ArrowRight"
            ? (index + 1) % eintraege.length
            : (index - 1 + eintraege.length) % eintraege.length;
    const eintrag = eintraege[naechster];
    if (!eintrag) return;
    eintrag.onWaehlen();
    document.getElementById(eintrag.buttonId)?.focus();
  }

  return (
    <div
      className={className}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onTaste}
    >
      {eintraege.map((eintrag) => (
        <button
          key={eintrag.id}
          type="button"
          role="tab"
          id={eintrag.buttonId}
          className={eintrag.className}
          aria-selected={eintrag.ausgewaehlt}
          aria-controls="plan-ansicht"
          tabIndex={eintrag.tabStop ? 0 : -1}
          onClick={eintrag.onWaehlen}
        >
          {eintrag.children}
        </button>
      ))}
    </div>
  );
}
