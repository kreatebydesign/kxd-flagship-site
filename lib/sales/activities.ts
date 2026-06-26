import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ActivityType, SalesDoc } from "./types";

const COLLECTION = "sales-activities";

export async function getSalesActivities(limit = 100): Promise<SalesDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit,
    depth: 1,
    sort: "-occurredAt",
    overrideAccess: true,
  });
  return result.docs as SalesDoc[];
}

export interface LogActivityInput {
  activityType: ActivityType;
  title: string;
  summary?: string;
  leadId?: number;
  proposalId?: number;
  clientId?: number;
  occurredAt?: string;
}

export async function logSalesActivity(input: LogActivityInput): Promise<SalesDoc> {
  const payload = await getPayload({ config });
  const record = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      activityType: input.activityType,
      title: input.title,
      summary: input.summary,
      lead: input.leadId,
      proposal: input.proposalId,
      client: input.clientId,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    },
    overrideAccess: true,
  });
  return record as SalesDoc;
}
