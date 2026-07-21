import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  clientHasModule,
  resolveClientEntitlements,
} from "@/lib/client-plans";
import { publishActivity } from "@/lib/activity-engine/publish";
import { getUpgradeEligibleCapability } from "./catalog";
import { isUniqueConstraintError } from "./errors";
import {
  canClientCancelUpgradeStatus,
  canTransitionUpgradeStatus,
  evaluateUpgradeEligibility,
  isActiveUpgradeStatus,
  isUpgradeRequestStatus,
  upgradeStatusLabel,
} from "./rules";
import { notifyUpgradeRequestSubmitted } from "./notify";
import type {
  ClientUpgradeRequestRecord,
  CreateUpgradeRequestInput,
  EntitlementSnapshot,
  PortalUpgradeRequestView,
  UpdateUpgradeRequestStatusInput,
  UpgradeCapabilityCard,
  UpgradeRequestStatus,
} from "./types";
import { ACTIVE_UPGRADE_REQUEST_STATUSES } from "./types";
import { listUpgradeEligibleCapabilities } from "./catalog";

const COLLECTION = "client-upgrade-requests";

export class UpgradeRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "upgrade_request_error") {
    super(message);
    this.name = "UpgradeRequestError";
    this.status = status;
    this.code = code;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function relationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
  }
  return null;
}

function parseSnapshot(value: unknown): EntitlementSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    planKey: asString(row.planKey),
    planStatus: asString(row.planStatus) ?? "legacy",
    isLegacy: Boolean(row.isLegacy),
    isPaused: Boolean(row.isPaused),
    effectiveModules: Array.isArray(row.effectiveModules)
      ? row.effectiveModules.filter((m): m is string => typeof m === "string")
      : [],
    resolvedAt: asString(row.resolvedAt) ?? new Date().toISOString(),
  };
}

function mapDoc(
  doc: Record<string, unknown>,
  clientName?: string | null,
): ClientUpgradeRequestRecord {
  const statusRaw = asString(doc.status) ?? "submitted";
  const status = isUpgradeRequestStatus(statusRaw) ? statusRaw : "submitted";
  return {
    id: Number(doc.id),
    clientId: relationId(doc.client) ?? 0,
    clientName: clientName ?? null,
    portalUserId: relationId(doc.portalUser),
    requesterEmail: asString(doc.requesterEmail),
    requesterName: asString(doc.requesterName),
    moduleKey: asString(doc.moduleKey) ?? "",
    moduleLabel: asString(doc.moduleLabel) ?? asString(doc.moduleKey) ?? "",
    status,
    clientMessage: asString(doc.clientMessage),
    operatorNote: asString(doc.operatorNote),
    sourceSurface: asString(doc.sourceSurface),
    entitlementSnapshot: parseSnapshot(doc.entitlementSnapshot),
    reviewedAt: asString(doc.reviewedAt),
    reviewedBy: asString(doc.reviewedBy),
    createdAt: asString(doc.createdAt) ?? "",
    updatedAt: asString(doc.updatedAt) ?? "",
  };
}

export function toPortalUpgradeRequestView(
  record: ClientUpgradeRequestRecord,
  accessGranted: boolean,
): PortalUpgradeRequestView {
  return {
    id: record.id,
    moduleKey: record.moduleKey,
    moduleLabel: record.moduleLabel,
    status: record.status,
    clientMessage: record.clientMessage,
    sourceSurface: record.sourceSurface,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    reviewedAt: record.reviewedAt,
    accessGranted,
  };
}

async function findActiveForModule(
  clientId: number,
  moduleKey: string,
): Promise<ClientUpgradeRequestRecord | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { moduleKey: { equals: moduleKey } },
        { status: { in: [...ACTIVE_UPGRADE_REQUEST_STATUSES] } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as Record<string, unknown> | undefined;
  return doc ? mapDoc(doc) : null;
}

export async function findActiveUpgradeRequest(
  clientId: number,
  moduleKey: string,
): Promise<ClientUpgradeRequestRecord | null> {
  const capability = getUpgradeEligibleCapability(moduleKey);
  if (!capability) return null;
  return findActiveForModule(clientId, capability.key);
}

