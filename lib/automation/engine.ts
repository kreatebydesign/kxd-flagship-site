import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { persistAutomationEvent } from "./actions";
import { executeMatchingRules } from "./rule-runner";
import { getRegisteredRules } from "./rules";
import { MODULE_REGISTRY } from "./registry";
import type {
  AutomationDashboardData,
  AutomationDoc,
  AutomationEventRecord,
  CreateAutomationEventInput,
  FounderSignalRecord,
  ModulePublisherInfo,
} from "./types";

const EVENTS_COLLECTION = "automation-events";
const NOTIFICATIONS_COLLECTION = "automation-notifications";

export async function createAutomationEvent(
  input: CreateAutomationEventInput,
  payloadInstance?: Payload,
): Promise<AutomationDoc> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  let record: AutomationDoc;
  try {
    record = await persistAutomationEvent(input, payload);
  } catch (err) {
    console.error("[KXD Automation] Failed to create event:", err);
    throw err;
  }

  if (!input.skipRules && input.status !== "failed") {
    const eventRecord: AutomationEventRecord = {
      id: record.id as number,
      module: input.module,
      eventName: input.eventName,
      clientId: input.clientId,
      payload: input.payload,
    };

    try {
      await executeMatchingRules(eventRecord, payload);
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: EVENTS_COLLECTION as any,
        id: record.id as number,
        data: {
          status: "processed",
          processedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      });
      record.status = "processed";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rule execution failed";
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: EVENTS_COLLECTION as any,
        id: record.id as number,
        data: {
          status: "failed",
          errorMessage: message,
        },
        overrideAccess: true,
      });
      record.status = "failed";
      record.errorMessage = message;
      console.error("[KXD Automation] Rule execution failed:", err);
    }
  }

  return record;
}

export async function getFounderSignals(limit = 20): Promise<FounderSignalRecord[]> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: EVENTS_COLLECTION as any,
    where: {
      and: [
        { module: { equals: "Founder Intelligence" } },
        { eventName: { equals: "founder.signal" } },
      ],
    },
    limit,
    sort: "-createdAt",
    depth: 0,
    overrideAccess: true,
  });

  return (result.docs as AutomationDoc[]).map((doc) => {
    const p = (doc.payload ?? {}) as Record<string, unknown>;
    return {
      id: doc.id as number,
      clientId: typeof doc.client === "number" ? doc.client : undefined,
      signalType: String(p.signalType ?? "general"),
      title: String(p.title ?? ""),
      summary: String(p.summary ?? ""),
      urgency: String(p.urgency ?? "medium"),
      module: String(p.module ?? "Automation"),
      recommendedAction: p.recommendedAction ? String(p.recommendedAction) : undefined,
      href: p.href ? String(p.href) : undefined,
      createdAt: String(doc.createdAt),
      metadata: p,
    };
  });
}

export async function getAutomationDashboard(): Promise<AutomationDashboardData> {
  const payload = await getPayload({ config });

  const [eventsR, failedR, notificationsR, healthEventsR] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: EVENTS_COLLECTION as any,
      limit: 30,
      sort: "-createdAt",
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: EVENTS_COLLECTION as any,
      where: { status: { equals: "failed" } },
      limit: 10,
      sort: "-createdAt",
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: NOTIFICATIONS_COLLECTION as any,
      where: { status: { equals: "queued" } },
      limit: 15,
      sort: "-createdAt",
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: EVENTS_COLLECTION as any,
      where: { eventName: { equals: "health.recalculated" } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const recentEvents = eventsR.docs as AutomationDoc[];
  const failedEvents = failedR.docs as AutomationDoc[];
  const queuedNotifications = notificationsR.docs as AutomationDoc[];
  const healthEvents = healthEventsR.docs as AutomationDoc[];

  const ruleCounts = new Map<string, number>();
  for (const event of recentEvents) {
    if (event.ruleId) {
      ruleCounts.set(String(event.ruleId), (ruleCounts.get(String(event.ruleId)) ?? 0) + 1);
    }
  }

  const rules = getRegisteredRules();
  const ruleExecutionCounts = rules.map((rule) => ({
    ruleId: rule.id,
    name: rule.name,
    count: ruleCounts.get(rule.id) ?? 0,
  }));

  const processedCount = recentEvents.filter((e) => e.status === "processed").length;

  const connectedModules: ModulePublisherInfo[] = MODULE_REGISTRY.map((m) => ({
    id: m.id,
    label: m.label,
    connected: m.connected,
    description: m.description,
  }));

  const failureRate = recentEvents.length > 0 ? failedEvents.length / recentEvents.length : 0;
  const systemStatus: AutomationDashboardData["systemStatus"] =
    failureRate > 0.2 ? "degraded" : "operational";

  return {
    recentEvents,
    failedEvents,
    queuedNotifications,
    ruleExecutionCounts,
    stats: {
      eventsPublished: recentEvents.length,
      rulesExecuted: processedCount,
      healthRecalculations: healthEvents.length,
      notificationsQueued: queuedNotifications.length,
      failedEvents: failedEvents.length,
    },
    connectedModules,
    systemStatus,
  };
}

export {
  publishTimelineEvent,
  publishNotification,
  publishFounderSignal,
  publishClientHealthUpdate,
} from "./actions";

export type { ClientHealthResult } from "./actions";
