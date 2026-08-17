/**
 * Real Portal Access invitations from Launch Wizard team seats.
 * Uses canonical lib/portal/identity/invitations — no second invite system.
 */

import "server-only";

import type { Payload } from "payload";
import {
  createPortalInvitationDraft,
  listPortalInvitations,
  sendPortalInvitation,
} from "@/lib/portal/identity/invitations";
import { normalizePortalEmail } from "@/lib/portal/identity/crypto";
import { listPortalMembershipsForUser } from "@/lib/portal/memberships";
import type { LaunchWizardTeamMember } from "@/lib/client-launch-wizard/types";
import { mapLaunchRoleToMembershipRole } from "./invite-roles";
import type { LaunchInvitationOutcome } from "./types";

export { mapLaunchRoleToMembershipRole } from "./invite-roles";

async function findPortalUserIdByEmail(
  payload: Payload,
  email: string,
): Promise<number | null> {
  const normalized = normalizePortalEmail(email);
  const found = await payload.find({
    collection: "portal-users",
    where: { email: { equals: normalized } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = found.docs[0] as { id?: number } | undefined;
  return doc?.id != null ? Number(doc.id) : null;
}

export async function inviteTeamViaPortalAccess(input: {
  payload: Payload;
  clientId: number;
  clientName: string;
  team: LaunchWizardTeamMember[];
  origin: string;
  operatorUserId?: number | null;
}): Promise<LaunchInvitationOutcome[]> {
  const outcomes: LaunchInvitationOutcome[] = [];

  for (const member of input.team) {
    const email = normalizePortalEmail(member.email);
    if (!member.inviteOnLaunch) {
      outcomes.push({
        email,
        role: member.role,
        invitationId: null,
        status: "skipped",
        emailSent: false,
        message: "Saved for later — invitation not requested on launch.",
      });
      continue;
    }
    if (!email.includes("@")) {
      outcomes.push({
        email: member.email,
        role: member.role,
        invitationId: null,
        status: "skipped",
        emailSent: false,
        message: "Invalid email — invitation not sent.",
      });
      continue;
    }

    const membershipRole = mapLaunchRoleToMembershipRole(member.role);
    const existingUserId = await findPortalUserIdByEmail(input.payload, email);

    if (existingUserId != null) {
      const memberships = await listPortalMembershipsForUser(existingUserId);
      const already = memberships.find(
        (m) => m.clientId === input.clientId && m.status === "active",
      );
      if (already) {
        outcomes.push({
          email,
          role: member.role,
          invitationId: null,
          status: "access-active",
          emailSent: false,
          message: "Portal access already active for this client.",
        });
        continue;
      }
    }

    const existingInvites = await listPortalInvitations(input.payload);
    const openInvite = existingInvites.find(
      (inv) =>
        inv.email === email &&
        (inv.status === "draft" || inv.status === "sent" || inv.status === "opened") &&
        inv.memberships.some((m) => m.clientId === input.clientId),
    );

    if (openInvite?.status === "sent" || openInvite?.status === "opened") {
      outcomes.push({
        email,
        role: member.role,
        invitationId: openInvite.id,
        status: "already-invited",
        emailSent: true,
        message: "An open invitation already exists for this email and client.",
      });
      continue;
    }

    try {
      const draft =
        openInvite?.status === "draft"
          ? openInvite
          : await createPortalInvitationDraft({
              email,
              displayName: member.name.trim() || email,
              welcomeNote: `Welcome to ${input.clientName}. Your KXD workspace is ready.`,
              allowExistingUserExpansion: existingUserId != null,
              memberships: [{ clientId: input.clientId, role: membershipRole }],
              invitedByUserId: input.operatorUserId ?? null,
            });

      const sent = await sendPortalInvitation({
        invitationId: draft.id,
        origin: input.origin,
        operatorUserId: input.operatorUserId ?? null,
        resend: openInvite?.status === "draft" ? false : Boolean(openInvite),
      });

      outcomes.push({
        email,
        role: member.role,
        invitationId: sent.invitation.id,
        status: sent.emailSent ? "invitation-sent" : "invitation-delivery-failed",
        emailSent: sent.emailSent,
        message: sent.emailSent
          ? "Invitation email sent."
          : "Invitation created, but email delivery failed. Resend from Portal Access.",
        activateUrlForDev: sent.activateUrlForDev,
      });
    } catch (err) {
      outcomes.push({
        email,
        role: member.role,
        invitationId: null,
        status: "invitation-delivery-failed",
        emailSent: false,
        message:
          err instanceof Error
            ? err.message
            : "Invitation failed. Retry from Portal Access.",
      });
    }
  }

  return outcomes;
}
