/**
 * Phase 6 Batch C0 — KXD Connect foundation types.
 *
 * Connect organization ≠ Client ≠ Portal account ≠ Connected Workspace.
 * These types define multi-organization tenancy primitives only.
 */

export type ConnectOrganizationStatus = "active" | "inactive";

export type ConnectMembershipStatus = "active" | "disabled";

/** C0 roles only — vendor/guest/partner/client-participant arrive in later batches. */
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
  | "entitlement_denied";

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
  | "meter.adjusted";

export type ConnectActorKind = "operator" | "system";

export const CONNECT_KXD_ORGANIZATION_KEY = "kxd" as const;
