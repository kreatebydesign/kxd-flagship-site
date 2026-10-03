/**
 * Client Command — attention derivation (Primal Phase 1, Build 1).
 * Pure functions over existing ownership/status/follow-up facts. No fabricated
 * scores or SLAs. Safe for verifiers — no database.
 */

import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import type { LeadAttentionFlag } from "./types";

const OPEN_OUTCOME = new Set(["open"]);

function isOpen(inquiry: ClientInquiryRecord): boolean {
  return OPEN_OUTCOME.has(inquiry.outcomeState) && inquiry.operationalStatus !== "closed";
}

function hasOwner(inquiry: ClientInquiryRecord): boolean {
  return inquiry.assignedOwnerId != null || inquiry.assignedPortalOwnerId != null;
}

/** All attention flags that currently apply (excluding NONE), most urgent first. */
export function deriveLeadAttentionFlags(
  inquiry: ClientInquiryRecord,
  now: Date = new Date(),
): LeadAttentionFlag[] {
  if (!isOpen(inquiry)) return [];

  const flags: LeadAttentionFlag[] = [];

  if (inquiry.nextFollowUpAt) {
    const t = Date.parse(inquiry.nextFollowUpAt);
    if (Number.isFinite(t)) {
      if (t < now.getTime()) {
        flags.push("FOLLOW_UP_OVERDUE");
      } else if (t - now.getTime() <= 24 * 60 * 60 * 1000) {
        flags.push("FOLLOW_UP_DUE");
      }
    }
  }

  if (inquiry.operationalStatus === "new" && inquiry.disposition === "none") {
    flags.push("NEW_UNTOUCHED");
  }

  if (!hasOwner(inquiry)) {
    flags.push("UNASSIGNED");
  }

  return flags;
}

/** Single highest-priority attention flag for compact list/badge rendering. */
export function deriveLeadPrimaryAttention(
  inquiry: ClientInquiryRecord,
  now: Date = new Date(),
): LeadAttentionFlag {
  const flags = deriveLeadAttentionFlags(inquiry, now);
  const priority: LeadAttentionFlag[] = [
    "FOLLOW_UP_OVERDUE",
    "NEW_UNTOUCHED",
    "UNASSIGNED",
    "FOLLOW_UP_DUE",
  ];
  for (const flag of priority) {
    if (flags.includes(flag)) return flag;
  }
  return "NONE";
}

export function leadAttentionLabel(flag: LeadAttentionFlag): string {
  switch (flag) {
    case "NEW_UNTOUCHED":
      return "New · not yet acknowledged";
    case "UNASSIGNED":
      return "Unassigned";
    case "FOLLOW_UP_DUE":
      return "Follow-up due";
    case "FOLLOW_UP_OVERDUE":
      return "Follow-up overdue";
    case "NONE":
    default:
      return "On track";
  }
}
