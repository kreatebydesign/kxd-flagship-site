import "server-only";

import type { Payload } from "payload";
import { persistAutomationEvent, publishNotification } from "@/lib/automation/actions";

export async function recordHealthDropTask(
  payload: Payload,
  input: { clientId: number; healthScore: number; factors: string[] },
): Promise<number | null> {
  const doc = await persistAutomationEvent(
    {
      module: "Automation",
      eventName: "client-success.health-drop",
      clientId: input.clientId,
      payload: {
        healthScore: input.healthScore,
        factors: input.factors,
        taskType: "success-task",
        architectureOnly: true,
      },
      skipRules: true,
    },
    payload,
  );
  return doc.id as number;
}

export async function publishQuarterlyReviewDue(
  payload: Payload,
  input: { clientId: number; clientName: string; daysUntil: number; href: string },
): Promise<number | null> {
  const doc = await publishNotification(
    {
      title: `Quarterly review due — ${input.clientName}`,
      summary: `Success review in ${input.daysUntil} day(s)`,
      clientId: input.clientId,
      severity: input.daysUntil <= 7 ? "warning" : "info",
      module: "Client Success",
      metadata: { href: input.href, source: "client-success", type: "quarterly-review" },
    },
    payload,
  );
  return doc.id as number;
}

export async function publishHighSatisfactionOpportunity(
  payload: Payload,
  input: { clientId: number; clientName: string; satisfaction: string; href: string },
): Promise<number | null> {
  const doc = await publishNotification(
    {
      title: `Expansion opportunity — ${input.clientName}`,
      summary: `High satisfaction (${input.satisfaction}) — consider upsell or referral`,
      clientId: input.clientId,
      severity: "success",
      module: "Client Success",
      metadata: { href: input.href, source: "client-success", type: "expansion-opportunity" },
    },
    payload,
  );
  return doc.id as number;
}

export async function publishStaleMeetingAlert(
  payload: Payload,
  input: { clientId: number; clientName: string; daysSince: number; href: string },
): Promise<number | null> {
  const doc = await publishNotification(
    {
      title: `No success meeting — ${input.clientName}`,
      summary: `No check-in in ${input.daysSince} days`,
      clientId: input.clientId,
      severity: "warning",
      module: "Client Success",
      metadata: { href: input.href, source: "client-success", type: "stale-meeting" },
    },
    payload,
  );
  return doc.id as number;
}
