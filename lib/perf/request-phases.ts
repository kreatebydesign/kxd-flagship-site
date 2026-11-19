import "server-only";

import { cache } from "react";

export type RequestPhaseRecorder = {
  mark: (phase: string, durationMs: number) => void;
  snapshot: () => Record<string, number>;
};

/** Request-scoped performance marks for operator navigation instrumentation. */
export const getRequestPhaseRecorder = cache((): RequestPhaseRecorder => {
  const phases: Record<string, number> = {};
  return {
    mark(phase: string, durationMs: number) {
      phases[phase] = Math.round(durationMs);
    },
    snapshot() {
      return { ...phases };
    },
  };
});

export async function timePhase<T>(phase: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    getRequestPhaseRecorder().mark(phase, performance.now() - start);
  }
}