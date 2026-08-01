/**
 * Phase 5 Batch 5B — Stripe Invoice Read Foundation.
 * Deterministic mocks/fixtures only. No live Stripe. No DB. No secrets logged.
 *
 * Run: npm run verify:phase5-batch-5b
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  INVOICE_READ_DTO_ALLOWLIST,
  INVOICE_READ_EXCLUDED_PROVIDER_FIELDS,
  STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED,
  STRIPE_PHASE_5B_AUTHORIZED_MODE,
  STRIPE_PHASE_5B_INVOICE_READS_AUTHORIZED,
  assessInvoiceReadMapping,
  assertExactMinorUnitAmount,
  classifyProviderError,
  createFakeCommercialStripeAdapter,
  invoiceBelongsToMappedCustomer,
  isCommercialStripeOperationAllowed,
  isInvoiceReadOperationAuthorized,
  isStripeInvoiceIdFormat,
  listInvoicesForMappedCustomer,
  normalizeStripeInvoiceStatus,
  projectPortalSafeStripeInvoice,
  readInvoiceForMappedCustomer,
  rejectBrowserInvoiceReadAuthority,
  resolveInvoiceReadAuthorization,
  unixSecondsToIsoDay,
  type BillingProfileInvoiceMapping,
  type CommercialStripeInvoiceSnapshot,
  type PortalSafeStripeInvoice,
} from "../lib/stripe";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function mapping(partial: Partial<BillingProfileInvoiceMapping> & { clientId: number }): BillingProfileInvoiceMapping {
  return {
    clientId: partial.clientId,
    stripeCustomerId:
      "stripeCustomerId" in partial
        ? (partial.stripeCustomerId ?? null)
        : "cus_testphase5ba",
    stripeMode: partial.stripeMode === undefined ? "test" : partial.stripeMode,
    stripeCustomerMappingStatus:
      partial.stripeCustomerMappingStatus ?? "linked",
  };
}

function invoice(
  partial: Partial<CommercialStripeInvoiceSnapshot> & {
    id: string;
    customerId: string;
  },
): CommercialStripeInvoiceSnapshot {
  return {
    id: partial.id,
    customerId: partial.customerId,
    number: partial.number ?? "INV-001",
    status: partial.status ?? "open",
    livemode: partial.livemode ?? false,
    amountDue: partial.amountDue ?? 12500,
    amountPaid: partial.amountPaid ?? 0,
    amountRemaining: partial.amountRemaining ?? 12500,
    currency: partial.currency ?? "usd",
    created: partial.created ?? 1_700_000_000,
    dueDate: partial.dueDate ?? 1_700_086_400,
    paidAt: partial.paidAt ?? null,
    hostedInvoiceUrl:
      partial.hostedInvoiceUrl ?? "https://invoice.stripe.com/i/test/abc",
    paymentIntentId: partial.paymentIntentId ?? "pi_secret_should_not_leak",
    metadata: partial.metadata ?? { internal: "secret" },
  };
}

function dtoKeys(row: PortalSafeStripeInvoice): string[] {
  return Object.keys(row).sort();
}

async function main() {
  console.log("\nPhase 5 Batch 5B — Stripe Invoice Read Foundation\n");

  // 1–2. Read auth distinct from commercial execution; missing auth fails closed
  check(
    "commercial execution gate remains closed",
    STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED === false,
  );
  check(
    "Phase 5B invoice reads authorized flag is true",
    STRIPE_PHASE_5B_INVOICE_READS_AUTHORIZED === true,
  );
  check(
    "invoice_list/read allowed without opening execution gate",
    isCommercialStripeOperationAllowed("invoice_list") &&
      isCommercialStripeOperationAllowed("invoice_read") &&
      isInvoiceReadOperationAuthorized("invoice_list") &&
      isInvoiceReadOperationAuthorized("invoice_read"),
  );
  check(
    "mutation classes remain blocked by execution gate",
    !isCommercialStripeOperationAllowed("subscription_create") &&
      !isCommercialStripeOperationAllowed("checkout_create") &&
      !isCommercialStripeOperationAllowed("catalog_create") &&
      !isCommercialStripeOperationAllowed("invoice_preview"),
  );
  check(
    "missing Phase 5B flag fails closed (pure composition)",
    resolveInvoiceReadAuthorization({
      phase5bAuthorized: false,
      operationAllowed: true,
    }) === false,
  );
  check(
    "operation deny fails closed even if Phase 5B flag true",
    resolveInvoiceReadAuthorization({
      phase5bAuthorized: true,
      operationAllowed: false,
    }) === false,
  );

  // 3–5. Session/membership/clientId are server-side; browser authority rejected
  const serviceSrc = read("lib/stripe/invoice-read-service.ts");
  check(
    "portal list entry requires PortalSession",
    serviceSrc.includes("session: PortalSession | null") &&
      serviceSrc.includes('"session_required"'),
  );
  check(
    "portal service uses session.clientId (server-resolved)",
    serviceSrc.includes("input.session.clientId") &&
      !serviceSrc.includes("body.clientId"),
  );
  check(
    "browser-supplied customerId rejected",
    rejectBrowserInvoiceReadAuthority({ customerId: "cus_evilx" }).ok === false,
  );
  check(
    "browser-supplied clientId rejected",
    rejectBrowserInvoiceReadAuthority({ clientId: 99 }).ok === false,
  );
  check(
    "browser-supplied stripeMode rejected",
    rejectBrowserInvoiceReadAuthority({ stripeMode: "live" }).ok === false,
  );
  check(
    "innocent browser body accepted",
    rejectBrowserInvoiceReadAuthority({ limit: 10 }).ok === true,
  );

  const browserList = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: createFakeCommercialStripeAdapter(),
    browserBody: { stripeCustomerId: "cus_browserx" },
  });
  check(
    "browser customer id cannot authorize list",
    browserList.availability === "unavailable" &&
      browserList.code === "browser_authority_rejected" &&
      browserList.invoices.length === 0,
  );

  // 6–8. Mapping from billing profile shape; missing/invalid fail closed
  check(
    "valid test mapping opens gate",
    assessInvoiceReadMapping(mapping({ clientId: 7 }), 7).ok === true,
  );
  check(
    "missing mapping fails closed",
    assessInvoiceReadMapping(null, 7).ok === false &&
      !assessInvoiceReadMapping(null, 7).ok &&
      (assessInvoiceReadMapping(null, 7) as { code: string }).code ===
        "missing_billing_profile",
  );
  check(
    "client mismatch fails closed",
    !assessInvoiceReadMapping(mapping({ clientId: 8 }), 7).ok,
  );
  check(
    "missing customer mapping fails closed",
    (assessInvoiceReadMapping(
      mapping({ clientId: 7, stripeCustomerId: null }),
      7,
    ) as { code: string }).code === "missing_customer_mapping",
  );
  check(
    "invalid customer id fails closed",
    (assessInvoiceReadMapping(
      mapping({ clientId: 7, stripeCustomerId: "not_a_cus" }),
      7,
    ) as { code: string }).code === "invalid_customer_mapping",
  );
  check(
    "unlinked mapping fails closed",
    (assessInvoiceReadMapping(
      mapping({ clientId: 7, stripeCustomerMappingStatus: "unlinked" }),
      7,
    ) as { code: string }).code === "mapping_not_linked",
  );

  // 9–10. Mode policy server-controlled; no cross-mode
  check(
    "Batch 5B authorized mode is test only",
    STRIPE_PHASE_5B_AUTHORIZED_MODE === "test",
  );
  check(
    "live mapping disallowed for Batch 5B reads",
    (assessInvoiceReadMapping(
      mapping({ clientId: 7, stripeMode: "live" }),
      7,
    ) as { code: string }).code === "mode_disallowed",
  );
  check(
    "missing mode fails closed",
    (assessInvoiceReadMapping(
      mapping({ clientId: 7, stripeMode: null }),
      7,
    ) as { code: string }).code === "mode_mismatch",
  );

  const liveMapList = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7, stripeMode: "live" }),
    adapter: createFakeCommercialStripeAdapter({
      invoices: [
        invoice({ id: "in_live_1", customerId: "cus_testphase5ba" }),
      ],
    }),
  });
  check(
    "live mapping never queries provider for list",
    liveMapList.availability === "unavailable" &&
      liveMapList.code === "mode_disallowed",
  );

  // 11–12. List supplies mapped customer; no unscoped enumeration
  const scopedAdapter = createFakeCommercialStripeAdapter({
    invoices: [
      invoice({
        id: "in_a1",
        customerId: "cus_testphase5ba",
        amountDue: 1000,
        amountRemaining: 1000,
        created: 1_700_000_200,
      }),
      invoice({
        id: "in_b1",
        customerId: "cus_otherclient",
        amountDue: 99999,
        amountRemaining: 99999,
        created: 1_700_000_300,
      }),
    ],
  });
  const listOk = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({
      clientId: 7,
      stripeCustomerId: "cus_testphase5ba",
    }),
    adapter: scopedAdapter,
    limit: 24,
  });
  check(
    "list supplies mapped customer to provider",
    scopedAdapter.listInvoiceCustomerCalls.length === 1 &&
      scopedAdapter.listInvoiceCustomerCalls[0] === "cus_testphase5ba",
  );
  check(
    "list never returns other customer invoices",
    listOk.availability === "ready" &&
      listOk.invoices.length === 1 &&
      listOk.invoices[0]?.id === "in_a1",
  );
  check(
    "adapter rejects empty customer for list (no unscoped enum)",
    await scopedAdapter
      .listInvoicesByCustomer("", 10)
      .then(() => false)
      .catch(() => true),
  );
  const liveAdapterSrc = read("lib/stripe/commercial-stripe-adapter.ts");
  check(
    "live adapter list always passes customer param",
    liveAdapterSrc.includes("customer: customerId") &&
      liveAdapterSrc.includes("async listInvoicesByCustomer"),
  );

  // 13–17. Allowlisted DTO; amounts; dates; statuses
  const projected = projectPortalSafeStripeInvoice({
    id: "in_a1",
    customerId: "cus_testphase5ba",
    number: "INV-100",
    status: "paid",
    livemode: false,
    amountDue: 12500.9,
    amountPaid: 12500.9,
    amountRemaining: 0.4,
    currency: "USD",
    created: 1_700_000_000,
    dueDate: null,
    paidAt: 1_700_010_000,
    hostedInvoiceUrl: "https://invoice.stripe.com/i/test/abc",
  });
  check(
    "DTO keys match allowlist exactly",
    JSON.stringify(dtoKeys(projected)) ===
      JSON.stringify([...INVOICE_READ_DTO_ALLOWLIST].sort()),
  );
  check(
    "amounts preserve exact minor units (trunc, no float math)",
    projected.amountDue === 12500 &&
      projected.amountPaid === 12500 &&
      projected.amountRemaining === 0 &&
      assertExactMinorUnitAmount(12500.9) === 12500,
  );
  check(
    "missing due date stays null",
    projected.dueDate === null && unixSecondsToIsoDay(null) === null,
  );
  check(
    "hostedReceiptUrl is always null (Invoice has no receipt URL)",
    projected.hostedReceiptUrl === null,
  );
  check(
    "unknown status normalizes safely",
    normalizeStripeInvoiceStatus("weird_future_status") === "unknown" &&
      normalizeStripeInvoiceStatus(null) === "unknown",
  );
  check(
    "known statuses normalize",
    normalizeStripeInvoiceStatus("open") === "open" &&
      normalizeStripeInvoiceStatus("PAID") === "paid",
  );
  check(
    "raw provider fields excluded from allowlist contract",
    INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("metadata") &&
      INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("payment_intent") &&
      INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("customer") &&
      !listOk.invoices.some((row) => "metadata" in (row as object) &&
        Object.prototype.hasOwnProperty.call(row, "metadata")),
  );
  check(
    "list DTO does not leak paymentIntentId or metadata",
    listOk.availability === "ready" &&
      !JSON.stringify(listOk.invoices).includes("pi_secret") &&
      !JSON.stringify(listOk.invoices).includes("internal"),
  );

  // 18. Empty list distinct from unavailable
  const emptyAdapter = createFakeCommercialStripeAdapter({ invoices: [] });
  const emptyList = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: emptyAdapter,
  });
  check(
    "empty successful list is availability=empty",
    emptyList.availability === "empty" &&
      emptyList.code === null &&
      emptyList.invoices.length === 0,
  );
  const missingMapList = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: null,
    adapter: emptyAdapter,
  });
  check(
    "missing mapping is unavailable (not empty)",
    missingMapList.availability === "unavailable" &&
      missingMapList.code === "missing_billing_profile",
  );

  // 19. Provider failures
  for (const [behavior, code] of [
    ["permission", "provider_permission_denied"],
    ["auth", "provider_auth_failed"],
    ["timeout", "provider_timeout"],
    ["outage", "provider_outage"],
    ["malformed", "provider_malformed"],
  ] as const) {
    const failing = createFakeCommercialStripeAdapter({
      listBehavior: behavior,
      invoices: [invoice({ id: "in_x", customerId: "cus_testphase5ba" })],
    });
    const result = await listInvoicesForMappedCustomer({
      authorizedClientId: 7,
      mapping: mapping({ clientId: 7 }),
      adapter: failing,
    });
    check(
      `provider ${behavior} → ${code}`,
      result.availability === "unavailable" && result.code === code,
    );
  }
  check(
    "classifyProviderError covers resource_missing",
    classifyProviderError({ code: "resource_missing" }).code ===
      "invoice_not_found",
  );

  // 20–22. invoice_read ownership; forged / cross-customer
  check("invoice id format", isStripeInvoiceIdFormat("in_abc123") === true);
  check(
    "forged invoice id format rejected",
    isStripeInvoiceIdFormat("inv_not_stripe") === false,
  );

  const ownershipAdapter = createFakeCommercialStripeAdapter({
    invoices: [
      invoice({
        id: "in_mine",
        customerId: "cus_testphase5ba",
        status: "paid",
        amountDue: 5000,
        amountPaid: 5000,
        amountRemaining: 0,
      }),
      invoice({
        id: "in_theirs",
        customerId: "cus_otherclient",
        status: "open",
        amountDue: 9000,
        amountPaid: 0,
        amountRemaining: 9000,
      }),
    ],
  });

  const owned = await readInvoiceForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: ownershipAdapter,
    invoiceId: "in_mine",
  });
  check(
    "invoice_read returns owned invoice after ownership check",
    owned.availability === "ready" && owned.invoice?.id === "in_mine",
  );

  const cross = await readInvoiceForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: ownershipAdapter,
    invoiceId: "in_theirs",
  });
  check(
    "cross-customer invoice fails closed without existence leak",
    cross.availability === "unavailable" &&
      cross.code === "invoice_not_found" &&
      cross.message === "Invoice is unavailable." &&
      cross.invoice === null,
  );

  const forged = await readInvoiceForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: ownershipAdapter,
    invoiceId: "not_an_invoice",
  });
  check(
    "forged invoice id fails safely",
    forged.availability === "unavailable" &&
      forged.code === "invalid_invoice_id",
  );

  const missing = await readInvoiceForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: ownershipAdapter,
    invoiceId: "in_doesnotexist",
  });
  check(
    "missing invoice uses same unavailable shape as cross-customer",
    missing.availability === "unavailable" &&
      missing.code === "invoice_not_found" &&
      missing.message === cross.message,
  );
  check(
    "ownership helper is exact match",
    invoiceBelongsToMappedCustomer("cus_a", "cus_a") &&
      !invoiceBelongsToMappedCustomer("cus_a", "cus_b") &&
      !invoiceBelongsToMappedCustomer(null, "cus_a"),
  );

  // 23. Account switching — fresh mapping per authorized clientId
  const switchAdapter = createFakeCommercialStripeAdapter({
    invoices: [
      invoice({ id: "in_c1", customerId: "cus_client1", amountDue: 111 }),
      invoice({ id: "in_c2", customerId: "cus_client2", amountDue: 222 }),
    ],
  });
  const client1 = await listInvoicesForMappedCustomer({
    authorizedClientId: 1,
    mapping: mapping({
      clientId: 1,
      stripeCustomerId: "cus_client1",
    }),
    adapter: switchAdapter,
  });
  const client2 = await listInvoicesForMappedCustomer({
    authorizedClientId: 2,
    mapping: mapping({
      clientId: 2,
      stripeCustomerId: "cus_client2",
    }),
    adapter: switchAdapter,
  });
  check(
    "account switch uses fresh mapping (client 1)",
    client1.availability === "ready" &&
      client1.invoices[0]?.id === "in_c1" &&
      client1.invoices[0]?.amountDue === 111,
  );
  check(
    "account switch uses fresh mapping (client 2)",
    client2.availability === "ready" &&
      client2.invoices[0]?.id === "in_c2" &&
      client2.invoices[0]?.amountDue === 222,
  );
  check(
    "provider received distinct customer ids across switch",
    switchAdapter.listInvoiceCustomerCalls.includes("cus_client1") &&
      switchAdapter.listInvoiceCustomerCalls.includes("cus_client2"),
  );
  const staleMapping = await listInvoicesForMappedCustomer({
    authorizedClientId: 2,
    mapping: mapping({
      clientId: 1,
      stripeCustomerId: "cus_client1",
    }),
    adapter: switchAdapter,
  });
  check(
    "stale other-client mapping rejected on active client",
    staleMapping.availability === "unavailable" &&
      staleMapping.code === "client_mismatch",
  );

  // 24–28. Existing commercial paths intact; no mutations via 5B foundation
  const opsSrc = read("lib/stripe/invoice-read-ops.ts");
  const logicSrc = read("lib/stripe/invoice-read-logic.ts");
  const authSrc = read("lib/stripe/invoice-read-auth.ts");
  check(
    "5B foundation never calls createAndFinalizeInvoice",
    !opsSrc.includes("createAndFinalizeInvoice") &&
      !serviceSrc.includes("createAndFinalizeInvoice"),
  );
  check(
    "5B foundation never calls createCustomer",
    !opsSrc.includes("createCustomer") && !serviceSrc.includes("createCustomer"),
  );
  check(
    "5B foundation never flips commercial execution gate",
    !opsSrc.includes("STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED = true") &&
      !authSrc.includes("STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED = true") &&
      !logicSrc.includes("STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED = true") &&
      STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED === false,
  );
  check(
    "lifecycle invoice_create remains authorized separately",
    isCommercialStripeOperationAllowed("invoice_create") === true,
  );
  check(
    "no HTTP route introduced for Batch 5B invoice reads",
    !serviceSrc.includes("export async function GET") &&
      !read("lib/stripe/invoice-read-ops.ts").includes("NextResponse"),
  );

  const portalInvoices = read(
    "app/(portal)/portal/(app)/invoices/page.tsx",
  );
  check(
    "Batch 5B foundation modules remain UI-free",
    !read("lib/stripe/invoice-read-ops.ts").includes("InvoicesScreen") &&
      !read("lib/stripe/invoice-read-service.ts").includes("InvoicesScreen") &&
      portalInvoices.includes("getPortalSession"),
  );

  const hasMoreAdapter = createFakeCommercialStripeAdapter({
    invoices: Array.from({ length: 3 }, (_, i) =>
      invoice({
        id: `in_page_${i}`,
        customerId: "cus_testphase5ba",
        created: 1_700_000_000 + i,
      }),
    ),
  });
  const paged = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: mapping({ clientId: 7 }),
    adapter: hasMoreAdapter,
    limit: 2,
  });
  check(
    "bounded list reports hasMore honestly",
    paged.availability === "ready" &&
      paged.invoices.length === 2 &&
      paged.hasMore === true &&
      paged.limit === 2,
  );

  console.log("\nPhase 5 Batch 5B verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
