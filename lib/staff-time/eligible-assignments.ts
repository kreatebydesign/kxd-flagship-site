import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { resolveStaffClientScope } from "@/lib/staff/client-assignments";
import { listWorkAssignedToStaffActor } from "@/lib/work/staff-assigned";

export type StaffTimeEligibleWorkOption = {
  workId: number;
  title: string;
  clientId: number | null;
  clientLabel: string | null;
  status: string;
};

export type StaffTimeEligibleClientOption = {
  clientId: number;
  label: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function listStaffTimeEligibleWork(
  actor: StaffActor,
): Promise<StaffTimeEligibleWorkOption[]> {
  const items = await listWorkAssignedToStaffActor(actor, {
    includeCompleted: false,
    limit: 100,
  });
  return items.map((work) => ({
    workId: work.id,
    title: work.title,
    clientId: work.clientId,
    clientLabel: work.clientName ?? null,
    status: work.status,
  }));
}

export async function listStaffTimeEligibleClients(
  actor: StaffActor,
): Promise<StaffTimeEligibleClientOption[]> {
  const scope = await resolveStaffClientScope(actor);
  if (scope === null) return [];
  if (scope.length === 0) return [];

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "clients",
    where: { id: { in: scope } },
    limit: scope.length,
    depth: 0,
    overrideAccess: true,
  });

  const byId = new Map<number, string>();
  for (const doc of result.docs as AnyDoc[]) {
    const id = Number(doc.id);
    if (!Number.isFinite(id)) continue;
    const label =
      (typeof doc.name === "string" && doc.name.trim()) ||
      `Client #${id}`;
    byId.set(id, label);
  }

  return scope
    .filter((id) => byId.has(id))
    .map((clientId) => ({
      clientId,
      label: byId.get(clientId)!,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
