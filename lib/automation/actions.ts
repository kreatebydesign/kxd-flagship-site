import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import {
  calculateClientHealth,
  loadHealthContext,
  type ClientHealthResult,
} from "@/lib/client-health/scoring";
import type {
  CreateAutomationEventInput,
  PublishClientHealthInput,
  PublishFounderSignalInput,
  PublishNotificationInput,
  PublishTimelineInput,
  AutomationDoc,
} from "./types";

const EVENTS_COLLECTION = "automation-events";
const NOTIFICATIONS_COLLECTION = "automation-notifications";

export async function persistAutomationEvent(
  input: CreateAutomationEventInput,
  payloadInstance?: Payload,
): Promise<AutomationDoc> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  return (await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: EVENTS_COLLECTION as any,
    data: {
      client: input.clientId,
      module: input.module,
      eventName: input.eventName,
      status: input.status ?? "published",
      ruleId: input.ruleId,
      payload: input.payload,
      errorMessage: input.errorMessage,
    },
    overrideAccess: true,
  })) as AutomationDoc;
}

export async function publishTimelineEvent(
  input: PublishTimelineInput,
  payloadInstance?: Payload,
): Promise<AutomationDoc | null> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  try {
    const timeline = await createExecutiveEvent(
      {
        client: input.clientId,
        project: input.projectId,
        infrastructure: input.infrastructureId,
        request: input.requestId,
        deliverable: input.deliverableId,
        eventType: input.eventType,
        title: input.title,
        summary: input.summary,
        description: input.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: input.category as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        importance: (input.importance as any) ?? "normal",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceModule: input.sourceModule as any,
        createdBy: input.createdBy,
        occurredAt: input.occurredAt,
        pinned: input.pinned,
        metadata: input.metadata,
      },
      payload,
    );

    return persistAutomationEvent(
      {
        module: "Automation",
        eventName: "timeline.published",
        clientId: input.clientId,
        payload: { timelineEventId: timeline.id, title: input.title },
        skipRules: true,
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Automation] publishTimelineEvent failed:", err);
    return null;
  }
}

export async function publishNotification(
  input: PublishNotificationInput,
  payloadInstance?: Payload,
): Promise<AutomationDoc> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  return (await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: NOTIFICATIONS_COLLECTION as any,
    data: {
      title: input.title,
      client: input.clientId,
      severity: input.severity,
      module: input.module,
      status: "queued",
      summary: input.summary,
      metadata: input.metadata,
    },
    overrideAccess: true,
  })) as AutomationDoc;
}

export async function publishFounderSignal(
  input: PublishFounderSignalInput,
  payloadInstance?: Payload,
): Promise<AutomationDoc> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  return persistAutomationEvent(
    {
      module: "Founder Intelligence",
      eventName: "founder.signal",
      clientId: input.clientId,
      payload: {
        signalType: input.signalType,
        title: input.title,
        summary: input.summary,
        urgency: input.urgency,
        module: input.module,
        recommendedAction: input.recommendedAction,
        href: input.href,
        ...input.metadata,
      },
      skipRules: true,
    },
    payload,
  );
}

export async function publishClientHealthUpdate(
  input: PublishClientHealthInput,
  payloadInstance?: Payload,
): Promise<ClientHealthResult & { updated: boolean }> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const ctx = await loadHealthContext();
  const health = calculateClientHealth(input.clientId, ctx);

  let updated = false;

  try {
    const execProfiles = await payload.find({
      collection: "executive-client-profiles",
      where: { client: { equals: input.clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (execProfiles.docs.length > 0) {
      await payload.update({
        collection: "executive-client-profiles",
        id: execProfiles.docs[0].id as number,
        data: { clientHealthScore: health.overallScore },
        overrideAccess: true,
      });
      updated = true;
    }

    await payload.update({
      collection: "clients",
      id: input.clientId,
      data: { relationshipStatus: health.relationshipStatus },
      overrideAccess: true,
    });
    updated = true;
  } catch (err) {
    console.error("[KXD Automation] publishClientHealthUpdate failed:", err);
  }

  await persistAutomationEvent(
    {
      module: "Automation",
      eventName: "health.recalculated",
      clientId: input.clientId,
      payload: {
        triggerModule: input.triggerModule,
        triggerEvent: input.triggerEvent,
        overallScore: health.overallScore,
        factors: health.factors,
      },
      skipRules: true,
    },
    payload,
  );

  return { ...health, updated };
}

export type { ClientHealthResult };
