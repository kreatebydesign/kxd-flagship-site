import type { StaffTimeAuditEvent } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function readShiftAuditEvents(doc: AnyDoc): StaffTimeAuditEvent[] {
  if (!Array.isArray(doc.auditEvents)) return [];
  return doc.auditEvents
    .map((row: AnyDoc) => ({
      id: String(row.id ?? ""),
      at: String(row.at ?? ""),
      actorUserId: Number(row.actorUserId ?? 0),
      action: String(row.action ?? ""),
      reason: row.reason ? String(row.reason) : null,
      detail:
        row.detail && typeof row.detail === "object"
          ? (row.detail as Record<string, unknown>)
          : null,
    }))
    .filter((row) => row.id && row.at && row.action);
}

export function appendShiftAuditEvent(
  existing: StaffTimeAuditEvent[],
  entry: Omit<StaffTimeAuditEvent, "id"> & { id?: string },
): StaffTimeAuditEvent[] {
  const id =
    entry.id ??
    `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return [
    ...existing,
    {
      id,
      at: entry.at,
      actorUserId: entry.actorUserId,
      action: entry.action,
      reason: entry.reason ?? null,
      detail: entry.detail ?? null,
    },
  ];
}
