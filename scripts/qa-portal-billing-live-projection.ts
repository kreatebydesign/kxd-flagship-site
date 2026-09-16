/**
 * Read-only: project portal Billing Center view from live Neon ledger.
 * Does not mutate payments, obligations, Stripe, or invoices.
 */
import { spawnSync } from "node:child_process";
import { composeAccountStatement } from "../lib/commercial-documents/account-statement/compose";
import {
  projectPortalBillingOverviewCard,
  projectPortalLedgerBillingView,
} from "../lib/portal/billing/presentation";
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

async function loadObligations(clientId: number): Promise<InvoiceObligation[]> {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query<{
    lifecycle_package: { billingPlan?: { obligations?: InvoiceObligation[] } };
  }>(`select lifecycle_package from contracts where client_id = $1 order by id`, [
    clientId,
  ]);
  await client.end();
  const obligations: InvoiceObligation[] = [];
  for (const row of rows) {
    obligations.push(...(row.lifecycle_package?.billingPlan?.obligations ?? []));
  }
  return obligations;
}

async function main() {
  const asOf = new Date().toISOString().slice(0, 10);
  for (const [name, id] of [
    ["de Bois Entertainment", 19],
    ["Platinum Film Workz", 18],
  ] as const) {
    const obligations = await loadObligations(id);
    const { document } = composeAccountStatement({
      id: `live-${id}`,
      clientName: name,
      statementDate: asOf,
      obligations,
    });
    const view = projectPortalLedgerBillingView({
      document,
      clientLabel: name,
    });
    const card = projectPortalBillingOverviewCard(view);
    if (view.kind !== "ready") {
      console.log(name, view);
      continue;
    }
    console.log(`\n=== ${name} portal projection ===`);
    console.log(
      JSON.stringify(
        {
          currentlyDue: view.currentlyDueLabel,
          paidToDate: view.paidToDateLabel,
          status: view.accountStatus,
          dueItems: view.currentlyDue.map((item) => ({
            description: item.description,
            remaining: item.remainingLabel,
            status: item.statusLabel,
          })),
          upcoming: view.upcomingItems.map((item) => ({
            description: item.description,
            note: item.dueLabel,
          })),
          paymentCount: view.paymentHistory.length,
          card,
          payBalancePresent: JSON.stringify(view).includes("Pay Balance"),
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
