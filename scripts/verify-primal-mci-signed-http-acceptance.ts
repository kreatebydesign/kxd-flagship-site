/**
 * Real signed HTTP POST to local MCI receiver (cschool campaign payload).
 *
 * Requires:
 *   - worktree .env.local: PAYLOAD_SQLITE_PATH + KXD_MCI_PRIMAL_MOTORSPORTS_INGEST_SECRET
 *   - local dev server: KXD_MCI_QA_BASE_URL (default http://127.0.0.1:3001)
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs \\
 *     scripts/verify-primal-mci-signed-http-acceptance.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  getClientNotificationCenter,
  assertOwnedClientVisibleNotification,
} from "../lib/ces/modules/notifications/data";
import { leadDetailHref } from "../lib/client-command/leads/presentation";
import { computeMciFormSignatureBase64 } from "../lib/managed-client-leads/form-ingest/signature";
import {
  MCI_FORM_SIGNATURE_HEADER,
  MCI_FORM_TIMESTAMP_HEADER,
} from "../lib/managed-client-leads/form-ingest/constants";
import { CLIENT_INQUIRIES_COLLECTION } from "../lib/managed-client-leads/collection";
import { mapDocToRecord } from "../lib/managed-client-leads/map";
import "@/lib/acquisition-operations/policies/register";
import { assertPrimalLocalQaDatabase } from "./lib/primal-qa-db-gate.ts";

const JB_QA_EMAIL = "jb-qa@kxd-preview-qa.local";
const TYLER_QA_EMAIL = "tyler-qa@kxd-preview-qa.local";
const ORDER_SUFFIX = randomBytes(4).toString("hex").toUpperCase();
const ORDER_ID = `cschool-20261118-${ORDER_SUFFIX}`;

function signBody(secret: string, rawBody: string, ts: number): string {
  const sig = computeMciFormSignatureBase64(secret, ts, rawBody);
  return `v1,${sig}`;
}

function campaignPayload(): Record<string, unknown> {
  return {
    sourceExternalId: ORDER_ID,
    registrationId: ORDER_ID,
    sourceSystem: "primal-motorsports-website",
    channel: "form",
    contactName: "Gift Buyer",
    contactEmail: "bf-buyer@kxd-preview-qa.local",
    campaign: "black-friday-2026",
    messageSummary:
      `Black Friday campaign school payment · 2-Day Performance School · Gift · Order ${ORDER_ID} · Scheduling unscheduled`,
    payment: {
      paymentStatus: "paid",
      paymentAmountCents: 599500,
      paymentCurrency: "usd",
      stripeCheckoutSessionId: "cs_test_bf_local_acceptance",
      stripePaymentIntentId: "pi_test_bf_local_acceptance",
      paidAt: new Date().toISOString(),
      programLabel: "2-Day Performance School",
      courseId: "performance-school-2day",
      eventStartsOn: null,
      eventEndsOn: null,
    },
  };
}

async function postIngest(baseUrl: string, secret: string, rawBody: string, ts: number) {
  const res = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/webhooks/managed-client-inquiries/primal-motorsports`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [MCI_FORM_TIMESTAMP_HEADER]: String(ts),
        [MCI_FORM_SIGNATURE_HEADER]: signBody(secret, rawBody, ts),
      },
      body: rawBody,
    },
  );
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

async function main() {
  assertPrimalLocalQaDatabase();

  const secret = process.env.KXD_MCI_PRIMAL_MOTORSPORTS_INGEST_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "KXD_MCI_PRIMAL_MOTORSPORTS_INGEST_SECRET missing — set in worktree .env.local only",
    );
  }

  const baseUrl = process.env.KXD_MCI_QA_BASE_URL?.trim() || "http://127.0.0.1:3001";
  try {
    const health = await fetch(baseUrl, { method: "HEAD" });
    if (!health.ok && health.status !== 405) {
      throw new Error(`Local receiver not reachable at ${baseUrl} (status ${health.status})`);
    }
  } catch (err) {
    throw new Error(
      `Local receiver not running at ${baseUrl}. Start: npm run dev (worktree). ${err instanceof Error ? err.message : err}`,
    );
  }

  const rawBody = JSON.stringify(campaignPayload());
  const ts = Math.floor(Date.now() / 1000);

  const badRes = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/webhooks/managed-client-inquiries/primal-motorsports`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [MCI_FORM_TIMESTAMP_HEADER]: String(ts),
        [MCI_FORM_SIGNATURE_HEADER]: "v1,INVALIDSIGNATURE",
      },
      body: rawBody,
    },
  );
  assert.equal(badRes.status, 401, "Invalid signature must be rejected");

  const first = await postIngest(baseUrl, secret, rawBody, ts);
  assert.equal(first.status, 200, `First POST failed: ${JSON.stringify(first.body)}`);
  assert.equal(first.body.ok, true);
  assert.equal(first.body.created, true);

  const second = await postIngest(baseUrl, secret, rawBody, ts);
  assert.equal(second.status, 200, `Replay POST failed: ${JSON.stringify(second.body)}`);
  assert.equal(second.body.ok, true);
  assert.equal(second.body.created, false);

  const payload = await getPayload({ config });
  const rows = await payload.find({
    collection: CLIENT_INQUIRIES_COLLECTION,
    where: { sourceExternalId: { equals: ORDER_ID } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(rows.totalDocs, 1, "Replay must not duplicate inquiry rows");

  const inquiry = mapDocToRecord(rows.docs[0] as Record<string, unknown>);
  assert.equal(inquiry.paymentStatus, "paid");
  assert.equal(inquiry.paymentAmountCents, 599500);
  assert.equal(inquiry.programLabel, "2-Day Performance School");
  assert.equal(inquiry.registrationId, ORDER_ID);
  assert.equal(inquiry.contactName, "Gift Buyer");
  assert.equal(inquiry.eventStartsOn, null);
  assert.equal(inquiry.eventEndsOn, null);
  assert.ok(
    inquiry.messageSummary?.includes("Gift"),
    "Gift/self context must remain in messageSummary",
  );

  const primal = await payload.find({
    collection: "clients",
    where: { slug: { equals: "primal-motorsports" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const clientId = (primal.docs[0] as { id: number }).id;
  const href = leadDetailHref(inquiry.inquiryKey);

  const portalUsers = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { client: { equals: clientId } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  const jb = (portalUsers.docs as Array<{ id: number; email?: string }>).find(
    (u) => u.email?.toLowerCase() === JB_QA_EMAIL,
  );
  const tyler = (portalUsers.docs as Array<{ id: number; email?: string }>).find(
    (u) => u.email?.toLowerCase() === TYLER_QA_EMAIL,
  );
  assert.ok(jb, `JB QA user missing (${JB_QA_EMAIL})`);
  assert.ok(tyler, `Tyler QA user missing (${TYLER_QA_EMAIL})`);

  const assertFeedForUser = async (portalUserId: number, label: string) => {
    const feed = await getClientNotificationCenter({
      clientId,
      portalUserId,
      limit: 40,
    });
    const matches = feed.items.filter(
      (item) =>
        item.href === href &&
        (item.kind === "managed-client.inquiry.received" ||
          item.kind === "managed-client.registration.payment.paid"),
    );
    assert.equal(matches.length, 2, `${label}: expected inquiry + paid notifications`);
    return matches;
  };

  const jbItems = await assertFeedForUser(jb!.id, "JB");
  const tylerItems = await assertFeedForUser(tyler!.id, "Tyler");

  const otherClients = await payload.find({
    collection: "clients",
    where: { slug: { not_equals: "primal-motorsports" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const other = otherClients.docs[0] as { id: number } | undefined;
  if (other) {
    for (const item of jbItems) {
      const owned = await assertOwnedClientVisibleNotification({
        activityId: item.id,
        clientId: other.id,
      });
      assert.equal(owned.ok, false, "Cross-client notification leak blocked");
    }
  }

  console.log(
    JSON.stringify(
      {
        orderId: ORDER_ID,
        inquiryKey: inquiry.inquiryKey,
        href,
        firstPost: { status: first.status, created: first.body.created },
        replayPost: { status: second.status, created: second.body.created },
        invalidSignatureStatus: badRes.status,
        rowCount: rows.totalDocs,
        paymentStatus: inquiry.paymentStatus,
        amountCents: inquiry.paymentAmountCents,
        jbNotificationKinds: jbItems.map((i) => i.kind),
        tylerNotificationKinds: tylerItems.map((i) => i.kind),
      },
      null,
      2,
    ),
  );

  console.log("OK — Primal MCI signed HTTP acceptance passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});