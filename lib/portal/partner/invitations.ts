/**
 * KXD Network Phase 3 — partner invitation lifecycle (owner + activation).
 * Separate from CES Portal Access invitations.
 */

import "server-only";

import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { hashInvitationToken } from "@/lib/portal/identity/crypto";
import { appendPortalSecurityEvent } from "@/lib/portal/identity/security-events";
import {
  buildPartnerInvitationActivateUrl,
  resolvePartnerInvitationOrigin,
  sendPartnerInvitationEmail,
} from "./email-invitation";
import {
  buildPartnerInvitationTokenState,
  canResendPartnerInvitation,
  canRevokePartnerInvitation,
  derivePartnerRosterState,
  isAcceptablePartnerInvitationStatus,
  isPartnerInvitationExpired,
  maskPartnerInviteEmail,
  nextPartnerTokenVersion,
  normalizePartnerInviteEmail,
  PARTNER_INVITATION_PUBLIC_ERROR,
  type PartnerInvitationStatus,
  type PartnerRosterState,
} from "./invitation-rules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;
type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

export type PartnerInvitationRow = {
  id: number;
  email: string;
  displayName: string;
  personalNote: string | null;
  status: PartnerInvitationStatus;
  partnerProfileId: number;
  portalUserId: number;
  expiresAt: string | null;
  sendCount: number;
  sentAt: string | null;
  lastSentAt: string | null;
  firstOpenedAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  rosterState: PartnerRosterState;
  canResend: boolean;
  canRevoke: boolean;
};

function mapInvitation(
  doc: AnyDoc,
  profileStatus: string,
): PartnerInvitationRow {
  const status = (doc.status as PartnerInvitationStatus) ?? "sent";
  const expiresAt = doc.expiresAt ? String(doc.expiresAt) : null;
  const rosterState = derivePartnerRosterState({
    profileStatus,
    invitationStatus: status,
    invitationExpiresAt: expiresAt,
  });
  return {
    id: Number(doc.id),
    email: normalizePartnerInviteEmail(String(doc.email ?? "")),
    displayName: String(doc.displayName ?? "").trim() || "Partner",
    personalNote: doc.personalNote ? String(doc.personalNote) : null,
    status,
    partnerProfileId: relId(doc.partnerProfile) ?? 0,
    portalUserId: relId(doc.portalUser) ?? 0,
    expiresAt,
    sendCount: Number(doc.sendCount ?? 0) || 0,
    sentAt: doc.sentAt ? String(doc.sentAt) : null,
    lastSentAt: doc.lastSentAt ? String(doc.lastSentAt) : null,
    firstOpenedAt: doc.firstOpenedAt ? String(doc.firstOpenedAt) : null,
    acceptedAt: doc.acceptedAt ? String(doc.acceptedAt) : null,
    revokedAt: doc.revokedAt ? String(doc.revokedAt) : null,
    rosterState,
    canResend: canResendPartnerInvitation({
      profileStatus,
      invitationStatus: status,
      invitationExpiresAt: expiresAt,
    }),
    canRevoke: canRevokePartnerInvitation({
      profileStatus,
      invitationStatus: status,
    }),
  };
}

async function loadProfileStatus(
  payload: PayloadClient,
  profileId: number,
): Promise<string> {
  try {
    const doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: profileId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    return String(doc.status ?? "inactive");
  } catch {
    return "inactive";
  }
}

export async function findPartnerInvitationByProfileId(
  partnerProfileId: number,
): Promise<PartnerInvitationRow | null> {
  if (!partnerProfileId) return null;
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    where: { partnerProfile: { equals: partnerProfileId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;
  const profileStatus = await loadProfileStatus(payload, partnerProfileId);
  return mapInvitation(doc, profileStatus);
}

export async function listPartnerInvitationsByProfileIds(
  profileIds: number[],
): Promise<Map<number, PartnerInvitationRow>> {
  const map = new Map<number, PartnerInvitationRow>();
  if (profileIds.length === 0) return map;
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    where: { partnerProfile: { in: profileIds } },
    limit: Math.max(profileIds.length, 1),
    depth: 0,
    overrideAccess: true,
  });
  for (const raw of result.docs) {
    const doc = raw as AnyDoc;
    const profileId = relId(doc.partnerProfile);
    if (!profileId) continue;
    const profileStatus = await loadProfileStatus(payload, profileId);
    map.set(profileId, mapInvitation(doc, profileStatus));
  }
  return map;
}

