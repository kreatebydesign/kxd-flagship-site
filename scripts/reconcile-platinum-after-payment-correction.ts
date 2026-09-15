/**
 * Post-correction Platinum + de Bois read-only reconciliation.
 *   npx tsx scripts/reconcile-platinum-after-payment-correction.ts
 */

import { spawnSync } from "node:child_process";
import { buildLiveAccountStatement } from "../lib/client-command/commercial/build-account-statement";
import {
  renderAccountStatementPdf,
  validateAccountStatement,
} from "../lib/commercial-documents/account-statement";
import { formatCents } from "../lib/proposal-builder/money";
import {
  aggregateObligationBalances,
  obligationAmountPaidCents,
  obligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";

function neonUri(): string {
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
  if (!line) throw new Error("no neon uri");
  return line;
}

async function main() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query<{
    id: number;
    title: string;
    lifecycle_package: {
      billingPlan?: { obligations?: InvoiceObligation[] };
      auditEvents?: Array<{ action?: string; reason?: string }>;
    };
  }>(`select id, title, lifecycle_package from contracts where client_id = 18`);

  const statement = buildLiveAccountStatement({
    clientId: 18,
    clientName: "Platinum film workz",
    clientSlug: "platinum-film-workz-20c65f",
    contracts: rows.map((r) => ({
      id: r.id,
      title: r.title,
      lifecyclePackage: r.lifecycle_package,
    })),
  });

  const obs = rows[0]!.lifecycle_package.billingPlan?.obligations ?? [];
  const final = obs.find((o) => o.id === "pfw-rem-2")!;
  const event = final.paymentEvents!.find((e) => e.id === "payevt_bfab49f443c4b715")!;
  const project = obs.filter((o) =>
    o.kind === "initial" || o.kind === "milestone" || o.kind === "final",
  );
  const projectAgg = aggregateObligationBalances(project);
  const allAgg = aggregateObligationBalances(obs);
  const issues = validateAccountStatement(statement.document);
  const pdf = await renderAccountStatementPdf(statement.document);

  console.log(
    JSON.stringify(
      {
        event: {
          amountCents: event.amountCents,
          paidAt: event.paidAt,
          method: event.externalPaymentMethod,
          group: event.paymentGroupId,
          key: event.idempotencyKey,
        },
        final: {
          original: final.amountCents,
          paid: obligationAmountPaidCents(final),
          remaining: obligationRemainingCents(final),
          status: final.status,
          receipt: final.paymentReceipt?.status,
          receiptAmount: final.paymentReceipt?.amountCents,
        },
        project: projectAgg,
        accountRemaining: allAgg.remainingCents,
        openBalances: statement.document.openBalances.items.map((i) => ({
          description: i.description,
          remainingCents: i.remainingCents,
        })),
        statementOutstanding: statement.document.summary.totalOutstandingCents,
        statementPayments: statement.document.summary.accountPaymentsReceivedCents,
        validation: issues,
        pdfBytes: pdf.buffer.byteLength,
        outstandingLabel: formatCents(statement.document.summary.totalOutstandingCents),
        auditPresent: (rows[0]!.lifecycle_package.auditEvents ?? []).some(
          (a) => a.action === "obligation.external-payment-amount-corrected",
        ),
      },
      null,
      2,
    ),
  );

  const deBois = await client.query<{
    id: number;
    title: string;
    lifecycle_package: unknown;
  }>(`select id, title, lifecycle_package from contracts where client_id = 19`);
  const beforeCount = JSON.stringify(deBois.rows);
  const deStatement = buildLiveAccountStatement({
    clientId: 19,
    clientName: "de Bois Entertainment",
    clientSlug: "de-bois-entertainment",
    contracts: deBois.rows.map((r) => ({
      id: r.id,
      title: r.title,
      lifecyclePackage: r.lifecycle_package,
    })),
  });
  const after = await client.query(
    `select id, title, lifecycle_package from contracts where client_id = 19`,
  );
  console.log(
    JSON.stringify(
      {
        deBois: {
          outstanding: deStatement.document.summary.totalOutstandingCents,
          payments: deStatement.document.summary.accountPaymentsReceivedCents,
          validation: validateAccountStatement(deStatement.document),
          unchanged: JSON.stringify(after.rows) === beforeCount,
        },
      },
      null,
      2,
    ),
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
