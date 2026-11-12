import { createRequire } from "node:module";
import { Font } from "@react-pdf/renderer";

const require = createRequire(import.meta.url);
let registriert = false;

/** Dieselben Roboto-Dateien wie im Browser, hier als Dateipfad für die Beispiel-PDFs. */
export function registriereNodeSchriften(): void {
  if (registriert) return;
  registriert = true;
  Font.register({
    family: "Finanz",
    fonts: [
      {
        src: require.resolve("@fontsource/roboto/files/roboto-latin-400-normal.woff"),
        fontWeight: 400,
      },
      {
        src: require.resolve("@fontsource/roboto/files/roboto-latin-700-normal.woff"),
        fontWeight: 700,
      },
    ],
  });
  Font.registerHyphenationCallback((wort) => [wort]);
}
