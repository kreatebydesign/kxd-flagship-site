import type { Observation } from "./types";

const MAX_HISTORY = 5000;

/**
 * Append-only observation history.
 * Preserves normalized observations for future Pulse and analytics.
 * No analytics implemented in Phase 17A — only preservation and query.
 */
export class ObservationHistory {
  private entries: Observation[] = [];
  private fingerprintIndex = new Map<string, Observation[]>();
  private runTimestamps: string[] = [];

  append(observations: Observation[], runAt: string): void {
    this.runTimestamps.push(runAt);

    for (const obs of observations) {
      this.entries.push(obs);
      const existing = this.fingerprintIndex.get(obs.fingerprint) ?? [];
      existing.push(obs);
      this.fingerprintIndex.set(obs.fingerprint, existing);
    }

    if (this.entries.length > MAX_HISTORY) {
      const trimCount = this.entries.length - MAX_HISTORY;
      const removed = this.entries.splice(0, trimCount);
      for (const obs of removed) {
        const list = this.fingerprintIndex.get(obs.fingerprint);
        if (list) {
          const idx = list.indexOf(obs);
          if (idx >= 0) list.splice(idx, 1);
          if (list.length === 0) this.fingerprintIndex.delete(obs.fingerprint);
        }
      }
    }
  }

  getAll(): Observation[] {
    return [...this.entries];
  }

  /** Observations recorded since a given ISO timestamp */
  since(iso: string): Observation[] {
    const ts = new Date(iso).getTime();
    return this.entries.filter((obs) => new Date(obs.recordedAt).getTime() >= ts);
  }

  /** Fingerprints that appeared more than once */
  repeated(): Array<{ fingerprint: string; count: number; latest: Observation }> {
    const result: Array<{ fingerprint: string; count: number; latest: Observation }> = [];
    for (const [fingerprint, list] of this.fingerprintIndex) {
      if (list.length > 1) {
        result.push({
          fingerprint,
          count: list.length,
          latest: list[list.length - 1]!,
        });
      }
    }
    return result.sort((a, b) => b.count - a.count);
  }

  /** Fingerprints seen only once — potentially novel */
  novel(sinceRunCount = 1): Observation[] {
    const seen = new Set<string>();
    const novel: Observation[] = [];

    for (const obs of [...this.entries].reverse()) {
      const prior = this.fingerprintIndex.get(obs.fingerprint) ?? [];
      if (prior.length === 1 && !seen.has(obs.fingerprint)) {
        novel.push(obs);
        seen.add(obs.fingerprint);
      }
    }

    return novel.slice(0, 50);
  }

  /** Fingerprints present in every recent run */
  stable(recentRuns = 3): Observation[] {
    if (this.runTimestamps.length < recentRuns) return [];

    const recentRunStarts = this.runTimestamps.slice(-recentRuns);
    const firstRunTs = new Date(recentRunStarts[0]!).getTime();

    const inAllRuns = new Map<string, number>();

    for (const obs of this.entries) {
      if (new Date(obs.recordedAt).getTime() < firstRunTs) continue;
      inAllRuns.set(obs.fingerprint, (inAllRuns.get(obs.fingerprint) ?? 0) + 1);
    }

    return [...inAllRuns.entries()]
      .filter(([, count]) => count >= recentRuns)
      .map(([fingerprint]) => {
        const list = this.fingerprintIndex.get(fingerprint) ?? [];
        return list[list.length - 1]!;
      });
  }

  /** What changed between two timestamps */
  delta(sinceIso: string): {
    added: Observation[];
    unchanged: Observation[];
  } {
    const before = new Set(
      this.entries
        .filter((obs) => new Date(obs.recordedAt).getTime() < new Date(sinceIso).getTime())
        .map((obs) => obs.fingerprint),
    );

    const after = this.since(sinceIso);
    const added: Observation[] = [];
    const unchanged: Observation[] = [];

    for (const obs of after) {
      if (!before.has(obs.fingerprint)) {
        added.push(obs);
      } else {
        unchanged.push(obs);
      }
    }

    return { added, unchanged };
  }

  runCount(): number {
    return this.runTimestamps.length;
  }
}

let globalHistory: ObservationHistory | null = null;

export function getObservationHistory(): ObservationHistory {
  if (!globalHistory) {
    globalHistory = new ObservationHistory();
  }
  return globalHistory;
}

export function resetObservationHistory(): void {
  globalHistory = new ObservationHistory();
}
