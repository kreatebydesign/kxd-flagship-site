import type {
  StaffDocumentKind,
  StaffDocumentSigningMode,
  StaffDocumentStatus,
} from "./types.ts";

export type StaffDocumentStatusBadge = {
  label: string;
  variant: "warning" | "success" | "default" | "critical";
};

export function staffDocumentKindLabel(kind: StaffDocumentKind): string {
  switch (kind) {
    case "employment-agreement":
      return "Employment agreement";
    case "confidentiality-nda":
      return "NDA";
    case "ip-assignment":
      return "IP assignment";
    case "staff-policy":
      return "Staff policy";
    case "policy-acknowledgment":
      return "Policy acknowledgment";
    default:
      return kind;
  }
}

/** Operator-facing labels for real employee document templates. */
export function staffDocumentKindOperatorLabel(kind: StaffDocumentKind): string {
  switch (kind) {
    case "confidentiality-nda":
      return "Confidentiality and Non-Disclosure Agreement";
    case "ip-assignment":
      return "Intellectual Property and Work Product Agreement";
    case "staff-policy":
      return "Information Security and Client Data Policy";
    case "employment-agreement":
      return "Employment Agreement";
    default:
      return staffDocumentKindLabel(kind);
  }
}

export function staffDocumentTemplateStatusLabel(
  status: import("./types.ts").StaffDocumentTemplateStatus,
): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "legal-review":
      return "Legal review";
    case "approved-for-use":
      return "Approved for use";
    case "retired":
      return "Retired";
    default:
      return status;
  }
}

export function staffDocumentStatusBadge(input: {
  status: StaffDocumentStatus;
  signingMode: StaffDocumentSigningMode;
}): StaffDocumentStatusBadge {
  const { status, signingMode } = input;
  if (signingMode === "acknowledgment") {
    switch (status) {
      case "assigned":
        return { label: "Acknowledgment required", variant: "warning" };
      case "acknowledged":
        return { label: "Acknowledged", variant: "success" };
      case "revoked":
        return { label: "Revoked", variant: "default" };
      default:
        return { label: status, variant: "default" };
    }
  }

  switch (status) {
    case "assigned":
      return { label: "Signature required", variant: "warning" };
    case "awaiting-operator-signature":
      return { label: "Awaiting KXD signature", variant: "warning" };
    case "executing":
      return { label: "Finalizing execution", variant: "warning" };
    case "executed":
      return { label: "Executed", variant: "success" };
    case "declined":
      return { label: "Declined", variant: "default" };
    case "revoked":
      return { label: "Revoked", variant: "default" };
    case "expired":
      return { label: "Expired", variant: "default" };
    default:
      return { label: status, variant: "default" };
  }
}

export function staffDocumentAttentionLabel(input: {
  signingMode: StaffDocumentSigningMode;
}): string {
  return input.signingMode === "dual-signature"
    ? "Signature required"
    : "Acknowledgment required";
}

/** Primary CTA on the employee list when action is required. */
export function staffDocumentEmployeeReviewAction(input: {
  status: StaffDocumentStatus;
  signingMode: StaffDocumentSigningMode;
}): string | null {
  if (input.status !== "assigned") return null;
  return input.signingMode === "acknowledgment" ? "Review & acknowledge" : "Review & sign";
}

export function formatStaffDocumentListDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function staffDocumentAssignmentNextAction(input: {
  status: StaffDocumentStatus;
  signingMode: StaffDocumentSigningMode;
}): string {
  if (input.signingMode === "acknowledgment") {
    if (input.status === "assigned") return "Employee acknowledgment required";
    if (input.status === "acknowledged") return "Complete";
    if (input.status === "revoked") return "Revoked";
    return staffDocumentStatusBadge(input).label;
  }
  switch (input.status) {
    case "assigned":
      return "Employee signature required";
    case "awaiting-operator-signature":
      return "KXD countersignature required";
    case "executing":
      return "Finalizing execution";
    case "executed":
      return "Executed — download available";
    case "declined":
      return "Declined by employee";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    default:
      return staffDocumentStatusBadge(input).label;
  }
}
