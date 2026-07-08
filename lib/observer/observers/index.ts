import { timelineObserver } from "./timeline";
import { workObserver } from "./work";
import { reviewObserver } from "./review";
import { communicationsObserver } from "./communications";
import { clientRequestObserver } from "./client-request";
import { deliverablesObserver } from "./deliverables";
import { businessHealthObserver } from "./business-health";
import { relationshipHealthObserver } from "./relationship-health";
import { operationalHealthObserver } from "./operational-health";
import { brainMemoryObserver } from "./brain-memory";
import type { ObserverModule } from "../types";

/**
 * Registered observer modules — each converts raw system state into observations.
 */
export const OBSERVER_MODULES: ObserverModule[] = [
  timelineObserver,
  workObserver,
  reviewObserver,
  communicationsObserver,
  clientRequestObserver,
  deliverablesObserver,
  businessHealthObserver,
  relationshipHealthObserver,
  operationalHealthObserver,
  brainMemoryObserver,
];

export function getObserverModule(id: string): ObserverModule | undefined {
  return OBSERVER_MODULES.find((module) => module.id === id);
}

export {
  timelineObserver,
  workObserver,
  reviewObserver,
  communicationsObserver,
  clientRequestObserver,
  deliverablesObserver,
  businessHealthObserver,
  relationshipHealthObserver,
  operationalHealthObserver,
  brainMemoryObserver,
};
