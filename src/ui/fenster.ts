/** Unter dieser Breite bleibt die bisherige, vereinfachte Ansicht. Ab 1024px das Desktop-Gerüst. */
export const MOBIL_BIS = "(max-width: 1023px)";

type FensterModus = "mobil" | "desktop";

/** Setzt matchMedia für Tests. „mobil“ trifft nur die Kompakt-Abfrage. */
export function setzeFensterbreite(modus: FensterModus): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: modus === "mobil" && query === MOBIL_BIS,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
}
