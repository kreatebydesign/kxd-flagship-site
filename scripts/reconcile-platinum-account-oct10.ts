/**
 * Platinum Film Workz — Oct 10, 2026 account reconciliation.
 *
 * Applies (in order):
 * 1. Materialize already-due KXD Managed Website Hosting $299.99
 * 2. Materialize October 2026 Website Growth & Management $325.00
 * 3. Backfill Sept 27 Cash App $400 → $300 Final + $100 project-overage credit
 * 4. Record Oct 10 Cody Thompson referral credit $100
 *
 * Preserves the existing Oct 10 Cash App $150 allocation.
 * Dry-run by default. Write requires:
 *   CONFIRM_PLATINUM_ACCOUNT_RECONCILIATION=platinum-oct10-610.18
 *
 *   npx tsx scripts/reconcile-platinum-account-oct10.ts
 */

import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildLiveAccountStatement } from "../lib/client-command/commercial/build-account-statement";
import {
  renderAccountStatementPdf,
  validateAccountStatement,
} from "../lib/commercial-documents/account-statement";
import { applyAccountCredit } from "../lib/proposal-lifecycle/account-credit";
import {
  buildRecurringOccurrenceSourceKey,
  ensureRecurringDueOccurrenceOnPlan,
} from "../lib/proposal-lifecycle/ensure-payable-surfaces";
import { applyAllocatedExternalPayment } from "../lib/proposal-lifecycle/external-obligation-payment";
import { newLifecycleId } from "../lib/proposal-lifecycle/hash";
import {
  obligationAmountPaidCents,
  obligationRemainingCents,
  sumCurrentlyOutstandingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import { appendAudit } from "../lib/proposal-lifecycle/package";
import { assertObligationTransition } from "../lib/proposal-lifecycle/transitions";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
} from "../lib/proposal-lifecycle/types";

const CONFIRM = "platinum-oct10-610.18";
const CLIENT_ID = 18;
const CONTRACT_ID = 2;
const FINAL_ID = "pfw-rem-2";
const HOSTING_ID = "pfw-hosting-y1";
const ACTOR = "matt@kreatebydesign.com";
const STATEMENT_DATE = "2026-10-10";
const EXPECTED_OUTSTANDING = 61_018;

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
  if (!line || !/neon\.tech/i.test(line)) {
    throw new Error("Could not obtain Neon production connection string");
  }
  return line;
}

function materializeHostingDue(
  pkg: ContractLifecyclePackage,
): { pkg: ContractLifecyclePackage; changed: boolean } {
  const plan = pkg.billingPlan;
  if (!plan) throw new Error("Missing billing plan");
  const idx = plan.obligations.findIndex((o) => o.id === HOSTING_ID);
  if (idx < 0) throw new Error(`Hosting obligation ${HOSTING_ID} not found`);
  const hosting = plan.obligations[idx]!;

  if (
    hosting.status !== "pending-trigger" &&
    obligationRemainingCents(hosting) > 0 &&
    hosting.dueDate
  ) {
    return { pkg, changed: false };
  }

  if (hosting.status === "pending-trigger") {
    assertObligationTransition(hosting.status, "draft-ready");
  }

  const nextHosting: InvoiceObligation = {
    ...hosting,
    status: hosting.status === "pending-trigger" ? "draft-ready" : hosting.status,
    trigger: "on-date",
    dueDate: hosting.dueDate ?? "2026-09-27",
    dueTerms: "Annual managed hosting — already due",
  };

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: {
      ...plan,
      obligations: plan.obligations.map((o, i) => (i === idx ? nextHosting : o)),
      updatedAt: new Date().toISOString(),
    },
  };
  next = appendAudit(next, {
    actor: ACTOR,
    action: "obligation.hosting-materialized-due",
    reason: "Materialize already-due KXD Managed Website Hosting $299.99",
    fromStatus: hosting.status,
    toStatus: nextHosting.status,
    correlationId: HOSTING_ID,
  });
  return { pkg: next, changed: true };
}

