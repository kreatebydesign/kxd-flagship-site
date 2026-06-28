import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { NormalizedPayload } from "./types";

export async function syncPayload(): Promise<{
  normalized: NormalizedPayload | null;
  recordsProcessed: number;
  error?: string;
}> {
  try {
    const payload = await getPayload({ config });
    const collections = Object.keys(payload.collections);
    let failedJobs = 0;

    try {
      const jobs = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "payload-jobs" as any,
        where: { completedAt: { exists: false }, error: { exists: true } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      failedJobs = jobs.totalDocs;
    } catch {
      failedJobs = 0;
    }

    return {
      normalized: {
        collectionCount: collections.length,
        failedJobs,
        databaseStatus: "reachable",
        mediaStatus: "available",
        cmsReachable: true,
      },
      recordsProcessed: collections.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payload unreachable";
    return {
      normalized: {
        collectionCount: null,
        failedJobs: null,
        databaseStatus: "error",
        mediaStatus: "unknown",
        cmsReachable: false,
      },
      recordsProcessed: 0,
      error: message,
    };
  }
}

export function isPayloadConfigured(): boolean {
  return Boolean(process.env.PAYLOAD_SECRET);
}
