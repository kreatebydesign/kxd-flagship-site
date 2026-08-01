/**
 * Phase 4 Batch I — invitation lifecycle (operator + activation).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  ensurePortalMembership,
  listPortalMembershipsForUser,
  syncPortalUserLegacyClientAndPreference,
} from "@/lib/portal/memberships";
import {
  generateInvitationToken,
  hashInvitationToken,
  normalizePortalEmail,
} from "./crypto";
import {
  buildSentInvitationTokenState,
  dedupeInvitationMemberships,
  INVITATION_PUBLIC_ERROR,
  isInvitationExpired,
  nextTokenVersion,
  planInvitationAcceptance,
  type InvitationMembershipDraft,
  type InvitationStatus,
} from "./invitation-rules";
import {
  buildInvitationActivateUrl,
  sendPortalInvitationEmail,
} from "./email-invitation";
import { isPortalMembershipRole, type PortalMembershipRole } from "./roles";
import { appendPortalSecurityEvent } from "./security-events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;
type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

function resolveRelId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export type PortalInvitationRow = {
  id: number;
  email: string;
  displayName: string | null;
  status: InvitationStatus;
  welcomeNote: string | null;
  allowExistingUserExpansion: boolean;
  expiresAt: string | null;
  sendCount: number;
  sentAt: string | null;
  firstOpenedAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  memberships: Array<{
    id: number;
    clientId: number;
    clientName: string;
    role: PortalMembershipRole;
  }>;
};

async function loadInvitationMemberships(
  payload: PayloadClient,
  invitationId: number,
): Promise<PortalInvitationRow["memberships"]> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitation-memberships" as any,
    where: { invitation: { equals: invitationId } },
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });
  return result.docs
    .map((doc) => {
      const d = doc as AnyDoc;
      const clientRaw = d.client;
      const clientId = resolveRelId(clientRaw);
      if (clientId == null) return null;
      const role = isPortalMembershipRole(d.role) ? d.role : "client-member";
      const clientName =
        typeof clientRaw === "object" && clientRaw !== null
          ? String((clientRaw as AnyDoc).name ?? `Client #${clientId}`)
          : `Client #${clientId}`;
      return {
        id: Number(d.id),
        clientId,
        clientName,
        role,
      };
    })
    .filter((row): row is PortalInvitationRow["memberships"][number] => row != null);
}

function mapInvitationDoc(
  doc: AnyDoc,
  memberships: PortalInvitationRow["memberships"],
): PortalInvitationRow {
  return {
    id: Number(doc.id),
    email: normalizePortalEmail(String(doc.email ?? "")),
    displayName: doc.displayName ? String(doc.displayName) : null,
    status: (doc.status as InvitationStatus) ?? "draft",
    welcomeNote: doc.welcomeNote ? String(doc.welcomeNote) : null,
    allowExistingUserExpansion: doc.allowExistingUserExpansion === true,
    expiresAt: doc.expiresAt ? String(doc.expiresAt) : null,
    sendCount: Number(doc.sendCount ?? 0) || 0,
    sentAt: doc.sentAt ? String(doc.sentAt) : null,
    firstOpenedAt: doc.firstOpenedAt ? String(doc.firstOpenedAt) : null,
    acceptedAt: doc.acceptedAt ? String(doc.acceptedAt) : null,
    revokedAt: doc.revokedAt ? String(doc.revokedAt) : null,
    lastSentAt: doc.lastSentAt ? String(doc.lastSentAt) : null,
    createdAt: String(doc.createdAt ?? ""),
    memberships,
  };
}

export async function listPortalInvitations(
  payload?: PayloadClient,
): Promise<PortalInvitationRow[]> {
  const p = payload ?? (await getPayload({ config }));
  const result = await p.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    sort: "-updatedAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const rows: PortalInvitationRow[] = [];
  for (const doc of result.docs) {
    const memberships = await loadInvitationMemberships(p, Number((doc as AnyDoc).id));
    rows.push(mapInvitationDoc(doc as AnyDoc, memberships));
  }
  return rows;
}

export async function createPortalInvitationDraft(input: {
  email: string;
  displayName: string;
  welcomeNote?: string | null;
  allowExistingUserExpansion?: boolean;
  memberships: InvitationMembershipDraft[];
  invitedByUserId?: number | null;
}): Promise<PortalInvitationRow> {
  const payload = await getPayload({ config });
  const email = normalizePortalEmail(input.email);
  const memberships = dedupeInvitationMemberships(input.memberships);
  if (!email.includes("@")) throw new Error("A valid email is required.");
  if (!input.displayName.trim()) throw new Error("Display name is required.");
  if (memberships.length === 0) throw new Error("At least one client membership is required.");

  for (const row of memberships) {
    try {
      await payload.findByID({
        collection: "clients",
        id: row.clientId,
        depth: 0,
        overrideAccess: true,
      });
    } catch {
      throw new Error(`Client #${row.clientId} not found.`);
    }
  }

  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    data: {
      email,
      displayName: input.displayName.trim(),
      status: "draft",
      welcomeNote: input.welcomeNote?.trim() || undefined,
      allowExistingUserExpansion: input.allowExistingUserExpansion === true,
      tokenVersion: 0,
      sendCount: 0,
      ...(input.invitedByUserId != null ? { invitedBy: input.invitedByUserId } : {}),
    },
    overrideAccess: true,
  });

  const invitationId = created.id as number;
  for (const row of memberships) {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-invitation-memberships" as any,
      data: {
        invitation: invitationId,
        client: row.clientId,
        role: row.role,
      },
      overrideAccess: true,
    });
  }

  await appendPortalSecurityEvent({
    type: "invitation.created",
    actorKind: "operator",
    actorOperatorUserId: input.invitedByUserId ?? null,
    summary: `Invitation draft created for ${email}`,
    metadata: { invitationId, clientIds: memberships.map((m) => m.clientId) },
  });

  const membershipRows = await loadInvitationMemberships(payload, invitationId);
  return mapInvitationDoc(created as AnyDoc, membershipRows);
}

export async function sendPortalInvitation(input: {
  invitationId: number;
  origin: string;
  operatorUserId?: number | null;
  resend?: boolean;
}): Promise<{ invitation: PortalInvitationRow; emailSent: boolean; activateUrlForDev?: string }> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    id: input.invitationId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (doc.status === "accepted") throw new Error("Invitation already accepted.");
  if (doc.status === "revoked") throw new Error("Invitation was revoked.");

  const memberships = await loadInvitationMemberships(payload, input.invitationId);
  if (memberships.length === 0) throw new Error("Invitation has no client memberships.");

  const rawToken = generateInvitationToken();
  const tokenState = buildSentInvitationTokenState(rawToken);
  const tokenVersion = nextTokenVersion(Number(doc.tokenVersion ?? 0));
  const now = new Date().toISOString();
  const sendCount = (Number(doc.sendCount ?? 0) || 0) + 1;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    id: input.invitationId,
    data: {
      status: "sent",
      tokenHash: tokenState.tokenHash,
      tokenVersion,
      expiresAt: tokenState.expiresAt.toISOString(),
      sendCount,
      sentAt: doc.sentAt ?? now,
      lastSentAt: now,
    },
    overrideAccess: true,
  });

  const activateUrl = buildInvitationActivateUrl(input.origin, rawToken);
  const emailResult = await sendPortalInvitationEmail({
    to: normalizePortalEmail(String(doc.email)),
    recipientName: String(doc.displayName ?? ""),
    companyNames: memberships.map((m) => m.clientName),
    activateUrl,
    welcomeNote: doc.welcomeNote ? String(doc.welcomeNote) : null,
  });

  await appendPortalSecurityEvent({
    type: input.resend ? "invitation.resent" : "invitation.sent",
    actorKind: "operator",
    actorOperatorUserId: input.operatorUserId ?? null,
    summary: `Invitation ${input.resend ? "resent" : "sent"} to ${normalizePortalEmail(String(doc.email))}`,
    metadata: {
      invitationId: input.invitationId,
      emailSent: emailResult.sent,
      resendConfigured: emailResult.resendConfigured,
    },
  });

  const updated = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    id: input.invitationId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  return {
    invitation: mapInvitationDoc(updated, memberships),
    emailSent: emailResult.sent,
    activateUrlForDev:
      process.env.NODE_ENV !== "production" && !emailResult.sent ? activateUrl : undefined,
  };
}

export async function revokePortalInvitation(input: {
  invitationId: number;
  operatorUserId?: number | null;
}): Promise<PortalInvitationRow> {
  const payload = await getPayload({ config });
  const now = new Date().toISOString();
  const updated = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    id: input.invitationId,
    data: {
      status: "revoked",
      revokedAt: now,
      tokenHash: null,
    },
    overrideAccess: true,
  })) as AnyDoc;

  await appendPortalSecurityEvent({
    type: "invitation.revoked",
    actorKind: "operator",
    actorOperatorUserId: input.operatorUserId ?? null,
    summary: `Invitation #${input.invitationId} revoked`,
    metadata: { invitationId: input.invitationId },
  });

  const memberships = await loadInvitationMemberships(payload, input.invitationId);
  return mapInvitationDoc(updated, memberships);
}

export async function findInvitationByRawToken(rawToken: string): Promise<{
  invitation: AnyDoc;
  memberships: InvitationMembershipDraft[];
  membershipDetails: PortalInvitationRow["memberships"];
} | null> {
  if (!rawToken || rawToken.length < 16) return null;
  const payload = await getPayload({ config });
  const tokenHash = hashInvitationToken(rawToken);
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { status: { in: ["sent", "opened"] } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const d = result.docs[0] as AnyDoc | undefined;
  if (!d) return null;
  if (isInvitationExpired(d.expiresAt ?? null)) return null;

  const membershipRows = await loadInvitationMemberships(payload, Number(d.id));
  return {
    invitation: d,
    memberships: membershipRows.map((m) => ({ clientId: m.clientId, role: m.role })),
    membershipDetails: membershipRows,
  };
}

export async function markInvitationOpened(invitationId: number): Promise<void> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    id: invitationId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (doc.status !== "sent" && doc.status !== "opened") return;
  const data: AnyDoc = { status: "opened" };
  if (!doc.firstOpenedAt) data.firstOpenedAt = new Date().toISOString();
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    id: invitationId,
    data,
    overrideAccess: true,
  });
  await appendPortalSecurityEvent({
    type: "invitation.opened",
    actorKind: "system",
    summary: `Invitation #${invitationId} opened`,
    metadata: { invitationId },
  });
}

export type AcceptInvitationResult =
  | {
      ok: true;
      portalUserId: number;
      mode: "create-user" | "expand-memberships";
      requiresSecurityEnrollment: boolean;
    }
  | { ok: false; publicMessage: string };

/**
 * Atomic-ish accept: create/expand then mark accepted. Fail-closed on errors.
 */
