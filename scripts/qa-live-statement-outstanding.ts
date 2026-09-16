/**
 * Read-only live QA — Account Statement currently-outstanding semantics.
 *   npx tsx scripts/qa-live-statement-outstanding.ts
 */
import { spawnSync } from "node:child_process";
import { composeAccountStatement } from "../lib/commercial-documents/account-statement/compose";
import { validateAccountStatement } from "../lib/commercial-documents/account-statement/validate";
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

async function loadClientObligations(clientId: number) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query<{
    id: number;
    title: string;
    lifecycle_package: { billingPlan?: { obligations?: InvoiceObligation[] } };
  }>(
    `select id, title, lifecycle_package from contracts where client_id = $1 order by id`,
    [clientId],
  );
  await client.end();
  const obligations: InvoiceObligation[] = [];
  for (const row of rows) {
    obligations.push(...(row.lifecycle_package?.billingPlan?.obligations ?? []));
  }
  return { rows, obligations };
}

function report(name: string, clientId: number, obligations: InvoiceObligation[]) {
  const asOf = new Date().toISOString().slice(0, 10);
  const { document, ledger } = composeAccountStatement({
    id: `live-${clientId}`,
    clientName: name,
    statementDate: asOf,
    obligations,
  });
  const issues = validateAccountStatement(document);
  console.log(`\n=== ${name} (client ${clientId}) asOf ${asOf} ===`);
  console.log(
    JSON.stringify(
      {
        projectTotal: document.summary.originalProjectCents,
        projectPaid: document.summary.paymentsReceivedCents,
        projectRemaining: document.summary.projectBalanceCents,
        currentCharges: document.summary.currentChargesCents,
        currentChargeLines: document.summary.currentChargeLines.map((line) => ({
          label: line.label,
          amountCents: line.amountCents,
        })),
        finalLines: document.finalPosition.lines.map((line) => ({
          label: line.label,
          amountCents: line.amountCents,
        })),
        currentlyOutstanding: document.summary.totalOutstandingCents,
        contractualRemaining: ledger.remainingCents,
        currentlyDue: document.openBalances.items.map((i) => ({
          id: i.id,
          remaining: i.remainingCents,
          dueDate: i.dueDate ?? null,
        })),
        upcoming: document.openBalances.upcomingItems.map((i) => ({
          id: i.id,
          remaining: i.remainingCents,
          note: i.timingNote ?? null,
        })),
        validationIssues: issues,
      },
      null,
      2,
    ),
  );
  return document;
}

async function main() {
  const deBois = await loadClientObligations(19);
  const platinum = await loadClientObligations(18);
  const deDoc = report("de Bois Entertainment", 19, deBois.obligations);
  const ptDoc = report("Platinum Film Workz", 18, platinum.obligations);

  if (deDoc.summary.totalOutstandingCents !== 200_000) {
    throw new Error(
      `de Bois outstanding expected 200000 got ${deDoc.summary.totalOutstandingCents}`,
    );
  }
  if (deDoc.summary.projectBalanceCents !== 200_000) {
    throw new Error(`de Bois project remaining expected 200000`);
  }
  const vaultUpcoming = deDoc.openBalances.upcomingItems.find((i) =>
    /media vault/i.test(i.description),
  );
  if (!vaultUpcoming || vaultUpcoming.remainingCents !== 30_000) {
    throw new Error("de Bois Media Vault should be upcoming $300");
  }
  if ((vaultUpcoming.dueDate ?? "").slice(0, 10) !== "2026-09-22") {
    throw new Error(
      `de Bois Media Vault dueDate expected 2026-09-22 got ${vaultUpcoming.dueDate}`,
    );
  }
  if (deDoc.openBalances.items.some((i) => /media vault/i.test(i.description))) {
    throw new Error("de Bois Media Vault must not be currently due before Sep 22");
  }
  if (
    deDoc.openBalances.upcomingItems.some((i) => /hosting/i.test(i.description)) ===
    false
  ) {
    throw new Error("de Bois hosting should be upcoming");
  }
  if (deDoc.openBalances.items.some((i) => /hosting/i.test(i.description))) {
    throw new Error("de Bois hosting must not be currently due");
  }
  if (ptDoc.openBalances.items.some((i) => /hosting/i.test(i.description))) {
    throw new Error("Platinum hosting must not be currently due");
  }
  console.log("\nLIVE QA PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
