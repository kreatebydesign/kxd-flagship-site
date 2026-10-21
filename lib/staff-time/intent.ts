import type { StaffWorkIntentCategory, StaffWorkIntentInput } from "./types";
import { STAFF_WORK_INTENT_CATEGORIES } from "./types";

export function isStaffWorkIntentCategory(value: unknown): value is StaffWorkIntentCategory {
  return (
    typeof value === "string" &&
    (STAFF_WORK_INTENT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function parseStaffWorkIntent(body: unknown): StaffWorkIntentInput {
  if (!body || typeof body !== "object") {
    throw new Error("WORK_INTENT_REQUIRED");
  }
  const record = body as Record<string, unknown>;
  const category = record.category;
  if (!isStaffWorkIntentCategory(category)) {
    throw new Error("WORK_INTENT_CATEGORY_INVALID");
  }

  const workIdRaw = record.workId;
  const clientIdRaw = record.clientId;
  const noteRaw = record.note;

  const workId =
    workIdRaw == null || workIdRaw === ""
      ? null
      : Number(workIdRaw);
  const clientId =
    clientIdRaw == null || clientIdRaw === ""
      ? null
      : Number(clientIdRaw);
  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 500) : null;

  if (category === "assigned_kxd_work") {
    if (!workId || !Number.isFinite(workId) || workId <= 0) {
      throw new Error("WORK_INTENT_WORK_ID_REQUIRED");
    }
  }

  if (category === "client_project") {
    if (!clientId || !Number.isFinite(clientId) || clientId <= 0) {
      throw new Error("WORK_INTENT_CLIENT_ID_REQUIRED");
    }
  }

  if (category === "other_authorized" && !note) {
    throw new Error("WORK_INTENT_NOTE_REQUIRED");
  }

  return {
    category,
    workId: workId && Number.isFinite(workId) ? workId : null,
    clientId: clientId && Number.isFinite(clientId) ? clientId : null,
    note,
  };
}

export function staffWorkIntentDetail(
  intent: StaffWorkIntentInput,
  context?: {
    workTitle?: string | null;
    clientLabel?: string | null;
  },
): string | null {
  if (intent.category === "assigned_kxd_work") {
    if (context?.workTitle?.trim()) return context.workTitle.trim();
    if (intent.workId) return `Work #${intent.workId}`;
  }
  if (intent.category === "client_project") {
    if (context?.clientLabel?.trim()) return context.clientLabel.trim();
    if (intent.clientId) return `Client #${intent.clientId}`;
  }
  if (intent.note?.trim()) return intent.note.trim();
  return null;
}

export function staffWorkIntentLabel(category: StaffWorkIntentCategory): string {
  switch (category) {
    case "assigned_kxd_work":
      return "Assigned KXD work";
    case "client_project":
      return "Client project";
    case "meeting":
      return "Meeting";
    case "training":
      return "Training";
    case "internal_operations":
      return "Internal operations";
    case "other_authorized":
      return "Other authorized work";
    default:
      return category;
  }
}
