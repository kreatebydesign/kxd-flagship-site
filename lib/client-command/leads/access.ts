/**
 * Client Command — Lead Command portal access gates (Primal Phase 1, Build 1).
 *
 * Read gate: CES module `leads` entitled on the resolved experience profile.
 * Manage gate: leads entitled AND (policy.portalModuleEnabled for any active
 * portal member) OR (client-owner / client-admin / canManageMembers) OR a
 * studio operator preview session (isStudioPayloadOperator — never an email list).
 *
 * Membership scope comes from PortalSession.clientId (already authorized).
 */

import "server-only";

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../payload/access/index.ts";
import { getPortalSession, type PortalSession } from "@/lib/portal/session";
import { listPortalMembershipsForUser } from "@/lib/portal/memberships";
import {
  getManagedClientLeadPolicy,
  type ManagedClientLeadPolicy,
} from "@/lib/acquisition-operations/policy";
import "@/lib/acquisition-operations/policies/register";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { LeadCommandTenantContext } from "./types";

export const LEAD_COMMAND_CES_MODULE = "leads" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function isLeadCommandEnabled(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  if (!profile) return false;
  return isCesModuleEnabled(profile, LEAD_COMMAND_CES_MODULE);
}

/** Build a minimal portal-safe policy when no registry policy exists. */
function buildGenericLeadCommandPolicy(input: {
  clientKey: string;
  displayName?: string | null;
}): ManagedClientLeadPolicy {
  const key = String(input.clientKey ?? "").trim();
  const name = String(input.displayName ?? "").trim() || "Workspace";
  return {
    clientKey: key,
    context: "managed_client",
    displayName: name,
    enabled: true,
    allowedChannels: ["form", "call", "email", "chat", "walk_in", "other"],
    defaultOperationalStatus: "new",
    defaultVerificationState: "unverified",
    defaultQualificationState: "unreviewed",
    defaultOutcomeState: "open",
    attributionReconciliationEnabled: false,
    ga4PropertyIds: [],
    supportsSaleConfirmation: false,
    commissionOnConfirmedSale: false,
    commissionAmountCents: null,
    portalModuleEnabled: false,
    autoIngestFromWebsiteForm: false,
  };
}

/** Resolve the Lead Command policy for a tenant — registry wins when present. */
export function resolveLeadCommandPolicy(input: {
  clientKey: string;
  displayName?: string | null;
}): ManagedClientLeadPolicy | null {
  const key = String(input.clientKey ?? "").trim();
  if (!key) return null;
  const registered = getManagedClientLeadPolicy(key);
  if (registered) {
    if (!registered.enabled) return null;
    return registered;
  }
  return buildGenericLeadCommandPolicy({ clientKey: key, displayName: input.displayName });
}

