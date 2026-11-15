import type { StaffEmploymentComplianceAuditEvent } from "./compliance-types";

export function readStaffEmploymentComplianceAudit(
  raw: unknown,
): StaffEmploymentComplianceAuditEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        id: String(entry.id ?? ""),
        at: String(entry.at ?? ""),
        actorUserId: Number(entry.actorUserId ?? 0),
        action: String(entry.action ?? ""),
        note: entry.note ? String(entry.note) : null,
        detail:
          entry.detail && typeof entry.detail === "object"
            ? (entry.detail as Record<string, unknown>)
            : null,
      };
    })
    .filter((e) => e.id && e.at && e.action);
}

export function appendStaffEmploymentComplianceAudit(
  existing: StaffEmploymentComplianceAuditEvent[],
  entry: Omit<StaffEmploymentComplianceAuditEvent, "id"> & { id?: string },
): StaffEmploymentComplianceAuditEvent[] {
  const id =
    entry.id ?? `staff-compliance-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return [
    ...existing,
    {
      id,
      at: entry.at,
      actorUserId: entry.actorUserId,
      action: entry.action,
      note: entry.note ?? null,
      detail: entry.detail ?? null,
    },
  ];
}