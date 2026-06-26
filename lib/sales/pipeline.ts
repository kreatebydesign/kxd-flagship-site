import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { PIPELINE_COLUMNS, type PipelineBoardData, type PipelineStatus, type SalesDoc } from "./types";

const COLLECTION = "sales-leads";

function weightedValue(lead: SalesDoc): number {
  const value = Number(lead.estimatedValue ?? 0);
  const probability = Number(lead.probability ?? 25) / 100;
  return value * probability;
}

export async function getPipelineBoard(): Promise<PipelineBoardData> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit: 500,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });

  const leads = result.docs as SalesDoc[];
  const columns = PIPELINE_COLUMNS.map((col) => {
    const columnLeads = leads.filter((l) => l.status === col.id);
    const totalValue = columnLeads.reduce(
      (sum, l) => sum + Number(l.estimatedValue ?? 0),
      0,
    );
    return {
      status: col.id as PipelineStatus,
      label: col.label,
      leads: columnLeads,
      totalValue,
    };
  });

  const totalPipelineValue = leads
    .filter((l) => !["won", "lost"].includes(String(l.status)))
    .reduce((sum, l) => sum + weightedValue(l), 0);

  return {
    columns,
    totalLeads: leads.length,
    totalPipelineValue,
  };
}

export async function updateLeadPipelineStatus(
  leadId: number,
  status: PipelineStatus | "nurturing",
): Promise<void> {
  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: leadId,
    data: { status },
    overrideAccess: true,
  });
}

export async function getLeadsList(limit = 100): Promise<SalesDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });
  return result.docs as SalesDoc[];
}