async function assertEmailAvailable(
  payload: PayloadClient,
  email: string,
): Promise<void> {
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    throw new Error("A portal account with this email already exists.");
  }
}

/**
 * Create invited portal user + partner profile + invitation, then email (or return one-time link).
 */
export async function createPartnerInvitation(input: {
  displayName: string;
  email: string;
  personalNote?: string | null;
  invitedByUserId?: number | null;
  origin?: string | null;
}): Promise<{
  invitation: PartnerInvitationRow;
  emailSent: boolean;
  /** Raw activate URL — returned once when email is not delivered. Never stored. */
  oneTimeActivateUrl?: string;
}> {
  const payload = await getPayload({ config });
  const email = normalizePartnerInviteEmail(input.email);
  const displayName = input.displayName.trim();
  if (!email.includes("@")) throw new Error("A valid email is required.");
  if (!displayName) throw new Error("Display name is required.");

  await assertEmailAvailable(payload, email);

  const tokenState = buildPartnerInvitationTokenState();
  const placeholderPassword = randomBytes(32).toString("base64url");

  const portalUser = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    data: {
      email,
      displayName,
      accessMode: "partner",
      active: false,
      password: placeholderPassword,
      welcomeCompletedAt: new Date(0).toISOString(),
    },
    overrideAccess: true,
  });
  const portalUserId = Number(portalUser.id);

  const profile = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-profiles" as any,
    data: {
      portalUser: portalUserId,
      displayName,
      status: "invited",
      notes: input.personalNote?.trim()
        ? `Invite note: ${input.personalNote.trim()}`
        : undefined,
    },
    overrideAccess: true,
  });
  const partnerProfileId = Number(profile.id);

  const now = new Date().toISOString();
  const invitation = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    data: {
      email,
      displayName,
      personalNote: input.personalNote?.trim() || undefined,
      status: "sent",
      partnerProfile: partnerProfileId,
      portalUser: portalUserId,
      tokenHash: tokenState.tokenHash,
      tokenVersion: 1,
      expiresAt: tokenState.expiresAt.toISOString(),
      sendCount: 1,
      sentAt: now,
      lastSentAt: now,
      ...(input.invitedByUserId != null
        ? { invitedBy: input.invitedByUserId }
        : {}),
    },
    overrideAccess: true,
  });

  const origin = resolvePartnerInvitationOrigin(input.origin);
  const activateUrl = buildPartnerInvitationActivateUrl(
    origin,
    tokenState.rawToken,
  );
  const emailResult = await sendPartnerInvitationEmail({
    to: email,
    recipientName: displayName,
    activateUrl,
    personalNote: input.personalNote,
  });

  await appendPortalSecurityEvent({
    type: "partner_invitation.created",
    actorKind: "operator",
    actorOperatorUserId: input.invitedByUserId ?? null,
    summary: `Partner invitation created for ${email}`,
    metadata: {
      invitationId: Number(invitation.id),
      partnerProfileId,
      portalUserId,
      emailSent: emailResult.sent,
      resendConfigured: emailResult.resendConfigured,
    },
  });

  const row = mapInvitation(invitation as AnyDoc, "invited");
  return {
    invitation: row,
    emailSent: emailResult.sent,
    oneTimeActivateUrl: emailResult.sent ? undefined : activateUrl,
  };
}

