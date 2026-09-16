/**
 * Hosting + annual renewal commercial authority read model.
 * Distinguishes service start, billing due, payment, entitlement, renewal.
 * Never invents annual amounts — MISSING AUTHORITY when untrustworthy.
 */

import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import {
  daysRemainingDateOnly,
  evaluateHostingRenewalReadiness,
} from "@/lib/infrastructure/hosting-renewal-readiness";
import type {
  HostingAutoChargeMode,
  HostingCommercialAuthority,
  HostingRenewalLifecycle,
} from "./types";

const CLOSED = new Set(["paid", "waived", "cancelled", "void"]);

function parseAutoCharge(raw: unknown): HostingAutoChargeMode {
  const s = String(raw ?? "unknown");
  if (s === "manual" || s === "invoice" || s === "authorized_auto" || s === "unknown") {
    return s;
  }
  return "unknown";
}

function parseLifecycle(raw: unknown): HostingRenewalLifecycle {
  const s = String(raw ?? "unknown");
  const allowed: HostingRenewalLifecycle[] = [
    "unknown",
    "upcoming",
    "notice_due",
    "notice_sent",
    "renewal_scheduled",
    "charge_due",
    "paid",
    "next_renewal",
  ];
  return (allowed as string[]).includes(s) ? (s as HostingRenewalLifecycle) : "unknown";
}

/** Derive 30-day notice lifecycle from renewal/due date when not explicitly set. */
export function deriveRenewalLifecycle(input: {
  explicit: HostingRenewalLifecycle;
  renewalOrDueDate: string | null;
  noticeSentAt: string | null;
  paid: boolean;
  now?: Date;
}): HostingRenewalLifecycle {
  if (input.explicit !== "unknown") return input.explicit;
  if (input.paid) return "paid";
  if (input.noticeSentAt) return "notice_sent";
  const days = daysRemainingDateOnly(input.renewalOrDueDate, input.now);
  if (days == null) return "unknown";
  if (days < 0) return "charge_due";
  if (days <= 30) return "notice_due";
  if (days <= 90) return "upcoming";
  return "upcoming";
}

