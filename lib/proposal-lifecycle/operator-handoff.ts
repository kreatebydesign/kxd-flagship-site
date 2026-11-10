/**
 * Founder / operator awareness for commercial lifecycle transitions.
 * Reuses automation notifications + operational flow (Today / signals refresh).
 * Does not send external email or mutate commercial records.
 */

import "server-only";

import { processOperationalFlow } from "@/lib/operational-flow";
import type { OperationalTransitionKind } from "@/lib/operational-flow/types";
import { notifyLifecycleEvent } from "./notifications.ts";

export async function emitLifecycleOperatorHandoff(input: {
  flowKind: OperationalTransitionKind;
  entityId: string | number;
  clientId?: number | null;
  title: string;
  summary: string;
  severity?: "info" | "success" | "warning" | "critical";
  href?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await notifyLifecycleEvent({
      title: input.title,
      summary: input.summary,
      clientId: input.clientId ?? undefined,
      severity: input.severity ?? "info",
      href: input.href,
      metadata: input.metadata,
    });
  } catch {
    /* best-effort */
  }

  try {
    await processOperationalFlow({
      kind: input.flowKind,
      source: "proposal",
      entityId: input.entityId,
      clientId: input.clientId ?? null,
      nextStatus: input.flowKind,
      skipRevalidate: false,
    });
  } catch {
    /* best-effort */
  }
}
