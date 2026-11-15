export type StaffDiscretionaryBonusStatus = "active" | "voided";

export type StaffDiscretionaryBonusPaymentStatus = "pending" | "paid" | "voided";

export type StaffDiscretionaryBonusAuditEvent = {
  id: string;
  at: string;
  actorUserId: number;
  action: string;
  note: string | null;
  detail: Record<string, unknown> | null;
};

export type StaffDiscretionaryBonusView = {
  id: number;
  staffUserId: number;
  amountCents: number;
  reason: string;
  bonusDate: string;
  idempotencyKey: string;
  status: StaffDiscretionaryBonusStatus;
  paymentStatus: StaffDiscretionaryBonusPaymentStatus;
  paymentRecordedAt: string | null;
  paymentReference: string | null;
  paymentIdempotencyKey: string | null;
  createdByUserId: number;
  createdAt: string;
  auditEvents: StaffDiscretionaryBonusAuditEvent[];
};

export type RecordStaffDiscretionaryBonusInput = {
  staffUserId: number;
  amountCents: number;
  reason: string;
  bonusDate: string;
  idempotencyKey: string;
};

export const STAFF_DISCRETIONARY_BONUS_DISCLAIMER =
  "Discretionary bonuses are separate from hourly shift earnings. They do not change recorded wage payment allocations. Not legal payroll advice.";