/**
 * Primal — client-visible lead notifications (local SQLite fixture).
 *
 * Publishes a real inquiry + paid-registration activity, then verifies JB's feed.
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs \\
 *     scripts/verify-primal-portal-lead-notifications-qa.ts
 */
import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  getClientNotificationCenter,
  getClientNotificationSummary,
  assertOwnedClientVisibleNotification,
} from "../lib/ces/modules/notifications/data";
import { leadDetailHref } from "../lib/client-command/leads/presentation";
import { receiveManagedClientInquiry } from "../lib/managed-client-leads/receive";
import { parseRegistrationPaymentPatch } from "../lib/managed-client-leads/registration-payment";
import "@/lib/acquisition-operations/policies/register";
import { assertPrimalLocalQaDatabase } from "./lib/primal-qa-db-gate.ts";

const JB_QA_EMAIL = "jb-qa@kxd-preview-qa.local";
const TYLER_QA_EMAIL = "tyler-qa@kxd-preview-qa.local";
const QA_SOURCE_ID = `evtreg_qa${Date.now().toString(36).slice(-10)}_k7h9m2`;

async function main() {
  assertPrimalLocalQaDatabase();

  const payload = await getPayload({ config });

  const primal = await payload.find({
    collection: "clients",
    where: { slug: { equals: "primal-motorsports" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const client = primal.docs[0] as { id: number } | undefined;
  assert.ok(client, "Primal client missing — run seed:clients on local fixture");

  const portalUsers = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { client: { equals: client.id } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const jb = (portalUsers.docs as Array<{ id: number; email?: string }>).find(
    (u) => u.email?.toLowerCase() === JB_QA_EMAIL,
  );
  const tyler = (portalUsers.docs as Array<{ id: number; email?: string }>).find(
    (u) => u.email?.toLowerCase() === TYLER_QA_EMAIL,
  );
  assert.ok(jb, `JB QA portal user missing (${JB_QA_EMAIL}) — run seed:portal-user`);
  assert.ok(tyler, `Tyler QA portal user missing (${TYLER_QA_EMAIL}) — run seed:portal-user`);

  const payment = parseRegistrationPaymentPatch(
    {
      registrationId: QA_SOURCE_ID,
      payment: {
        paymentStatus: "paid",
        paymentAmountCents: 139900,
        paymentCurrency: "usd",
        stripeCheckoutSessionId: "cs_test_qa_fixture_only",
        paidAt: new Date().toISOString(),
        programLabel: "Primal QA HPDE",
      },
    },
    QA_SOURCE_ID,
  );

  const created = await receiveManagedClientInquiry({
    clientId: client.id,
    clientKey: "primal-motorsports",
    channel: "form",
    receivedAt: new Date().toISOString(),
    sourceSystem: "primal-motorsports-website",
    sourceExternalId: QA_SOURCE_ID,
    contactName: "QA Driver",
    contactEmail: "qa-driver@kxd-preview-qa.local",
    programInterest: "Primal QA HPDE",
    registrationPayment: payment,
  });
  if (!created.ok) {
    throw new Error(created.message);
  }

  const inquiry = created.inquiry;
  const href = leadDetailHref(inquiry.inquiryKey);

  const assertUserFeed = async (portalUserId: number, label: string) => {
    const feed = await getClientNotificationCenter({
      clientId: client.id,
      portalUserId,
      limit: 40,
    });
    const summary = await getClientNotificationSummary({
      clientId: client.id,
      portalUserId,
    });

    const leadKinds = feed.items.filter(
      (item) =>
        item.href === href &&
        (item.kind === "managed-client.inquiry.received" ||
          item.kind === "managed-client.registration.payment.paid"),
    );

    assert.equal(
      leadKinds.length,
      2,
      `${label}: expected inquiry + paid registration for this inquiry`,
    );
    for (const item of leadKinds) {
      assert.equal(
        item.href,
        href,
        `${label}: lead notification href must match inquiry ${inquiry.inquiryKey}`,
      );
      assert.ok(item.href?.startsWith("/portal/leads/"), `${label}: href must stay in portal leads`);
      assert.equal(item.read, false, `${label}: new notifications should be unread`);
    }
    const matchingUnread = leadKinds.filter((item) => !item.read).length;
    assert.equal(matchingUnread, 2, `${label}: both new lead notifications should be unread`);
    assert.equal(
      summary.unreadCount,
      feed.unreadCount,
      `${label}: summary unread must match feed unread`,
    );
    return leadKinds;
  };

  const jbLeadKinds = await assertUserFeed(jb.id, "JB");
  const tylerLeadKinds = await assertUserFeed(tyler.id, "Tyler");

  const otherClients = await payload.find({
    collection: "clients",
    where: { slug: { not_equals: "primal-motorsports" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const other = otherClients.docs[0] as { id: number } | undefined;
  if (other) {
    for (const item of jbLeadKinds) {
      const owned = await assertOwnedClientVisibleNotification({
        activityId: item.id,
        clientId: other.id,
      });
      assert.equal(owned.ok, false, "Cross-client notification access must be blocked");
    }
  }

  console.log(
    JSON.stringify(
      {
        primalClientId: client.id,
        jbPortalUserId: jb.id,
        tylerPortalUserId: tyler.id,
        inquiryKey: inquiry.inquiryKey,
        expectedHref: href,
        jbLeadNotificationCount: jbLeadKinds.length,
        tylerLeadNotificationCount: tylerLeadKinds.length,
        sample: jbLeadKinds.map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          href: i.href,
          read: i.read,
        })),
      },
      null,
      2,
    ),
  );

  console.log("OK — Primal portal lead notifications QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});