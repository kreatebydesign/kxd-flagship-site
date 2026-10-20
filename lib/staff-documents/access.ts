import type { StaffActor } from "@/lib/staff/types";
import { isRestrictedStaff, isFounderOrAdmin } from "@/lib/staff/permissions";

export function staffMayManageDocuments(actor: StaffActor): boolean {
  return isFounderOrAdmin(actor) || actor.role === "admin";
}

export function staffDocumentStaffPath(documentId: number): string {
  return `/admin/operations/staff/documents/${documentId}`;
}

export function staffDocumentsListPath(): string {
  return "/admin/operations/staff/documents";
}

export function operatorStaffDocumentsPath(): string {
  return "/admin/operations/staff/oversight/documents";
}

/** Restricted staff may only access their own document rows. */
export function assertStaffDocumentRowAccess(
  actor: StaffActor,
  staffUserId: number,
): void {
  if (!isRestrictedStaff(actor)) return;
  if (actor.userId !== staffUserId) {
    throw new Error("Staff permission denied: document belongs to another employee.");
  }
}
