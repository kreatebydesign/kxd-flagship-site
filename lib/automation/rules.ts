import type { Payload } from "payload";
import {
  publishClientHealthUpdate,
  publishFounderSignal,
  publishNotification,
  publishTimelineEvent,
} from "./actions";
import type { AutomationEventRecord, AutomationRule, AutomationRuleContext } from "./types";

const ruleRegistry: AutomationRule[] = [];

export function registerAutomationRule(rule: AutomationRule): void {
  if (ruleRegistry.some((r) => r.id === rule.id)) return;
  ruleRegistry.push(rule);
}

export function getRegisteredRules(): AutomationRule[] {
  return [...ruleRegistry];
}

export async function executeMatchingRules(
  event: AutomationEventRecord,
  payload?: Payload,
): Promise<void> {
  const ctx: AutomationRuleContext = { payload };

  for (const rule of ruleRegistry) {
    if (!rule.when(event)) continue;

    try {
      await rule.then(event, ctx);
    } catch (err) {
      console.error(`[KXD Automation] Rule ${rule.id} failed:`, err);
      throw err;
    }
  }
}

function eventName(event: AutomationEventRecord, name: string): boolean {
  return event.eventName === name;
}

function moduleIs(event: AutomationEventRecord, module: string): boolean {
  return event.module === module;
}

// ── Built-in deterministic rules ─────────────────────────────────────────────

registerAutomationRule({
  id: "onboarding-approved",
  name: "Onboarding Approved",
  description:
    "When client onboarding is approved → timeline event, health recalculation, founder signal.",
  when: (e) => moduleIs(e, "Onboarding") && eventName(e, "onboarding.approved"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "onboarding-approved",
        title: "Onboarding intake approved",
        summary: "KXD approved the client onboarding intake.",
        category: "onboarding",
        importance: "high",
        sourceModule: "Portal",
        pinned: true,
        metadata: event.payload,
      },
      payload,
    );

    await publishClientHealthUpdate(
      { clientId: event.clientId, triggerModule: "Onboarding", triggerEvent: event.eventName },
      payload,
    );

    await publishFounderSignal(
      {
        clientId: event.clientId,
        signalType: "onboarding-approved",
        title: "Onboarding approved",
        summary: `Client onboarding approved — relationship ready for launch operations.`,
        urgency: "medium",
        module: "Onboarding",
        recommendedAction: "Confirm launch checklist and infrastructure registry.",
        href: `/admin/operations/clients/${event.clientId}`,
      },
      payload,
    );
  },
});

registerAutomationRule({
  id: "infrastructure-critical",
  name: "Infrastructure Critical",
  description:
    "When infrastructure event severity is critical → timeline, founder priority, health recalculation.",
  when: (e) =>
    moduleIs(e, "Infrastructure") && eventName(e, "infrastructure.critical"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;
    const title = String(event.payload?.title ?? "Critical infrastructure issue");

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "infrastructure-critical",
        title,
        summary: String(event.payload?.description ?? "Critical infrastructure event detected."),
        category: "infrastructure",
        importance: "critical",
        sourceModule: "Infrastructure",
        infrastructureId: event.payload?.infrastructureId as number | undefined,
        metadata: event.payload,
      },
      payload,
    );

    await publishFounderSignal(
      {
        clientId: event.clientId,
        signalType: "infrastructure-critical",
        title: `Critical infrastructure: ${title}`,
        summary: "Infrastructure requires immediate executive attention.",
        urgency: "critical",
        module: "Infrastructure",
        recommendedAction: "Review infrastructure record and resolve open issue.",
        href: `/admin/operations/infrastructure/${event.clientId}`,
      },
      payload,
    );

    await publishNotification(
      {
        title: `Critical infrastructure — ${title}`,
        clientId: event.clientId,
        severity: "critical",
        module: "Infrastructure",
        summary: "Open critical infrastructure event.",
        metadata: event.payload,
      },
      payload,
    );

    await publishClientHealthUpdate(
      { clientId: event.clientId, triggerModule: "Infrastructure", triggerEvent: event.eventName },
      payload,
    );
  },
});

registerAutomationRule({
  id: "website-audit-completed",
  name: "Website Audit Completed",
  description:
    "When website audit completes → timeline event, opportunity signal, growth recommendation.",
  when: (e) => moduleIs(e, "Website Auditor") && eventName(e, "website-audit.completed"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;
    const grade = String(event.payload?.grade ?? "—");
    const score = Number(event.payload?.overallScore ?? 0);

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "website-audit",
        title: `Website audit completed — grade ${grade}`,
        summary: `Overall score ${score}/100.`,
        category: "website",
        importance: score < 60 ? "high" : "normal",
        sourceModule: "Website Auditor",
        metadata: event.payload,
      },
      payload,
    );

    await publishFounderSignal(
      {
        clientId: event.clientId,
        signalType: "growth-opportunity",
        title: "Website audit opportunity",
        summary: `Audit score ${score}/100 — review growth recommendations.`,
        urgency: score < 60 ? "high" : "medium",
        module: "Growth",
        recommendedAction: "Review audit recommendations and propose growth scope.",
        href: `/admin/operations/audits`,
        metadata: event.payload,
      },
      payload,
    );

    await publishNotification(
      {
        title: `Growth recommendation — website audit (${grade})`,
        clientId: event.clientId,
        severity: score < 60 ? "warning" : "info",
        module: "Growth",
        summary: "Website audit completed — opportunity signal published.",
        metadata: event.payload,
      },
      payload,
    );
  },
});

