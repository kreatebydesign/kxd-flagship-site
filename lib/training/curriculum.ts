import { TRAINING_CATALOG } from "./catalog";
import type { TrainingPathDefinition } from "./types";

/** Read-only published curriculum — never mutates Payload. */
export function readPublishedCatalog(): TrainingPathDefinition[] {
  return TRAINING_CATALOG.filter((path) => path.status !== "archived");
}
