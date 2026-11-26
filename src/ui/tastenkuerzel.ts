/** Globale Tastenkürzel. Auf dem Mac steht Cmd an der Stelle von Strg. Strg+N bleibt frei. */

export type KuerzelAktion =
  | "sichern"
  | "laden"
  | "undo"
  | "redo"
  | "pdf"
  | "excel"
  | "leiste"
  | "hilfe"
  | "start"
  | "eingeben"
  | "ergebnisse"
  | "pruefen"
  | "szenarien";

export interface KuerzelZeile {
  aktion: string;
  kuerzel: string;
}

export function istMac(
  plattform: string = navigator.platform,
  agent: string = navigator.userAgent,
): boolean {
  return /mac|iphone|ipad|ipod/i.test(`${plattform} ${agent}`);
}

export function modTaste(mac = istMac()): "Cmd" | "Strg" {
  return mac ? "Cmd" : "Strg";
}

/** Sichtbares Kürzel in Menü und Tooltip. Wiederholen zeigt im Menü das übliche Strg+Y. */
export function kuerzelText(id: string, mac = istMac()): string {
  const mod = modTaste(mac);
  switch (id) {
    case "sichern":
      return `${mod}+S`;
    case "laden":
      return `${mod}+O`;
    case "undo":
      return `${mod}+Z`;
    case "redo":
      return `${mod}+Y`;
    case "pdf":
      return `${mod}+P`;
    case "excel":
      return `${mod}+E`;
    case "leiste":
      return `${mod}+B`;
    case "kurz":
      return "F1";
    default:
      return "";
  }
}

/** Tooltip der Werkzeugleiste. Neu bleibt ohne Kürzel. Wiederholen nennt beide Wege. */
export function werkzeugTitel(name: string, id: string, mac = istMac()): string {
  if (id === "redo") {
    const mod = modTaste(mac);
    return `${name} (${mod}+Y, ${mod}+Umschalt+Z)`;
  }
  const kuerzel = kuerzelText(id, mac);
  return kuerzel ? `${name} (${kuerzel})` : name;
}

export function kuerzelTabelle(mac = istMac()): readonly KuerzelZeile[] {
  const mod = modTaste(mac);
  return [
    { aktion: "Plan sichern", kuerzel: `${mod}+S` },
    { aktion: "Plan laden", kuerzel: `${mod}+O` },
    { aktion: "Rückgängig", kuerzel: `${mod}+Z` },
    { aktion: "Wiederholen", kuerzel: `${mod}+Y, ${mod}+Umschalt+Z` },
    { aktion: "PDF erstellen", kuerzel: `${mod}+P` },
    { aktion: "Excel erstellen", kuerzel: `${mod}+E` },
    { aktion: "Seitenleiste ein/aus", kuerzel: `${mod}+B` },
    { aktion: "Kurzanleitung", kuerzel: "F1" },
    { aktion: "Startseite", kuerzel: "Alt+1" },
    { aktion: "Eingeben", kuerzel: "Alt+2" },
    { aktion: "Ergebnisse", kuerzel: "Alt+3" },
    { aktion: "Prüfen", kuerzel: "Alt+4" },
    { aktion: "Szenarien", kuerzel: "Alt+5" },
    { aktion: "Menüs und Dialoge schließen", kuerzel: "Esc" },
  ];
}

function istEingabefeld(ziel: EventTarget | null): boolean {
  return ziel instanceof HTMLInputElement || ziel instanceof HTMLTextAreaElement;
}

function hauptModifikator(event: KeyboardEvent, mac: boolean): boolean {
  if (event.altKey) return false;
  if (mac) return event.metaKey && !event.ctrlKey;
  return event.ctrlKey && !event.metaKey;
}

function altZiffer(event: KeyboardEvent): string | null {
  if (/^Digit[1-5]$/.test(event.code)) return event.code.slice("Digit".length);
  if (/^[1-5]$/.test(event.key)) return event.key;
  return null;
}

/**
 * Liefert die Aktion, wenn das Ereignis eines der belegten Kürzel ist.
 * In Eingabefeldern bleiben Strg+Z und Strg+Y dem Browser (Feld-Undo und Feld-Redo).
 * Strg+N ist absichtlich frei.
 */
export function aktionFuerTaste(event: KeyboardEvent, mac = istMac()): KuerzelAktion | null {
  if (event.repeat || event.isComposing) return null;
  const taste = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && taste === "F1") {
    return "hilfe";
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    switch (altZiffer(event)) {
      case "1":
        return "start";
      case "2":
        return "eingeben";
      case "3":
        return "ergebnisse";
      case "4":
        return "pruefen";
      case "5":
        return "szenarien";
      default:
        return null;
    }
  }

  if (!hauptModifikator(event, mac)) return null;
  if (event.shiftKey) return taste === "z" ? "redo" : null;

  if ((taste === "z" || taste === "y") && istEingabefeld(event.target)) return null;

  switch (taste) {
    case "s":
      return "sichern";
    case "o":
      return "laden";
    case "z":
      return "undo";
    case "y":
      return "redo";
    case "p":
      return "pdf";
    case "e":
      return "excel";
    case "b":
      return "leiste";
    default:
      return null;
  }
}
