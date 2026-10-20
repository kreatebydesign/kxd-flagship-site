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
