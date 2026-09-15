/**
 * AUTHORIZED production correction — Platinum Film Workz Final Payment event.
 *
 * Corrects ONLY:
 *   contract 2 / obligation pfw-rem-2 / payevt_bfab49f443c4b715
 *   amountCents 60000 → 30000
 *
 * Dry-run by default. Write requires:
 *   CONFIRM_PLATINUM_PAYMENT_CORRECTION=payevt_bfab49f443c4b715
 *
 *   npx tsx scripts/correct-platinum-final-payment-event.ts
 */

import { spawnSync } from "node:child_process";
import { newLifecycleId } from "../lib/proposal-lifecycle/hash";
import {
  obligationAmountPaidCents,
  obligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";
import type { ObligationPaymentEvent } from "../lib/proposal-lifecycle/external-obligation-payment";

const CONFIRM = "payevt_bfab49f443c4b715";
const CONTRACT_ID = 2;
const CLIENT_ID = 18;
const OBLIGATION_ID = "pfw-rem-2";
const EVENT_ID = "payevt_bfab49f443c4b715";
const GROUP_ID = "paygrp_47239d15248070bd";
const FROM_CENTS = 60_000;
const TO_CENTS = 30_000;

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

function rebuildIdempotencyKey(key: string, fromCents: number, toCents: number): string {
  const needle = `amt:${fromCents}`;
  if (!key.includes(needle)) {
    throw new Error(`Idempotency key missing expected ${needle}: ${key}`);
  }
  return key.replace(needle, `amt:${toCents}`);
}

function correctPackage(pkg: Record<string, unknown>): {
  next: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
} {
  const billingPlan = pkg.billingPlan as
    | { obligations?: InvoiceObligation[]; updatedAt?: string }
    | undefined;
  if (!billingPlan?.obligations?.length) {
    throw new Error("No billing plan obligations on contract");
  }

  const idx = billingPlan.obligations.findIndex((o) => o.id === OBLIGATION_ID);
  if (idx < 0) throw new Error(`Obligation ${OBLIGATION_ID} not found`);
  const obligation = billingPlan.obligations[idx]!;
  const events = [...(obligation.paymentEvents ?? [])];
  const eventIdx = events.findIndex((e) => e.id === EVENT_ID);
  if (eventIdx < 0) throw new Error(`Event ${EVENT_ID} not found`);
  const event = events[eventIdx]!;

  if (event.paymentGroupId !== GROUP_ID) {
    throw new Error(`Unexpected paymentGroupId ${event.paymentGroupId}`);
  }
  if (event.amountCents !== FROM_CENTS) {
    throw new Error(
      `Refusing correction: event amount is ${event.amountCents}, expected ${FROM_CENTS}`,
    );
  }

  const correctedEvent: ObligationPaymentEvent = {
    ...event,
    amountCents: TO_CENTS,
    idempotencyKey: rebuildIdempotencyKey(
      String(event.idempotencyKey),
      FROM_CENTS,
      TO_CENTS,
    ),
  };
  events[eventIdx] = correctedEvent;

  const nextObligationBase: InvoiceObligation = {
    ...obligation,
    paymentEvents: events,
  };
  const paidCents = obligationAmountPaidCents(nextObligationBase);
  const remainingCents = Math.max(0, obligation.amountCents - paidCents);
  const nextStatus =
    remainingCents <= 0 ? "paid" : paidCents > 0 ? "partially-paid" : obligation.status;

  const receipt = obligation.paymentReceipt
    ? {
        ...obligation.paymentReceipt,
        status: remainingCents <= 0 ? ("paid" as const) : ("partial" as const),
        amountCents: remainingCents <= 0 ? obligation.amountCents : paidCents,
        paidAt: correctedEvent.paidAt,
        externalPaymentMethod: correctedEvent.externalPaymentMethod,
        externalReference: correctedEvent.externalReference ?? null,
        operatorNote: correctedEvent.operatorNote ?? null,
        recordedBy: correctedEvent.recordedBy,
        recordedAt: correctedEvent.recordedAt,
        stripeInvoiceId: correctedEvent.stripeInvoiceId ?? null,
        collectionChannel: correctedEvent.collectionChannel,
        idempotencyKey: correctedEvent.idempotencyKey,
      }
    : null;

  const nextObligation: InvoiceObligation = {
    ...nextObligationBase,
    amountPaidCents: paidCents,
    status: nextStatus as InvoiceObligation["status"],
    paymentReceipt: receipt,
    paidAt: remainingCents <= 0 ? correctedEvent.paidAt : obligation.paidAt,
  };

  const nextObligations = billingPlan.obligations.map((o, i) =>
    i === idx ? nextObligation : o,
  );

  const auditEvents = [
    ...((pkg.auditEvents as Array<Record<string, unknown>> | undefined) ?? []),
    {
      id: newLifecycleId("audit"),
      at: new Date().toISOString(),
      actor: "matt@kreatebydesign.com",
      action: "obligation.external-payment-amount-corrected",
      fromStatus: obligation.status,
      toStatus: nextStatus,
      reason:
        "Human-authorized correction: Record Payment UI overwrote operator $300.00 with obligation remaining $600.00. Event payevt_bfab49f443c4b715 amountCents 60000→30000. Real Cash App payment 2026-09-14 was $300.00.",
      sourceVersion: null,
      correlationId: EVENT_ID,
    },
  ];

  const before = {
    eventAmountCents: event.amountCents,
    obligationPaidCents: obligationAmountPaidCents(obligation),
    obligationRemainingCents: obligationRemainingCents(obligation),
    obligationStatus: obligation.status,
    idempotencyKey: event.idempotencyKey,
  };

  const after = {
    eventAmountCents: correctedEvent.amountCents,
    obligationPaidCents: paidCents,
    obligationRemainingCents: remainingCents,
    obligationStatus: nextStatus,
    idempotencyKey: correctedEvent.idempotencyKey,
  };

  const next = {
    ...pkg,
    billingPlan: {
      ...billingPlan,
      obligations: nextObligations,
      updatedAt: new Date().toISOString(),
    },
    auditEvents,
  };

  return { next, before, after };
}

async function main() {
  const write =
    process.env.CONFIRM_PLATINUM_PAYMENT_CORRECTION === CONFIRM;
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query<{
    id: number;
    client_id: number;
    lifecycle_package: Record<string, unknown>;
  }>(`select id, client_id, lifecycle_package from contracts where id = $1`, [
    CONTRACT_ID,
  ]);
  const row = rows[0];
  if (!row) throw new Error("Contract 2 not found");
  if (row.client_id !== CLIENT_ID) {
    throw new Error(`Contract client_id ${row.client_id} ≠ expected ${CLIENT_ID}`);
  }

  const { next, before, after } = correctPackage(row.lifecycle_package);
  console.log("BEFORE", JSON.stringify(before, null, 2));
  console.log("AFTER", JSON.stringify(after, null, 2));

  if (after.eventAmountCents !== TO_CENTS) throw new Error("after amount mismatch");
  if (after.obligationPaidCents !== 32_500) throw new Error("expected paid 32500");
  if (after.obligationRemainingCents !== 30_000) {
    throw new Error("expected remaining 30000");
  }
  if (after.obligationStatus !== "partially-paid") {
    throw new Error("expected partially-paid");
  }

  // Blast check: only this event amount changed in package serialization of payment events
  const beforeEvents = JSON.stringify(
    (row.lifecycle_package as { billingPlan?: { obligations?: InvoiceObligation[] } })
      .billingPlan?.obligations?.flatMap((o) =>
        (o.paymentEvents ?? []).map((e) => ({
          id: e.id,
          amountCents: e.amountCents,
          group: e.paymentGroupId,
        })),
      ) ?? [],
  );
  const afterEvents = JSON.stringify(
    (next as { billingPlan?: { obligations?: InvoiceObligation[] } }).billingPlan
      ?.obligations?.flatMap((o) =>
        (o.paymentEvents ?? []).map((e) => ({
          id: e.id,
          amountCents: e.amountCents,
          group: e.paymentGroupId,
        })),
      ) ?? [],
  );
  console.log("event list before", beforeEvents);
  console.log("event list after", afterEvents);

  if (!write) {
    console.log(
      "\nDRY RUN — set CONFIRM_PLATINUM_PAYMENT_CORRECTION=payevt_bfab49f443c4b715 to write.",
    );
    await client.end();
    return;
  }

  await client.query(
    `update contracts
     set lifecycle_package = $2::jsonb,
         updated_at = now()
     where id = $1 and client_id = $3`,
    [CONTRACT_ID, JSON.stringify(next), CLIENT_ID],
  );
  console.log("\nWROTE correction to contract 2.");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
