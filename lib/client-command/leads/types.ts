/**
 * Client Command — Lead Command shared presentation types (Primal Phase 1, Build 1).
 * Pure. No database. Not Contractor OS, not a generic CRM.
 */

import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";

/** Calm, deterministic presentation stage — derived from MCI dimensions only. */
export type LeadPresentationStage =
  | "NEW"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "QUALIFIED"
  | "WON"
  | "LOST";

/** Attention reason derived from ownership, status, and follow-up timing. */
export type LeadAttentionFlag =
  | "NEW_UNTOUCHED"
  | "UNASSIGNED"
  | "FOLLOW_UP_DUE"
  | "FOLLOW_UP_OVERDUE"
  | "NONE";

export type LeadCommandTenantContext = {
  clientId: number;
  clientKey: string;
  clientName: string;
};

export type LeadOwnerOption = {
  /** portal-users id — Client Command owners are portal members, not Payload staff users. */
  portalUserId: number;
  label: string;
  role: "client-owner" | "client-admin" | "client-member";
  canManageMembers: boolean;
};

export type LeadListFilters = {
  q?: string;
  stage?: LeadPresentationStage | "all";
  ownerPortalUserId?: number | "unassigned" | "all";
  needsAttention?: boolean;
  sourceMedium?: string;
  receivedFrom?: string;
  receivedTo?: string;
};

export type LeadListItem = {
  inquiry: ClientInquiryRecord;
  href: string;
  stage: LeadPresentationStage;
  attention: LeadAttentionFlag;
  ownerLabel: string | null;
  locationLabel: string | null;
};

export type LeadActivityItem = {
  id: string;
  title: string;
  summary: string | null;
  occurredAt: string | null;
  eventType: string | null;
};

export type LeadAttentionCounts = {
  total: number;
  newUntouched: number;
  unassigned: number;
  followUpDue: number;
  followUpOverdue: number;
};
