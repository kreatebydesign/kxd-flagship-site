import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { BrainMemoryRecord } from "./types";

const COLLECTION = "brain-memory";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MemoryDoc = Record<string, any>;

export async function loadBrainMemory(limit = 200): Promise<BrainMemoryRecord[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      limit,
      sort: "-createdAt",
      depth: 0,
      overrideAccess: true,
    });
    return (result.docs as MemoryDoc[]).map((d) => ({
      id: d.id as number,
      recommendationId: String(d.recommendationId),
      action: d.action as BrainMemoryRecord["action"],
      clientId: typeof d.client === "number" ? d.client : (d.client as { id: number })?.id ?? null,
      title: d.title ? String(d.title) : null,
      createdAt: String(d.createdAt),
    }));
  } catch {
    return [];
  }
}

export function getSuppressedRecommendationIds(memory: BrainMemoryRecord[]): Set<string> {
  const suppressed = new Set<string>();
  const now = Date.now();
  const dismissWindow = 14 * 86_400_000;
  const ignoreWindow = 30 * 86_400_000;

  for (const event of memory) {
    const age = now - new Date(event.createdAt).getTime();
    if (event.action === "completed") {
      suppressed.add(event.recommendationId);
    }
    if (event.action === "dismissed" && age < dismissWindow) {
      suppressed.add(event.recommendationId);
    }
    if (event.action === "ignored" && age < ignoreWindow) {
      suppressed.add(event.recommendationId);
    }
  }
  return suppressed;
}

export async function recordBrainMemory(input: {
  recommendationId: string;
  action: BrainMemoryRecord["action"];
  clientId?: number;
  title?: string;
}): Promise<void> {
  const payload = await getPayload({ config });
  await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      recommendationId: input.recommendationId,
      action: input.action,
      client: input.clientId,
      title: input.title,
    },
    overrideAccess: true,
  });
}

export async function markRecommendationsShown(ids: string[]): Promise<void> {
  const existing = await loadBrainMemory(500);
  const recentShown = new Set(
    existing
      .filter((e) => e.action === "shown")
      .map((e) => e.recommendationId),
  );
  for (const id of ids) {
    if (recentShown.has(id)) continue;
    await recordBrainMemory({ recommendationId: id, action: "shown" });
  }
}
