import "server-only";

/** Brain integration stub — Genesis signals for KXD Brain */

import type { GenesisSessionDetail } from "./types";

export interface GenesisBrainSignal {
  id: string;
  label: string;
  detail: string;
  href?: string;
  weight: number;
}

export function buildGenesisBrainSignals(session: GenesisSessionDetail | null): GenesisBrainSignal[] {
  if (!session) return [];

  const signals: GenesisBrainSignal[] = [];

  if (session.status !== "completed") {
    signals.push({
      id: `genesis-incomplete-${session.id}`,
      label: "Genesis in progress",
      detail: `${session.progressPercent}% discovery · ${session.recommendedNextStep}`,
      href: `/admin/operations/genesis/${session.id}`,
      weight: session.launchReadiness < 50 ? 0.8 : 0.5,
    });
  }

  if (session.missingFields.length > 0) {
    signals.push({
      id: `genesis-missing-${session.id}`,
      label: "Genesis gaps",
      detail: session.missingFields.slice(0, 3).join(" · "),
      href: `/admin/operations/genesis/${session.id}`,
      weight: 0.6,
    });
  }

  if (session.blueprintStatus === "generated") {
    signals.push({
      id: `genesis-blueprints-${session.id}`,
      label: "Blueprints ready",
      detail: "Engagement blueprints generated — ready to finalize Genesis.",
      href: `/admin/operations/genesis/${session.id}`,
      weight: 0.7,
    });
  }

  return signals;
}
