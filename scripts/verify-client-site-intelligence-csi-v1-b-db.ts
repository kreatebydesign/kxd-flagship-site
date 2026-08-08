/**
 * DB-backed CSI v1-b concurrency and integrity verification.
 *
 * Safety: refuses every remote database and every local database whose name
 * does not begin with `kxd_csi_v1b_hardening_`.
 */
import assert from "node:assert/strict";
import { getPayload, type Payload } from "payload";
import config from "../payload.config.ts";
import {
  buildCsiLifecycleActivitySourceId,
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
} from "../lib/client-site-intelligence/constants.ts";
import {
  confirmCsiWebsiteLeadSale,
  markCsiCommissionPaid,
} from "../lib/client-site-intelligence/sale-commission.ts";

function assertDisposableLocalDatabase(): void {
  const value =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  const url = new URL(value);
  const database = url.pathname.replace(/^\//, "").split("?")[0];
  assert.ok(
    url.hostname === "127.0.0.1" || url.hostname === "localhost",
    `Refusing non-local host ${url.hostname}`,
  );
  assert.match(database, /^kxd_csi_v1b_hardening_/);
  console.log(`[CSI v1-b DB] local database=${database}`);
}

async function createEvent(
  payload: Payload,
  input: {
    clientId: number;
    clientKey: string;
    eventClass?: string;
    suffix: string;
  },
): Promise<number> {
  const externalEventId = `OTP-WEB-20260807-${input.suffix}`;
  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-site-events" as any,
    data: {
      client: input.clientId,
      clientKey: input.clientKey,
      eventClass: input.eventClass ?? "website_lead",
      externalEventId,
      sourceSystem: "otp-carts-website",
      idempotencyKey: `otp-carts-website:${externalEventId}:${input.eventClass ?? "website_lead"}`,
      occurredAt: "2026-08-07T18:00:00.000Z",
      receivedAt: "2026-08-07T18:00:01.000Z",
      sensitivity: "sensitive_contact",
      visibilityState: "internal_only",
      processingStatus: "activity_published",
      payload: {
        leadId: externalEventId,
        customer: {
          name: "Synthetic DB Test",
          email: "csi-v1b@example.invalid",
        },
        lifecycleStatus: "new",
        commissionStatus: "not_due",
        soldAt: null,
        saleReference: null,
      },
      ingestMeta: { commissionObligationCreated: false },
    },
    overrideAccess: true,
    depth: 0,
  });
  return Number(created.id);
}

async function ensureClient(
  payload: Payload,
  input: { name: string; slug: string },
): Promise<number> {
  const existing = await payload.find({
    collection: "clients",
    where: { slug: { equals: input.slug } },
    overrideAccess: true,
    depth: 0,
    limit: 1,
  });
  if (existing.docs[0]) return Number(existing.docs[0].id);
  const created = await payload.create({
    collection: "clients",
    data: { ...input, status: "active" },
    overrideAccess: true,
    depth: 0,
  });
  return Number(created.id);
}

async function findEvent(payload: Payload, eventId: number) {
  return payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-site-events" as any,
    id: eventId,
    overrideAccess: true,
    depth: 0,
  });
}

async function activityCount(
  payload: Payload,
  clientId: number,
  eventType: string,
  sourceId: string,
): Promise<{ count: number; serialized: string }> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { eventType: { equals: eventType } },
      ],
    },
    overrideAccess: true,
    depth: 0,
    limit: 100,
  });
  const matches = result.docs.filter((doc) => {
    const metadata = (doc as Record<string, unknown>).metadata;
    return (
      metadata &&
      typeof metadata === "object" &&
      String((metadata as Record<string, unknown>).sourceId ?? "") === sourceId
    );
  });
  return { count: matches.length, serialized: JSON.stringify(matches) };
}