function materializeOctoberGrowth(
  pkg: ContractLifecyclePackage,
): { pkg: ContractLifecyclePackage; created: boolean } {
  const plan = pkg.billingPlan;
  if (!plan) throw new Error("Missing billing plan");
  const sourceKey = buildRecurringOccurrenceSourceKey(
    "website-growth-management",
    "2026-10",
  );
  const before = plan.obligations.length;
  const nextPlan = ensureRecurringDueOccurrenceOnPlan(plan, {
    sourceKey,
    label: "Website Growth & Management — 2026-10",
    amountCents: 32_500,
    currency: "USD",
    dueDate: "2026-10-01",
    serviceTitle: "Website Growth & Management",
    serviceDescription:
      "Ongoing website management and updates, SEO, search indexing and visibility, performance optimization, technical website management, and management of Instagram and Facebook.",
    internalNotes:
      "October 2026 period materialized during Platinum Oct 10 account reconciliation.",
    billingCadence: "monthly",
    billDay: 1,
    serviceEffectiveDate: "2026-09-01",
    serviceDefinitionKey: "website-growth-management",
    recordedBy: ACTOR,
  });
  const created = nextPlan.obligations.length > before;
  if (!created) return { pkg, created: false };

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: nextPlan,
  };
  next = appendAudit(next, {
    actor: ACTOR,
    action: "billing.recurring-due-registered",
    reason: "Website Growth & Management — 2026-10 · $325.00 due 2026-10-01",
  });
  return { pkg: next, created: true };
}

function alreadyHasSept27Payment(pkg: ContractLifecyclePackage): boolean {
  for (const obligation of pkg.billingPlan?.obligations ?? []) {
    for (const event of obligation.paymentEvents ?? []) {
      if (
        event.paidAt?.slice(0, 10) === "2026-09-27" &&
        event.externalPaymentMethod === "cash-app" &&
        (event.paymentGroupGrossCents === 40_000 || event.amountCents === 40_000)
      ) {
        return true;
      }
      if (
        String(event.externalReference || "").includes("09/27/2026") ||
        String(event.idempotencyKey || "").includes("platinum-sept27-400")
      ) {
        return true;
      }
    }
  }
  return false;
}

function alreadyHasReferralCredit(pkg: ContractLifecyclePackage): boolean {
  for (const obligation of pkg.billingPlan?.obligations ?? []) {
    for (const event of obligation.creditEvents ?? []) {
      if (
        event.sourceType === "referral-credit" &&
        event.label.includes("Cody Thompson")
      ) {
        return true;
      }
    }
  }
  return false;
}

