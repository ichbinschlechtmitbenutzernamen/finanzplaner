import { beispielCafe } from "./beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "./beispiel-einzelunternehmen.ts";
import { beispielElektro } from "./beispiel-elektro.ts";
import { beispielGmbh } from "./beispiel-gmbh.ts";
import type { Finanzplan } from "../domain/types.ts";

export interface Beispielplan {
  id: string;
  label: string;
  plan: Finanzplan;
}

export const beispielplaene: readonly Beispielplan[] = [
  { id: "elektro", label: "Blitzweg", plan: beispielElektro },
  { id: "cafe", label: "Café Leseecke", plan: beispielCafe },
  { id: "gmbh", label: "Hafenlicht GmbH", plan: beispielGmbh },
  { id: "nordlicht", label: "Grafikstudio", plan: beispielEinzelunternehmen },
];

export function beispielplanById(id: string): Beispielplan {
  return beispielplaene.find((item) => item.id === id) ?? beispielplaene[0];
}
