import "server-only";

import { publishNotification } from "@/lib/automation/actions";
import { publishers } from "@/lib/automation/publishers";
import type { Payload } from "payload";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";

export async function publishLaunchQaNotification(
  payload: Payload,
  input: {
    title: string;
    summary: string;
    clientId: number;
    severity: "info" | "warning" | "critical" | "success";
    href: string;
    qaId: number;
  },
): Promise<number | null> {
  const doc = await publishNotification(
    {
      title: input.title,
      summary: input.summary,
      clientId: input.clientId,
      severity: input.severity,
      module: "Projects",
      metadata: { href: input.href, qaId: input.qaId, source: "launch-qa" },
    },
    payload,
  );
  return doc?.id as number | null;
}

export async function onLaunchQaCreated(
  payload: Payload,
  input: { clientId: number; qaId: number; projectId?: number; websiteUrl?: string },
): Promise<void> {
  try {
    await publishers.launchQa.created(
      { clientId: input.clientId, qaId: input.qaId, projectId: input.projectId },
      payload,
    );
  } catch (err) {
    console.error("[Launch QA] Automation publish failed:", err);
  }

  await publishLaunchQaNotification(payload, {
    title: "Launch QA session created",
    summary: "Website QA checklist prepared for launch readiness review.",
    clientId: input.clientId,
    severity: "info",
    href: `/admin/operations/launch-qa/${input.clientId}`,
    qaId: input.qaId,
  });
}

export async function onLaunchQaBlockers(
  payload: Payload,
  input: { clientId: number; qaId: number; blockerCount: number },
): Promise<void> {
  if (input.blockerCount === 0) return;
  await publishLaunchQaNotification(payload, {
    title: "Launch QA has blockers",
    summary: `${input.blockerCount} critical blocker(s) must be resolved before launch.`,
    clientId: input.clientId,
    severity: "critical",
    href: `/admin/operations/launch-qa/${input.clientId}`,
    qaId: input.qaId,
  });
  try {
    await publishers.launchQa.blockers(input, payload);
  } catch {
    /* notification already sent */
  }
}

export async function onLaunchQaReady(
  payload: Payload,
  input: { clientId: number; qaId: number; readinessScore: number },
): Promise<void> {
  await publishLaunchQaNotification(payload, {
    title: "Launch QA ready",
    summary: `Website readiness score: ${input.readinessScore}% — ready for final review.`,
    clientId: input.clientId,
    severity: "success",
    href: `/admin/operations/launch-qa/${input.clientId}`,
    qaId: input.qaId,
  });
  try {
    await publishers.launchQa.ready(input, payload);
  } catch {
    /* notification already sent */
  }
}

export async function onLaunchQaApproved(
  payload: Payload,
  input: { clientId: number; qaId: number; approvedBy: string },
): Promise<void> {
  await createExecutiveEvent({
    client: input.clientId,
    eventType: "launch-qa.approved",
    title: "Launch QA approved",
    summary: `Website launch readiness approved by ${input.approvedBy}.`,
    category: "launch",
    importance: "high",
    sourceModule: "Manual",
    createdBy: input.approvedBy,
  }, payload);

  await publishLaunchQaNotification(payload, {
    title: "Launch QA approved",
    summary: "Website cleared for launch.",
    clientId: input.clientId,
    severity: "success",
    href: `/admin/operations/launch-qa/${input.clientId}`,
    qaId: input.qaId,
  });

  try {
    await publishers.launchQa.approved(input, payload);
  } catch {
    /* notification already sent */
  }
}

export async function checkLaunchDateReminder(
  payload: Payload,
  input: { clientId: number; qaId: number; launchDate: string; readinessScore: number; status: string },
): Promise<void> {
  const launch = new Date(input.launchDate);
  const now = new Date();
  const diffDays = (launch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 3 || diffDays < 0) return;
  if (input.status === "approved" || input.status === "launched") return;
  if (input.readinessScore >= 90) return;

  await publishLaunchQaNotification(payload, {
    title: "Launch date approaching — QA incomplete",
    summary: `Launch in ${Math.ceil(diffDays)} day(s) — readiness at ${input.readinessScore}%.`,
    clientId: input.clientId,
    severity: "warning",
    href: `/admin/operations/launch-qa/${input.clientId}`,
    qaId: input.qaId,
  });
}
