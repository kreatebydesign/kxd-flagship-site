/**
 * Phase 33A — Eligible clients for automated reporting sweeps.
 * Configuration-only multi-client support (active clients with infrastructure).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
} from "./constants";
import { clampReportingSyncHourPacific } from "./schedule";
import type { ClientReportingSchedule } from "./types";

function relClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: number }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Active clients eligible for automation scheduling.
 * Entitlement/provider gating happens per provider inside the engine.
 */
export async function loadClientsForReportingAutomation(input?: {
  clientId?: number | null;
  clientSlug?: string | null;
}): Promise<ClientReportingSchedule[]> {
  const payload = await getPayload({ config });

  if (input?.clientId != null && Number.isFinite(input.clientId)) {
    try {
      const client = await payload.findByID({
        collection: "clients",
        id: input.clientId,
        depth: 0,
        overrideAccess: true,
      });
      return [await toSchedule(payload, client as unknown as Record<string, unknown>)];
    } catch {
      return [];
    }
  }

  if (input?.clientSlug?.trim()) {
    const found = await payload.find({
      collection: "clients",
      where: { slug: { equals: input.clientSlug.trim() } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (!found.docs[0]) return [];
    return [
      await toSchedule(
        payload,
        found.docs[0] as unknown as Record<string, unknown>,
      ),
    ];
  }

  const clients = await payload.find({
    collection: "clients",
    where: {
      status: { equals: "active" },
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    sort: "name",
  });

  const schedules: ClientReportingSchedule[] = [];
  for (const doc of clients.docs) {
    schedules.push(
      await toSchedule(payload, doc as unknown as Record<string, unknown>),
    );
  }
  return schedules;
}

async function toSchedule(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  client: Record<string, unknown>,
): Promise<ClientReportingSchedule> {
  const clientId = Number(client.id);
  const infra = await payload.find({
    collection: "client-infrastructure",
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const infraDoc = (infra.docs[0] ?? null) as Record<string, unknown> | null;

  return {
    clientId,
    clientSlug: typeof client.slug === "string" ? client.slug : null,
    clientName: String(client.name ?? "Client"),
    clientStatus: String(client.status ?? "unknown"),
    infrastructureId:
      infraDoc && typeof infraDoc.id === "number" ? infraDoc.id : null,
    automationEnabled: infraDoc?.reportingAutomationEnabled !== false,
    syncHourPacific: clampReportingSyncHourPacific(
      typeof infraDoc?.reportingSyncHourPacific === "number"
        ? infraDoc.reportingSyncHourPacific
        : DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
    ),
  };
}

export function resolveClientIdFromInfraDoc(doc: Record<string, unknown>): number | null {
  return relClientId(doc.client);
}