export async function resendPartnerInvitation(input: {
  invitationId: number;
  operatorUserId?: number | null;
  origin?: string | null;
}): Promise<{
  invitation: PartnerInvitationRow;
  emailSent: boolean;
  oneTimeActivateUrl?: string;
}> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    id: input.invitationId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const partnerProfileId = relId(doc.partnerProfile);
  if (!partnerProfileId) throw new Error("Invitation is missing a partner profile.");
  const profileStatus = await loadProfileStatus(payload, partnerProfileId);

  if (
    !canResendPartnerInvitation({
      profileStatus,
      invitationStatus: String(doc.status ?? ""),
      invitationExpiresAt: doc.expiresAt ? String(doc.expiresAt) : null,
    })
  ) {
    throw new Error("This invitation cannot be resent.");
  }

  const tokenState = buildPartnerInvitationTokenState();
  const now = new Date().toISOString();
  const sendCount = (Number(doc.sendCount ?? 0) || 0) + 1;

  const updated = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    id: input.invitationId,
    data: {
      status: "sent",
      tokenHash: tokenState.tokenHash,
      tokenVersion: nextPartnerTokenVersion(Number(doc.tokenVersion ?? 0)),
      expiresAt: tokenState.expiresAt.toISOString(),
      sendCount,
      lastSentAt: now,
      revokedAt: null,
    },
    overrideAccess: true,
  })) as AnyDoc;

  if (profileStatus !== "invited") {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: partnerProfileId,
      data: { status: "invited" },
      overrideAccess: true,
    });
  }

  const portalUserId = relId(doc.portalUser);
  if (portalUserId) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      data: { active: false },
      overrideAccess: true,
    });
  }

  const origin = resolvePartnerInvitationOrigin(input.origin);
  const activateUrl = buildPartnerInvitationActivateUrl(
    origin,
    tokenState.rawToken,
  );
  const emailResult = await sendPartnerInvitationEmail({
    to: normalizePartnerInviteEmail(String(doc.email)),
    recipientName: String(doc.displayName ?? ""),
    activateUrl,
    personalNote: doc.personalNote ? String(doc.personalNote) : null,
  });

  await appendPortalSecurityEvent({
    type: "partner_invitation.resent",
    actorKind: "operator",
    actorOperatorUserId: input.operatorUserId ?? null,
    summary: `Partner invitation resent to ${normalizePartnerInviteEmail(String(doc.email))}`,
    metadata: {
      invitationId: input.invitationId,
      emailSent: emailResult.sent,
      resendConfigured: emailResult.resendConfigured,
    },
  });

  return {
    invitation: mapInvitation(updated, "invited"),
    emailSent: emailResult.sent,
    oneTimeActivateUrl: emailResult.sent ? undefined : activateUrl,
  };
}

export async function revokePartnerInvitation(input: {
  invitationId: number;
  operatorUserId?: number | null;
}): Promise<PartnerInvitationRow> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    id: input.invitationId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const partnerProfileId = relId(doc.partnerProfile);
  const portalUserId = relId(doc.portalUser);
  const profileStatus = partnerProfileId
    ? await loadProfileStatus(payload, partnerProfileId)
    : "inactive";

  if (
    !canRevokePartnerInvitation({
      profileStatus,
      invitationStatus: String(doc.status ?? ""),
    })
  ) {
    throw new Error("This invitation cannot be revoked.");
  }

  const now = new Date().toISOString();
  const updated = (await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    id: input.invitationId,
    data: {
      status: "revoked",
      revokedAt: now,
      tokenHash: null,
    },
    overrideAccess: true,
  })) as AnyDoc;

  if (partnerProfileId) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: partnerProfileId,
      data: { status: "inactive" },
      overrideAccess: true,
    });
  }
  if (portalUserId) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      data: { active: false },
      overrideAccess: true,
    });
  }

  await appendPortalSecurityEvent({
    type: "partner_invitation.revoked",
    actorKind: "operator",
    actorOperatorUserId: input.operatorUserId ?? null,
    summary: `Partner invitation #${input.invitationId} revoked`,
    metadata: { invitationId: input.invitationId, partnerProfileId },
  });

  return mapInvitation(updated, "inactive");
}

export async function findPartnerInvitationByRawToken(rawToken: string): Promise<{
  invitation: AnyDoc;
  row: PartnerInvitationRow;
} | null> {
  if (!rawToken || rawToken.length < 16) return null;
  const payload = await getPayload({ config });
  const tokenHash = hashInvitationToken(rawToken);
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
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
  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;
  if (isPartnerInvitationExpired(doc.expiresAt ?? null)) {
    try {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-partner-invitations" as any,
        id: Number(doc.id),
        data: { status: "expired", tokenHash: null },
        overrideAccess: true,
      });
    } catch {
      /* best effort */
    }
    return null;
  }
  if (
    !isAcceptablePartnerInvitationStatus(
      String(doc.status ?? ""),
      doc.expiresAt ? String(doc.expiresAt) : null,
    )
  ) {
    return null;
  }
  const profileId = relId(doc.partnerProfile) ?? 0;
  const profileStatus = profileId
    ? await loadProfileStatus(payload, profileId)
    : "invited";
  if (profileStatus !== "invited") return null;
  return { invitation: doc, row: mapInvitation(doc, profileStatus) };
}

