/**
 * Phase 6 Batch C1 — trusted server-side messaging authorization.
 *
 * Evaluation order (fail closed):
 * 1. Authenticated identity
 * 2. Global Connect release controls
 * 3. Active Connect organization
 * 4. Active organization membership
 * 5. Active conversation
 * 6. Active conversation participation
 * 7. Organization consistency across all records
 * 8. Permission for the requested operation
 *
 * Browser-supplied organization/membership/author IDs are never trusted.
 */

import { evaluateConnectAccess } from "../access";
import type {
  ConnectAccessDenyReason,
  ConnectConversationRecord,
  ConnectConversationParticipantRecord,
  ConnectMembershipRecord,
  ConnectMembershipRole,
  ConnectOrganizationRecord,
  ConnectSubjectKind,
} from "../types";

export type ConnectMessagingOperation =
  | "list_conversations"
  | "get_conversation"
  | "create_direct_conversation"
  | "create_group_conversation"
  | "archive_conversation"
  | "reactivate_conversation"
  | "add_participant"
  | "remove_participant"
  | "list_messages"
  | "send_message"
  | "read_unread_state"
  | "mark_read";

export type ConnectMessagingAuthContext = {
  subjectKind: ConnectSubjectKind;
  staffEmail?: string | null;
  staffUserId?: number | null;
  organization: Pick<ConnectOrganizationRecord, "id" | "key" | "status"> | null;
  membership: Pick<
    ConnectMembershipRecord,
    "id" | "organizationId" | "status" | "role" | "subjectKind" | "staffUserId"
  > | null;
  conversation?: Pick<
    ConnectConversationRecord,
    "id" | "organizationId" | "status"
  > | null;
  participation?: Pick<
    ConnectConversationParticipantRecord,
    "id" | "organizationId" | "conversationId" | "membershipId" | "status"
  > | null;
  operation: ConnectMessagingOperation;
  editionFeatureActive?: boolean;
  localActivationEnabled?: boolean;
  environmentAllowed?: boolean;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
};

export type ConnectMessagingAuthResult =
  | {
      allowed: true;
      organizationKey: string;
      organizationId: number;
      membershipId: number;
      role: ConnectMembershipRole;
    }
  | { allowed: false; reason: ConnectAccessDenyReason };

function canMutateParticipants(role: ConnectMembershipRole): boolean {
  return role === "platform-operator" || role === "organization-admin";
}

function operationRequiresParticipation(
  operation: ConnectMessagingOperation,
): boolean {
  switch (operation) {
    case "create_direct_conversation":
    case "create_group_conversation":
    case "list_conversations":
      return false;
    default:
      return true;
  }
}

function operationRequiresConversation(
  operation: ConnectMessagingOperation,
): boolean {
  switch (operation) {
    case "create_direct_conversation":
    case "create_group_conversation":
    case "list_conversations":
      return false;
    default:
      return true;
  }
}

/**
 * Full C1 messaging authorization path.
 * Returns a safe deny reason without revealing whether records exist.
 */
export function authorizeConnectMessaging(
  input: ConnectMessagingAuthContext,
): ConnectMessagingAuthResult {
  if (input.subjectKind !== "staff-user") {
    return { allowed: false, reason: "portal_identity_not_supported_in_c0" };
  }

  if (
    input.staffUserId == null ||
    !Number.isFinite(input.staffUserId) ||
    input.staffUserId <= 0
  ) {
    return { allowed: false, reason: "invalid_identity" };
  }

  const access = evaluateConnectAccess({
    subjectKind: input.subjectKind,
    staffEmail: input.staffEmail,
    organization: input.organization,
    membership: input.membership,
    editionFeatureActive: input.editionFeatureActive,
    localActivationEnabled: input.localActivationEnabled,
    environmentAllowed: input.environmentAllowed,
    env: input.env,
    cwd: input.cwd,
  });

  if (!access.allowed) {
    return { allowed: false, reason: access.reason };
  }

  if (!input.organization || !input.membership) {
    return { allowed: false, reason: "invalid_organization" };
  }

  if (input.membership.organizationId !== input.organization.id) {
    return { allowed: false, reason: "org_mismatch" };
  }

  if (input.membership.subjectKind !== "staff-user") {
    return { allowed: false, reason: "portal_identity_not_supported_in_c0" };
  }

  if (input.membership.staffUserId !== input.staffUserId) {
    return { allowed: false, reason: "invalid_identity" };
  }

  if (operationRequiresConversation(input.operation)) {
    if (!input.conversation) {
      // Opaque denial — do not reveal existence.
      return { allowed: false, reason: "not_conversation_participant" };
    }
    if (input.conversation.organizationId !== input.organization.id) {
      return { allowed: false, reason: "org_mismatch" };
    }
    // Archived conversations: history + unread/mark-read remain available;
    // send and participant mutations require active status.
    if (
      input.conversation.status !== "active" &&
      (input.operation === "send_message" ||
        input.operation === "add_participant" ||
        input.operation === "remove_participant" ||
        input.operation === "archive_conversation")
    ) {
      return { allowed: false, reason: "conversation_inactive" };
    }
  }

  if (operationRequiresParticipation(input.operation)) {
    if (!input.participation || !input.conversation) {
      return { allowed: false, reason: "not_conversation_participant" };
    }
    if (input.participation.status !== "active") {
      return { allowed: false, reason: "not_conversation_participant" };
    }
    if (input.participation.organizationId !== input.organization.id) {
      return { allowed: false, reason: "org_mismatch" };
    }
    if (input.participation.conversationId !== input.conversation.id) {
      return { allowed: false, reason: "org_mismatch" };
    }
    if (input.participation.membershipId !== input.membership.id) {
      return { allowed: false, reason: "not_conversation_participant" };
    }
  }

  if (
    (input.operation === "add_participant" ||
      input.operation === "remove_participant" ||
      input.operation === "archive_conversation" ||
      input.operation === "reactivate_conversation") &&
    !canMutateParticipants(access.role)
  ) {
    // Members may still remove themselves — handled by caller for remove_self.
    // For admin operations, deny here; service may allow self-leave separately.
    if (
      input.operation === "archive_conversation" ||
      input.operation === "reactivate_conversation" ||
      input.operation === "add_participant"
    ) {
      return { allowed: false, reason: "operation_denied" };
    }
  }

  return {
    allowed: true,
    organizationKey: access.organizationKey,
    organizationId: input.organization.id,
    membershipId: input.membership.id,
    role: access.role,
  };
}

/** Safe client error — never leaks existence of unauthorized records. */
export function connectMessagingSafeError(reason: ConnectAccessDenyReason): {
  status: number;
  message: string;
} {
  switch (reason) {
    case "kill_switch":
    case "feature_disabled":
    case "not_staff_dogfood":
    case "org_not_allowlisted":
    case "org_inactive":
    case "no_membership":
    case "membership_disabled":
    case "portal_identity_not_supported_in_c0":
    case "entitlement_denied":
      return { status: 403, message: "Connect is unavailable." };
    case "invalid_identity":
      return { status: 401, message: "Unauthorized." };
    case "invalid_organization":
    case "conversation_inactive":
    case "not_conversation_participant":
    case "org_mismatch":
    case "operation_denied":
      return { status: 404, message: "Not found." };
    default:
      return { status: 403, message: "Connect is unavailable." };
  }
}