export function extractHostingFromContractPackage(
  pkgRaw: unknown,
): Array<{
  title: string;
  annualAmountCents: number;
  serviceStartDate: string | null;
  billingDueDate: string | null;
  status: string;
  kind: string;
  obligationId: string | null;
}> {
  const pkg = normalizeLifecyclePackage(pkgRaw);
  const rows: Array<{
    title: string;
    annualAmountCents: number;
    serviceStartDate: string | null;
    billingDueDate: string | null;
    status: string;
    kind: string;
    obligationId: string | null;
  }> = [];

  for (const charge of pkg.structuredPaymentTerms?.ancillaryCharges ?? []) {
    const kind = String(charge.kind ?? "");
    const title = String(charge.title ?? "");
    const isHosting =
      kind === "managed-hosting" || /managed\s+website\s+hosting|kxd\s+hosting/i.test(title);
    const isVault = kind === "media-vault" || /media\s*vault/i.test(title);
    const isDomain = kind === "domain-registration" || /domain/i.test(title);
    if (!isHosting && !isVault && !isDomain) continue;
    const amount = Number(charge.amountCents ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    rows.push({
      title,
      annualAmountCents: amount,
      // Ancillary dueDate is often service/start signal — keep separate from obligation due.
      serviceStartDate: charge.dueDate ?? null,
      billingDueDate: null,
      status: String(charge.status ?? "pending-trigger"),
      kind: isHosting ? "managed-hosting" : isVault ? "media-vault" : "domain",
      obligationId: null,
    });
  }

  for (const obl of pkg.billingPlan?.obligations ?? []) {
    if (CLOSED.has(String(obl.status))) continue;
    const label = String(obl.label ?? "");
    const kind = String(obl.kind ?? "");
    const isHosting =
      kind === "addon" && /hosting/i.test(label);
    const isVault = /media\s*vault/i.test(label);
    const isDomain = /domain/i.test(label);
    if (!isHosting && !isVault && !isDomain) continue;
    const amount = Number(obl.amountCents ?? 0) - Number(obl.amountPaidCents ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const match = rows.find(
      (r) =>
        (isHosting && r.kind === "managed-hosting") ||
        (isVault && r.kind === "media-vault") ||
        (isDomain && r.kind === "domain"),
    );
    if (match) {
      match.billingDueDate = obl.dueDate ?? match.billingDueDate;
      match.obligationId = obl.id;
      match.status = String(obl.status);
      // Prefer obligation remaining amount when present.
      match.annualAmountCents = amount;
    } else {
      rows.push({
        title: label,
        annualAmountCents: amount,
        serviceStartDate: null,
        billingDueDate: obl.dueDate ?? null,
        status: String(obl.status),
        kind: isHosting ? "managed-hosting" : isVault ? "media-vault" : "domain",
        obligationId: obl.id,
      });
    }
  }

  return rows;
}

export function buildHostingCommercialAuthority(input: {
  clientId: number;
  clientName: string;
  contractPackages?: unknown[];
  infrastructure?: {
    annualRenewalCost?: number | null;
    nextRenewalDate?: string | null;
    hostingProvider?: string | null;
    domainExpirationDate?: string | null;
    hostingAutoChargeMode?: unknown;
    hostingRenewalLifecycle?: unknown;
    hostingServiceStartDate?: string | null;
    hostingAnnualAmountCents?: number | null;
    renewalNoticeSentAt?: string | null;
  } | null;
  /** When true, do not invent $299 from hosting presence alone. */
  requireExplicitAmount?: boolean;
}): HostingCommercialAuthority[] {
  const autoChargeMode = parseAutoCharge(input.infrastructure?.hostingAutoChargeMode);
  const explicitLifecycle = parseLifecycle(input.infrastructure?.hostingRenewalLifecycle);
  const noticeSentAt = input.infrastructure?.renewalNoticeSentAt ?? null;
  const results: HostingCommercialAuthority[] = [];

  for (const pkg of input.contractPackages ?? []) {
    for (const row of extractHostingFromContractPackage(pkg)) {
      const renewalOrDue = row.billingDueDate ?? row.serviceStartDate;
      results.push({
        clientId: input.clientId,
        clientName: input.clientName,
        serviceTitle: row.title,
        status: row.status === "pending-trigger" ? "pending_trigger" : "active",
        serviceStartDate: row.serviceStartDate,
        billingDueDate: row.billingDueDate,
        renewalDate: renewalOrDue,
        annualAmountCents: row.annualAmountCents,
        amountAuthority: "contract",
        autoChargeMode,
        renewalLifecycle: deriveRenewalLifecycle({
          explicit: explicitLifecycle,
          renewalOrDueDate: renewalOrDue,
          noticeSentAt,
          paid: false,
        }),
        noticeSentAt,
        domainAnnualCents: row.kind === "domain" ? row.annualAmountCents : null,
      });
    }
  }

  if (results.length > 0) return results;

  const infraAmount =
    input.infrastructure?.hostingAnnualAmountCents != null
      ? Number(input.infrastructure.hostingAnnualAmountCents)
      : input.infrastructure?.annualRenewalCost != null
        ? Math.round(Number(input.infrastructure.annualRenewalCost) * 100)
        : null;

  const hasInfraSignal =
    Boolean(input.infrastructure?.hostingProvider) ||
    Boolean(input.infrastructure?.nextRenewalDate) ||
    (infraAmount != null && infraAmount > 0);

  if (!hasInfraSignal) {
    return [
      {
        clientId: input.clientId,
        clientName: input.clientName,
        serviceTitle: "KXD Managed Hosting",
        status: "missing_authority",
        serviceStartDate: input.infrastructure?.hostingServiceStartDate ?? null,
        billingDueDate: null,
        renewalDate: input.infrastructure?.nextRenewalDate ?? null,
        annualAmountCents: null,
        amountAuthority: "missing",
        autoChargeMode,
        renewalLifecycle: "unknown",
        noticeSentAt,
        domainAnnualCents: null,
      },
    ];
  }

  const amountOk = infraAmount != null && Number.isFinite(infraAmount) && infraAmount > 0;
  if (!amountOk && input.requireExplicitAmount !== false) {
    // Soft readiness for ops visibility — still MISSING AUTHORITY for commercial totals.
    evaluateHostingRenewalReadiness({
      hostingProvider: input.infrastructure?.hostingProvider,
      nextRenewalDate: input.infrastructure?.nextRenewalDate,
      domainExpirationDate: input.infrastructure?.domainExpirationDate,
    });
    return [
      {
        clientId: input.clientId,
        clientName: input.clientName,
        serviceTitle: "KXD Managed Hosting",
        status: "missing_authority",
        serviceStartDate: input.infrastructure?.hostingServiceStartDate ?? null,
        billingDueDate: null,
        renewalDate: input.infrastructure?.nextRenewalDate ?? null,
        annualAmountCents: null,
        amountAuthority: "missing",
        autoChargeMode,
        renewalLifecycle: deriveRenewalLifecycle({
          explicit: explicitLifecycle,
          renewalOrDueDate: input.infrastructure?.nextRenewalDate ?? null,
          noticeSentAt,
          paid: false,
        }),
        noticeSentAt,
        domainAnnualCents: null,
      },
    ];
  }

  return [
    {
      clientId: input.clientId,
      clientName: input.clientName,
      serviceTitle: "KXD Managed Hosting",
      status: "unknown",
      serviceStartDate: input.infrastructure?.hostingServiceStartDate ?? null,
      billingDueDate: null,
      renewalDate: input.infrastructure?.nextRenewalDate ?? null,
      annualAmountCents: amountOk ? infraAmount : null,
      amountAuthority: amountOk ? "infrastructure" : "missing",
      autoChargeMode,
      renewalLifecycle: deriveRenewalLifecycle({
        explicit: explicitLifecycle,
        renewalOrDueDate: input.infrastructure?.nextRenewalDate ?? null,
        noticeSentAt,
        paid: false,
      }),
      noticeSentAt,
      domainAnnualCents: null,
    },
  ];
}
