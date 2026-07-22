/**
 * Operator service for commercial terms on client records.
 * Saves never mutate planKey, planStatus, entitlements, modules, or portal access.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";
import {
  getCommercialAgreement,
  isCommercialAgreementId,
} from "./definitions";
import type {
  ClientCommercialAgreementRecord,
  CommercialAgreementListFilters,
  CommercialAgreementSaveInput,
  CommercialProvisioningState,
  CommercialRecordStatus,
} from "./ops-types";
import type { CommercialAddOnId, CommercialAgreementId } from "./types";

export class CommercialOpsError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "commercial_ops_error") {
    super(message);
    this.name = "CommercialOpsError";
    this.status = status;
    this.code = code;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asAddOns(value: unknown): CommercialAddOnId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is CommercialAddOnId => typeof v === "string");
}

function deriveRecordStatus(
  agreementId: CommercialAgreementId | null,
): CommercialRecordStatus {
  return agreementId ? "recorded" : "unset";
}

function deriveProvisioning(
  planKey: string | null,
  planStatus: string | null,
): CommercialProvisioningState {
  if (planStatus === "active" || planStatus === "trial") {
    return "plan_assigned";
  }
  if (planKey && planStatus !== "legacy" && planStatus !== "paused") {
    return "plan_assigned";
  }
  if (planKey && planStatus === "paused") {
    return "plan_assigned";
  }
  return "not_provisioned";
}

function mapClientDoc(doc: Record<string, unknown>): ClientCommercialAgreementRecord {
  const rawAgreement = asString(doc.commercialAgreementId);
  const commercialAgreementId = isCommercialAgreementId(rawAgreement)
    ? rawAgreement
    : null;
  const catalog = getCommercialAgreement(commercialAgreementId);
  const planKey = asString(doc.planKey);
  const planStatus = asString(doc.planStatus);

  return {
    clientId: Number(doc.id),
    clientName: asString(doc.name) ?? `Client ${doc.id}`,
    clientSlug: asString(doc.slug),
    commercialAgreementId,
    agreementName: catalog?.name ?? null,
    monthlyRetainerAmount: asNumber(doc.monthlyRetainerAmount),
    setupFee: asNumber(doc.setupFee),
    monthlyServiceCredits: asNumber(doc.monthlyServiceCredits),
    commercialAddOns: asAddOns(doc.commercialAddOns),
    commercialNotes: asString(doc.commercialNotes),
    recordStatus: deriveRecordStatus(commercialAgreementId),
    planKey,
    planStatus,
    provisioningState: deriveProvisioning(planKey, planStatus),
    catalogMonthly: catalog?.monthlyStarting ?? null,
    catalogSetupFee: catalog?.setupFee ?? null,
    catalogCredits: catalog?.monthlyServiceCredits ?? null,
    updatedAt: asString(doc.updatedAt),
    createdAt: asString(doc.createdAt),
  };
}

/** Fields this service is allowed to write — never plan/entitlement/access fields. */
const COMMERCIAL_WRITE_FIELDS = [
  "commercialAgreementId",
  "monthlyRetainerAmount",
  "setupFee",
  "monthlyServiceCredits",
  "commercialAddOns",
  "commercialNotes",
] as const;

export async function listClientCommercialAgreements(
  filters: CommercialAgreementListFilters = {},
): Promise<ClientCommercialAgreementRecord[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "clients",
    limit: 500,
    depth: 0,
    sort: "name",
    overrideAccess: true,
  });

  let rows = result.docs.map((doc) =>
    mapClientDoc(doc as unknown as Record<string, unknown>),
  );

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (row) =>
        row.clientName.toLowerCase().includes(search) ||
        (row.clientSlug?.toLowerCase().includes(search) ?? false) ||
        (row.agreementName?.toLowerCase().includes(search) ?? false),
    );
  }

  if (filters.clientId) {
    rows = rows.filter((row) => row.clientId === filters.clientId);
  }

  const agreementFilter = filters.agreementId ?? "all";
  if (agreementFilter === "unset") {
    rows = rows.filter((row) => row.commercialAgreementId === null);
  } else if (agreementFilter !== "all") {
    rows = rows.filter((row) => row.commercialAgreementId === agreementFilter);
  }

  const recordFilter = filters.recordStatus ?? "all";
  if (recordFilter !== "all") {
    rows = rows.filter((row) => row.recordStatus === recordFilter);
  }

  return rows;
}