async function main(): Promise<void> {
  assertDisposableLocalDatabase();
  const payload = await getPayload({ config });

  try {
    const users = await payload.find({
      collection: "users",
      overrideAccess: true,
      depth: 0,
      limit: 1,
      sort: "id",
    });
    assert.ok(users.docs[0], "A local operator fixture is required");
    const actor = { id: Number(users.docs[0].id) };
    const runId = Date.now().toString(36).toUpperCase();

    const clientId = await ensureClient(payload, {
      name: "OTP Carts — CSI v1-b DB Test",
      slug: "otp-carts",
    });
    const wrongClientId = await ensureClient(payload, {
      name: "Wrong Client — CSI v1-b DB Test",
      slug: "not-otp-carts",
    });

    const rollbackEventId = await createEvent(payload, {
      clientId,
      clientKey: "otp-carts",
      suffix: `${runId}-ROLLBACK`,
    });
    await assert.rejects(() =>
      confirmCsiWebsiteLeadSale({
        eventId: rollbackEventId,
        soldAt: "2026-08-07",
        saleReference: "ROLLBACK-TEST",
        actor: { id: 2_147_483_000 },
        payloadInstance: payload,
      }),
    );
    const rolledBack = (await findEvent(payload, rollbackEventId)) as Record<
      string,
      unknown
    >;
    assert.equal(rolledBack.lifecycleStatus, "new");
    assert.equal(rolledBack.commissionStatus, "not_due");
    assert.equal(rolledBack.commissionAmountCents, null);
    assert.equal(rolledBack.saleReference, null);
    await assert.rejects(() =>
      markCsiCommissionPaid({
        eventId: rollbackEventId,
        paidAt: "2026-08-08",
        paymentReference: "MUST-NOT-WRITE",
        actor,
        payloadInstance: payload,
      }),
    );
    console.log("  ✓ failed transactional update leaves no partial state");

    const wrongClientEventId = await createEvent(payload, {
      clientId: wrongClientId,
      clientKey: "not-otp-carts",
      suffix: `${runId}-WRONGCLIENT`,
    });
    const wrongClassEventId = await createEvent(payload, {
      clientId,
      clientKey: "otp-carts",
      eventClass: "deployment",
      suffix: `${runId}-WRONGCLASS`,
    });
    for (const eventId of [wrongClientEventId, wrongClassEventId]) {
      await assert.rejects(() =>
        confirmCsiWebsiteLeadSale({
          eventId,
          soldAt: "2026-08-07",
          saleReference: "MUST-NOT-WRITE",
          actor,
          payloadInstance: payload,
        }),
      );
      const unchanged = (await findEvent(payload, eventId)) as Record<
        string,
        unknown
      >;
      assert.equal(unchanged.lifecycleStatus, "new");
      assert.equal(unchanged.commissionStatus, "not_due");
    }
    console.log("  ✓ wrong client and event class fail closed");

    const eventId = await createEvent(payload, {
      clientId,
      clientKey: "otp-carts",
      suffix: `${runId}-CONCURRENT`,
    });

    await assert.rejects(() =>
      payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-site-events" as any,
        id: eventId,
        data: { lifecycleStatus: "sold_confirmed" },
        overrideAccess: false,
      }),
    );
    console.log("  ✓ generic Payload update cannot bypass collection access");

    const confirmations = await Promise.all(
      Array.from({ length: 12 }, () =>
        confirmCsiWebsiteLeadSale({
          eventId,
          soldAt: "2026-08-07",
          saleReference: "ORDER-DB-CONCURRENT-1",
          cartModelReference: "Synthetic cart",
          actor,
          payloadInstance: payload,
        }),
      ),
    );
    assert.equal(
      confirmations.filter((result) => result.kind === "confirmed").length,
      1,
    );
    assert.equal(
      confirmations.filter((result) => result.kind === "already_confirmed")
        .length,
      11,
    );

    const due = (await findEvent(payload, eventId)) as Record<string, unknown>;
    assert.equal(due.lifecycleStatus, "sold_confirmed");
    assert.equal(due.commissionStatus, "due");
    assert.equal(
      due.commissionAmountCents,
      DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
    );
    assert.equal(due.saleReference, "ORDER-DB-CONCURRENT-1");

    await assert.rejects(() =>
      payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-site-events" as any,
        id: eventId,
        data: { commissionAmountCents: 1 },
        overrideAccess: true,
      }),
    );
    assert.equal(
      ((await findEvent(payload, eventId)) as Record<string, unknown>)
        .commissionAmountCents,
      DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
    );
    console.log("  ✓ concurrent confirmation creates one $300 obligation");

    await assert.rejects(() =>
      markCsiCommissionPaid({
        eventId,
        paidAt: "2026-08-08",
        paymentReference: "",
        actor,
        payloadInstance: payload,
      }),
    );
    await assert.rejects(() =>
      markCsiCommissionPaid({
        eventId,
        paidAt: "2026-08-08",
        paymentReference: "card number 4111111111111111",
        actor,
        payloadInstance: payload,
      }),
    );

    const payments = await Promise.all(
      Array.from({ length: 12 }, () =>
        markCsiCommissionPaid({
          eventId,
          paidAt: "2026-08-08",
          paymentReference: "PAYOUT-DB-CONCURRENT-1",
          actor,
          payloadInstance: payload,
        }),
      ),
    );
    assert.equal(payments.filter((result) => result.kind === "paid").length, 1);
    assert.equal(
      payments.filter((result) => result.kind === "already_paid").length,
      11,
    );

    const paid = (await findEvent(payload, eventId)) as Record<string, unknown>;
    assert.equal(paid.commissionStatus, "paid");
    assert.ok(paid.commissionPaidAt);
    assert.equal(paid.commissionPaymentReference, "PAYOUT-DB-CONCURRENT-1");
    assert.equal(Number(paid.commissionPaidBy), actor.id);
    console.log("  ✓ concurrent payment records one authoritative paid state");

    const activities = [
      {
        eventType: "client-site.sale.confirmed",
        action: "sale-confirmed" as const,
      },
      {
        eventType: "client-site.commission.due",
        action: "commission-due" as const,
      },
      {
        eventType: "client-site.commission.paid",
        action: "commission-paid" as const,
      },
    ];
    for (const activity of activities) {
      const result = await activityCount(
        payload,
        clientId,
        activity.eventType,
        buildCsiLifecycleActivitySourceId(eventId, activity.action),
      );
      assert.equal(result.count, 1);
      assert.doesNotMatch(result.serialized, /csi-v1b@example\.invalid/i);
      assert.doesNotMatch(result.serialized, /ORDER-DB-CONCURRENT-1/);
      assert.doesNotMatch(result.serialized, /PAYOUT-DB-CONCURRENT-1/);
    }
    console.log("  ✓ lifecycle Activity is single-publication and PII-safe");

    console.log("\nCSI v1-b DB-backed lifecycle verification passed.\n");
  } finally {
    await Promise.race([
      payload.destroy(),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
