import { useEffect, useRef, type ReactNode } from "react";

const FOKUS_SELEKTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
].join(", ");

function fokussierbare(wurzel: HTMLElement): HTMLElement[] {
  return [...wurzel.querySelectorAll<HTMLElement>(FOKUS_SELEKTOR)].filter((element) => {
    if (element.closest("[hidden]")) return false;
    const stil = window.getComputedStyle(element);
    return stil.display !== "none" && stil.visibility !== "hidden";
  });
}

function anfangsZiel(wurzel: HTMLElement): HTMLElement | null {
  const markiert = wurzel.querySelector<HTMLElement>("[data-anfangs-fokus]");
  if (markiert && !markiert.hasAttribute("disabled")) return markiert;
  return fokussierbare(wurzel)[0] ?? null;
}

/** Auslöser in einem geschlossenen Menü bekommt den Fokus nicht zurück, sonst klappt es wieder auf. */
function darfFokusZurueck(element: HTMLElement): boolean {
  if (!document.contains(element)) return false;
  if (element.closest("details:not([open])")) return false;
  const stil = window.getComputedStyle(element);
  return stil.display !== "none" && stil.visibility !== "hidden";
}

/**
 * Gemeinsamer Dialog.
 * Beim Öffnen liegt der Fokus auf dem Element mit `data-anfangs-fokus`, sonst auf dem ersten Feld.
 * Tab bleibt im Dialog, Escape schließt, beim Schließen geht der Fokus zum Auslöser zurück.
 */
export function Dialog({
  titelId,
  beschreibungId,
  klasse,
  onSchliessen,
  escapeAktiv = true,
  hintergrundSchliesst = false,
  children,
}: {
  titelId: string;
  beschreibungId?: string;
  klasse?: string;
  onSchliessen: () => void;
  escapeAktiv?: boolean;
  hintergrundSchliesst?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const schliessenRef = useRef(onSchliessen);
  const escapeRef = useRef(escapeAktiv);

  useEffect(() => {
    schliessenRef.current = onSchliessen;
    escapeRef.current = escapeAktiv;
  });

  useEffect(() => {
    const wurzel = ref.current;
    const vorher = document.activeElement;
    const ausloeser =
      vorher instanceof HTMLElement && wurzel && !wurzel.contains(vorher) ? vorher : null;

    function onKey(event: KeyboardEvent) {
      if (!wurzel) return;
      if (event.key === "Escape") {
        if (!escapeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        schliessenRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const liste = fokussierbare(wurzel);
      if (liste.length === 0) {
        event.preventDefault();
        return;
      }
      const erste = liste[0]!;
      const letzte = liste[liste.length - 1]!;
      const aktiv = document.activeElement;
      const innen = aktiv instanceof Node && wurzel.contains(aktiv);
      if (event.shiftKey) {
        if (!innen || aktiv === erste) {
          event.preventDefault();
          letzte.focus();
        }
      } else if (!innen || aktiv === letzte) {
        event.preventDefault();
        erste.focus();
      }
    }

    function onFocusIn(event: FocusEvent) {
      if (!wurzel) return;
      const ziel = event.target;
      if (ziel instanceof Node && wurzel.contains(ziel)) return;
      const naechstes = anfangsZiel(wurzel) ?? fokussierbare(wurzel)[0];
      if (naechstes) naechstes.focus();
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    if (wurzel) anfangsZiel(wurzel)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      if (ausloeser && darfFokusZurueck(ausloeser)) ausloeser.focus();
    };
  }, []);

  return (
    <div
      className="dialog-hintergrund"
      onMouseDown={(event) => {
        if (hintergrundSchliesst && event.target === event.currentTarget) schliessenRef.current();
      }}
    >
      <div
        ref={ref}
        className={klasse ? `dialog ${klasse}` : "dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        aria-describedby={beschreibungId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
