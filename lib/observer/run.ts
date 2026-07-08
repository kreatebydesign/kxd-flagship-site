import "server-only";

import { loadObserverContext } from "./context";
import { getObservationHistory } from "./history";
import { OBSERVER_MODULES } from "./observers";
import {
  ObservationRegistry,
  setLatestRegistry,
  type ObservationRegistrySnapshot,
} from "./registry";
import type { Observation, ObservationRunResult, ObserverSource } from "./types";

/**
 * Run all registered observers and publish to the central registry.
 * The Observer only understands — it never recommends or automates.
 */
export async function runObserver(): Promise<ObservationRunResult> {
  const ctx = await loadObserverContext();
  const registry = new ObservationRegistry();

  for (const module of OBSERVER_MODULES) {
    const observations = module.observe(ctx);
    registry.publish(observations);
  }

  const generatedAt = ctx.observedAt;
  const all = registry.getAll();

  getObservationHistory().append(all, generatedAt);
  setLatestRegistry(registry);

  const sourceCounts = {} as Record<ObserverSource, number>;
  for (const obs of all) {
    sourceCounts[obs.source] = (sourceCounts[obs.source] ?? 0) + 1;
  }

  return {
    observations: all,
    generatedAt,
    observerCount: OBSERVER_MODULES.length,
    sourceCounts,
  };
}

/**
 * Run observer and return registry snapshot — convenience for Pulse preparation.
 */
export async function captureObservationSnapshot(): Promise<ObservationRegistrySnapshot> {
  await runObserver();
  const registry = new ObservationRegistry();
  const latest = (await import("./registry")).getLatestRegistry();
  return latest?.snapshot() ?? registry.snapshot();
}

export async function getLatestObservations(): Promise<Observation[]> {
  const latest = (await import("./registry")).getLatestRegistry();
  if (latest) return latest.getAll();

  const result = await runObserver();
  return result.observations;
}
