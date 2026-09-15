/**
 * AUTHORIZED production reconciliation — de Bois Entertainment (client 19).
 *
 * 1) Backfill already-paid Stripe invoices EZ84QTSE-0002 / 0003 onto website
 *    contract #3 obligations (FIFO split). No Stripe API writes / charges.
 * 2) Align ancillary + management service structure:
 *    - Media Vault $300/yr due now (separate from $9,500 project)
 *    - Hosting $299/yr launch-triggered (not due now)
 *    - Management $600/mo launch-triggered (not Sept 1 / not due now)
 *
 * Dry-run by default. Write requires:
 *   CONFIRM_DE_BOIS_STRIPE_RECONCILIATION=de-bois-ez84qtse-7500-2026-09-15
 *
 *   npx tsx scripts/reconcile-de-bois-stripe-payments.ts
 */

import { spawnSync } from "node:child_process";
import {
  applyAllocatedExternalPayment,
} from "../lib/proposal-lifecycle/external-obligation-payment";
import { ensurePayableSurfacesOnPlan } from "../lib/proposal-lifecycle/ensure-payable-surfaces";
import { appendAudit, normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package";
import {
  aggregateObligationBalances,
  obligationAmountPaidCents,
  obligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import { bindObligationStripeInvoice } from "../lib/proposal-lifecycle/live-stripe-reconciliation";
import type { ContractLifecyclePackage } from "../lib/proposal-lifecycle/types";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";

const CONFIRM = "de-bois-ez84qtse-7500-2026-09-15";
const CLIENT_ID = 19;
const WEBSITE_CONTRACT_ID = 3;
const MANAGEMENT_CONTRACT_ID = 4;

const INVOICE_1 = {
  id: "in_1U6bs4H7v7C2pv8k3pZuRHDy",
  number: "EZ84QTSE-0001",
  amountCents: 250_000,
  paidAt: "2026-08-21",
} as const;

void INVOICE_1; // documented already-paid deposit; not re-applied in this script

const INVOICE_2 = {
  id: "in_1U8qSTH7v7C2pv8k180yHoYS",
  number: "EZ84QTSE-0002",
  amountCents: 250_000,
  paidAt: "2026-08-26",
  chargeId: "ch_3U8qTlH7v7C2pv8k1ciHl3MT",
  paymentIntentId: "pi_3U8qTlH7v7C2pv8k1QaYcOkJ",
} as const;

const INVOICE_3 = {
  id: "in_1UEllxH7v7C2pv8kmGk6QEAT",
  number: "EZ84QTSE-0003",
  amountCents: 250_000,
  paidAt: "2026-09-12",
  chargeId: "ch_3UElnPH7v7C2pv8k18fvEiQi",
  paymentIntentId: "pi_3UElnPH7v7C2pv8k1sOLCzok",
} as const;

function neonUri(): string {
  if (process.env.DATABASE_URI && /neon\.tech/i.test(process.env.DATABASE_URI)) {
    return process.env.DATABASE_URI;
  }
  const result = spawnSync(
    "npx",
    [
      "neonctl",
      "connection-string",
      "--project-id",
      "mute-violet-81514071",
      "--org-id",
      "org-odd-haze-95704840",
      "--database-name",
      "neondb",
    ],
    { encoding: "utf8" },
  );
  const line = result.stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!line || !/neon\.tech/i.test(line)) throw new Error("Neon URI unavailable");
  return line;
}

function projectObligations(obs: InvoiceObligation[]) {
  return obs.filter(
    (o) => o.kind === "initial" || o.kind === "milestone" || o.kind === "final",
  );
}

function summarize(pkg: ContractLifecyclePackage) {
  const obs = pkg.billingPlan?.obligations ?? [];
  return {
    project: aggregateObligationBalances(projectObligations(obs)),
    all: aggregateObligationBalances(obs),
    rows: obs.map((o) => ({
      id: o.id,
      kind: o.kind,
      label: o.label,
      amountCents: o.amountCents,
      paid: obligationAmountPaidCents(o),
      remaining: obligationRemainingCents(o),
      status: o.status,
    })),
  };
}

function alreadyBackfilled(pkg: ContractLifecyclePackage, invoiceId: string): boolean {
  for (const o of pkg.billingPlan?.obligations ?? []) {
    for (const e of o.paymentEvents ?? []) {
      if (e.stripeInvoiceId === invoiceId || e.externalReference === invoiceId) {
        return true;
      }
    }
    if (o.paymentReceipt?.stripeInvoiceId === invoiceId) return true;
  }
  return Boolean(
    (pkg.obligationStripeBindings ?? []).some((b) => b.stripeInvoiceId === invoiceId),
  );
}

function applyInvoiceAllocation(
  pkg: ContractLifecyclePackage,
  invoice: {
    id: string;
    number: string;
    amountCents: number;
    paidAt: string;
  },
  allocations: Array<{ obligationId: string; amountCents: number }>,
): ContractLifecyclePackage {
  if (alreadyBackfilled(pkg, invoice.id)) {
    console.log(`skip already-present ${invoice.number}`);
    return pkg;
  }

  const applied = applyAllocatedExternalPayment(pkg, {
    contractId: WEBSITE_CONTRACT_ID,
    amountCents: invoice.amountCents,
    currency: "USD",
    paidAt: invoice.paidAt,
    externalPaymentMethod: "stripe",
    externalReference: invoice.id,
    stripeInvoiceId: invoice.id,
    operatorNote: `Authorized ledger backfill of already-paid Stripe invoice ${invoice.number} (${invoice.id}). No Stripe charge or invoice created.`,
    recordedBy: "operator@authorized-de-bois-reconciliation",
    paidOutsideStripe: true,
    allocationMode: "explicit",
    allocations,
    clientIdempotencyKey: `de-bois-backfill:${invoice.id}`,
  });
  if (!applied.ok) {
    throw new Error(
      `Allocation failed for ${invoice.number}: ${JSON.stringify(applied.errors)}`,
    );
  }
  if (applied.idempotentReplay) {
    console.log(`idempotent replay ${invoice.number}`);
    return applied.pkg;
  }

  let next = applied.pkg;
  // Bind invoice to primary obligation for deterministic future linkage.
  const primary = allocations[0]!;
  const bound = bindObligationStripeInvoice({
    pkg: next,
    obligationId: primary.obligationId,
    stripeInvoiceId: invoice.id,
    actor: "operator@authorized-de-bois-reconciliation",
    note: `Backfill bind ${invoice.number} (no Stripe mutation)`,
  });
  if ("error" in bound) {
    // Binding may fail if invoice already bound elsewhere — non-fatal when payments applied.
    console.warn(`bind warning ${invoice.number}: ${bound.error}`);
  } else {
    next = bound.pkg;
  }
  return next;
}

function reconcileWebsitePayments(pkgIn: ContractLifecyclePackage): {
  pkg: ContractLifecyclePackage;
  before: ReturnType<typeof summarize>;
  after: ReturnType<typeof summarize>;
} {
  let pkg = normalizeLifecyclePackage(pkgIn) as ContractLifecyclePackage;
  const before = summarize(pkg);

  // Guard: deposit must already show $2,500 paid from invoice 1.
  const deposit = pkg.billingPlan?.obligations?.find((o) => o.id === "deb-dep-1");
  if (!deposit || obligationAmountPaidCents(deposit) !== 250_000) {
    throw new Error(
      `Unexpected deposit paid state: ${deposit ? obligationAmountPaidCents(deposit) : "missing"}`,
    );
  }

  if (!alreadyBackfilled(pkg, INVOICE_2.id)) {
    pkg = applyInvoiceAllocation(pkg, INVOICE_2, [
      { obligationId: "deb-des-1", amountCents: 200_000 },
      { obligationId: "deb-dev-1", amountCents: 50_000 },
    ]);
  } else {
    console.log("INVOICE_2 already on ledger — skip");
  }

  if (!alreadyBackfilled(pkg, INVOICE_3.id)) {
    pkg = applyInvoiceAllocation(pkg, INVOICE_3, [
      { obligationId: "deb-dev-1", amountCents: 150_000 },
      { obligationId: "deb-fin-1", amountCents: 100_000 },
    ]);
  } else {
    console.log("INVOICE_3 already on ledger — skip");
  }

  pkg = appendAudit(pkg, {
    actor: "operator@authorized-de-bois-reconciliation",
    action: "obligation.stripe-payments-backfilled",
    reason:
      "Human-authorized reconciliation: applied already-paid Stripe invoices EZ84QTSE-0002 ($2,500) and EZ84QTSE-0003 ($2,500) onto website obligations via FIFO split. No Stripe charges/invoices created. Project paid $7,500 / remaining $2,000.",
  });

  const after = summarize(pkg);
  if (after.project.paidCents !== 750_000) {
    throw new Error(`Expected project paid 750000, got ${after.project.paidCents}`);
  }
  if (after.project.remainingCents !== 200_000) {
    throw new Error(
      `Expected project remaining 200000, got ${after.project.remainingCents}`,
    );
  }
  const final = after.rows.find((r) => r.id === "deb-fin-1");
  if (!final || final.paid !== 100_000 || final.remaining !== 200_000) {
    throw new Error(`Final obligation unexpected: ${JSON.stringify(final)}`);
  }

  return { pkg, before, after };
}

function alignManagementServices(pkgIn: ContractLifecyclePackage): {
  pkg: ContractLifecyclePackage;
  beforeVaultHost: unknown;
  afterVaultHost: unknown;
} {
  let pkg = normalizeLifecyclePackage(pkgIn) as ContractLifecyclePackage;
  const terms = pkg.structuredPaymentTerms;
  if (!terms) throw new Error("Contract 4 missing structuredPaymentTerms");

  const beforeVaultHost = {
    ancillaryCharges: terms.ancillaryCharges ?? [],
    recurring: terms.recurring,
    initialDueTerms: terms.initialPayment?.dueTerms,
    planRecurring: pkg.billingPlan?.recurring,
  };

  const commencementNotes = [
    "Website + Digital Management ($600/month) begins at website launch / production launch of the completed website — not on a calendar date during the build.",
    "It includes ongoing website/digital management plus Instagram and Facebook management.",
    "It is separate from the $9,500 website rebuild project total.",
    "KXD Media Vault ($300/year) and KXD Managed Website Hosting ($299/year) are separately billed infrastructure services.",
  ].join(" ");

  const nextTerms = {
    ...terms,
    recurring: {
      ...terms.recurring,
      status: "pending-trigger" as const,
      cadence: "monthly" as const,
      amountCents: 60_000,
      startTrigger: "after-launch-verified",
      startBillingDate: null,
      startBillingDateStatus: "milestone-confirmed" as const,
      commencementNotes,
      renewalBehavior:
        "Month-to-month ongoing services beginning at website launch. Either party may discontinue recurring services according to the cancellation provisions in this Agreement.",
      serviceTitle: "Website + Digital Management",
      includes: [
        "Ongoing website and digital management",
        "Instagram and Facebook management",
      ],
    },
    initialPayment: {
      ...terms.initialPayment,
      type: "none" as const,
      amountCents: 0 as never,
      trigger: "manual" as const,
      dueTerms: [
        "Recurring management fee: $600.00 USD per month under the Friends & Family Client Rate.",
        "Service commencement: website launch (not September 1, 2026).",
        "First payment due at website launch; recurring monthly thereafter.",
        "Separate infrastructure: KXD Managed Website Hosting $299/year (launch-triggered) and KXD Media Vault 250 GB $300/year (active now).",
        "No invoice, charge, or payment collection is initiated by this record alone.",
      ].join(" "),
    },
    ancillaryCharges: [
      {
        id: "deb-media-vault-y1",
        kind: "media-vault",
        title: "KXD Media Vault — 250 GB",
        amountCents: 30_000 as never,
        cadence: "annual" as const,
        dueTrigger: "on-date",
        dueDate: "2026-09-15",
        termNotes:
          "Annual Media Vault allocation (250 GB). Starts now because KXD has activated R2 storage infrastructure for this service. Separate from the $9,500 website rebuild project and from the $600/month management fee.",
        renewalNotes:
          "Future annual Media Vault renewals are subject to then-current agreement terms and capacity.",
        status: "pending-trigger" as const,
      },
      {
        id: "deb-hosting-y1",
        kind: "managed-hosting",
        title: "KXD Managed Website Hosting",
        amountCents: 29_900 as never,
        cadence: "annual" as const,
        dueTrigger: "website-launch",
        dueDate: null,
        termNotes:
          "Annual hosting charge becomes due at website launch — not currently due. Separate from the $9,500 website rebuild and from the $600/month management fee.",
        renewalNotes:
          "Future annual hosting renewals are subject to this Agreement’s renewal and billing terms.",
        status: "pending-trigger" as const,
      },
    ],
  };

  pkg = {
    ...pkg,
    structuredPaymentTerms: nextTerms,
  };

  if (pkg.billingPlan) {
    const nextPlan = {
      ...pkg.billingPlan,
      recurring: {
        ...(pkg.billingPlan.recurring ?? {
          id: "sched_ee4dcfa462ef7082",
          currency: "USD",
          stripeScheduleOrSubscriptionId: null,
          minimumTermMonths: null,
        }),
        status: "pending-trigger" as const,
        cadence: "monthly" as const,
        amountCents: 60_000,
        startTrigger: "after-launch-verified",
      },
      monthlyTotalCents: 60_000,
      oneTimeTotalCents: 0,
    };
    pkg = {
      ...pkg,
      billingPlan: ensurePayableSurfacesOnPlan(nextPlan, pkg.structuredPaymentTerms),
    };
  }

  pkg = appendAudit(pkg, {
    actor: "operator@authorized-de-bois-reconciliation",
    action: "commercial.service-structure-aligned",
    reason:
      "Aligned management to launch-triggered (not Sept 1); added Media Vault $300/yr due now; Hosting $299/yr launch-triggered. No Stripe mutation. Does not alter $9,500 website project balance.",
  });

  const afterVaultHost = {
    ancillaryCharges: pkg.structuredPaymentTerms?.ancillaryCharges ?? [],
    recurring: pkg.structuredPaymentTerms?.recurring,
    obligations: (pkg.billingPlan?.obligations ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      amountCents: o.amountCents,
      trigger: o.trigger,
      dueDate: o.dueDate ?? null,
      status: o.status,
    })),
  };

  const vault = afterVaultHost.obligations.find((o) => o.id === "deb-media-vault-y1");
  const host = afterVaultHost.obligations.find((o) => o.id === "deb-hosting-y1");
  if (!vault || vault.amountCents !== 30_000) {
    throw new Error(`Media Vault obligation missing/wrong: ${JSON.stringify(vault)}`);
  }
  if (!host || host.amountCents !== 29_900) {
    throw new Error(`Hosting obligation missing/wrong: ${JSON.stringify(host)}`);
  }
  if (host.dueDate) {
    throw new Error("Hosting must not have a due date yet (launch-triggered)");
  }

  return { pkg, beforeVaultHost, afterVaultHost };
}

