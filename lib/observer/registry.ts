import type { Observation, ObserverSource } from "./types";

/**
 * Central observation registry — single source of truth for business awareness.
 * Observers publish here. Nothing consumes during Phase 17A except history + pulse API.
 */
export class ObservationRegistry {
  private observations: Observation[] = [];
  private bySource = new Map<ObserverSource, Observation[]>();
  private byFingerprint = new Map<string, Observation>();
  private byClient = new Map<number, Observation[]>();

  publish(observations: Observation[]): void {
    for (const obs of observations) {
      this.observations.push(obs);
      this.byFingerprint.set(obs.fingerprint, obs);

      const sourceList = this.bySource.get(obs.source) ?? [];
      sourceList.push(obs);
      this.bySource.set(obs.source, sourceList);

      if (obs.relatedClientId != null) {
        const clientList = this.byClient.get(obs.relatedClientId) ?? [];
        clientList.push(obs);
        this.byClient.set(obs.relatedClientId, clientList);
      }
    }
  }

  getAll(): Observation[] {
    return [...this.observations];
  }

  getBySource(source: ObserverSource): Observation[] {
    return [...(this.bySource.get(source) ?? [])];
  }

  getByClient(clientId: number): Observation[] {
    return [...(this.byClient.get(clientId) ?? [])];
  }

  getByFingerprint(fingerprint: string): Observation | undefined {
    return this.byFingerprint.get(fingerprint);
  }

  count(): number {
    return this.observations.length;
  }

  sourceCounts(): Record<ObserverSource, number> {
    const counts = {} as Record<ObserverSource, number>;
    for (const [source, list] of this.bySource) {
      counts[source] = list.length;
    }
    return counts;
  }

  snapshot(): ObservationRegistrySnapshot {
    return {
      observations: this.getAll(),
      count: this.count(),
      sourceCounts: this.sourceCounts(),
      capturedAt: new Date().toISOString(),
    };
  }
}

export interface ObservationRegistrySnapshot {
  observations: Observation[];
  count: number;
  sourceCounts: Partial<Record<ObserverSource, number>>;
  capturedAt: string;
}

/** Process-wide registry singleton for the latest observation run */
let latestRegistry: ObservationRegistry | null = null;

export function setLatestRegistry(registry: ObservationRegistry): void {
  latestRegistry = registry;
}

export function getLatestRegistry(): ObservationRegistry | null {
  return latestRegistry;
}