export async function markPartnerInvitationOpened(
  invitationId: number,
): Promise<void> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    id: invitationId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (doc.status !== "sent" && doc.status !== "opened") return;
  const data: AnyDoc = { status: "opened" };
  if (!doc.firstOpenedAt) data.firstOpenedAt = new Date().toISOString();
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-partner-invitations" as any,
    id: invitationId,
    data,
    overrideAccess: true,
  });
  await appendPortalSecurityEvent({
    type: "partner_invitation.opened",
    actorKind: "system",
    summary: `Partner invitation #${invitationId} opened`,
    metadata: { invitationId },
  });
}

export type AcceptPartnerInvitationResult =
  | { ok: true; portalUserId: number; partnerProfileId: number }
  | { ok: false; publicMessage: string };

export async function acceptPartnerInvitation(input: {
  rawToken: string;
  password: string;
  displayName?: string;
}): Promise<AcceptPartnerInvitationResult> {
  if (input.password.length < 8) {
    return {
      ok: false,
      publicMessage: "Password must be at least 8 characters.",
    };
  }

  const found = await findPartnerInvitationByRawToken(input.rawToken);
  if (!found) {
    await appendPortalSecurityEvent({
      type: "partner_invitation.failed",
      actorKind: "system",
      summary: "Partner invitation accept failed (invalid or expired token)",
      metadata: {},
    });
    return { ok: false, publicMessage: PARTNER_INVITATION_PUBLIC_ERROR };
  }

  const payload = await getPayload({ config });
  const inv = found.invitation;
  const portalUserId = relId(inv.portalUser);
  const partnerProfileId = relId(inv.partnerProfile);
  if (!portalUserId || !partnerProfileId) {
    return { ok: false, publicMessage: PARTNER_INVITATION_PUBLIC_ERROR };
  }

  const memberships = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-client-memberships" as any,
    where: {
      and: [
        { portalUser: { equals: portalUserId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (memberships.docs.length > 0) {
    await appendPortalSecurityEvent({
      type: "partner_invitation.failed",
      actorKind: "system",
      summary: "Partner invitation accept failed (client membership present)",
      metadata: { invitationId: Number(inv.id), portalUserId },
    });
    return { ok: false, publicMessage: PARTNER_INVITATION_PUBLIC_ERROR };
  }

  const nextDisplayName =
    input.displayName?.trim() || String(inv.displayName ?? "").trim() || "Partner";

  try {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      data: {
        password: input.password,
        displayName: nextDisplayName,
        accessMode: "partner",
        active: true,
        welcomeCompletedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: partnerProfileId,
      data: {
        displayName: nextDisplayName,
        status: "active",
      },
      overrideAccess: true,
    });

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-invitations" as any,
      id: Number(inv.id),
      data: {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        tokenHash: null,
        displayName: nextDisplayName,
      },
      overrideAccess: true,
    });
  } catch {
    await appendPortalSecurityEvent({
      type: "partner_invitation.failed",
      actorKind: "system",
      summary: "Partner invitation accept failed during activation write",
      metadata: { invitationId: Number(inv.id) },
    });
    return { ok: false, publicMessage: PARTNER_INVITATION_PUBLIC_ERROR };
  }

  await appendPortalSecurityEvent({
    type: "partner_invitation.accepted",
    actorKind: "portal-user",
    actorPortalUserId: portalUserId,
    summary: `Partner invitation accepted for ${maskPartnerInviteEmail(String(inv.email))}`,
    metadata: {
      invitationId: Number(inv.id),
      partnerProfileId,
      portalUserId,
    },
  });

  return { ok: true, portalUserId, partnerProfileId };
}

export { PARTNER_INVITATION_PUBLIC_ERROR, maskPartnerInviteEmail };