async function main() {
  const write = process.env.CONFIRM_DE_BOIS_STRIPE_RECONCILIATION === CONFIRM;
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const website = await client.query<{
    id: number;
    client_id: number;
    proposal_id: number | null;
    lifecycle_package: unknown;
  }>(
    `select id, client_id, proposal_id, lifecycle_package from contracts where id = $1`,
    [WEBSITE_CONTRACT_ID],
  );
  const management = await client.query<{
    id: number;
    client_id: number;
    lifecycle_package: unknown;
  }>(`select id, client_id, lifecycle_package from contracts where id = $1`, [
    MANAGEMENT_CONTRACT_ID,
  ]);

  if (!website.rows[0] || website.rows[0].client_id !== CLIENT_ID) {
    throw new Error("Website contract client mismatch");
  }
  if (!management.rows[0] || management.rows[0].client_id !== CLIENT_ID) {
    throw new Error("Management contract client mismatch");
  }
  const websiteProposalId = website.rows[0].proposal_id;

  const paymentResult = reconcileWebsitePayments(
    website.rows[0].lifecycle_package as ContractLifecyclePackage,
  );
  const serviceResult = alignManagementServices(
    management.rows[0].lifecycle_package as ContractLifecyclePackage,
  );

  console.log("WEBSITE BEFORE", JSON.stringify(paymentResult.before, null, 2));
  console.log("WEBSITE AFTER", JSON.stringify(paymentResult.after, null, 2));
  console.log("SERVICES AFTER", JSON.stringify(serviceResult.afterVaultHost, null, 2));

  // Ensure project total unchanged by vault/hosting
  if (paymentResult.after.project.totalCents !== 950_000) {
    throw new Error("Website project total drifted");
  }

  if (!write) {
    console.log(
      `\nDRY RUN — set CONFIRM_DE_BOIS_STRIPE_RECONCILIATION=${CONFIRM} to write.`,
    );
    await client.end();
    return;
  }

  await client.query("begin");
  try {
    await client.query(
      `update contracts
       set lifecycle_package = $2::jsonb, updated_at = now()
       where id = $1 and client_id = $3`,
      [WEBSITE_CONTRACT_ID, JSON.stringify(paymentResult.pkg), CLIENT_ID],
    );
    await client.query(
      `update contracts
       set lifecycle_package = $2::jsonb, updated_at = now()
       where id = $1 and client_id = $3`,
      [MANAGEMENT_CONTRACT_ID, JSON.stringify(serviceResult.pkg), CLIENT_ID],
    );

    // Additive revenue recognition for already-paid Stripe invoices (no Stripe write).
    for (const inv of [INVOICE_2, INVOICE_3]) {
      const dedupe = `stripe-paid-backfill:contract:${WEBSITE_CONTRACT_ID}|in:${inv.id}`;
      await client.query(
        `insert into revenue_events (
           client_id, proposal_id, contract_id, event_type, title, summary, amount,
           occurred_at, dedupe_key, metadata, created_at, updated_at
         )
         values (
           $1, $2, $3, 'revenue.external-payment-recorded',
           $4, $5, $6, $7::timestamptz, $8, $9::jsonb, now(), now()
         )
         on conflict (dedupe_key) do nothing`,
        [
          CLIENT_ID,
          websiteProposalId,
          WEBSITE_CONTRACT_ID,
          `Stripe payment recorded · ${inv.number}`,
          "Already-completed Stripe invoice reconciled into KXD OS. No Stripe charge was created.",
          "2500",
          `${inv.paidAt}T12:00:00.000Z`,
          dedupe,
          JSON.stringify({
            source: "authorized-de-bois-stripe-backfill",
            livemode: true,
            stripeInvoiceId: inv.id,
            stripeInvoiceNumber: inv.number,
            stripeChargeId: inv.chargeId,
            stripePaymentIntentId: inv.paymentIntentId,
            noStripeMutation: true,
          }),
        ],
      );
    }

    await client.query("commit");
    console.log("\nWROTE contract 3 payment backfill + contract 4 service alignment.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
