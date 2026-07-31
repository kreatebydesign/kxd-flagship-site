/**
 * Operator notifications for proposal lifecycle transitions.
 * Reuses automation-notifications; never sends external email.
 */

import { publishNotification } from "../automation/actions.ts";

export async function notifyLifecycleEvent(input: {
  title: string;
  summary: string;
  clientId?: number;
  severity?: "info" | "success" | "warning" | "critical";
  href?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await publishNotification({
    title: input.title,
    summary: input.summary,
    clientId: input.clientId,
    severity: input.severity ?? "info",
    module: "Sales",
    metadata: {
      ...(input.metadata ?? {}),
      href: input.href ?? null,
      source: "proposal-lifecycle",
      localOnly: true,
    },
  });
}
