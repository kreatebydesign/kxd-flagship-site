/**
 * Staff Sales Development — safe read projections (no owner financials or commercial activity).
 * Enforcement lives here and in staff sales loaders/APIs; UI hiding is not sufficient.
 */

import type { StaffActor } from "../types";
import {
  relUserId,
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

/**
 * Lead qualification notes may contain operator commercial context.
 * Visible only when this staff member explicitly sourced the prospect.
 */
export function staffVisibleLeadQualificationNotes(
  lead: SalesLeadDoc,
  actor: StaffActor,
): string | null {
  if (staffLeadSourcedByUserId(lead) !== actor.userId) {
    return null;
  }
  const notes = lead.notes;
  return typeof notes === "string" && notes.trim() ? notes.trim() : null;
}

export function staffRecordedActivityUserId(doc: SalesLeadDoc): number | null {
  return relUserId(doc.recordedByStaffUser);
}

/**
 * Staff may only see activities they recorded via Staff Sales Development
 * (recordedByStaffUser). Operator/system rows stay NULL and are hidden.
 */
export function isStaffVisibleSalesActivity(
  doc: SalesLeadDoc,
  actor: StaffActor,
): boolean {
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
  const recorderId = staffRecordedActivityUserId(doc);
  if (recorderId == null || recorderId !== actor.userId) {
    return false;
  }
  return true;
}

export function mapStaffVisibleSalesActivity(
  doc: SalesLeadDoc,
  actor: StaffActor,
): StaffSalesActivityRow | null {
  if (!isStaffVisibleSalesActivity(doc, actor)) return null;
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
  actor: StaffActor,
): StaffSalesActivityRow[] {
  const rows: StaffSalesActivityRow[] = [];
  for (const doc of docs) {
    const row = mapStaffVisibleSalesActivity(doc, actor);
    if (row) rows.push(row);
  }
  return rows;
}