export async function acceptPortalInvitation(input: {
  rawToken: string;
  password: string;
  displayName?: string;
  termsAccepted: boolean;
}): Promise<AcceptInvitationResult> {
  if (!input.termsAccepted) {
    return { ok: false, publicMessage: "Please accept the workspace terms to continue." };
  }
  if (input.password.length < 8) {
    return { ok: false, publicMessage: "Password must be at least 8 characters." };
  }

  const found = await findInvitationByRawToken(input.rawToken);
  if (!found) {
    return { ok: false, publicMessage: INVITATION_PUBLIC_ERROR };
  }

  const payload = await getPayload({ config });
  const inv = found.invitation;
  const email = normalizePortalEmail(String(inv.email));

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existingDoc = existing.docs[0] as AnyDoc | undefined;
  const existingUser = existingDoc
    ? {
        id: Number(existingDoc.id),
        email,
        active: existingDoc.active !== false,
      }
    : null;

  let existingMemberships: Array<{
    clientId: number;
    role: PortalMembershipRole;
    status: "active" | "disabled";
  }> = [];
  if (existingUser) {
    const rows = await listPortalMembershipsForUser(existingUser.id, { payload });
    existingMemberships = rows.map((m) => ({
      clientId: m.clientId,
      role: m.role ?? "client-member",
      status: m.status,
    }));
  }

  const plan = planInvitationAcceptance({
    invitation: {
      status: inv.status,
      tokenHash: inv.tokenHash ?? null,
      tokenVersion: Number(inv.tokenVersion ?? 0),
      expiresAt: inv.expiresAt ?? null,
      email,
      allowExistingUserExpansion: inv.allowExistingUserExpansion === true,
      memberships: found.memberships,
    },
    existingUser,
    existingMemberships,
  });

  if (plan.mode === "refuse") {
    await appendPortalSecurityEvent({
      type: "invitation.failed",
      actorKind: "system",
      summary: `Invitation accept refused (${plan.reason})`,
      metadata: { invitationId: Number(inv.id), reason: plan.reason },
    });
    return { ok: false, publicMessage: INVITATION_PUBLIC_ERROR };
  }

  let portalUserId: number;
  let mode: "create-user" | "expand-memberships";

  try {
    if (plan.mode === "create-user") {
      mode = "create-user";
      const primary = plan.memberships[0]!;
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        data: {
          email: plan.email,
          displayName: (input.displayName ?? String(inv.displayName ?? "")).trim() || plan.email,
          client: primary.clientId,
          lastActiveClientId: primary.clientId,
          password: input.password,
          active: true,
          termsAcceptedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      });
      portalUserId = created.id as number;

      let first = true;
      for (const row of plan.memberships) {
        await ensurePortalMembership({
          portalUserId,
          clientId: row.clientId,
          role: row.role,
          isDefault: first,
          payload,
        });
        first = false;
      }
      await syncPortalUserLegacyClientAndPreference({
        portalUserId,
        clientId: primary.clientId,
        payload,
      });
    } else {
      mode = "expand-memberships";
      portalUserId = plan.portalUserId;
      // Existing users: password update only if they provided one during accept
      // (activation for expansion still requires password field for confirmation path).
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        id: portalUserId,
        data: {
          password: input.password,
          termsAcceptedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      });
      for (const row of plan.membershipsToAdd) {
        await ensurePortalMembership({
          portalUserId,
          clientId: row.clientId,
          role: row.role,
          isDefault: false,
          payload,
        });
      }
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-invitations" as any,
      id: Number(inv.id),
      data: {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        tokenHash: null,
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[KXD Portal] invitation accept failed:", err);
    await appendPortalSecurityEvent({
      type: "invitation.failed",
      actorKind: "system",
      summary: "Invitation accept failed closed",
      metadata: { invitationId: Number(inv.id) },
    });
    return { ok: false, publicMessage: INVITATION_PUBLIC_ERROR };
  }

  await appendPortalSecurityEvent({
    type: "invitation.accepted",
    actorKind: "portal-user",
    actorPortalUserId: portalUserId,
    summary: `Invitation accepted for ${email}`,
    metadata: { invitationId: Number(inv.id), mode },
  });

  const userAfter = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: portalUserId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  return {
    ok: true,
    portalUserId,
    mode,
    requiresSecurityEnrollment: !userAfter.securityEnrollmentCompletedAt,
  };
}

export { INVITATION_PUBLIC_ERROR };