export async function canRequestClientUpgrade(
  clientId: number,
  moduleKeyRaw: string,
): Promise<{
  canRequest: boolean;
  reason: ReturnType<typeof evaluateUpgradeEligibility>["reason"];
  moduleKey: string | null;
  accessGranted: boolean;
  activeRequest: PortalUpgradeRequestView | null;
}> {
  const entitlements = await resolveClientEntitlements(clientId);
  const provisional = evaluateUpgradeEligibility({
    moduleKeyRaw,
    entitlements,
    hasActiveDuplicate: false,
  });
  if (!provisional.moduleKey) {
    return {
      canRequest: false,
      reason: provisional.reason,
      moduleKey: null,
      accessGranted: false,
      activeRequest: null,
    };
  }

  const active = await findActiveForModule(clientId, provisional.moduleKey);
  const evaluated = evaluateUpgradeEligibility({
    moduleKeyRaw: provisional.moduleKey,
    entitlements,
    hasActiveDuplicate: Boolean(active),
  });

  return {
    canRequest: evaluated.canRequest,
    reason: evaluated.reason,
    moduleKey: evaluated.moduleKey,
    accessGranted: evaluated.accessGranted,
    activeRequest: active
      ? toPortalUpgradeRequestView(active, evaluated.accessGranted)
      : null,
  };
}

export async function listUpgradeCapabilityCards(
  clientId: number,
): Promise<UpgradeCapabilityCard[]> {
  const entitlements = await resolveClientEntitlements(clientId);
  const cards: UpgradeCapabilityCard[] = [];

  for (const capability of listUpgradeEligibleCapabilities()) {
    const active = await findActiveForModule(clientId, capability.key);
    const evaluated = evaluateUpgradeEligibility({
      moduleKeyRaw: capability.key,
      entitlements,
      hasActiveDuplicate: Boolean(active),
    });

    // Hide modules the client already has — keep the surface curated.
    if (evaluated.accessGranted && !active) continue;

    // Paused plans: do not present a module upsell catalog. Only surface
    // capabilities that already have an open request so status remains visible.
    if (entitlements.isPaused && !active) continue;

    cards.push({
      moduleKey: capability.key,
      label: capability.label,
      summary: capability.summary,
      valueLine: capability.valueLine,
      activeRequest: active
        ? toPortalUpgradeRequestView(active, evaluated.accessGranted)
        : null,
      canRequest: evaluated.canRequest,
      reason: evaluated.reason,
      accessGranted: evaluated.accessGranted,
    });
  }

  return cards;
}

