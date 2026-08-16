/**
 * Managed Client Lead Operations Phase 3 — form-success signed ingest.
 * Run: npm run verify:managed-client-form-ingest-phase-3
 *
 * Pure contract + architecture surface checks. Does not write production data.
 */

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ACQUISITION_OPERATIONS_PHASE_3,
  getManagedClientLeadPolicy,
} from "../lib/acquisition-operations";
import {
  MCI_FORM_INGEST_CREDENTIAL_REGISTRY,
  MCI_FORM_SIGNATURE_HEADER,
  MCI_FORM_TIMESTAMP_HEADER,
  OTP_COMMISSION_BOUNDARY,
  PRIMAL_MOTORSPORTS_FORM_INGEST_SECRET_ENV,
  PRIMAL_WEB_SUBMISSION_ID_PATTERN,
  computeMciFormSignatureBase64,
  normalizeMciFormIngestPayload,
  verifyMciFormIngestSignature,
} from "../lib/managed-client-leads";
import { OTP_COMMISSION_BOUNDARY as OTP_BOUNDARY_FROM_COMPAT } from "../lib/managed-client-leads/otp-compatibility";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function assertFileContains(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(text.includes(needle), `${rel} should contain: ${needle}`);
}

function assertFileDoesNotContain(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(!text.includes(needle), `${rel} must not contain: ${needle}`);
}

function assertPathMissing(rel: string) {
  assert.equal(existsSync(path.join(ROOT, rel)), false, `${rel} must not exist`);
}

