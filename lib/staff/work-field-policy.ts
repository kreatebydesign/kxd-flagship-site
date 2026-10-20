/**
 * Field-level authorization for restricted staff work mutations.
 * Operators bypass this layer; staff may only update execution-safe fields.
 */
import type { UpdateWorkItemInput } from "@/lib/work/types";
import type { WorkListItem, WorkStatus } from "@/lib/work/types";
import type { StaffActor } from "./types";
import { assertRestrictedStaffWorkStatusTransition } from "./work-status-policy";

const FORBIDDEN_BODY_KEYS = new Set([
  "status",
  "priority",
  "clientId",
  "assignedToId",
  "project",
  "internalProject",
  "dueDate",
  "startDate",
  "plannedForDate",
  "estimatedEffort",
  "tags",
  "category",
  "summary",
  "description",
  "acceptanceCriteria",
  "title",
  "clientVisible",
  "timelineEnabled",
  "source",
  "sourceId",
  "assignmentDeliverables",
  "items",
]);

const ALLOWED_BODY_KEYS = new Set(["notes"]);

function bodyKeyProvided(body: Record<string, unknown>, key: string): boolean {
  if (!(key in body)) return false;
  const value = body[key];
  if (value === undefined) return false;
  if (value === null) return key === "notes";
  if (typeof value === "string" && !value.trim()) return false;
  return true;
}

export class StaffWorkFieldPolicyError extends Error {
  readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = "StaffWorkFieldPolicyError";
  }
}

/**
 * Build an operator-safe update patch from a JSON body.
 * Restricted staff: reject forbidden keys; allow notes only; status via policy when present.
 */
export function buildStaffAwareWorkUpdatePatch(
  actor: StaffActor,
  work: WorkListItem,
  body: Record<string, unknown>,
): Pick<UpdateWorkItemInput, "notes"> {
  const forbidden: string[] = [];
  for (const key of Object.keys(body)) {
    if (!bodyKeyProvided(body, key)) continue;
    if (ALLOWED_BODY_KEYS.has(key)) continue;
    if (FORBIDDEN_BODY_KEYS.has(key)) forbidden.push(key);
    else forbidden.push(key);
  }

  if (forbidden.length > 0) {
    throw new StaffWorkFieldPolicyError(
      `Staff permission denied: cannot modify field(s): ${forbidden.join(", ")}.`,
    );
  }

  if (bodyKeyProvided(body, "status")) {
    const nextStatus = String(body.status) as WorkStatus;
    assertRestrictedStaffWorkStatusTransition(actor, work, nextStatus);
    throw new StaffWorkFieldPolicyError(
      "Staff permission denied: use the work status action instead of PATCH status.",
    );
  }

  const notes =
    body.notes === undefined
      ? undefined
      : body.notes === null
        ? null
        : String(body.notes).trim() || null;

  if (notes === undefined) {
    throw new StaffWorkFieldPolicyError(
      "Staff permission denied: only execution notes may be updated on this endpoint.",
    );
  }

  return { notes };
}
