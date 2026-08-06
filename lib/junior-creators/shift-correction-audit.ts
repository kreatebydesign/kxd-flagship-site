/**
 * Shared junior shift correction audit helpers.
 * Used by admin API mutations and one-off repair scripts.
 */
export type ShiftMoneyState = {
  status: string | null;
  totalMinutes: number | null;
  hourlyRateCents: number | null;
  payAdjustmentCents: number | null;
  startedAt: string | null;
  endedAt: string | null;
  weekKey: string | null;
};

export function shiftMoneyState(
  source: Record<string, unknown> | null,
): ShiftMoneyState | null {
  if (!source) return null;
  return {
    status: source.status ? String(source.status) : null,
    totalMinutes: source.totalMinutes == null ? null : Number(source.totalMinutes),
    hourlyRateCents:
      source.hourlyRateCents == null ? null : Number(source.hourlyRateCents),
    payAdjustmentCents:
      source.payAdjustmentCents == null ? null : Number(source.payAdjustmentCents),
    startedAt: source.startedAt ? String(source.startedAt) : null,
    endedAt: source.endedAt ? String(source.endedAt) : null,
    weekKey: source.weekKey ? String(source.weekKey) : null,
  };
}

export function existingCorrectionAudit(source: Record<string, unknown>): unknown[] {
  return Array.isArray(source.correctionAudit) ? [...source.correctionAudit] : [];
}

export function adminIdentity(user: Record<string, unknown>) {
  return {
    id: user.id ?? null,
    email: user.email ? String(user.email) : null,
    collection: user.collection ? String(user.collection) : "users",
  };
}

export function correctionAuditEntry(args: {
  action: string;
  reason: string;
  admin: Record<string, unknown>;
  original: ShiftMoneyState | null;
  corrected: ShiftMoneyState;
  at?: string;
}) {
  return {
    action: args.action,
    reason: args.reason,
    at: args.at ?? new Date().toISOString(),
    admin: adminIdentity(args.admin),
    original: args.original,
    corrected: args.corrected,
  };
}

export function appendAdminNote(
  existing: string | null | undefined,
  line: string,
): string {
  const base = existing?.trim() ?? "";
  return base ? `${base}\n\n${line}` : line;
}

export function adminAuditLine(action: string, note: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `[Admin ${action} ${date}] ${note.trim()}`;
}

export function getRelatedId(value: unknown): number {
  if (typeof value === "object" && value && "id" in value) {
    return Number((value as { id: unknown }).id);
  }
  return Number(value);
}
