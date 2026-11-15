export function staffEmploymentComplianceErrorResponse(error: unknown): {
  status: number;
  message: string;
} {
  const code = error instanceof Error ? error.message : "COMPLIANCE_UNKNOWN";
  switch (code) {
    case "COMPLIANCE_OWNER_ONLY":
      return { status: 403, message: "Only the owner may manage employment compliance records." };
    case "COMPLIANCE_MIGRATION_REQUIRED":
    case "PAID_SHIFT_COMPLIANCE_MIGRATION_REQUIRED":
      return {
        status: 503,
        message: "Employment compliance migration pending (20261116_staff_minor_employment_compliance).",
      };
    case "PAID_SHIFT_BLOCKED":
      return {
        status: 403,
        message:
          "Paid shift clock-in is blocked until employment authorization and payroll setup are confirmed.",
      };
    default:
      return {
        status: 500,
        message: error instanceof Error ? error.message : "Compliance request failed.",
      };
  }
}