registerAutomationRule({
  id: "retainer-created",
  name: "Retainer Created",
  description: "When retainer is created → timeline event, MRR signal, client health update.",
  when: (e) => moduleIs(e, "Growth") && eventName(e, "retainer.created"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;
    const amount = Number(event.payload?.monthlyAmount ?? 0);
    const name = String(event.payload?.retainerName ?? "Retainer");

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "retainer-created",
        title: `Retainer created — ${name}`,
        summary: amount > 0 ? `Monthly value $${amount}.` : undefined,
        category: "finance",
        importance: "high",
        sourceModule: "Accounts",
        pinned: true,
        metadata: event.payload,
      },
      payload,
    );

    await publishFounderSignal(
      {
        clientId: event.clientId,
        signalType: "revenue",
        title: "MRR updated",
        summary: `New retainer added${amount > 0 ? ` — $${amount}/mo` : ""}.`,
        urgency: "low",
        module: "Growth",
        recommendedAction: "Verify MRR totals in executive briefing.",
        href: `/admin/operations/founder-intelligence`,
        metadata: event.payload,
      },
      payload,
    );

    await publishClientHealthUpdate(
      { clientId: event.clientId, triggerModule: "Growth", triggerEvent: event.eventName },
      payload,
    );
  },
});

registerAutomationRule({
  id: "project-completed",
  name: "Project Completed",
  description: "When project is completed → timeline event, growth opportunity, follow-up.",
  when: (e) => moduleIs(e, "Projects") && eventName(e, "project.completed"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;
    const projectName = String(event.payload?.projectName ?? "Project");

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "project-completed",
        title: `Project completed — ${projectName}`,
        summary: "Delivery milestone reached.",
        category: "project",
        importance: "high",
        sourceModule: "Creative",
        projectId: event.payload?.projectId as number | undefined,
        pinned: true,
        metadata: event.payload,
      },
      payload,
    );

    await publishFounderSignal(
      {
        clientId: event.clientId,
        signalType: "growth-opportunity",
        title: `Follow-up opportunity — ${projectName}`,
        summary: "Project completed — schedule growth conversation and case study review.",
        urgency: "medium",
        module: "Growth",
        recommendedAction: "Schedule follow-up and explore expansion scope.",
        href: `/admin/operations/clients/${event.clientId}`,
        metadata: event.payload,
      },
      payload,
    );

    await publishNotification(
      {
        title: `Follow-up recommended — ${projectName}`,
        clientId: event.clientId,
        severity: "info",
        module: "Projects",
        summary: "Project completed — growth follow-up queued.",
        metadata: event.payload,
      },
      payload,
    );

    await publishClientHealthUpdate(
      { clientId: event.clientId, triggerModule: "Projects", triggerEvent: event.eventName },
      payload,
    );
  },
});

registerAutomationRule({
  id: "onboarding-submitted",
  name: "Onboarding Submitted",
  description: "When onboarding is submitted → timeline event and health recalculation.",
  when: (e) => moduleIs(e, "Onboarding") && eventName(e, "onboarding.submitted"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "onboarding-submitted",
        title: "Onboarding intake submitted",
        summary: String(event.payload?.summary ?? "Client submitted onboarding intake."),
        category: "onboarding",
        importance: "normal",
        sourceModule: "Portal",
        metadata: event.payload,
      },
      payload,
    );

    await publishClientHealthUpdate(
      { clientId: event.clientId, triggerModule: "Onboarding", triggerEvent: event.eventName },
      payload,
    );
  },
});

registerAutomationRule({
  id: "client-launched",
  name: "Client Launched",
  description: "When client is launched → timeline event, health recalculation, founder signal.",
  when: (e) => moduleIs(e, "Launch") && eventName(e, "client.launched"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: String(event.payload?.eventType ?? "client-launch"),
        title: String(event.payload?.title ?? "Client launched into KXD OS"),
        summary: String(event.payload?.summary ?? "Partnership launched via KXD Client Launch."),
        category: "launch",
        importance: "high",
        sourceModule: "Launch",
        pinned: true,
        createdBy: event.payload?.createdBy as string | undefined,
        metadata: event.payload,
      },
      payload,
    );

    await publishClientHealthUpdate(
      { clientId: event.clientId, triggerModule: "Launch", triggerEvent: event.eventName },
      payload,
    );

    await publishFounderSignal(
      {
        clientId: event.clientId,
        signalType: "client-launch",
        title: "New client launched",
        summary: String(event.payload?.summary ?? "New partnership launched into KXD OS."),
        urgency: "medium",
        module: "Launch",
        recommendedAction: "Review launch checklist and infrastructure registry.",
        href: `/admin/operations/clients/${event.clientId}`,
      },
      payload,
    );
  },
});

registerAutomationRule({
  id: "infrastructure-registry",
  name: "Infrastructure Registry Initialized",
  description: "When infrastructure registry is created → timeline event.",
  when: (e) =>
    moduleIs(e, "Infrastructure") && eventName(e, "infrastructure.registry-initialized"),
  then: async (event, ctx) => {
    if (!event.clientId) return;
    const payload = ctx.payload;

    await publishTimelineEvent(
      {
        clientId: event.clientId,
        eventType: "infrastructure-registry",
        title: "Infrastructure registry initialized",
        summary: "Placeholder infrastructure record created.",
        category: "infrastructure",
        importance: "normal",
        sourceModule: "Infrastructure",
        infrastructureId: event.payload?.infrastructureId as number | undefined,
        metadata: event.payload,
      },
      payload,
    );
  },
});