async function main() {
  console.log("\nverify-managed-client-form-ingest-phase-3\n");

  await check("Phase 3 scope note is registered", () => {
    assert.equal(
      ACQUISITION_OPERATIONS_PHASE_3.id,
      "acquisition-lead-operations-phase-3",
    );
    assert.ok(
      ACQUISITION_OPERATIONS_PHASE_3.implements.some((s) =>
        s.includes("Signed managed-client website form ingest"),
      ),
    );
    assert.ok(
      ACQUISITION_OPERATIONS_PHASE_3.deferred.includes(
        "OTP managed-client auto-ingest",
      ),
    );
  });

  await check("Primal policy allows ingest; OTP policy blocks auto-ingest", () => {
    const primal = getManagedClientLeadPolicy("primal-motorsports");
    const otp = getManagedClientLeadPolicy("otp-carts");
    assert.equal(primal?.autoIngestFromWebsiteForm, true);
    assert.equal(otp?.autoIngestFromWebsiteForm, false);
    assert.equal(primal?.portalModuleEnabled, false);
    assert.equal(otp?.portalModuleEnabled, false);
  });

  await check("valid Primal signed payload accepted by signature + normalize", () => {
    const secret = "phase3-test-secret-not-production";
    const body = JSON.stringify({
      clientKey: "primal-motorsports",
      sourceSystem: "primal-motorsports-website",
      sourceExternalId: "PRIMAL-WEB-20260816-ABC123XY",
      channel: "form",
      contactName: "Test Driver",
      contactEmail: "test@example.com",
      contactPhone: "706-555-0100",
      messageSummary: "Program: 2-Day Performance School",
      landingPage: "https://ads.primalmotorsports.com/landing/racing-school",
      destinationInbox: "info@primalmotorsports.com",
      // Hostile fields — must be ignored by normalize/ingest.
      clientId: 999999,
      googleConversionObserved: true,
      sourceClientSiteEventId: 42,
    });
    const ts = Math.floor(Date.now() / 1000);
    const sig = computeMciFormSignatureBase64(secret, ts, body);
    const verified = verifyMciFormIngestSignature({
      secret,
      rawBody: body,
      timestampHeader: String(ts),
      signatureHeader: `v1,${sig}`,
    });
    assert.equal(verified.ok, true);

    const normalized = normalizeMciFormIngestPayload({
      body: JSON.parse(body),
      expectedClientKey: "primal-motorsports",
      expectedSourceSystem: "primal-motorsports-website",
      sourceExternalIdPattern: PRIMAL_WEB_SUBMISSION_ID_PATTERN,
    });
    assert.equal(normalized.ok, true);
    if (normalized.ok) {
      assert.equal(normalized.data.sourceExternalId, "PRIMAL-WEB-20260816-ABC123XY");
      assert.equal(normalized.data.channel, "form");
      assert.equal(normalized.data.contactEmail, "test@example.com");
    }
  });

  await check("bad signature rejected", () => {
    const secret = "phase3-test-secret-not-production";
    const body = JSON.stringify({
      sourceExternalId: "PRIMAL-WEB-20260816-ABC123XY",
    });
    const ts = Math.floor(Date.now() / 1000);
    const verified = verifyMciFormIngestSignature({
      secret,
      rawBody: body,
      timestampHeader: String(ts),
      signatureHeader: "v1,not-a-valid-signature====",
    });
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, "invalid_signature");
  });

  await check("stale timestamp rejected", () => {
    const secret = "phase3-test-secret-not-production";
    const body = "{}";
    const stale = Math.floor(Date.now() / 1000) - 60 * 60;
    const sig = computeMciFormSignatureBase64(secret, stale, body);
    const verified = verifyMciFormIngestSignature({
      secret,
      rawBody: body,
      timestampHeader: String(stale),
      signatureHeader: `v1,${sig}`,
    });
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, "stale_timestamp");
  });

  await check("missing sourceExternalId rejected", () => {
    const normalized = normalizeMciFormIngestPayload({
      body: {
        clientKey: "primal-motorsports",
        sourceSystem: "primal-motorsports-website",
        channel: "form",
      },
      expectedClientKey: "primal-motorsports",
      expectedSourceSystem: "primal-motorsports-website",
      sourceExternalIdPattern: PRIMAL_WEB_SUBMISSION_ID_PATTERN,
    });
    assert.equal(normalized.ok, false);
    if (!normalized.ok) {
      assert.equal(normalized.code, "missing_source_external_id");
    }
  });

  await check("duplicate sourceExternalId identity is stable (same key)", () => {
    const a = normalizeMciFormIngestPayload({
      body: {
        sourceExternalId: "PRIMAL-WEB-20260816-DUPTEST1",
        sourceSystem: "primal-motorsports-website",
      },
      expectedClientKey: "primal-motorsports",
      expectedSourceSystem: "primal-motorsports-website",
      sourceExternalIdPattern: PRIMAL_WEB_SUBMISSION_ID_PATTERN,
    });
    const b = normalizeMciFormIngestPayload({
      body: {
        sourceExternalId: "PRIMAL-WEB-20260816-DUPTEST1",
        sourceSystem: "primal-motorsports-website",
      },
      expectedClientKey: "primal-motorsports",
      expectedSourceSystem: "primal-motorsports-website",
      sourceExternalIdPattern: PRIMAL_WEB_SUBMISSION_ID_PATTERN,
    });
    assert.equal(a.ok && b.ok, true);
    if (a.ok && b.ok) {
      assert.equal(a.data.sourceExternalId, b.data.sourceExternalId);
    }
    assertFileContains(
      "lib/managed-client-leads/receive.ts",
      "sourceExternalId",
    );
    assertFileContains(
      "lib/managed-client-leads/receive.ts",
      "created: false",
    );
  });

  await check("cross-client mismatch rejected", () => {
    const normalized = normalizeMciFormIngestPayload({
      body: {
        clientKey: "otp-carts",
        sourceExternalId: "PRIMAL-WEB-20260816-ABC123XY",
        sourceSystem: "primal-motorsports-website",
      },
      expectedClientKey: "primal-motorsports",
      expectedSourceSystem: "primal-motorsports-website",
      sourceExternalIdPattern: PRIMAL_WEB_SUBMISSION_ID_PATTERN,
    });
    assert.equal(normalized.ok, false);
    if (!normalized.ok) assert.equal(normalized.code, "client_key_mismatch");
  });

  await check("OTP has no form-ingest credential registry entry", () => {
    assert.equal(MCI_FORM_INGEST_CREDENTIAL_REGISTRY["otp-carts"], undefined);
    assert.ok(MCI_FORM_INGEST_CREDENTIAL_REGISTRY["primal-motorsports"]);
    assert.equal(
      MCI_FORM_INGEST_CREDENTIAL_REGISTRY["primal-motorsports"].envVar,
      PRIMAL_MOTORSPORTS_FORM_INGEST_SECRET_ENV,
    );
  });

  await check("GA4 evidence cannot create an inquiry via this boundary", () => {
    assertFileDoesNotContain(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "runGa4GenerateLeadCount",
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "ReportingFacts",
    );
    assertFileContains(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "googleConversionObserved: false",
    );
    assertFileContains(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "sourceClientSiteEventId: null",
    );
  });

  await check("no sales-leads / sale / commission from form ingest", () => {
    assertFileDoesNotContain(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "sales-leads",
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "confirmCsiWebsiteLeadSale",
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "commissionAmount",
    );
    assert.equal(OTP_COMMISSION_BOUNDARY.inquiryCreateCreatesCommission, false);
    assert.equal(
      OTP_BOUNDARY_FROM_COMPAT.commissionRequiresExplicitCsiSaleConfirmation,
      true,
    );
  });

  await check("no public/portal ingest path; Preview cannot write", () => {
    assert.equal(
      existsSync(path.join(ROOT, "app/api/webhooks/managed-client-inquiries")),
      true,
    );
    assertPathMissing("app/api/portal/client-inquiries");
    assertPathMissing("app/api/client-inquiries");
    assertFileDoesNotContain(
      "app/api/admin/portal/preview/start/route.ts",
      "receiveManagedClientInquiry",
    );
    assertFileDoesNotContain(
      "app/api/admin/portal/preview/start/route.ts",
      "managed-client-inquiries",
    );
  });

  await check("webhook route + headers + receive wiring exist", () => {
    assertFileContains(
      "app/api/webhooks/managed-client-inquiries/[clientKey]/route.ts",
      "ingestManagedClientFormWebhook",
    );
    assertFileContains(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "receiveManagedClientInquiry",
    );
    assertFileContains(
      "lib/managed-client-leads/form-ingest/ingest.ts",
      "autoIngestFromWebsiteForm",
    );
    assert.equal(MCI_FORM_SIGNATURE_HEADER, "x-kxd-mci-signature");
    assert.equal(MCI_FORM_TIMESTAMP_HEADER, "x-kxd-mci-timestamp");
  });

  await check("HMAC uses exact raw body (no reserialize)", () => {
    const secret = "abc";
    const raw = '{"a":1,"b":2}';
    const ts = 1_700_000_000;
    const expected = createHmac("sha256", secret)
      .update(`${ts}.${raw}`)
      .digest("base64");
    assert.equal(computeMciFormSignatureBase64(secret, ts, raw), expected);
  });

  await check("no new migration introduced by Phase 3", () => {
    assert.equal(
      existsSync(
        path.join(ROOT, "migrations/20260831_managed_client_form_ingest.ts"),
      ),
      false,
    );
    assertFileDoesNotContain(
      "migrations/index.ts",
      "20260831_managed_client_form_ingest",
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
