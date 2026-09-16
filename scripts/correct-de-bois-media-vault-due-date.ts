/**
 * Authorized commercial correction — de Bois Media Vault due date only.
 *
 *   npx tsx scripts/correct-de-bois-media-vault-due-date.ts           # dry-run
 *   npx tsx scripts/correct-de-bois-media-vault-due-date.ts --apply   # write
 *
 * Mutates ONLY contracts.id=4 / client_id=19 / obligation deb-media-vault-y1:
 *   dueDate: 2026-09-15 → 2026-09-22
 *
 * Does not create payments, invoices, Stripe objects, or alter other obligations.
 */

import { spawnSync } from "node:child_process";
import { composeAccountStatement } from "../lib/commercial-documents/account-statement/compose";
import { projectPortalLedgerBillingView } from "../lib/portal/billing/presentation";
import { appendAudit, normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package";
import type { ContractLifecyclePackage } from "../lib/proposal-lifecycle/types";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";

const CLIENT_ID = 19;
const CONTRACT_ID = 4;
const OBLIGATION_ID = "deb-media-vault-y1";
const FROM_DUE = "2026-09-15";
const TO_DUE = "2026-09-22";
const ASOF = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes("--apply");

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

function paymentFingerprint(obligations: InvoiceObligation[]) {
  return obligations
    .flatMap((o) =>
      (o.paymentEvents ?? []).map((e) => ({
        obligationId: o.id,
        eventId: e.id,
        amountCents: e.amountCents,
        paymentGroupId: e.paymentGroupId ?? null,
        paidAt: e.paidAt,
      })),
    )
    .sort((a, b) => a.eventId.localeCompare(b.eventId));
}

function findVault(pkg: ContractLifecyclePackage): InvoiceObligation {
  const vault = (pkg.billingPlan?.obligations ?? []).find(
    (o) => o.id === OBLIGATION_ID,
  );
  if (!vault) throw new Error(`${OBLIGATION_ID} not found on contract ${CONTRACT_ID}`);
  return vault;
}

function assertBefore(vault: InvoiceObligation) {
  if (vault.dueDate !== FROM_DUE) {
    throw new Error(`Expected dueDate ${FROM_DUE}, got ${vault.dueDate}`);
  }
  if (vault.amountCents !== 30_000) {
    throw new Error(`Expected amountCents 30000, got ${vault.amountCents}`);
  }
  if ((vault.paymentEvents ?? []).length !== 0) {
    throw new Error("Expected empty paymentEvents");
  }
  if ((vault.amountPaidCents ?? 0) !== 0) {
    throw new Error(`Expected amountPaidCents 0, got ${vault.amountPaidCents}`);
  }
}

async function loadAllClientObligations(
  client: import("pg").Client,
  clientId: number,
): Promise<InvoiceObligation[]> {
  const { rows } = await client.query<{
    lifecycle_package: ContractLifecyclePackage;
  }>(`select lifecycle_package from contracts where client_id = $1 order by id`, [
    clientId,
  ]);
  return rows.flatMap(
    (row) =>
      normalizeLifecyclePackage(row.lifecycle_package).billingPlan?.obligations ??
      [],
  );
}

async function main() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const beforeRow = await client.query<{
      id: number;
      client_id: number;
      title: string;
      lifecycle_package: unknown;
    }>(
      `select id, client_id, title, lifecycle_package
       from contracts
       where id = $1 and client_id = $2`,
      [CONTRACT_ID, CLIENT_ID],
    );
    if (beforeRow.rowCount !== 1) {
      throw new Error(`Expected contract ${CONTRACT_ID} for client ${CLIENT_ID}`);
    }

    const beforePkg = normalizeLifecyclePackage(
      beforeRow.rows[0]!.lifecycle_package,
    ) as ContractLifecyclePackage;
    const beforeVault = findVault(beforePkg);
    assertBefore(beforeVault);

    const allBefore = await loadAllClientObligations(client, CLIENT_ID);
    const paymentsBefore = paymentFingerprint(allBefore);

    // Platinum blast-radius snapshot (read-only)
    const platinumBefore = await client.query<{ id: number; due: string | null }>(
      `select id,
              lifecycle_package->'billingPlan'->'obligations' as obligations
       from contracts where client_id = 18 order by id`,
    );

    let nextPkg = {
      ...beforePkg,
      billingPlan: beforePkg.billingPlan
        ? {
            ...beforePkg.billingPlan,
            obligations: (beforePkg.billingPlan.obligations ?? []).map((o) => {
              if (o.id !== OBLIGATION_ID) return o;
              return { ...o, dueDate: TO_DUE };
            }),
            updatedAt: new Date().toISOString(),
          }
        : beforePkg.billingPlan,
    } as ContractLifecyclePackage;

    nextPkg = appendAudit(nextPkg, {
      actor: "operator@authorized-de-bois-media-vault-due-date",
      action: "obligation.due-date-corrected",
      reason:
        "Human-authorized correction: deb-media-vault-y1 dueDate 2026-09-15→2026-09-22. Sep 15 is service start; Sep 22 is current annual charge due. No payment/status/amount/Stripe changes.",
      fromStatus: FROM_DUE,
      toStatus: TO_DUE,
    });

    const afterVaultPreview = findVault(nextPkg);
    if (afterVaultPreview.dueDate !== TO_DUE) {
      throw new Error("Preview dueDate mutation failed");
    }

    console.log(
      JSON.stringify(
        {
          mode: APPLY ? "APPLY" : "DRY_RUN",
          asOf: ASOF,
          before: {
            dueDate: beforeVault.dueDate,
            amountCents: beforeVault.amountCents,
            paymentEvents: beforeVault.paymentEvents ?? [],
            status: beforeVault.status,
          },
          afterPreview: {
            dueDate: afterVaultPreview.dueDate,
            amountCents: afterVaultPreview.amountCents,
            paymentEvents: afterVaultPreview.paymentEvents ?? [],
            status: afterVaultPreview.status,
          },
        },
        null,
        2,
      ),
    );

    if (APPLY) {
      await client.query("begin");
      await client.query(
        `update contracts
         set lifecycle_package = $1::jsonb, updated_at = now()
         where id = $2 and client_id = $3`,
        [JSON.stringify(nextPkg), CONTRACT_ID, CLIENT_ID],
      );
      await client.query("commit");
    }

    const afterRow = await client.query<{ lifecycle_package: unknown }>(
      `select lifecycle_package from contracts where id = $1 and client_id = $2`,
      [CONTRACT_ID, CLIENT_ID],
    );
    const afterPkg = normalizeLifecyclePackage(
      afterRow.rows[0]!.lifecycle_package,
    ) as ContractLifecyclePackage;
    const afterVault = findVault(afterPkg);

    if (APPLY) {
      if (afterVault.dueDate !== TO_DUE) {
        throw new Error(`Write failed: dueDate is ${afterVault.dueDate}`);
      }
    }

    const allAfter = await loadAllClientObligations(client, CLIENT_ID);
    const paymentsAfter = paymentFingerprint(allAfter);
    if (JSON.stringify(paymentsBefore) !== JSON.stringify(paymentsAfter)) {
      throw new Error("Payment events changed — abort condition");
    }

    const { document } = composeAccountStatement({
      id: `de-bois-due-date-${ASOF}`,
      clientName: "de Bois Entertainment",
      clientSlug: "de-bois-entertainment",
      statementDate: ASOF,
      obligations: allAfter,
    });
    const portal = projectPortalLedgerBillingView({
      document,
      clientLabel: "de Bois Entertainment",
    });
    if (portal.kind !== "ready") {
      throw new Error(`Portal view not ready: ${portal.kind}`);
    }

    const vaultOpen = document.openBalances.items.find((i) => i.id === OBLIGATION_ID);
    const vaultUpcoming = document.openBalances.upcomingItems.find(
      (i) => i.id === OBLIGATION_ID,
    );
    const hostUpcoming = document.openBalances.upcomingItems.find(
      (i) => i.id === "deb-hosting-y1",
    );

    // Platinum unchanged check
    const platinumAfter = await client.query<{ id: number }>(
      `select id from contracts where client_id = 18 order by id`,
    );
    if (platinumAfter.rowCount !== platinumBefore.rowCount) {
      throw new Error("Platinum contract count changed");
    }

    const report = {
      applied: APPLY,
      asOf: ASOF,
      vault: {
        dueDate: afterVault.dueDate,
        amountCents: afterVault.amountCents,
        paymentEventsCount: (afterVault.paymentEvents ?? []).length,
        status: afterVault.status,
      },
      statement: {
        totalCurrentlyDueCents: document.summary.totalOutstandingCents,
        currentlyDue: document.openBalances.items.map((i) => ({
          id: i.id,
          description: i.description,
          remainingCents: i.remainingCents,
          dueDate: i.dueDate ?? null,
        })),
        upcoming: document.openBalances.upcomingItems.map((i) => ({
          id: i.id,
          description: i.description,
          remainingCents: i.remainingCents,
          dueDate: i.dueDate ?? null,
          timingNote: i.timingNote ?? null,
        })),
        paymentHistory: document.paymentHistory.payments.map((p) => ({
          paidOn: p.paidOn,
          amountCents: p.amountCents,
          label: p.label,
        })),
        projectBalanceCents: document.summary.projectBalanceCents,
        vaultInCurrentlyDue: Boolean(vaultOpen),
        vaultInUpcoming: Boolean(vaultUpcoming),
        hostUpcoming: Boolean(hostUpcoming),
      },
      portal: {
        currentlyDueLabel: portal.currentlyDueLabel,
        currentlyDueCount: portal.currentlyDue.length,
        upcomingCount: portal.upcomingItems.length,
        paymentHistoryAmounts: portal.paymentHistory.map((p) => p.amountLabel),
      },
      auditPresent: (afterPkg.auditEvents ?? []).some(
        (e) =>
          e.action === "obligation.due-date-corrected" &&
          String(e.reason ?? "").includes("2026-09-22"),
      ),
      paymentsUnchanged: true,
    };

    // Hard post-conditions for APPLY (and dry-run preview against mutated pkg obligations)
    const verifyObligations = APPLY
      ? allAfter
      : allBefore.map((o) =>
          o.id === OBLIGATION_ID ? { ...o, dueDate: TO_DUE } : o,
        );
    const { document: expectedDoc } = composeAccountStatement({
      id: "verify",
      clientName: "de Bois Entertainment",
      statementDate: ASOF,
      obligations: verifyObligations,
    });
    if (expectedDoc.summary.totalOutstandingCents !== 200_000) {
      throw new Error(
        `Expected total currently due 200000, got ${expectedDoc.summary.totalOutstandingCents}`,
      );
    }
    if (expectedDoc.openBalances.items.some((i) => i.id === OBLIGATION_ID)) {
      throw new Error("Media Vault must not be currently due before Sep 22");
    }
    const upcomingVault = expectedDoc.openBalances.upcomingItems.find(
      (i) => i.id === OBLIGATION_ID,
    );
    if (!upcomingVault || upcomingVault.remainingCents !== 30_000) {
      throw new Error("Media Vault must be upcoming $300");
    }
    if (upcomingVault.dueDate !== TO_DUE) {
      throw new Error(`Upcoming vault dueDate expected ${TO_DUE}`);
    }
    if (expectedDoc.summary.projectBalanceCents !== 200_000) {
      throw new Error("Project remaining must stay $2,000");
    }
    if (expectedDoc.paymentHistory.payments.length !== 3) {
      throw new Error("Expected 3 payment history rows");
    }
    for (const p of expectedDoc.paymentHistory.payments) {
      if (p.amountCents !== 250_000) {
        throw new Error("Payment amounts must remain $2,500");
      }
    }

    console.log("\n=== VERIFICATION ===");
    console.log(JSON.stringify(report, null, 2));
    console.log(APPLY ? "\nAPPLIED OK" : "\nDRY_RUN OK (re-run with --apply to write)");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
