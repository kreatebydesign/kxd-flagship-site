/**
 * Read-only Platinum Film Workz ledger snapshot.
 *   npx tsx scripts/inspect-platinum-ledger-snapshot.ts
 */

import { spawnSync } from "node:child_process";
import {
  isObligationCurrentlyOutstanding,
  obligationAmountPaidCents,
  obligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances";

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
      billingPlan?: { obligations?: Array<Record<string, unknown>> };
      operatorRecurringServices?: unknown;
      auditEvents?: Array<{ action?: string; reason?: string; at?: string }>;
      commercialAmendments?: unknown;
    };
  }>(`select id, title, lifecycle_package from contracts where client_id = 18`);

  const pkg = rows[0]!.lifecycle_package;
  const obs = (pkg.billingPlan?.obligations ?? []) as Array<{
    id: string;
    kind: string;
    label: string;
    status: string;
    amountCents: number;
    dueDate?: string | null;
    trigger?: string;
    sourceKey?: string | null;
    serviceTitle?: string | null;
    billingCadence?: string | null;
    paymentEvents?: Array<Record<string, unknown>>;
  }>;

  const asOf = "2026-10-10";
  console.log(
    JSON.stringify(
      {
        contractId: rows[0]!.id,
        title: rows[0]!.title,
        obligations: obs.map((o) => ({
          id: o.id,
          kind: o.kind,
          label: o.label,
          status: o.status,
          amount: o.amountCents,
          paid: obligationAmountPaidCents(o as never),
          rem: obligationRemainingCents(o as never),
          due: o.dueDate,
          trigger: o.trigger,
          sourceKey: o.sourceKey,
          serviceTitle: o.serviceTitle,
          cadence: o.billingCadence,
          currentlyDue: isObligationCurrentlyOutstanding(o as never, asOf),
          events: (o.paymentEvents || []).map((e) => ({
            id: e.id,
            amt: e.amountCents,
            paidAt: e.paidAt,
            group: e.paymentGroupId,
            method: e.externalPaymentMethod,
            ref: e.externalReference,
          })),
        })),
        operatorRecurringServices: pkg.operatorRecurringServices ?? null,
        auditTail: (pkg.auditEvents || []).slice(-12),
      },
      null,
      2,
    ),
  );
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
