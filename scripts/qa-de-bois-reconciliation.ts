/**
 * Read-only QA for authorized de Bois Stripe reconciliation.
 *   npx tsx scripts/qa-de-bois-reconciliation.ts
 */

import { spawnSync } from "node:child_process";
import {
  aggregateObligationBalances,
  obligationAmountPaidCents,
  obligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";

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

async function main() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const rows = await client.query<{
    id: number;
    proposal_id: number | null;
    lifecycle_package: {
      billingPlan?: { obligations?: InvoiceObligation[]; recurring?: { status?: string } };
      structuredPaymentTerms?: {
        ancillaryCharges?: Array<{
          id: string;
          amountCents: number;
          dueDate?: string | null;
          dueTrigger?: string;
        }>;
        recurring?: { startTrigger?: string; startBillingDate?: string | null };
      };
      obligationStripeBindings?: unknown;
    };
  }>(
    `select id, proposal_id, lifecycle_package from contracts where id in (3,4) and client_id = 19 order by id`,
  );

  const failures: string[] = [];

  for (const row of rows.rows) {
    const pkg = row.lifecycle_package;
    const obs = pkg.billingPlan?.obligations ?? [];
    const project = obs.filter((o) =>
      ["initial", "milestone", "final"].includes(o.kind),
    );
    const addons = obs.filter((o) => o.kind === "addon");
    console.log("CONTRACT", row.id, "proposal", row.proposal_id);
    console.log("project", aggregateObligationBalances(project));
    console.log(
      "addons",
      addons.map((o) => ({
        id: o.id,
        amount: o.amountCents,
        due: o.dueDate ?? null,
        trigger: o.trigger,
        paid: obligationAmountPaidCents(o),
        rem: obligationRemainingCents(o),
      })),
    );
    console.log(
      "recurring",
      pkg.structuredPaymentTerms?.recurring?.startTrigger,
      pkg.structuredPaymentTerms?.recurring?.startBillingDate,
      pkg.billingPlan?.recurring?.status,
    );
    console.log("bindings", pkg.obligationStripeBindings);
    console.log("ancillary", pkg.structuredPaymentTerms?.ancillaryCharges ?? []);

    if (row.id === 3) {
      const bal = aggregateObligationBalances(project);
      if (bal.totalCents !== 950_000) failures.push("c3 total");
      if (bal.paidCents !== 750_000) failures.push("c3 paid");
      if (bal.remainingCents !== 200_000) failures.push("c3 remaining");
      for (const id of [
        "in_1U8qSTH7v7C2pv8k180yHoYS",
        "in_1UEllxH7v7C2pv8kmGk6QEAT",
      ]) {
        const hit = obs.some(
          (o) =>
            (o.paymentEvents ?? []).some((e) => e.stripeInvoiceId === id) ||
            o.paymentReceipt?.stripeInvoiceId === id,
        );
        if (!hit) failures.push(`missing ${id}`);
        console.log("invoice", id, hit ? "ON_LEDGER" : "MISSING");
      }
    }

    if (row.id === 4) {
      const vault = addons.find((o) => o.id === "deb-media-vault-y1");
      const host = addons.find((o) => o.id === "deb-hosting-y1");
      if (!vault || vault.amountCents !== 30_000) failures.push("vault");
      if (!host || host.amountCents !== 29_900) failures.push("host");
      if (host?.dueDate) failures.push("host due date set");
      if (pkg.structuredPaymentTerms?.recurring?.startBillingDate) {
        failures.push("management startBillingDate set");
      }
      if (pkg.structuredPaymentTerms?.recurring?.startTrigger !== "after-launch-verified") {
        failures.push("management trigger");
      }
    }
  }

  const rev = await client.query(
    `select id, title, amount::text, dedupe_key, metadata->>'stripeInvoiceId' as inv
     from revenue_events
     where client_id = 19 and dedupe_key like 'stripe-paid-backfill:%'
     order by id`,
  );
  console.log("REVENUE", rev.rows);
  if (rev.rows.length < 2) failures.push("revenue events");

  await client.end();

  if (failures.length) {
    console.error("QA FAIL", failures);
    process.exit(1);
  }
  console.log("QA PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
