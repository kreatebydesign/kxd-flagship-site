import "server-only";

import type { Payload } from "payload";
import { persistAutomationEvent, publishNotification } from "@/lib/automation/actions";
import type { PlaybookAutomationTrigger } from "./types";

/** Architecture-only automation hooks — records intent, does not call external systems */
export async function recordPlaybookAutomationHook(
  payload: Payload,
  input: {
    trigger: PlaybookAutomationTrigger | string;
    clientId: number;
    playbookName: string;
    stepTitle: string;
    runId: number;
  },
): Promise<number | null> {
  if (!input.trigger || input.trigger === "none") return null;

  const doc = await persistAutomationEvent(
    {
      module: "Automation",
      eventName: `playbook.hook.${input.trigger}`,
      clientId: input.clientId,
      payload: {
        playbookName: input.playbookName,
        stepTitle: input.stepTitle,
        runId: input.runId,
        trigger: input.trigger,
        architectureOnly: true,
      },
      skipRules: true,
    },
    payload,
  );

  return doc.id as number;
}

export async function publishPlaybookNotification(
  payload: Payload,
  input: {
    title: string;
    summary: string;
    clientId: number;
    severity: "info" | "warning" | "critical" | "success";
    href: string;
    runId: number;
  },
): Promise<number | null> {
  const doc = await publishNotification(
    {
      title: input.title,
      summary: input.summary,
      clientId: input.clientId,
      severity: input.severity,
      module: "Playbooks",
      metadata: { href: input.href, runId: input.runId, source: "playbooks" },
    },
    payload,
  );
  return doc.id as number;
}

export { AUTOMATION_TRIGGER_LABELS } from "./labels";