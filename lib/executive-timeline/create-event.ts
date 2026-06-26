/**
 * Executive timeline writes — safe for Payload CLI hooks and Next server routes.
 */
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import type { CreateExecutiveEventInput, ExecutiveTimelineDoc } from "./types";

const COLLECTION = "executive-timeline-events";

/**
 * Canonical helper — all KXD Core modules should write relationship history through here.
 */
export async function createExecutiveEvent(
  input: CreateExecutiveEventInput,
  payloadInstance?: Payload,
): Promise<ExecutiveTimelineDoc> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  const record = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      client: input.client,
      project: input.project,
      infrastructure: input.infrastructure,
      request: input.request,
      deliverable: input.deliverable,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      description: input.description,
      category: input.category,
      status: input.status ?? "active",
      importance: input.importance ?? "normal",
      sourceModule: input.sourceModule,
      createdBy: input.createdBy,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      metadata: input.metadata,
      internalOnly: input.internalOnly ?? true,
      pinned: input.pinned ?? false,
    },
    overrideAccess: true,
  });

  return record as ExecutiveTimelineDoc;
}
