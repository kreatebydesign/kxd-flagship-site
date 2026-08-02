/**
 * Phase 6 Batch C0/C1 — KXD Connect foundation + messaging types.
 *
 * Connect organization ≠ Client ≠ Portal account ≠ Connected Workspace.
 * C1 adds organization-owned conversations and messages — no UI.
 */

export type ConnectOrganizationStatus = "active" | "inactive";

export type ConnectMembershipStatus = "active" | "disabled";

/** C0/C1 roles only — vendor/guest/partner/client-participant arrive later. */
export type ConnectMembershipRole =
  | "platform-operator"
  | "organization-admin"
  | "organization-member";

export type ConnectSubjectKind = "staff-user" | "portal-user";

export type ConnectOrganizationRecord = {
  id: number;
  key: string;
  name: string;
  status: ConnectOrganizationStatus;
  config: Record<string, unknown> | null;
};

export type ConnectMembershipRecord = {
  id: number;
  organizationId: number;
  subjectKind: ConnectSubjectKind;
  staffUserId: number | null;
  portalUserId: number | null;
  role: ConnectMembershipRole;
  status: ConnectMembershipStatus;
};

/** C1 conversation types for internal dogfooding only. */
export type ConnectConversationType = "direct" | "group";

export type ConnectConversationStatus = "active" | "archived";

export type ConnectParticipantStatus = "active" | "left";

export type ConnectConversationRecord = {
  id: number;
  publicId: string;
  organizationId: number;
  type: ConnectConversationType;
  status: ConnectConversationStatus;
  title: string | null;
  /** Deterministic pair key for active direct conversations; null for groups. */
  directPairKey: string | null;
  createdAt: string;
  latestMessageAt: string | null;
};

export type ConnectConversationParticipantRecord = {
  id: number;
  publicId: string;
  organizationId: number;
  conversationId: number;
  membershipId: number;
  status: ConnectParticipantStatus;
  /** Private per-participant cursor — never exposed as a read receipt. */
  lastReadMessagePublicId: string | null;
  lastReadAt: string | null;
  joinedAt: string;
};

export type ConnectMessageRecord = {
  id: number;
  publicId: string;
  organizationId: number;
  conversationId: number;
  authorParticipantId: number;
  body: string;
  createdAt: string;
};

export type ConnectMeterKey =
  | "active_internal_members"
  | "active_external_participants"
  | "messages_sent"
  | "conversations_created"
  | "attachment_bytes_stored"
  | "transfer_bytes_upload"
  | "transfer_bytes_download"
  | "notifications_sent"
  | "ai_operations"
  | "ai_tokens"
  | "ai_estimated_provider_cost_micros";

export type ConnectMeterPeriodKind = "daily";

export type ConnectAccessDenyReason =
  | "kill_switch"
  | "feature_disabled"
  | "not_staff_dogfood"
  | "org_not_allowlisted"
  | "org_inactive"
  | "no_membership"
  | "membership_disabled"
  | "invalid_identity"
  | "invalid_organization"
  | "portal_identity_not_supported_in_c0"
  | "entitlement_denied"
  | "conversation_inactive"
  | "not_conversation_participant"
  | "org_mismatch"
  | "operation_denied";

export type ConnectAccessDecision =
  | { allowed: true; organizationKey: string; role: ConnectMembershipRole }
  | { allowed: false; reason: ConnectAccessDenyReason };

export type ConnectAuditEventType =
  | "organization.created"
  | "organization.activated"
  | "organization.deactivated"
  | "membership.created"
  | "membership.role_changed"
  | "membership.disabled"
  | "connect.enabled"
  | "connect.disabled"
  | "meter.adjusted"
  | "conversation.created"
  | "conversation.archived"
  | "conversation.reactivated"
  | "conversation.participant_added"
  | "conversation.participant_removed";

export type ConnectActorKind = "operator" | "system";

export const CONNECT_KXD_ORGANIZATION_KEY = "kxd" as const;

/** C1 plain-text message body maximum length (characters). */
export const CONNECT_MESSAGE_MAX_LENGTH = 4000;

/** Bounded page size for message listing / polling-ready retrieval. */
export const CONNECT_MESSAGE_PAGE_SIZE_DEFAULT = 50;
export const CONNECT_MESSAGE_PAGE_SIZE_MAX = 100;