export async function createClientUpgradeRequest(
  input: CreateUpgradeRequestInput,
  options?: { requestOrigin?: string | null },
): Promise<PortalUpgradeRequestView> {
  const entitlements = await resolveClientEntitlements(input.clientId);
  const capability = getUpgradeEligibleCapability(input.moduleKey);
  if (!capability) {
    const evaluated = evaluateUpgradeEligibility({
      moduleKeyRaw: input.moduleKey,
      entitlements,
      hasActiveDuplicate: false,
    });
    if (evaluated.reason === "internal_only") {
      throw new UpgradeRequestError("This capability is not available.", 403, "internal_only");
    }
    if (evaluated.reason === "unknown_module") {
      throw new UpgradeRequestError("Unknown capability.", 400, "unknown_module");
    }
    throw new UpgradeRequestError(
      "This capability cannot be requested from the portal.",
      400,
      "not_upgrade_eligible",
    );
  }

  const active = await findActiveForModule(input.clientId, capability.key);
  const evaluated = evaluateUpgradeEligibility({
    moduleKeyRaw: capability.key,
    entitlements,
    hasActiveDuplicate: Boolean(active),
  });

  if (evaluated.accessGranted) {
    throw new UpgradeRequestError(
      "This capability is already included in your access.",
      409,
      "already_entitled",
    );
  }
  if (evaluated.reason === "plan_paused") {
    throw new UpgradeRequestError(
      "Your workspace access is currently paused. Contact KXD for help.",
      403,
      "plan_paused",
    );
  }
  if (active) {
    throw new UpgradeRequestError(
      "You already have an open request for this capability.",
      409,
      "active_duplicate",
    );
  }

  const snapshot: EntitlementSnapshot = {
    planKey: entitlements.planKey,
    planStatus: entitlements.planStatus,
    isLegacy: entitlements.isLegacy,
    isPaused: entitlements.isPaused,
    effectiveModules: [...entitlements.effectiveModules],
    resolvedAt: entitlements.resolvedAt,
  };

  const payload = await getPayload({ config });
  const message =
    typeof input.clientMessage === "string"
      ? input.clientMessage.trim().slice(0, 2000) || null
      : null;

  let created: unknown;
  try {
    created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      data: {
        client: input.clientId,
        portalUser: input.portalUserId ?? undefined,
        requesterEmail: input.requesterEmail ?? undefined,
        requesterName: input.requesterName ?? undefined,
        moduleKey: capability.key,
        moduleLabel: capability.label,
        status: "submitted",
        clientMessage: message,
        sourceSurface: input.sourceSurface ?? "portal-home",
        entitlementSnapshot: snapshot,
      },
      overrideAccess: true,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      const raced = await findActiveForModule(input.clientId, capability.key);
      throw new UpgradeRequestError(
        raced
          ? "You already have an open request for this capability."
          : "An open request for this capability already exists.",
        409,
        "active_duplicate",
      );
    }
    console.error("[KXD Upgrade Requests] Create failed:", err);
    throw new UpgradeRequestError(
      "Unable to submit upgrade request.",
      500,
      "create_failed",
    );
  }

  const record = mapDoc(created as unknown as Record<string, unknown>);

  try {
    await publishActivity(
      {
        eventType: "upgrade.requested",
        title: `Upgrade requested · ${capability.label}`,
        summary: `${capability.label} requested from the portal.`,
        clientId: input.clientId,
        sourceModule: "Requests",
        sourceId: record.id,
        internalOnly: true,
        dedupe: true,
        metadata: {
          upgradeRequestId: record.id,
          moduleKey: capability.key,
          status: "submitted",
          // client message intentionally omitted from activity metadata
        },
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Upgrade Requests] Activity publish failed:", err);
  }

  try {
    let clientName = "Client";
    try {
      const client = await payload.findByID({
        collection: "clients",
        id: input.clientId,
        depth: 0,
        overrideAccess: true,
      });
      clientName = String((client as { name?: string }).name ?? "Client");
    } catch {
      /* ignore */
    }

    await notifyUpgradeRequestSubmitted({
      requestId: record.id,
      clientName,
      moduleLabel: capability.label,
      moduleKey: capability.key,
      requesterName: input.requesterName ?? null,
      requesterEmail: input.requesterEmail ?? null,
      submittedAt: record.createdAt || new Date().toISOString(),
      clientMessagePreview: message,
      origin:
        options?.requestOrigin ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        "https://www.kreatebydesign.com",
    });
  } catch (err) {
    console.error("[KXD Upgrade Requests] Notify failed:", err);
  }

  return toPortalUpgradeRequestView(record, false);
}

export async function listClientUpgradeRequests(
  clientId: number,
): Promise<PortalUpgradeRequestView[]> {
  const payload = await getPayload({ config });
  const entitlements = await resolveClientEntitlements(clientId);
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    sort: "-createdAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  return result.docs.map((doc) => {
    const record = mapDoc(doc as unknown as Record<string, unknown>);
    const accessGranted = clientHasModule(entitlements, record.moduleKey);
    return toPortalUpgradeRequestView(record, accessGranted);
  });
}

export async function getClientUpgradeRequest(
  requestId: number,
  options?: { clientId?: number },
): Promise<ClientUpgradeRequestRecord> {
  const payload = await getPayload({ config });
  let doc: Record<string, unknown>;
  try {
    doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: requestId,
      depth: 1,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new UpgradeRequestError("Request not found.", 404, "not_found");
  }

  const clientRel = doc.client;
  let clientName: string | null = null;
  const clientId = relationId(clientRel);
  if (clientRel && typeof clientRel === "object" && "name" in clientRel) {
    clientName = asString((clientRel as { name?: unknown }).name);
  }

  if (options?.clientId != null && clientId !== options.clientId) {
    throw new UpgradeRequestError("Request not found.", 404, "not_found");
  }

  return mapDoc(doc, clientName);
}

