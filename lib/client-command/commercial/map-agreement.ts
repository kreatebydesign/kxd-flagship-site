import { formatCents } from "@/lib/proposal-builder/money";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import type { DirectAgreementTerms } from "@/lib/direct-agreement/types";
import type {
  CommercialAgreementRow,
  CommercialDocumentKindLabel,
  CommercialOverviewSnapshot,
} from "./types";
import { commercialAgreementHref } from "./sections";

export function documentKindLabel(kind: string): CommercialDocumentKindLabel {
  switch (kind) {
    case "direct-agreement":
    case "executed-contract":
    case "accepted-proposal":
      return kind === "accepted-proposal" ? "Proposal" : "Agreement";
    case "invoice":
      return "Invoice";
    case "receipt":
      return "Receipt";
    case "authorization-evidence":
      return "Authorization evidence";
    case "billing-summary":
      return "Billing summary";
    case "certificate":
      return "Execution certificate";
    case "package-manifest":
      return "Package";
    default:
      return "Document";
  }
}

export function formatCommercialStatus(status: string | null | undefined): string {
  if (!status) return "Draft";
  const map: Record<string, string> = {
    draft: "Draft",
    finalized: "Finalized",
    sent: "Sent",
    accepted: "Accepted",
    "payment-pending": "Payment pending",
    paid: "Paid",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    executed: "Executed",
    "sent-for-signature": "Awaiting signature",
    "partially-signed": "Partially signed",
  };
  return map[status] ?? status.replace(/-/g, " ");
}

export function formatPaymentMethodLabel(
  brand: string | null | undefined,
  last4: string | null | undefined,
): string {
  if (brand && last4) {
    const nice = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
    return `${nice} •••• ${last4}`;
  }
  if (last4) return `Card •••• ${last4}`;
  return "Not on file";
}

export function centsToDollars(cents: number | null | undefined): number | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return cents / 100;
}

export function buildAgreementRow(input: {
  clientId: number;
  contractId: number;
  title: string;
  contractStatus: string;
  agreementSource: string | null;
  contractType: string | null;
  createdAt: string | null;
  proposalId: number | null;
  pkg: ContractLifecyclePackage;
  daTerms: DirectAgreementTerms | null;
}): CommercialAgreementRow {
  const terms = input.pkg.structuredPaymentTerms;
  const projectCents =
    input.daTerms?.oneTimeAmountCents ??
    terms?.oneTimeTotalCents ??
    null;
  const monthlyCents =
    input.daTerms?.monthlyAmountCents ??
    terms?.monthlyTotalCents ??
    null;

  const valueParts: string[] = [];
  if (projectCents != null && projectCents > 0) valueParts.push(formatCents(projectCents as never));
  if (monthlyCents != null && monthlyCents > 0) {
    valueParts.push(`${formatCents(monthlyCents as never)}/mo`);
  }
  if (valueParts.length === 0) valueParts.push("—");

  const commercial = input.pkg.commercialStatus;
  const status = commercial || input.contractStatus;
  const sourceLabel =
    input.agreementSource === "direct-agreement" ? "Direct Agreement" : "From proposal";

  return {
    id: input.contractId,
    title: input.title,
    status,
    statusLabel: formatCommercialStatus(status),
    typeLabel: input.contractType?.replace(/-/g, " ") || "Agreement",
    sourceLabel,
    valueLabel: valueParts.join(" · "),
    projectAmountCents: projectCents,
    monthlyAmountCents: monthlyCents,
    serviceStartDate: input.daTerms?.serviceStartDate ?? null,
    serviceEndDate: input.daTerms?.serviceEndDate ?? null,
    createdAt: input.createdAt,
    acceptedAt:
      input.pkg.externalAcceptance?.acceptedAt ??
      input.pkg.executedCertificate?.clientSignedAt ??
      input.pkg.clientSignature?.signedAt ??
      null,
    href: commercialAgreementHref(input.clientId, input.contractId),
    proposalId: input.proposalId,
  };
}

export function buildOverviewFromPrimary(input: {
  clientId: number;
  agreement: CommercialAgreementRow | null;
  pkg: ContractLifecyclePackage | null;
  daTerms: DirectAgreementTerms | null;
  documentKinds: CommercialDocumentKindLabel[];
  lastActivityLabel: string | null;
}): CommercialOverviewSnapshot {
  const agreement = input.agreement;
  const pkg = input.pkg;
  const da = input.daTerms;
  const auth = pkg?.paymentAuthorization;
  const refs = pkg?.paymentReferences;
  const hours = da?.capacityHoursPerMonth ?? null;

  const outstanding: string[] = [];
  if (agreement) {
    const st = agreement.status;
    if (["draft", "finalized", "sent"].includes(st)) {
      outstanding.push("Acceptance not yet recorded");
    }
    if (["accepted", "payment-pending"].includes(st)) {
      outstanding.push("Payment not yet marked");
    }
    if (st === "paid") {
      outstanding.push("Service not yet activated");
    }
  } else {
    outstanding.push("No agreement on file");
  }

  const invoiceCents =
    agreement?.projectAmountCents ??
    pkg?.structuredPaymentTerms?.oneTimeTotalCents ??
    null;

  return {
    agreementTitle: agreement?.title ?? null,
    agreementId: agreement?.id ?? null,
    agreementHref: agreement?.href ?? null,
    statusLabel: agreement?.statusLabel ?? "None",
    paymentStatusLabel: formatCommercialStatus(
      refs?.paymentStatus ||
        (pkg?.commercialStatus === "paid" || pkg?.commercialStatus === "active"
          ? "paid"
          : pkg?.commercialStatus === "payment-pending"
            ? "payment-pending"
            : "pending"),
    ),
    invoiceAmountLabel:
      invoiceCents != null && invoiceCents > 0 ? formatCents(invoiceCents as never) : "—",
    termStart: agreement?.serviceStartDate ?? da?.serviceStartDate ?? null,
    termEnd: agreement?.serviceEndDate ?? da?.serviceEndDate ?? null,
    hoursIncludedLabel: hours != null ? `${hours} per month` : "—",
    hoursUsedLabel: "Not tracked yet",
    hoursRemainingLabel: "Not tracked yet",
    paymentMethodLabel: formatPaymentMethodLabel(auth?.cardBrand, auth?.cardLast4),
    renewalLabel: da?.autoRenew
      ? "Auto-renew enabled"
      : da?.renewalBehavior || (agreement ? "No automatic renewal" : "—"),
    lastActivityLabel: input.lastActivityLabel,
    outstandingItems: outstanding,
    documentKindsPresent: input.documentKinds,
  };
}
