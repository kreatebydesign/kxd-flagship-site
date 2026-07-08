import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "../constants";
import type { WorkSource } from "../types";
import type { WorkIntegrationMetadata } from "./types";
import { WORK_INTEGRATION_METADATA_VERSION, formatWorkNumber, parseWorkNumber } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface WorkSourceLookupResult {
  workId: number;
  workNumber: string | null;
  clientId: number;
  source: WorkSource;
  sourceId: string;
}

function parseMetadata(raw: unknown): WorkIntegrationMetadata {
  if (!raw || typeof raw !== "object") {
    return { integrationVersion: WORK_INTEGRATION_METADATA_VERSION, relationships: [] };
  }
  return raw as WorkIntegrationMetadata;
}

export async function findWorkBySource(
  clientId: number,
  source: WorkSource,
  sourceId: string,
): Promise<WorkSourceLookupResult | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { source: { equals: source } },
        { sourceId: { equals: sourceId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;

  const metadata = parseMetadata(doc.metadata);
  const workNumber =
    metadata.workNumber ?? (typeof doc.id === "number" ? formatWorkNumber(doc.id) : null);

  return {
    workId: doc.id as number,
    workNumber,
    clientId,
    source,
    sourceId,
  };
}

export async function mergeWorkMetadata(
  workId: number,
  patch: Record<string, unknown>,
): Promise<void> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  });

  if (!doc) throw new Error("Work item not found.");

  const metadata = parseMetadata((doc as AnyDoc).metadata);
  const next: WorkIntegrationMetadata & Record<string, unknown> = {
    ...metadata,
    ...patch,
    integrationVersion: WORK_INTEGRATION_METADATA_VERSION,
    relationships: metadata.relationships ?? [],
  };

  if (!next.workNumber && typeof workId === "number") {
    next.workNumber = formatWorkNumber(workId);
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: workId,
    data: { metadata: next },
    overrideAccess: true,
  });
}

export function resolveWorkIdFromNumber(workNumber: string): number | null {
  return parseWorkNumber(workNumber);
}
