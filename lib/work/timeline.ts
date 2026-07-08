import "server-only";

import type { Payload } from "payload";
import { publishWorkEvent } from "./integration/events";
import type { WorkSource, WorkStatus } from "./types";
import type { WorkLifecycleEvent } from "./integration/types";

/** @deprecated Prefer publishWorkEvent from @/lib/work/integration */
export interface PublishWorkTimelineInput {
  workId: number;
  clientId: number;
  title: string;
  summary?: string | null;
  status: WorkStatus;
  source: WorkSource;
  sourceId?: string | null;
  clientVisible: boolean;
  timelineEnabled: boolean;
  eventType: string;
  previousStatus?: WorkStatus;
  createdBy?: string | null;
}

/**
 * Backward-compatible wrapper — delegates to Work Integration Layer.
 */
export async function publishWorkTimelineEvent(
  input: PublishWorkTimelineInput,
  payloadInstance?: Payload,
): Promise<void> {
  await publishWorkEvent(
    {
      workId: input.workId,
      clientId: input.clientId,
      title: input.title,
      summary: input.summary,
      status: input.status,
      source: input.source,
      sourceId: input.sourceId,
      clientVisible: input.clientVisible,
      timelineEnabled: input.timelineEnabled,
      event: input.eventType as WorkLifecycleEvent,
      previousStatus: input.previousStatus,
      createdBy: input.createdBy,
    },
    payloadInstance,
  );
}
