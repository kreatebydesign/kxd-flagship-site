import "server-only";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const STAFF_TIME_SHIFT_IMMUTABLE_AFTER_COMPLETE = [
  "startedAt",
  "staffUser",
  "workTimezone",
  "localDateKey",
  "workIntentCategory",
  "workIntentWorkId",
  "workIntentClientId",
  "endedAt",
  "status",
  "payPeriodId",
] as const;

const OPERATOR_CORRECTION_ALLOWED_FIELDS = new Set([
  "startedAt",
  "endedAt",
  "localDateKey",
  "payPeriodId",
  "auditEvents",
]);

const CLOCK_END_ALLOWED_FIELDS = new Set(["status", "endedAt", "auditEvents"]);

export function assertStaffTimeAuditEventsAppendOnly(
  originalDoc: AnyDoc,
  data: AnyDoc,
): void {
  const originalAudit = originalDoc.auditEvents;
  const nextAudit = data.auditEvents ?? originalAudit;
  const originalEntries = Array.isArray(originalAudit) ? originalAudit : [];
  const nextEntries = Array.isArray(nextAudit) ? nextAudit : [];
  if (nextEntries.length < originalEntries.length) {
    throw new Error("staff time auditEvents are append-only.");
  }
  const prefixOk = originalEntries.every((entry, index) => {
    const next = nextEntries[index];
    if (!next || typeof entry !== "object" || typeof next !== "object") {
      return false;
    }
    const a = entry as AnyDoc;
    const b = next as AnyDoc;
    return (
      String(a.id ?? "") === String(b.id ?? "") &&
      String(a.at ?? "") === String(b.at ?? "") &&
      String(a.action ?? "") === String(b.action ?? "") &&
      Number(a.actorUserId ?? 0) === Number(b.actorUserId ?? 0)
    );
  });
  if (!prefixOk) {
    throw new Error("staff time auditEvents are append-only.");
  }
}

function fieldChanged(data: AnyDoc, originalDoc: AnyDoc, field: string): boolean {
  if (!(field in data)) return false;
  return data[field] !== originalDoc[field];
}

function assertOnlyFieldsChanged(
  data: AnyDoc,
  originalDoc: AnyDoc,
  allowed: Set<string>,
): void {
  const keys = new Set([...Object.keys(data), ...Object.keys(originalDoc)]);
  for (const key of keys) {
    if (key === "id" || key === "updatedAt" || key === "createdAt") continue;
    if (!fieldChanged(data, originalDoc, key)) continue;
    if (!allowed.has(key)) {
      throw new Error(`Staff time shift field "${key}" cannot be changed through this path.`);
    }
  }
}

export function validateStaffTimeShiftCreate(data: AnyDoc, operatorBypass: boolean): void {
  const status = String(data.status ?? "active");
  if (status === "completed" && !operatorBypass) {
    throw new Error(
      "Completed staff shifts cannot be created directly. Use operator correction workflow.",
    );
  }
  if (status !== "active" && status !== "completed") {
    throw new Error("Staff time shifts must start as active or operator-completed.");
  }
}

export function validateStaffTimeShiftUpdate(input: {
  data: AnyDoc;
  originalDoc: AnyDoc;
  operatorBypass: boolean;
}): void {
  const { data, originalDoc, operatorBypass } = input;
  const status = String(originalDoc.status ?? "");

  assertStaffTimeAuditEventsAppendOnly(originalDoc, data);

  if (operatorBypass) {
    assertOnlyFieldsChanged(data, originalDoc, OPERATOR_CORRECTION_ALLOWED_FIELDS);
    return;
  }

  if (status === "completed" || status === "voided") {
    for (const field of STAFF_TIME_SHIFT_IMMUTABLE_AFTER_COMPLETE) {
      if (field in data && data[field] !== originalDoc[field]) {
        throw new Error(
          `Completed staff shifts cannot change ${field}. Use correction workflow.`,
        );
      }
    }
    return;
  }

  if (status === "active") {
    assertOnlyFieldsChanged(data, originalDoc, CLOCK_END_ALLOWED_FIELDS);
    if (fieldChanged(data, originalDoc, "status")) {
      const nextStatus = String(data.status ?? "");
      if (nextStatus !== "completed") {
        throw new Error("Active staff shifts may only transition to completed via clock-out.");
      }
    }
    return;
  }

  throw new Error("Staff time shift status cannot be changed through this path.");
}
