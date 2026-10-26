import {
  STAFF_HOME_PATH,
  actorHasStaffCapability,
  isRestrictedStaff,
} from "@/lib/staff/permissions";
import type { StaffActor } from "@/lib/staff/types";
import { operatorStaffDocumentsPath, staffMayManageDocuments } from "./access.ts";

export type StaffDocumentsPageAccess =
  | { kind: "render" }
  | { kind: "redirect"; href: string };

/**
 * Employee "My documents" list — restricted staff only.
 * Full operators are sent to the oversight workspace.
 */
export function resolveStaffDocumentsListPageAccess(
  actor: StaffActor | null,
): StaffDocumentsPageAccess {
  if (!actor) {
    return { kind: "redirect", href: STAFF_HOME_PATH };
  }

  if (isRestrictedStaff(actor)) {
    if (!actorHasStaffCapability(actor, "staff.documents.read")) {
      return { kind: "redirect", href: STAFF_HOME_PATH };
    }
    return { kind: "render" };
  }

  if (staffMayManageDocuments(actor)) {
    return { kind: "redirect", href: operatorStaffDocumentsPath() };
  }

  return { kind: "redirect", href: STAFF_HOME_PATH };
}

/**
 * Operator oversight — full admin / founder only; restricted staff denied.
 */
export function resolveStaffDocumentsOversightPageAccess(
  actor: StaffActor | null,
): StaffDocumentsPageAccess {
  if (!actor) {
    return { kind: "redirect", href: STAFF_HOME_PATH };
  }

  if (isRestrictedStaff(actor)) {
    return { kind: "redirect", href: STAFF_HOME_PATH };
  }

  if (!staffMayManageDocuments(actor)) {
    return { kind: "redirect", href: STAFF_HOME_PATH };
  }

  return { kind: "render" };
}
