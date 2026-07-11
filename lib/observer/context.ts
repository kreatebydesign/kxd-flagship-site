import "server-only";

import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import type { BrainMemoryRecord } from "@/lib/brain/types";
import type { ClientCommunicationDoc } from "@/lib/client-command/communications/types";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";
import { loadBriefingContext } from "@/lib/intelligence/briefings/builder";
import { loadBrainMemory } from "@/lib/brain/memory";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Shared context loaded once per observation run.
 * Observers read from this — they do not fetch independently.
 */
export interface ObserverContext extends BriefingInputContext {
  brainMemory: BrainMemoryRecord[];
  communicationDocs: ClientCommunicationDoc[];
  reviewInboxItems: ReviewInboxItem[];
  observedAt: string;
}

async function loadCommunicationDocs(): Promise<ClientCommunicationDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-communications" as any,
      limit: 300,
      depth: 0,
      sort: "-date",
      overrideAccess: true,
    });
    return result.docs as ClientCommunicationDoc[];
  } catch {
    return [];
  }
}

export async function loadObserverContext(): Promise<ObserverContext> {
  const [briefing, brainMemory, communicationDocs] = await Promise.all([
    loadBriefingContext(),
    loadBrainMemory(200),
    loadCommunicationDocs(),
  ]);

  return {
    ...briefing,
    brainMemory,
    communicationDocs,
    // Reuse Review Inbox items already loaded for briefing — no second query
    reviewInboxItems: briefing.reviewInbox.items,
    observedAt: new Date().toISOString(),
  };
}
