/**
 * Staff Sales Development — safe read projections (no owner financials or commercial activity).
 * Enforcement lives here and in staff sales loaders/APIs; UI hiding is not sufficient.
 */

import type { StaffActor } from "../types";
import {
  relUserId,
  staffLeadAssignedUserId,
  staffLeadSourcedByUserId,
  type SalesLeadDoc,
} from "./access";
import type { StaffSalesActivityRow } from "./types";

/** Activity types staff may see on prospects (outreach + qualification only). */
export const STAFF_VISIBLE_SALES_ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  "call",
  "meeting",
  "email",
  "follow-up",
  "note",
]);

/** Operator / commercial activity types — never staff-visible. */
export const STAFF_OPERATOR_ONLY_SALES_ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  "proposal-sent",
  "proposal-viewed",
  "commercial-trigger",
  "payment-promised",
  "renewal-notice",
  "commission-follow-up",
  "commercial-review",
]);

export const STAFF_OUTBOUND_LEAD_SOURCE = "staff-outbound";

function leadHasOperatorIntakeProvenance(lead: SalesLeadDoc): boolean {
  return (
    relUserId(lead.sourceInquiry) != null ||
    relUserId(lead.sourceProjectInquiry) != null ||
    relUserId(lead.sourceWebsiteAudit) != null ||
    relUserId(lead.sourceResearchLead) != null ||
    relUserId(lead.sourcePartnerReferral) != null
  );
}

/**
 * Qualification notes on the lead record may contain operator commercial context.
 * Staff may read notes only on prospects they originated via Staff Sales Development.
 */
export function staffVisibleLeadQualificationNotes(
  lead: SalesLeadDoc,
  actor: StaffActor,
): string | null {
  if (staffLeadSourcedByUserId(lead) === actor.userId) {
    const notes = lead.notes;
    return typeof notes === "string" && notes.trim() ? notes.trim() : null;
  }
  if (leadHasOperatorIntakeProvenance(lead)) {
    return null;
  }
  if (
    staffLeadAssignedUserId(lead) === actor.userId &&
    String(lead.source ?? "") === STAFF_OUTBOUND_LEAD_SOURCE
  ) {
    const notes = lead.notes;
    return typeof notes === "string" && notes.trim() ? notes.trim() : null;
  }
  return null;
}

export function isStaffVisibleSalesActivity(doc: SalesLeadDoc): boolean {
  const activityType = String(doc.activityType ?? "");
  if (STAFF_OPERATOR_ONLY_SALES_ACTIVITY_TYPES.has(activityType)) {
    return false;
  }
  if (!STAFF_VISIBLE_SALES_ACTIVITY_TYPES.has(activityType)) {
    return false;
  }
  if (relUserId(doc.proposal) != null) {
    return false;
  }
  return true;
}

export function mapStaffVisibleSalesActivity(
  doc: SalesLeadDoc,
): StaffSalesActivityRow | null {
  if (!isStaffVisibleSalesActivity(doc)) return null;
  return {
    id: Number(doc.id),
    activityType: String(doc.activityType ?? "note"),
    title: String(doc.title ?? "Activity"),
    summary:
      typeof doc.summary === "string" && doc.summary.trim()
        ? doc.summary.trim()
        : null,
    occurredAt: String(doc.occurredAt ?? doc.createdAt ?? ""),
  };
}

export function filterStaffVisibleSalesActivities(
  docs: SalesLeadDoc[],
): StaffSalesActivityRow[] {
  const rows: StaffSalesActivityRow[] = [];
  for (const doc of docs) {
    const row = mapStaffVisibleSalesActivity(doc);
    if (row) rows.push(row);
  }
  return rows;
}
