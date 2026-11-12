import regular from "@fontsource/roboto/files/roboto-latin-400-normal.woff?url";
import bold from "@fontsource/roboto/files/roboto-latin-700-normal.woff?url";
import { Font } from "@react-pdf/renderer";

let registriert = false;

/** Roboto liegt im Bundle. Der Browser lädt sie von der eigenen Seite, nicht aus dem Netz. */
export function registriereBrowserSchriften(): void {
  if (registriert) return;
  registriert = true;
  Font.register({
    family: "Finanz",
    fonts: [
      { src: regular, fontWeight: 400 },
      { src: bold, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((wort) => [wort]);
}
