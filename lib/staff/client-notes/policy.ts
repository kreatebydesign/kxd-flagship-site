import type { StaffActor } from "../types";
import { actorHasStaffCapability, isRestrictedStaff } from "../permissions";

export type StaffClientNoteKind = "note" | "question";

export function staffMayUseClientNotesApi(actor: StaffActor): boolean {
  return actorHasStaffCapability(actor, "staff.notes.internal");
}

export function staffMayReadClientNotesForClient(
  actor: StaffActor,
  clientAssigned: boolean,
): boolean {
  if (!staffMayUseClientNotesApi(actor)) return false;
  if (!isRestrictedStaff(actor)) return true;
  return clientAssigned;
}

export function staffMayCreateClientNote(
  actor: StaffActor,
  clientAssigned: boolean,
): boolean {
  if (!staffMayUseClientNotesApi(actor)) return false;
  if (!isRestrictedStaff(actor)) return false;
  return clientAssigned;
}

export function normalizeStaffClientNoteBody(body: string): string {
  return body.trim();
}

export function validateStaffClientNoteInput(input: {
  body: string;
  kind: StaffClientNoteKind;
}): { ok: true } | { ok: false; error: string } {
  const body = normalizeStaffClientNoteBody(input.body);
  if (body.length < 4) {
    return { ok: false, error: "Write at least a short sentence." };
  }
  if (body.length > 8000) {
    return { ok: false, error: "Note is too long." };
  }
  if (input.kind !== "note" && input.kind !== "question") {
    return { ok: false, error: "Invalid note kind." };
  }
  return { ok: true };
}