function reconcilePackage(pkg: ContractLifecyclePackage): {
  pkg: ContractLifecyclePackage;
  entries: string[];
} {
  const entries: string[] = [];
  let next = pkg;

  const hosting = materializeHostingDue(next);
  next = hosting.pkg;
  entries.push(
    hosting.changed
      ? "Materialized KXD Managed Website Hosting $299.99 as currently due"
      : "Hosting already materialized as due (noop)",
  );

  const october = materializeOctoberGrowth(next);
  next = october.pkg;
  entries.push(
    october.created
      ? "Materialized Website Growth & Management — October 2026 $325.00"
      : "October 2026 Growth obligation already present (noop)",
  );

  if (!alreadyHasSept27Payment(next)) {
    const final = next.billingPlan!.obligations.find((o) => o.id === FINAL_ID);
    if (!final) throw new Error("Final payment obligation missing");
    if (obligationRemainingCents(final) !== 30_000) {
      throw new Error(
        `Expected Final remaining $300.00 before Sept 27 backfill; found $${(
          obligationRemainingCents(final) / 100
        ).toFixed(2)}`,
      );
    }
    const paid = applyAllocatedExternalPayment(next, {
      contractId: CONTRACT_ID,
      amountCents: 40_000,
      paidAt: "2026-09-27",
      externalPaymentMethod: "cash-app",
      externalReference: "Cash App — HJ Brennecke — 09/27/2026",
      operatorNote:
        "Backfilled real Sept 27 Cash App $400: $300 completes Final Payment; $100 project-payment-overage credit.",
      recordedBy: ACTOR,
      allocationMode: "explicit",
      allocations: [{ obligationId: FINAL_ID, amountCents: 30_000 }],
      overageAsAccountCredit: {
        sourceType: "project-overage",
        label: "Project payment overage",
        reason: "Project payment overage",
        note: "HJ paid $2,600 total toward the $2,500 website project.",
        allocationMode: "fifo",
      },
      clientIdempotencyKey: "platinum-sept27-400",
    });
    if (!paid.ok) {
      throw new Error(
        Object.entries(paid.errors)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; "),
      );
    }
    next = paid.pkg;
    entries.push(
      "Backfilled Sept 27 Cash App $400 → $300 Final Payment + $100 Project payment overage credit",
    );
  } else {
    entries.push("Sept 27 $400 Cash App already present (noop)");
  }

  if (!alreadyHasReferralCredit(next)) {
    const credited = applyAccountCredit(next, {
      contractId: CONTRACT_ID,
      amountCents: 10_000,
      creditedAt: "2026-10-10",
      sourceType: "referral-credit",
      label: "KXD Referral Credit — Cody Thompson",
      reason: "Referral credit",
      note:
        "Referral credit for connecting Kreate by Design with Cody Thompson / Twisted Creek Logistics; project closed.",
      recordedBy: ACTOR,
      allocationMode: "fifo",
      clientIdempotencyKey: "platinum-referral-cody-2026-10-10",
    });
    if (!credited.ok) {
      throw new Error(
        Object.entries(credited.errors)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; "),
      );
    }
    next = credited.pkg;
    entries.push(
      "Recorded Oct 10 $100 account credit — KXD Referral Credit — Cody Thompson",
    );
  } else {
    entries.push("Cody Thompson referral credit already present (noop)");
  }

  // Seal audit marker for this reconciliation pass.
  if (
    !(next.auditEvents ?? []).some(
      (a) => a.action === "account.platinum-oct10-reconciled",
    )
  ) {
    next = appendAudit(next, {
      actor: ACTOR,
      action: "account.platinum-oct10-reconciled",
      reason: "Platinum Film Workz commercial record reconciled as of 2026-10-10 → $610.18 outstanding",
      correlationId: newLifecycleId("recon"),
    });
    entries.push("Appended reconciliation audit marker");
  }

  return { pkg: next, entries };
}

