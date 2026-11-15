import type { StaffActor } from "@/lib/staff/types";
import type { StaffEmploymentComplianceRecord } from "./compliance-types";

export function evaluatePaidShiftAllowed(
  actor: StaffActor,
  record: StaffEmploymentComplianceRecord | null,
): { allowed: boolean; reason: string } {
  if (actor.staffRole !== "junior_studio_teammate") {
    return { allowed: true, reason: "not_subject_to_minor_compliance_gate" };
  }
  if (!record) {
    return {
      allowed: false,
      reason:
        "Paid shift clock-in is blocked until owner completes employment authorization and payroll setup.",
    };
  }
  if (record.paidShiftActivation !== "allowed") {
    return {
      allowed: false,
      reason: "Paid shift clock-in is blocked by owner configuration.",
    };
  }
  if (record.employmentAuthorizationStatus !== "authorized") {
    return {
      allowed: false,
      reason: "Employment authorization is not approved yet.",
    };
  }
  if (!record.payrollSetupConfirmed) {
    return {
      allowed: false,
      reason: "Payroll setup has not been confirmed by the owner.",
    };
  }
  if (!record.ownerHourlyRateConfirmed) {
    return {
      allowed: false,
      reason: "Hourly rate has not been confirmed by the owner.",
    };
  }
  if (record.permitExpirationDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (record.permitExpirationDate < today) {
      return {
        allowed: false,
        reason: "Oregon permit expiration requires owner review before paid shifts.",
      };
    }
  }
  return { allowed: true, reason: "authorized" };
}