export async function getClientCommercialAgreement(
  clientId: number,
): Promise<ClientCommercialAgreementRecord> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    return mapClientDoc(doc as unknown as Record<string, unknown>);
  } catch {
    throw new CommercialOpsError("Client not found.", 404, "client_not_found");
  }
}

export async function listClientsForCommercialPicker(): Promise<
  Array<{ id: number; name: string; slug: string | null; recordStatus: CommercialRecordStatus }>
> {
  const rows = await listClientCommercialAgreements();
  return rows.map((row) => ({
    id: row.clientId,
    name: row.clientName,
    slug: row.clientSlug,
    recordStatus: row.recordStatus,
  }));
}

/**
 * Persist commercial terms on a client.
 * Explicitly does not touch planKey, planStatus, planEffectiveAt, plan modules,
 * CES, portal users, infrastructure, reporting, or provider connections.
 */
export async function saveClientCommercialAgreement(
  clientId: number,
  input: CommercialAgreementSaveInput,
  actor?: string | null,
): Promise<ClientCommercialAgreementRecord> {
  const payload = await getPayload({ config });

  let before: ClientCommercialAgreementRecord;
  try {
    const existing = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    before = mapClientDoc(existing as unknown as Record<string, unknown>);
  } catch {
    throw new CommercialOpsError("Client not found.", 404, "client_not_found");
  }

  const planSnapshot = {
    planKey: before.planKey,
    planStatus: before.planStatus,
  };

  const data: Record<string, unknown> = {
    commercialAgreementId: input.commercialAgreementId,
    monthlyRetainerAmount: input.monthlyRetainerAmount,
    setupFee: input.setupFee,
    monthlyServiceCredits: input.monthlyServiceCredits,
    commercialAddOns: input.commercialAddOns,
    commercialNotes: input.commercialNotes,
  };

  // Guard against accidental mass-assignment if this object is ever expanded
  for (const key of Object.keys(data)) {
    if (!(COMMERCIAL_WRITE_FIELDS as readonly string[]).includes(key)) {
      delete data[key];
    }
  }

  const updated = await payload.update({
    collection: "clients",
    id: clientId,
    data,
    depth: 0,
    overrideAccess: true,
  });

  const after = mapClientDoc(updated as unknown as Record<string, unknown>);

  // Hard safety: plan fields must be unchanged
  if (
    after.planKey !== planSnapshot.planKey ||
    after.planStatus !== planSnapshot.planStatus
  ) {
    console.error(
      "[KXD Commercial Ops] Plan fields changed unexpectedly after commercial save",
      { clientId, before: planSnapshot, after: { planKey: after.planKey, planStatus: after.planStatus } },
    );
    throw new CommercialOpsError(
      "Commercial save unexpectedly affected plan fields. Operation aborted for safety review.",
      500,
      "plan_integrity",
    );
  }

  const wasUnset = before.recordStatus === "unset";
  const eventType = wasUnset ? "commercial.recorded" : "commercial.updated";
  const agreement = getCommercialAgreement(input.commercialAgreementId);

  try {
    await publishActivity(
      {
        eventType,
        title: wasUnset
          ? `Commercial agreement recorded · ${agreement?.name ?? input.commercialAgreementId}`
          : `Commercial agreement updated · ${agreement?.name ?? input.commercialAgreementId}`,
        summary:
          "Commercial terms saved. Client plan, entitlements, and portal access were not changed.",
        clientId,
        sourceModule: "Client Command",
        sourceType: "commercial-agreement",
        sourceId: clientId,
        author: actor ?? undefined,
        internalOnly: true,
        dedupe: false,
        metadata: {
          commercialAgreementId: input.commercialAgreementId,
          fromAgreementId: before.commercialAgreementId,
          // notes intentionally omitted
        },
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Commercial Ops] Activity publish failed:", err);
  }

  return after;
}