async function main() {
  const write =
    process.env.CONFIRM_PLATINUM_ACCOUNT_RECONCILIATION === CONFIRM;
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query<{
    id: number;
    title: string;
    client_id: number;
    lifecycle_package: ContractLifecyclePackage;
  }>(
    `select id, title, client_id, lifecycle_package from contracts where id = $1 and client_id = $2`,
    [CONTRACT_ID, CLIENT_ID],
  );
  if (!rows[0]) throw new Error("Platinum contract not found");

  const beforePkg = rows[0].lifecycle_package;
  const beforeFinal = (beforePkg.billingPlan?.obligations ?? []).find(
    (o) => o.id === FINAL_ID,
  );
  if (!beforeFinal) throw new Error("Final obligation missing before reconcile");

  const reconciled = reconcilePackage(structuredClone(beforePkg));
  const after = reconciled.pkg;
  const outstanding = sumCurrentlyOutstandingCents(
    after.billingPlan!.obligations,
    STATEMENT_DATE,
  );
  if (outstanding !== EXPECTED_OUTSTANDING) {
    throw new Error(
      `Expected outstanding ${EXPECTED_OUTSTANDING}, got ${outstanding}`,
    );
  }

  const finalAfter = after.billingPlan!.obligations.find((o) => o.id === FINAL_ID)!;
  if (obligationRemainingCents(finalAfter) !== 0) {
    throw new Error("Final Payment must be fully settled after reconciliation");
  }
  if (obligationAmountPaidCents(finalAfter) !== 62_500) {
    throw new Error("Final Payment cash paid must be $625.00");
  }

  const statement = buildLiveAccountStatement({
    clientId: CLIENT_ID,
    clientName: "Platinum Film Workz",
    clientSlug: "platinum-film-workz-20c65f",
    contracts: [
      {
        id: CONTRACT_ID,
        title: rows[0].title,
        lifecyclePackage: after,
      },
    ],
    statementDate: STATEMENT_DATE,
  });
  const issues = validateAccountStatement(statement.document);
  if (issues.length) {
    throw new Error(`Statement invalid:\n- ${issues.join("\n- ")}`);
  }
  const pdf = await renderAccountStatementPdf(statement.document);

  const outDir = path.join(
    process.cwd(),
    ".tmp",
    "platinum-account-reconciliation",
  );
  await mkdir(outDir, { recursive: true });
  const pdfPath = path.join(outDir, "platinum-account-statement-2026-10-10.pdf");
  await writeFile(pdfPath, pdf.buffer);

  const raster = spawnSync(
    "pdftoppm",
    ["-png", "-r", "120", pdfPath, path.join(outDir, "page")],
    { encoding: "utf8" },
  );
  const info = spawnSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const pagesMatch = /Pages:\s+(\d+)/.exec(info.stdout || "");
  const pageCount = pagesMatch ? Number(pagesMatch[1]) : null;

  console.log(
    JSON.stringify(
      {
        mode: write ? "WRITE" : "DRY_RUN",
        entries: reconciled.entries,
        before: {
          finalPaid: obligationAmountPaidCents(beforeFinal),
          finalRemaining: obligationRemainingCents(beforeFinal),
          finalStatus: beforeFinal.status,
        },
        after: {
          finalPaid: obligationAmountPaidCents(finalAfter),
          finalRemaining: obligationRemainingCents(finalAfter),
          finalStatus: finalAfter.status,
          outstandingCents: outstanding,
          outstandingLabel: `$${(outstanding / 100).toFixed(2)}`,
          serviceChargesCents: 96_018,
          projectOverageCreditCents: 10_000,
          oct10CashAppCents: 15_000,
          referralCreditCents: 10_000,
          credits: (after.billingPlan?.obligations ?? []).flatMap((o) =>
            (o.creditEvents ?? []).map((e) => ({
              obligationId: o.id,
              amountCents: e.amountCents,
              label: e.label,
              sourceType: e.sourceType,
              creditedAt: e.creditedAt,
            })),
          ),
          openBalances: statement.document.openBalances.items.map((i) => ({
            description: i.description,
            remainingCents: i.remainingCents,
            creditedCents: i.creditedCents ?? 0,
          })),
        },
        statement: {
          validation: issues,
          totalOutstandingCents: statement.document.summary.totalOutstandingCents,
          accountCreditsAppliedCents:
            statement.document.summary.accountCreditsAppliedCents,
          paymentCount: statement.document.paymentHistory.payments.length,
          creditCount: statement.document.creditHistory?.credits.length ?? 0,
          pdfBytes: pdf.buffer.byteLength,
          pdfPath,
          pageCount,
          rasterStatus: raster.status,
        },
      },
      null,
      2,
    ),
  );

  if (!write) {
    console.log(
      `\nDry-run only. To persist:\n  CONFIRM_PLATINUM_ACCOUNT_RECONCILIATION=${CONFIRM} npx tsx scripts/reconcile-platinum-account-oct10.ts`,
    );
    await client.end();
    return;
  }

  await client.query(
    `update contracts set lifecycle_package = $1::jsonb, updated_at = now() where id = $2 and client_id = $3`,
    [JSON.stringify(after), CONTRACT_ID, CLIENT_ID],
  );
  console.log("\nPersisted Platinum lifecycle package to Neon.");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