export async function listAdminUpgradeRequests(input?: {
  status?: UpgradeRequestStatus | "open" | "all";
  clientId?: number;
}): Promise<ClientUpgradeRequestRecord[]> {
  const payload = await getPayload({ config });
  const and: Array<Record<string, unknown>> = [];
  if (input?.clientId != null) {
    and.push({ client: { equals: input.clientId } });
  }
  if (input?.status === "open") {
    and.push({ status: { in: [...ACTIVE_UPGRADE_REQUEST_STATUSES] } });
  } else if (input?.status && input.status !== "all") {
    and.push({ status: { equals: input.status } });
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: (and.length ? { and } : undefined) as any,
    sort: "-createdAt",
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });

  return result.docs.map((doc) => {
    const row = doc as unknown as Record<string, unknown>;
    const clientRel = row.client;
    const clientName =
      clientRel && typeof clientRel === "object" && "name" in clientRel
        ? asString((clientRel as { name?: unknown }).name)
        : null;
    return mapDoc(row, clientName);
  });
}

export async function updateClientUpgradeRequestStatus(
  requestId: number,
  input: UpdateUpgradeRequestStatusInput,
): Promise<ClientUpgradeRequestRecord> {
  if (!isUpgradeRequestStatus(input.status)) {
    throw new UpgradeRequestError("Invalid status.", 400, "invalid_status");
  }

  const existing = await getClientUpgradeRequest(requestId);
  const statusChanged = existing.status !== input.status;

  if (statusChanged && !canTransitionUpgradeStatus(existing.status, input.status)) {
    throw new UpgradeRequestError(
      `Cannot move from ${upgradeStatusLabel(existing.status)} to ${upgradeStatusLabel(input.status)}.`,
      400,
      "invalid_transition",
    );
  }

  const nextNote =
    input.operatorNote === undefined
      ? existing.operatorNote
      : typeof input.operatorNote === "string"
        ? input.operatorNote.trim() || null
        : null;
  const noteChanged =
    input.operatorNote !== undefined && nextNote !== existing.operatorNote;

  // Same-status with no note change: no-op (no write, no activity).
  // Same-status with note change: note-only update is intentionally supported.
  if (!statusChanged && !noteChanged) {
    return existing;
  }

  const payload = await getPayload({ config });
  const data: Record<string, unknown> = {
    status: input.status,
    operatorNote: nextNote,
  };
  if (statusChanged) {
    data.reviewedAt = new Date().toISOString();
    data.reviewedBy = input.actor ?? "KXD Operator";
  }

  const updated = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: requestId,
    data,
    overrideAccess: true,
  });

  const record = mapDoc(
    updated as unknown as Record<string, unknown>,
    existing.clientName,
  );

  if (statusChanged) {
    try {
      await publishActivity(
        {
          eventType: `upgrade.${input.status}`,
          title: `Upgrade request ${upgradeStatusLabel(input.status).toLowerCase()} · ${existing.moduleLabel}`,
          summary: `${existing.moduleLabel}: ${existing.status} → ${input.status}. Approval does not grant access.`,
          clientId: existing.clientId,
          sourceModule: "Requests",
          sourceId: requestId,
          internalOnly: true,
          dedupe: true,
          metadata: {
            upgradeRequestId: requestId,
            moduleKey: existing.moduleKey,
            fromStatus: existing.status,
            toStatus: input.status,
            // operatorNote intentionally omitted
          },
        },
        payload,
      );
    } catch (err) {
      console.error("[KXD Upgrade Requests] Status activity failed:", err);
    }
  }

  return record;
}

export async function cancelClientUpgradeRequest(
  requestId: number,
  clientId: number,
): Promise<PortalUpgradeRequestView> {
  const existing = await getClientUpgradeRequest(requestId, { clientId });
  if (!canClientCancelUpgradeStatus(existing.status)) {
    throw new UpgradeRequestError(
      "This request can no longer be canceled.",
      400,
      "not_cancelable",
    );
  }

  const updated = await updateClientUpgradeRequestStatus(requestId, {
    status: "canceled",
    actor: existing.requesterEmail ?? "Portal user",
  });

  const entitlements = await resolveClientEntitlements(clientId);
  return toPortalUpgradeRequestView(
    updated,
    clientHasModule(entitlements, updated.moduleKey),
  );
}

export function assertActiveStatusHelper(status: UpgradeRequestStatus): boolean {
  return isActiveUpgradeStatus(status);
}
