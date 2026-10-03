/**
 * Client Command — tenant-scoped lead loaders (Primal Phase 1, Build 1).
 * Collection Payload access stays studio-only; this service uses
 * overrideAccess only after PortalSession + CES + policy gates (see access.ts).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { CLIENT_INQUIRIES_COLLECTION } from "@/lib/managed-client-leads/collection";
import { ledgerScopeWhere, isCrossClientLeak } from "@/lib/managed-client-leads/isolation";
import { mapDocToRecord } from "@/lib/managed-client-leads/map";
import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import { deriveLeadPrimaryAttention } from "./attention";
import { resolveLeadPresentationStage, leadDetailHref, resolveLeadOwnerLabel } from "./presentation";
import { listAssignableLeadOwners, findOwnerLabel } from "./owners";
import {
  isLeadCommandEnabled,
  resolveLeadCommandPolicy,
  resolveLeadCommandTenant,
} from "./access";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { PortalSession } from "@/lib/portal/session";
import type {
  LeadActivityItem,
  LeadListFilters,
  LeadListItem,
  LeadOwnerOption,
  LeadCommandTenantContext,
  LeadPresentationStage,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type ScopedInquiryRow = {
  inquiry: ClientInquiryRecord;
  ownerLabel: string | null;
  locationLabel: string | null;
};

function staffOwnerLabelFromDoc(doc: AnyDoc): string | null {
  const owner = doc.assignedOwner;
  if (!owner || typeof owner !== "object") return null;
  return resolveLeadOwnerLabel(
    typeof owner.displayName === "string" ? owner.displayName : owner.email ?? null,
    typeof owner.email === "string" ? owner.email : null,
  );
}

function portalOwnerLabelFromDoc(doc: AnyDoc): string | null {
  const owner = doc.assignedPortalOwner;
  if (!owner || typeof owner !== "object") return null;
  return resolveLeadOwnerLabel(
    typeof owner.displayName === "string" ? owner.displayName : null,
    typeof owner.email === "string" ? owner.email : null,
  );
}

function resolveOwnerLabelFromDoc(doc: AnyDoc): string | null {
  return portalOwnerLabelFromDoc(doc) ?? staffOwnerLabelFromDoc(doc);
}

function locationLabelFromDoc(doc: AnyDoc): string | null {
  const loc = doc.location;
  if (!loc || typeof loc !== "object") return null;
  const name = (loc as AnyDoc).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function matchesQuery(inquiry: ClientInquiryRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    inquiry.contactName,
    inquiry.contactEmail,
    inquiry.contactPhone,
    inquiry.messageSummary,
    inquiry.inquiryKey,
    inquiry.programInterest,
    inquiry.campaign,
    inquiry.sourceMedium,
    inquiry.bookedProgram,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function inDateRange(receivedAt: string, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const t = Date.parse(receivedAt);
  if (!Number.isFinite(t)) return false;
  if (from) {
    const start = Date.parse(from);
    if (Number.isFinite(start) && t < start) return false;
  }
  if (to) {
    const end = Date.parse(to);
    if (Number.isFinite(end) && t > end) return false;
  }
  return true;
}

function filterLeadRows(
  rows: ScopedInquiryRow[],
  filters: LeadListFilters,
  now: Date,
): ScopedInquiryRow[] {
  return rows.filter(({ inquiry }) => {
    if (filters.stage && filters.stage !== "all") {
      if (resolveLeadPresentationStage(inquiry) !== filters.stage) return false;
    }
    if (filters.ownerPortalUserId === "unassigned") {
      if (inquiry.assignedPortalOwnerId != null || inquiry.assignedOwnerId != null) return false;
    } else if (typeof filters.ownerPortalUserId === "number") {
      if (inquiry.assignedPortalOwnerId !== filters.ownerPortalUserId) return false;
    }
    if (filters.needsAttention) {
      if (deriveLeadPrimaryAttention(inquiry, now) === "NONE") return false;
    }
    if (filters.sourceMedium && filters.sourceMedium !== "all") {
      const medium = (inquiry.utmSource || inquiry.sourceMedium || "").trim();
      if (medium !== filters.sourceMedium) return false;
    }
    if (filters.q && !matchesQuery(inquiry, filters.q)) return false;
    if (!inDateRange(inquiry.receivedAt, filters.receivedFrom, filters.receivedTo)) return false;
    return true;
  });
}

async function loadScopedInquiryRows(
  tenant: LeadCommandTenantContext,
  limit = 300,
): Promise<ScopedInquiryRow[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: CLIENT_INQUIRIES_COLLECTION,
    depth: 2,
    limit,
    sort: "-receivedAt",
    where: ledgerScopeWhere(tenant.clientId, tenant.clientKey),
    overrideAccess: true,
  });

  return result.docs
    .map((doc): ScopedInquiryRow => {
      const row = doc as unknown as AnyDoc;
      return {
        inquiry: mapDocToRecord(row),
        ownerLabel: resolveOwnerLabelFromDoc(row),
        locationLabel: locationLabelFromDoc(row),
      };
    })
    .filter(
      (row) =>
        !isCrossClientLeak({
          inquiryClientId: row.inquiry.clientId,
          inquiryClientKey: row.inquiry.clientKey,
          requestedClientId: tenant.clientId,
          requestedClientKey: tenant.clientKey,
        }),
    );
}

export type LeadListLoadResult =
  | {
      ok: true;
      tenant: LeadCommandTenantContext;
      items: LeadListItem[];
      totalBeforeFilter: number;
      owners: LeadOwnerOption[];
      canManage: boolean;
    }
  | { ok: false; code: "disabled" | "misconfigured" | "error"; message: string };

export type LeadDetailLoadResult =
  | {
      ok: true;
      tenant: LeadCommandTenantContext;
      inquiry: ClientInquiryRecord;
      stage: LeadPresentationStage;
      attention: ReturnType<typeof deriveLeadPrimaryAttention>;
      ownerLabel: string | null;
      locationLabel: string | null;
      owners: LeadOwnerOption[];
      activity: LeadActivityItem[];
      canManage: boolean;
    }
  | {
      ok: false;
      code: "disabled" | "misconfigured" | "not_found" | "forbidden" | "error";
      message: string;
    };

async function gateTenant(
  session: PortalSession,
  profile: ResolvedExperienceProfile,
): Promise<
  | { ok: true; tenant: LeadCommandTenantContext }
  | { ok: false; code: "disabled" | "misconfigured"; message: string }
> {
  if (!isLeadCommandEnabled(profile)) {
    return { ok: false, code: "disabled", message: "Leads is not enabled for this workspace." };
  }
  const tenant = await resolveLeadCommandTenant(session);
  if (!tenant) {
    return {
      ok: false,
      code: "misconfigured",
      message: "Workspace tenant could not be resolved.",
    };
  }
  const policy = resolveLeadCommandPolicy({
    clientKey: tenant.clientKey,
    displayName: tenant.clientName,
  });
  if (!policy) {
    return {
      ok: false,
      code: "disabled",
      message: "Lead operations are not available for this workspace.",
    };
  }
  return { ok: true, tenant };
}

async function loadInquiryActivity(
  tenant: LeadCommandTenantContext,
  inquiry: ClientInquiryRecord,
): Promise<LeadActivityItem[]> {
  const items: LeadActivityItem[] = [];

  items.push({
    id: `received-${inquiry.id}`,
    title: "Lead received",
    summary: `${inquiry.channel} · ${inquiry.inquiryKey}`,
    occurredAt: inquiry.receivedAt,
    eventType: "managed-client.inquiry.received",
  });

  if (inquiry.firstRespondedAt) {
    items.push({
      id: `responded-${inquiry.id}`,
      title: "First response recorded",
      summary: null,
      occurredAt: inquiry.firstRespondedAt,
      eventType: "managed-client.inquiry.responded",
    });
  }

  try {
    const payload = await getPayload({ config });
    // Activity Engine stores sourceType/sourceId inside metadata JSON — there is
    // no top-level sourceType column on executive-timeline-events. Query by
    // client + managed-client inquiry event prefix, then match inquiryKey.
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      depth: 0,
      limit: 50,
      sort: "-occurredAt",
      where: {
        and: [
          { client: { equals: tenant.clientId } },
          { eventType: { like: "managed-client.inquiry.%" } },
        ],
      },
      overrideAccess: true,
    });

    for (const doc of result.docs) {
      const row = doc as unknown as AnyDoc;
      const meta = (row.metadata ?? {}) as AnyDoc;
      const metaKey = meta.inquiryKey ? String(meta.inquiryKey) : "";
      const sourceType = meta.sourceType ? String(meta.sourceType) : "";
      const sourceId = String(meta.sourceId ?? row.sourceId ?? "");
      if (sourceType && sourceType !== "client-inquiry") continue;
      const matches =
        metaKey === inquiry.inquiryKey ||
        sourceId === String(inquiry.id) ||
        sourceId.startsWith(`${inquiry.id}:`);
      if (!matches) continue;
      // Skip raw "received" timeline twin — we already synthesize a calm
      // "Lead received" row from inquiry.receivedAt above.
      if (String(row.eventType ?? "") === "managed-client.inquiry.received") continue;
      items.push({
        id: `evt-${row.id}`,
        title: String(row.title ?? "Update"),
        summary: row.summary ? String(row.summary) : null,
        occurredAt: row.occurredAt
          ? String(row.occurredAt)
          : row.eventDate
            ? String(row.eventDate)
            : null,
        eventType: row.eventType ? String(row.eventType) : null,
      });
    }
  } catch {
    // Timeline may be unavailable — keep fact-derived history only.
  }

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.title}|${item.occurredAt}|${item.summary}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (Date.parse(b.occurredAt ?? "") || 0) - (Date.parse(a.occurredAt ?? "") || 0));
}

export async function loadLeadList(input: {
  session: PortalSession;
  profile: ResolvedExperienceProfile;
  canManage: boolean;
  filters?: LeadListFilters;
  now?: Date;
}): Promise<LeadListLoadResult> {
  const gate = await gateTenant(input.session, input.profile);
  if (!gate.ok) return gate;

  try {
    const now = input.now ?? new Date();
    const policy = resolveLeadCommandPolicy({
      clientKey: gate.tenant.clientKey,
      displayName: gate.tenant.clientName,
    })!;
    const [rows, owners] = await Promise.all([
      loadScopedInquiryRows(gate.tenant),
      listAssignableLeadOwners({ clientId: gate.tenant.clientId, policy }),
    ]);
    const filtered = filterLeadRows(rows, input.filters ?? {}, now);

    return {
      ok: true,
      tenant: gate.tenant,
      totalBeforeFilter: rows.length,
      owners,
      canManage: input.canManage,
      items: filtered.map((row) => ({
        inquiry: row.inquiry,
        href: leadDetailHref(row.inquiry.inquiryKey),
        stage: resolveLeadPresentationStage(row.inquiry),
        attention: deriveLeadPrimaryAttention(row.inquiry, now),
        ownerLabel:
          row.ownerLabel ?? findOwnerLabel(owners, row.inquiry.assignedPortalOwnerId),
        locationLabel: row.locationLabel,
      })),
    };
  } catch (err) {
    return {
      ok: false,
      code: "error",
      message: err instanceof Error ? err.message : "Unable to load leads.",
    };
  }
}

export async function loadLeadDetail(input: {
  session: PortalSession;
  profile: ResolvedExperienceProfile;
  inquiryKey: string;
  canManage: boolean;
  now?: Date;
}): Promise<LeadDetailLoadResult> {
  const gate = await gateTenant(input.session, input.profile);
  if (!gate.ok) return gate;

  const key = String(input.inquiryKey ?? "").trim();
  if (!key) return { ok: false, code: "not_found", message: "Lead not found." };

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: CLIENT_INQUIRIES_COLLECTION,
      depth: 2,
      limit: 1,
      where: {
        and: [
          { client: { equals: gate.tenant.clientId } },
          { clientKey: { equals: gate.tenant.clientKey } },
          { inquiryKey: { equals: key } },
        ],
      },
      overrideAccess: true,
    });

    const doc = result.docs[0] as unknown as AnyDoc | undefined;
    if (!doc) return { ok: false, code: "not_found", message: "Lead not found." };

    const inquiry = mapDocToRecord(doc);
    if (
      isCrossClientLeak({
        inquiryClientId: inquiry.clientId,
        inquiryClientKey: inquiry.clientKey,
        requestedClientId: gate.tenant.clientId,
        requestedClientKey: gate.tenant.clientKey,
      })
    ) {
      return { ok: false, code: "forbidden", message: "Lead is outside this workspace." };
    }

    const policy = resolveLeadCommandPolicy({
      clientKey: gate.tenant.clientKey,
      displayName: gate.tenant.clientName,
    })!;
    const now = input.now ?? new Date();
    const owners = await listAssignableLeadOwners({ clientId: gate.tenant.clientId, policy });

    return {
      ok: true,
      tenant: gate.tenant,
      inquiry,
      stage: resolveLeadPresentationStage(inquiry),
      attention: deriveLeadPrimaryAttention(inquiry, now),
      ownerLabel: resolveOwnerLabelFromDoc(doc) ?? findOwnerLabel(owners, inquiry.assignedPortalOwnerId),
      locationLabel: locationLabelFromDoc(doc),
      owners,
      activity: await loadInquiryActivity(gate.tenant, inquiry),
      canManage: input.canManage,
    };
  } catch (err) {
    return {
      ok: false,
      code: "error",
      message: err instanceof Error ? err.message : "Unable to load lead.",
    };
  }
}