/** Resolve tenant binding from an authorized portal session (never trusts the body). */
export async function resolveLeadCommandTenant(
  session: PortalSession,
): Promise<LeadCommandTenantContext | null> {
  try {
    const payload = await getPayload({ config });
    const client = (await payload.findByID({
      collection: "clients",
      id: session.clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc | null;
    if (!client) return null;
    const clientKey = String(client.slug ?? "").trim();
    if (!clientKey) return null;
    return {
      clientId: session.clientId,
      clientKey,
      clientName: String(client.name ?? session.clientName ?? "Workspace"),
    };
  } catch {
    return null;
  }
}

function hasElevatedMembershipRole(
  role: string | undefined,
  canManageMembers: boolean | undefined,
): boolean {
  return role === "client-owner" || role === "client-admin" || canManageMembers === true;
}

/**
 * Manage (write) capability for a real portal member.
 * Policy-wide opt-in (portalModuleEnabled) grants manage to any active member;
 * otherwise only elevated roles (owner/admin/canManageMembers) may manage.
 */
export async function resolvePortalMemberCanManage(input: {
  portalUserId: number;
  clientId: number;
  policy: ManagedClientLeadPolicy;
}): Promise<boolean> {
  if (!Number.isFinite(input.portalUserId) || input.portalUserId <= 0) return false;
  if (input.policy.portalModuleEnabled) return true;
  try {
    const memberships = await listPortalMembershipsForUser(input.portalUserId, {
      status: "active",
    });
    const membership = memberships.find((m) => m.clientId === input.clientId);
    if (!membership) return false;
    return hasElevatedMembershipRole(membership.role, membership.canManageMembers);
  } catch {
    return false;
  }
}

export type LeadCommandAccessOk = {
  session: PortalSession;
  profile: ResolvedExperienceProfile;
  tenant: LeadCommandTenantContext;
  policy: ManagedClientLeadPolicy;
  canManage: boolean;
};

export type LeadCommandAccessDenied = {
  error: NextResponse;
  code: "unauthorized" | "forbidden" | "disabled" | "misconfigured";
};

/** Full read gate used by portal pages and API routes. */
export async function requireLeadCommandAccess(): Promise<
  LeadCommandAccessOk | LeadCommandAccessDenied
> {
  const session = await getPortalSession();
  if (!session) {
    return {
      code: "unauthorized",
      error: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
    };
  }

  const profile = await resolveExperienceProfile(session);
  if (!isLeadCommandEnabled(profile)) {
    return {
      code: "disabled",
      error: NextResponse.json(
        { success: false, error: "Leads is not enabled for this workspace." },
        { status: 403 },
      ),
    };
  }

  const tenant = await resolveLeadCommandTenant(session);
  if (!tenant) {
    return {
      code: "misconfigured",
      error: NextResponse.json(
        { success: false, error: "Workspace tenant could not be resolved." },
        { status: 403 },
      ),
    };
  }

  const policy = resolveLeadCommandPolicy({
    clientKey: tenant.clientKey,
    displayName: tenant.clientName,
  });
  if (!policy) {
    return {
      code: "disabled",
      error: NextResponse.json(
        { success: false, error: "Lead operations are not available for this workspace." },
        { status: 403 },
      ),
    };
  }

  let canManage = false;
  if (session.isOperatorPreview) {
    const admin = await getPayloadAdminUser();
    canManage = Boolean(admin && isStudioPayloadOperator(admin));
  } else if (session.portalUserId > 0) {
    canManage = await resolvePortalMemberCanManage({
      portalUserId: session.portalUserId,
      clientId: tenant.clientId,
      policy,
    });
  }

  return { session, profile, tenant, policy, canManage };
}

/**
 * Write gate for mutating actions. Studio operator preview requires
 * isStudioPayloadOperator; real portal members require manage capability.
 *
 * `actorId` is used only for Activity Engine metadata attribution (JSON, no
 * FK). It is a `users.id` for operator preview or a `portal-users.id` for a
 * real member — Client Command mutations never set verificationState, so this
 * id never flows into the `verifiedBy` (users FK) column.
 */
export async function canWriteLeadCommand(
  session: PortalSession,
  canManage: boolean,
): Promise<{ ok: true; actorId: number } | { ok: false; reason: string }> {
  if (session.isOperatorPreview) {
    const admin = await getPayloadAdminUser();
    if (!admin || !isStudioPayloadOperator(admin)) {
      return { ok: false, reason: "Studio operator authority is required." };
    }
    const adminId = Number(admin.id);
    if (!Number.isFinite(adminId) || adminId <= 0) {
      return { ok: false, reason: "Studio operator identity is invalid." };
    }
    return { ok: true, actorId: adminId };
  }
  if (!canManage) {
    return { ok: false, reason: "Manage access is required for this workspace." };
  }
  if (!session.portalUserId || session.portalUserId <= 0) {
    return { ok: false, reason: "Portal membership is required." };
  }
  return { ok: true, actorId: session.portalUserId };
}
