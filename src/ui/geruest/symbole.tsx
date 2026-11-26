export type SymbolName =
  | "neu"
  | "sichern"
  | "laden"
  | "undo"
  | "redo"
  | "pdf"
  | "excel"
  | "start"
  | "eingeben"
  | "ergebnisse"
  | "pruefen"
  | "szenarien"
  | "einklappen"
  | "aufklappen";

/** Kleine Strichsymbole. Die Farbe kommt über currentColor, ohne eigene Hex-Werte. */
export function Symbol({ name }: { name: SymbolName }) {
  return (
    <svg className="symbol" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {pfad(name)}
    </svg>
  );
}

function pfad(name: SymbolName) {
  if (name === "neu") {
    return (
      <>
        <path d="M3 2.5h6.2L13 6.2V13.5H3z" />
        <path d="M9 2.5V6h3.8" />
        <path d="M8 8.2v3.6M6.2 10h3.6" />
      </>
    );
  }
  if (name === "sichern") {
    return (
      <>
        <path d="M3 13.5V2.5h7.2L13 5.2V13.5z" />
        <path d="M5 2.5v3.2h5" />
        <path d="M5 13.5v-3.8h6V13.5" />
      </>
    );
  }
  if (name === "laden") {
    return (
      <>
        <path d="M2 7.2V4.2h4l1.4 1.4H14V13H2z" />
        <path d="M8 7.6v3.6M6.4 9.4 8 11.2l1.6-1.8" />
      </>
    );
  }
  if (name === "undo") {
    return (
      <>
        <path d="M6.2 4.2H3v3.2" />
        <path d="M3.4 7.2a5 5 0 1 1 .6 3.6" />
      </>
    );
  }
  if (name === "redo") {
    return (
      <>
        <path d="M9.8 4.2H13v3.2" />
        <path d="M12.6 7.2a5 5 0 1 0-.6 3.6" />
      </>
    );
  }
  if (name === "pdf") {
    return (
      <>
        <path d="M4 2.2h5.2L12.5 5.4V13.8H4z" />
        <path d="M9 2.2v3.3h3.4" />
        <path d="M6 10.2h4.2" />
      </>
    );
  }
  if (name === "excel") {
    return (
      <>
        <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="1" />
        <path d="M2.4 6.2h11.2M2.4 9.8h11.2M6.2 2.4v11.2M9.8 2.4v11.2" />
      </>
    );
  }
  if (name === "start") {
    return (
      <>
        <path d="M2.5 7.2 8 2.6l5.5 4.6" />
        <path d="M4.2 6.8V13.4h7.6V6.8" />
      </>
    );
  }
  if (name === "eingeben") {
    return (
      <>
        <path d="M9.2 3.2 12.6 6.6 6.2 13H2.8V9.6z" />
        <path d="M8 4.4 11.4 7.8" />
      </>
    );
  }
  if (name === "ergebnisse") {
    return (
      <>
        <path d="M2.5 13.2h11" />
        <path d="M4 13.2V8.2M8 13.2V4.2M12 13.2V6.4" />
      </>
    );
  }
  if (name === "pruefen") {
    return (
      <>
        <circle cx="8" cy="8" r="5.4" />
        <path d="M5.4 8.2 7.2 10l3.4-3.8" />
      </>
    );
  }
  if (name === "szenarien") {
    return (
      <>
        <path d="M8 2.4 13.2 5.2 8 8 2.8 5.2z" />
        <path d="M3.2 7.4 8 10.2l4.8-2.8" />
        <path d="M3.2 10 8 12.8l4.8-2.8" />
      </>
    );
  }
  if (name === "einklappen") {
    return <path d="M10.2 3.2 5.4 8l4.8 4.8" />;
  }
  return <path d="M5.8 3.2 10.6 8l-4.8 4.8" />;
}
