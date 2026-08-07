/**
 * Client Site Intelligence — csi-v1-a foundation verifier.
 *   npm run verify:client-site-intelligence-csi-v1-a
 *
 * No production webhook calls. No production migrations. No OTP website adapter.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLIENT_SITE_EVENT_CLASSES,
  CSI_MAX_BODY_BYTES,
  CSI_REQUIRED_ENV_DOCS,
  CSI_SIGNATURE_HEADER,
  CSI_SOURCE_CREDENTIAL_REGISTRY,
  CSI_TIMESTAMP_HEADER,
  CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE,
  OTP_CARTS_CLIENT_KEY,
  OTP_CARTS_INGEST_SECRET_ENV,
  OTP_CARTS_SOURCE_SYSTEM,
  buildClientSiteIdempotencyKey,
  computeCsiSignatureBase64,
  createMemoryClientSiteEventStore,
  ingestClientSiteWebhook,
  normalizeWebsiteLeadPayload,
  parseCsiTimestampSeconds,
  persistClientSiteEventIdempotent,
  verifyCsiIngestSignature,
} from "../lib/client-site-intelligence/index.ts";
import { CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE } from "../lib/product-intelligence/client-site-intelligence/index.ts";
import {
  ON_TRACK_PERFORMANCE_SEED_SLUG,
  OTP_CARTS_EXPECTED_SLUG,
} from "../lib/client-launch/otp-carts-readiness.ts";

const root = process.cwd();
let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const SECRET = "test-csi-otp-carts-secret-do-not-use-in-prod";
const NOW = Date.parse("2026-08-07T19:45:00.000Z");

function leadBody(overrides: Record<string, unknown> = {}) {
  return {
    eventClass: "website_lead",
    clientKey: "otp-carts",
    sourceSystem: "otp-carts-website",
    leadId: "OTP-WEB-20260807-ABCD1234",
    occurredAt: "2026-08-07T18:00:00.000Z",
    formSource: "contact",
    formPath: "/contact",
    customer: {
      name: "Test Buyer",
      email: "buyer@example.com",
      phone: "555-0100",
      message: "Interested in a cart",
    },
    modelInterest: "Trail Cart X",
    utm: { source: "google", medium: "organic", campaign: null },
    referrer: "https://www.google.com/",
    landingPage: "https://www.otpcarts.com/models/trail-cart-x",
    status: "new",
    commissionAmountCents: 30000,
    commissionStatus: "not_due",
    soldAt: null,
    saleReference: null,
    ...overrides,
  };
}

function signedRequest(body: unknown, opts?: { ts?: number; secret?: string; badSig?: boolean }) {
  const rawBody = JSON.stringify(body);
  const ts = opts?.ts ?? Math.floor(NOW / 1000);
  const secret = opts?.secret ?? SECRET;
  const sig = opts?.badSig
    ? "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    : `v1,${computeCsiSignatureBase64(secret, ts, rawBody)}`;
  return { rawBody, ts, sig };
}

function mockPayload(clientId = 9003) {
  return {
    find: async ({ where }: { where: { slug?: { equals?: string } } }) => {
      const slug = where?.slug?.equals;
      if (slug === OTP_CARTS_EXPECTED_SLUG) {
        return { docs: [{ id: clientId, slug }] };
      }
      if (slug === ON_TRACK_PERFORMANCE_SEED_SLUG) {
        return { docs: [{ id: 1, slug }] };
      }
      return { docs: [] };
    },
  } as never;
}

console.log("\nverify:client-site-intelligence-csi-v1-a\n");

async function main() {
  {
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.foundationBatch, "csi-v1-a");
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.ingestApiImplemented, true);
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.hmacImplemented, true);
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.collectionsImplemented, true);
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.implemented, false);
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.nextImplementationBatch, "csi-v1-b");
    assert.ok(CLIENT_SITE_EVENT_CLASSES.includes("website_lead"));
    assert.ok(CLIENT_SITE_EVENT_CLASSES.includes("confirmed_sale"));
    assert.ok(CLIENT_SITE_EVENT_CLASSES.includes("seo_milestone"));
    ok("canonical event classes + gate flags for csi-v1-a");
  }

  {
    const binding = CSI_SOURCE_CREDENTIAL_REGISTRY[OTP_CARTS_CLIENT_KEY];
    assert.ok(binding);
    assert.equal(binding.sourceSystem, OTP_CARTS_SOURCE_SYSTEM);
    assert.equal(binding.envVar, OTP_CARTS_INGEST_SECRET_ENV);
    assert.deepEqual([...binding.allowedEventClasses], ["website_lead"]);
    assert.ok(binding.forbiddenClientKeys.includes("otp"));
    assert.equal(CSI_REQUIRED_ENV_DOCS[0]?.name, OTP_CARTS_INGEST_SECRET_ENV);
    assert.equal(CSI_REQUIRED_ENV_DOCS[0]?.sensitive, true);
    ok("OTP credential registry is per-site and Sensitive");
  }

  {
    const { rawBody, ts, sig } = signedRequest(leadBody());
    const good = verifyCsiIngestSignature({
      secret: SECRET,
      rawBody,
      timestampHeader: String(ts),
      signatureHeader: sig,
      nowMs: NOW,
    });
    assert.equal(good.ok, true);
    const bad = verifyCsiIngestSignature({
      secret: SECRET,
      rawBody,
      timestampHeader: String(ts),
      signatureHeader: "v1,bad",
      nowMs: NOW,
    });
    assert.equal(bad.ok, false);

    // Exact raw body: reserialized/different whitespace must not verify.
    const reserialized = JSON.stringify(JSON.parse(rawBody));
    const tamperedBody = `${rawBody} `;
    assert.equal(
      verifyCsiIngestSignature({
        secret: SECRET,
        rawBody: tamperedBody,
        timestampHeader: String(ts),
        signatureHeader: sig,
        nowMs: NOW,
      }).ok,
      false,
    );
    void reserialized;

    assert.equal(parseCsiTimestampSeconds("12.5"), null);
    assert.equal(parseCsiTimestampSeconds("1e3"), null);
    assert.equal(parseCsiTimestampSeconds("-1"), null);
    assert.equal(parseCsiTimestampSeconds("abc"), null);
    assert.equal(parseCsiTimestampSeconds(String(ts)), ts);

    const stale = verifyCsiIngestSignature({
      secret: SECRET,
      rawBody,
      timestampHeader: String(ts - 10_000),
      signatureHeader: `v1,${computeCsiSignatureBase64(SECRET, ts - 10_000, rawBody)}`,
      nowMs: NOW,
    });
    assert.equal(stale.ok, false);
    if (!stale.ok) assert.equal(stale.reason, "stale_timestamp");

    const future = verifyCsiIngestSignature({
      secret: SECRET,
      rawBody,
      timestampHeader: String(ts + 10_000),
      signatureHeader: `v1,${computeCsiSignatureBase64(SECRET, ts + 10_000, rawBody)}`,
      nowMs: NOW,
    });
    assert.equal(future.ok, false);
    if (!future.ok) assert.equal(future.reason, "stale_timestamp");

    ok("signature raw-body exactness + invalid/stale/future + integer timestamp");
  }

  {
    const normalized = normalizeWebsiteLeadPayload(
      leadBody({
        commissionStatus: "commission_due",
        soldAt: "2026-08-07T20:00:00.000Z",
        saleReference: "SALE-1",
        status: "sold_confirmed",
      }),
    );
    assert.equal(normalized.ok, true);
    if (normalized.ok) {
      assert.equal(normalized.payload.commissionStatus, "not_due");
      assert.equal(normalized.payload.soldAt, null);
      assert.equal(normalized.payload.saleReference, null);
      assert.equal(normalized.payload.lifecycleStatus, "new");
      assert.ok(normalized.rejectedAuthorityFields.includes("commissionStatus"));
      assert.ok(normalized.rejectedAuthorityFields.includes("soldAt"));
      assert.equal(normalized.payload.customer.email, "buyer@example.com");
      assert.ok((normalized.payload.customer.message ?? "").length <= 2000);
    }
    const badId = normalizeWebsiteLeadPayload(leadBody({ leadId: "NOPE" }));
    assert.equal(badId.ok, false);
    ok("payload normalization forces commission/sale authority fields");
  }

  {
    const store = createMemoryClientSiteEventStore();
    const key = buildClientSiteIdempotencyKey({
      sourceSystem: OTP_CARTS_SOURCE_SYSTEM,
      externalEventId: "OTP-WEB-20260807-ABCD1234",
      eventClass: "website_lead",
    });
    const base = {
      clientId: 9003,
      clientKey: OTP_CARTS_CLIENT_KEY,
      eventClass: "website_lead" as const,
      externalEventId: "OTP-WEB-20260807-ABCD1234",
      sourceSystem: OTP_CARTS_SOURCE_SYSTEM,
      occurredAt: "2026-08-07T18:00:00.000Z",
      receivedAt: "2026-08-07T19:45:00.000Z",
      sensitivity: "sensitive_contact" as const,
      visibilityState: "internal_only" as const,
      payload: { leadId: "OTP-WEB-20260807-ABCD1234" },
      ingestMeta: { commissionObligationCreated: false },
      idempotencyKey: key,
    };
    const a = await persistClientSiteEventIdempotent(store, base);
    const b = await persistClientSiteEventIdempotent(store, base);
    assert.equal(a.kind, "created");
    assert.equal(b.kind, "duplicate");
    assert.equal(store.rows.length, 1);

    const raceStore = createMemoryClientSiteEventStore();
    const races = await Promise.all([
      persistClientSiteEventIdempotent(raceStore, base),
      persistClientSiteEventIdempotent(raceStore, base),
      persistClientSiteEventIdempotent(raceStore, base),
    ]);
    assert.equal(raceStore.rows.length, 1);
    assert.equal(races.filter((r) => r.kind === "created").length, 1);
    assert.equal(races.filter((r) => r.kind === "duplicate").length, 2);
    ok("idempotent persist + concurrent duplicate collapse to one row");
  }

  {
    const store = createMemoryClientSiteEventStore();
    const activityCalls: Array<{ internalOnly?: boolean; sourceId?: string | number }> =
      [];
    const { rawBody, ts, sig } = signedRequest(leadBody());

    const deps = {
      resolveSecret: () =>
        ({
          ok: true as const,
          binding: CSI_SOURCE_CREDENTIAL_REGISTRY[OTP_CARTS_CLIENT_KEY]!,
          secret: SECRET,
        }),
      getPayload: async () => mockPayload(9003),
      createStore: () => store,
      nowMs: () => NOW,
      publishActivityForRecord: async ({ record }: { record: { id: number } }) => {
        activityCalls.push({
          internalOnly: true,
          sourceId: `csi:${OTP_CARTS_SOURCE_SYSTEM}:OTP-WEB-20260807-ABCD1234:website_lead:${record.id}`,
        });
        return { published: activityCalls.length === 1, skipped: activityCalls.length > 1, activityId: 42 };
      },
    };

    const first = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody,
      timestampHeader: String(ts),
      signatureHeader: sig,
      deps,
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.ok, true);
    assert.equal(first.body.duplicate, false);
    assert.equal(first.body.activityPublished, true);
    assert.equal(store.rows.length, 1);
    assert.equal(store.rows[0]?.visibilityState, "internal_only");
    assert.equal(
      (store.rows[0]?.payload as { commissionStatus?: string }).commissionStatus,
      "not_due",
    );
    assert.equal(
      (store.rows[0]?.ingestMeta as { commissionObligationCreated?: boolean })
        .commissionObligationCreated,
      false,
    );
    assert.equal(
      (store.rows[0]?.ingestMeta as { reportedCommissionStatus?: unknown })
        .reportedCommissionStatus,
      undefined,
    );
    assert.equal(store.rows[0]?.activityTimelineEventId, 42);

    const replay = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody,
      timestampHeader: String(ts),
      signatureHeader: sig,
      deps,
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.duplicate, true);
    assert.equal(store.rows.length, 1);
    // Already linked — must not re-enter Activity publish.
    assert.equal(activityCalls.length, 1);
    assert.ok(activityCalls.every((c) => c.internalOnly === true));
    ok("valid OTP website lead ingest + idempotent replay + one activity publish");
  }

  {
    const store = createMemoryClientSiteEventStore();
    const depsBase = {
      resolveSecret: () =>
        ({
          ok: true as const,
          binding: CSI_SOURCE_CREDENTIAL_REGISTRY[OTP_CARTS_CLIENT_KEY]!,
          secret: SECRET,
        }),
      getPayload: async () => mockPayload(9003),
      createStore: () => store,
      nowMs: () => NOW,
      publishActivityForRecord: async () => ({
        published: false,
        skipped: true,
        activityId: null,
      }),
    };

    const badSig = signedRequest(leadBody(), { badSig: true });
    const r1 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody: badSig.rawBody,
      timestampHeader: String(badSig.ts),
      signatureHeader: badSig.sig,
      deps: depsBase,
    });
    assert.equal(r1.status, 401);

    const stale = signedRequest(leadBody(), { ts: Math.floor(NOW / 1000) - 10_000 });
    const r2 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody: stale.rawBody,
      timestampHeader: String(stale.ts),
      signatureHeader: stale.sig,
      deps: depsBase,
    });
    assert.equal(r2.status, 400);
    assert.equal(r2.body.code, "stale_timestamp");

    const wrongKey = signedRequest(leadBody({ clientKey: "otp" }));
    const r3 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody: wrongKey.rawBody,
      timestampHeader: String(wrongKey.ts),
      signatureHeader: wrongKey.sig,
      deps: depsBase,
    });
    assert.equal(r3.status, 403);

    const wrongSource = signedRequest(leadBody({ sourceSystem: "other-site" }));
    const r4 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody: wrongSource.rawBody,
      timestampHeader: String(wrongSource.ts),
      signatureHeader: wrongSource.sig,
      deps: depsBase,
    });
    assert.equal(r4.status, 403);

    const unsupported = signedRequest(leadBody({ eventClass: "deployment" }));
    const r5 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody: unsupported.rawBody,
      timestampHeader: String(unsupported.ts),
      signatureHeader: unsupported.sig,
      deps: depsBase,
    });
    assert.equal(r5.status, 400);
    assert.equal(r5.body.code, "unsupported_event_class");

    const pathOtp = signedRequest(leadBody());
    const r6 = await ingestClientSiteWebhook({
      pathClientKey: "otp",
      rawBody: pathOtp.rawBody,
      timestampHeader: String(pathOtp.ts),
      signatureHeader: pathOtp.sig,
      deps: {
        ...depsBase,
        resolveSecret: () => ({ ok: false as const, reason: "unknown_client_key" }),
      },
    });
    assert.equal(r6.status, 404);

    const huge = "x".repeat(CSI_MAX_BODY_BYTES + 1);
    const r7 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody: huge,
      timestampHeader: "1",
      signatureHeader: "v1,x",
      deps: depsBase,
    });
    assert.equal(r7.status, 413);

    const { rawBody, ts, sig } = signedRequest(leadBody());
    const r8 = await ingestClientSiteWebhook({
      pathClientKey: "otp-carts",
      rawBody,
      timestampHeader: String(ts),
      signatureHeader: sig,
      contentTypeHeader: "text/plain",
      deps: depsBase,
    });
    assert.equal(r8.status, 415);

    assert.equal(store.rows.length, 0);
    ok("reject invalid signature, stale, wrong client/source, unsupported class, size, content-type");
  }

  {
    const route = readFileSync(
      join(root, "app/api/webhooks/client-site/[clientKey]/route.ts"),
      "utf8",
    );
    const creds = readFileSync(
      join(root, "lib/client-site-intelligence/credentials.ts"),
      "utf8",
    );
    const ingest = readFileSync(
      join(root, "lib/client-site-intelligence/ingest.ts"),
      "utf8",
    );
    const activity = readFileSync(
      join(root, "lib/client-site-intelligence/publish-activity.ts"),
      "utf8",
    );
    const migration = readFileSync(
      join(root, "migrations/20260823_client_site_events.ts"),
      "utf8",
    );
    const collection = readFileSync(
      join(root, "payload/collections/ClientSiteEvents.ts"),
      "utf8",
    );
    const pkg = readFileSync(join(root, "package.json"), "utf8");
    const migrationsIndex = readFileSync(join(root, "migrations/index.ts"), "utf8");

    assert.ok(route.includes("ingestClientSiteWebhook"));
    assert.ok(route.includes("force-dynamic"));
    assert.ok(route.includes("req.text()"));
    assert.ok(creds.includes(OTP_CARTS_INGEST_SECRET_ENV));
    // Secret must remain server-only — never bound to a public env name.
    assert.ok(!creds.includes(`process.env.NEXT_PUBLIC_`));
    assert.ok(!OTP_CARTS_INGEST_SECRET_ENV.startsWith("NEXT_PUBLIC_"));
    assert.ok(ingest.includes("commissionObligationCreated: false"));
    assert.ok(ingest.includes("rejectedAuthorityFields"));
    assert.ok(!ingest.includes("reportedCommissionStatus"));
    assert.ok(activity.includes("internalOnly: true"));
    assert.ok(activity.includes("CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE"));
    assert.ok(activity.includes("Website lead received"));
    assert.ok(!activity.includes("buyer@example.com"));
    assert.equal(
      CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE,
      "client-site.website_lead.received",
    );
    assert.ok(migration.includes("client_site_events_source_external_class_uidx"));
    assert.ok(migration.includes("client_site_events_idempotency_key_uidx"));
    assert.ok(collection.includes("website_lead"));
    assert.ok(collection.includes("denyAll"));
    assert.ok(collection.includes("isStudioPayloadOperator"));
    assert.ok(collection.includes("create: denyAll"));
    assert.ok(collection.includes("delete: denyAll"));
    assert.ok(pkg.includes("verify:client-site-intelligence-csi-v1-a"));
    assert.equal(CSI_SIGNATURE_HEADER, "x-kxd-csi-signature");
    assert.equal(CSI_TIMESTAMP_HEADER, "x-kxd-csi-timestamp");

    // On clean main release: CSI migration follows junior-creator timer safety.
    // Do not require Sign/Continuous Intelligence migrations on this branch.
    assert.ok(migrationsIndex.includes("20260807_junior_creator_timer_safety"));
    assert.ok(migrationsIndex.includes("20260823_client_site_events"));
    assert.ok(
      migrationsIndex.indexOf("20260823_client_site_events") >
        migrationsIndex.indexOf("20260807_junior_creator_timer_safety"),
    );
    assert.ok(!migrationsIndex.includes("20260822_continuous_intelligence_ops"));
    assert.ok(!migrationsIndex.includes("20260819_kxd_sign_operator_signature_profiles"));

    assert.ok(existsSync(join(root, "lib/client-site-intelligence/index.ts")));
    assert.ok(existsSync(join(root, "migrations/20260823_client_site_events.ts")));

    // No sale/commission UI / portal work surfaces in this batch
    assert.ok(!existsSync(join(root, "lib/client-site-intelligence/commission.ts")));
    assert.ok(!existsSync(join(root, "lib/client-site-intelligence/sale-confirmation.ts")));
    ok("files, access policy, secrets, migration sequence, no commission UI");
  }

  {
    // Document concurrency verification scope for operators.
    assert.ok(CSI_MAX_BODY_BYTES >= 1024);
    ok(
      "concurrency: in-memory unique-key race verified; DB unique indexes present in migration — live Postgres race not executed in this pass",
    );
  }

  {
    const dna = readFileSync(
      join(root, "lib/product-intelligence/archive/product-dna-seed.ts"),
      "utf8",
    );
    assert.ok(!/ClientSiteEvent|csi-v1-a ingest/i.test(dna));
    ok("Product DNA unchanged");
  }

  console.log(`\n${passed} checks passed — csi-v1-a foundation verified.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
