/**
 * Build a live Account Statement from authoritative contract ledger obligations.
 *
 * Read-only composition — never writes obligations, payments, Stripe, or invoices.
 */

import {
  composeAccountStatement,
  type ComposeAccountStatementResult,
} from "@/lib/commercial-documents/account-statement";
import { ensurePayableSurfacesOnPlan } from "@/lib/proposal-lifecycle/ensure-payable-surfaces";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
} from "@/lib/proposal-lifecycle/types";

export type LiveAccountStatementContractInput = {
  id: number;
  title: string;
  lifecyclePackage: unknown;
};

export type BuildLiveAccountStatementInput = {
  clientId: number;
  clientName: string;
  clientSlug?: string | null;
  contactName?: string | null;
  contracts: LiveAccountStatementContractInput[];
  /** YYYY-MM-DD. Defaults to today (UTC). */
  statementDate?: string;
  primaryAgreementId?: number | null;
};

export type LiveAccountStatementView = {
  clientId: number;
  statementDate: string;
  document: ComposeAccountStatementResult["document"];
  ledger: ComposeAccountStatementResult["ledger"];
  primaryAgreementId: number | null;
  agreementTitle: string | null;
  openBalanceCount: number;
  paymentCount: number;
};

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function collectObligations(
  contracts: LiveAccountStatementContractInput[],
): {
  obligations: InvoiceObligation[];
  primary: LiveAccountStatementContractInput | null;
} {
  const obligations: InvoiceObligation[] = [];
  let primary: LiveAccountStatementContractInput | null = null;

  for (const contract of contracts) {
    const pkg = normalizeLifecyclePackage(
      contract.lifecyclePackage,
    ) as ContractLifecyclePackage;
    if (!pkg.billingPlan) continue;
    const plan = ensurePayableSurfacesOnPlan(
      pkg.billingPlan,
      pkg.structuredPaymentTerms,
    );
    for (const obligation of plan.obligations ?? []) {
      obligations.push(obligation);
    }
    if (!primary) primary = contract;
  }

  return { obligations, primary };
}

/**
 * Compose the current live statement for a client from contract ledger packages.
 * Display-only hydrate via ensurePayableSurfacesOnPlan — no DB mutation.
 */
export function buildLiveAccountStatement(
  input: BuildLiveAccountStatementInput,
): LiveAccountStatementView {
  const statementDate = input.statementDate?.trim() || todayUtcDate();
  const { obligations, primary } = collectObligations(input.contracts);
  const primaryAgreement =
    (input.primaryAgreementId
      ? input.contracts.find((c) => c.id === input.primaryAgreementId)
      : null) ?? primary;

  const composed = composeAccountStatement({
    id: `client-${input.clientId}-account-statement-${statementDate}`,
    clientName: input.clientName,
    clientSlug: input.clientSlug ?? null,
    contactName: input.contactName ?? null,
    agreementTitle: primaryAgreement?.title ?? null,
    statementDate,
    obligations,
    projectLabel: "Website Design & Development",
  });

  return {
    clientId: input.clientId,
    statementDate,
    document: composed.document,
    ledger: composed.ledger,
    primaryAgreementId: primaryAgreement?.id ?? null,
    agreementTitle: primaryAgreement?.title ?? null,
    openBalanceCount: composed.document.openBalances.items.length,
    paymentCount: composed.document.paymentHistory.payments.length,
  };
}
