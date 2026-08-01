/**
 * Phase 5 Batch 5D — Staff Invoice Visibility.
 * Deterministic static + pure presentation verification. No live Stripe. No DB.
 *
 * Run: npm run verify:phase5-batch-5d
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  projectInvoiceRow,
  shouldRenderReceiptAction,
} from "../lib/portal/billing";
import { projectStaffInvoiceView } from "../lib/commercial-agreements/staff-invoice-presentation";
import {
  isRestrictedStaff,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
} from "../lib/staff/permissions";
import type { StaffActor } from "../lib/staff/types";
import {
  INVOICE_READ_DTO_ALLOWLIST,
  INVOICE_READ_EXCLUDED_PROVIDER_FIELDS,
  STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED,
  STRIPE_PHASE_5B_AUTHORIZED_MODE,
  createFakeCommercialStripeAdapter,
  listInvoicesForMappedCustomer,
  type BillingProfileInvoiceMapping,
  type CommercialStripeInvoiceSnapshot,
  type InvoiceReadListResult,
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

function heatherActor(): StaffActor {
  return {
    userId: 42,
    email: "heather@example.com",
    role: "editor",
    staffRole: "operations_coordinator",
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    displayName: "Heather",
  };
}

function sampleInvoice(
  partial: Partial<PortalSafeStripeInvoice> & { id: string },
): PortalSafeStripeInvoice {
  return {
    id: partial.id,
    number: "number" in partial ? (partial.number ?? null) : "INV-5001",
    status: partial.status ?? "open",
    amountDue: partial.amountDue ?? 12500,
    amountPaid: partial.amountPaid ?? 0,
    amountRemaining: partial.amountRemaining ?? 12500,
    currency: partial.currency ?? "usd",
    createdAt:
      "createdAt" in partial
        ? (partial.createdAt ?? null)
        : "2026-07-01T00:00:00.000Z",
    dueDate:
      "dueDate" in partial
        ? (partial.dueDate ?? null)
        : "2026-07-15T00:00:00.000Z",
    paidAt: "paidAt" in partial ? (partial.paidAt ?? null) : null,
    hostedInvoiceUrl:
      "hostedInvoiceUrl" in partial
        ? (partial.hostedInvoiceUrl ?? null)
        : "https://invoice.stripe.com/i/test/abc",
    hostedPaymentUrl:
      "hostedPaymentUrl" in partial
        ? (partial.hostedPaymentUrl ?? null)
        : "https://invoice.stripe.com/i/test/abc",
    hostedReceiptUrl: null,
  };
}

function adapterInvoice(
  partial: Partial<CommercialStripeInvoiceSnapshot> & {
    id: string;
    customerId: string;
  },
): CommercialStripeInvoiceSnapshot {
  return {
    id: partial.id,
    customerId: partial.customerId,
    number: partial.number ?? "INV-5001",
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

async function main() {
  console.log("\nPhase 5 Batch 5D — Staff Invoice Visibility\n");

  const route = read(
    "app/api/admin/commercial-agreements/[clientId]/invoices/route.ts",
  );
  const staffLoader = read("lib/stripe/invoice-read-staff.ts");
  const presentation = read(
    "lib/commercial-agreements/staff-invoice-presentation.ts",
  );
  const section = read(
    "components/admin/operations/commercial-agreements/StaffClientInvoicesSection.tsx",
  );
  const screen = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  const page = read("app/admin/operations/commercial-agreements/page.tsx");
  const opsLayout = read("app/admin/operations/layout.tsx");
  const portalPage = read("app/(portal)/portal/(app)/invoices/page.tsx");
  const portalScreen = read("components/client-hq/InvoicesScreen.tsx");
  const pkg = read("package.json");
  const phase5 = read("docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md");
  const permissions = read("lib/staff/permissions.ts");
  const auth = read("lib/admin/auth.ts");

  // 1–3. Auth boundaries
  check(
    "API requires requirePayloadAdminApi",
    route.includes("requirePayloadAdminApi"),
  );
  check(
    "page requires requirePayloadAdminPage",
    page.includes("requirePayloadAdminPage"),
  );
  check(
    "operations layout uses requireStaffAwarePage",
    opsLayout.includes("requireStaffAwarePage"),
  );
  const heather = heatherActor();
  check("Heather is restricted staff", isRestrictedStaff(heather) === true);
  check(
    "restricted staff cannot open commercial-agreements page",
    isStaffAllowedPagePath(
      "/admin/operations/commercial-agreements",
      heather,
    ) === false,
  );
  check(
    "restricted staff cannot call staff invoices API",
    isStaffAllowedApiPath(
      "/api/admin/commercial-agreements/7/invoices",
      heather,
    ) === false,
  );
  check(
    "commercial-agreements is not in STAFF_ALLOWED_PAGE_PREFIXES",
    !permissions.includes('"/admin/operations/commercial-agreements"'),
  );
  check(
    "API auth module still fails closed for restricted staff when path unresolved",
    auth.includes("isStaffAllowedApiPath") &&
      auth.includes("Staff permission denied"),
  );

  // 4–5. Canonical client resolution + browser authority rejection
  check(
    "route parses clientId via parseRouteClientId",
    route.includes("parseRouteClientId"),
  );
  check(
    "staff loader asserts canonical clients collection existence",
    staffLoader.includes('collection: "clients"') &&
      staffLoader.includes("assertCanonicalClientExists"),
  );
  check(
    "staff loader uses loadBillingProfileInvoiceMapping + listInvoicesForMappedCustomer",
    staffLoader.includes("loadBillingProfileInvoiceMapping") &&
      staffLoader.includes("listInvoicesForMappedCustomer"),
  );
  check(
    "route rejects browser Stripe/customer/mode/invoice query authority",
    route.includes("stripeCustomerId") &&
      route.includes("billingProfileId") &&
      route.includes("invoiceId") &&
      route.includes("rejectBrowserInvoiceReadAuthority") &&
      route.includes("status: 400"),
  );
  check(
    "route does not accept browser-supplied adapter or secret",
    !route.includes("stripeSecret") && !route.includes("req.json()"),
  );

  // 6–9. Batch 5B reuse + TEST-only + customer scope
  check(
    "staff loader is server-only",
    staffLoader.includes('import "server-only"'),
  );
  check(
    "staff path does not import PortalSession / listPortalSessionInvoices",
    !staffLoader.includes('from "@/lib/portal/session"') &&
      !staffLoader.includes("listPortalSessionInvoices") &&
      !route.includes("listPortalSessionInvoices") &&
      !route.includes('from "@/lib/portal/session"'),
  );
  check(
    "commercial execution remains closed",
    STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED === false,
  );
  check(
    "Phase 5B authorized mode remains test",
    STRIPE_PHASE_5B_AUTHORIZED_MODE === "test",
  );

  const linkedTest: BillingProfileInvoiceMapping = {
    clientId: 7,
    stripeCustomerId: "cus_staff5d",
    stripeMode: "test",
    stripeCustomerMappingStatus: "linked",
  };
  const liveMap: BillingProfileInvoiceMapping = {
    ...linkedTest,
    stripeMode: "live",
  };
  const adapter = createFakeCommercialStripeAdapter({
    invoices: [
      adapterInvoice({
        id: "in_staff_open",
        customerId: "cus_staff5d",
        status: "open",
        amountDue: 9900,
        amountRemaining: 9900,
      }),
      adapterInvoice({
        id: "in_staff_paid",
        customerId: "cus_staff5d",
        number: "INV-5002",
        status: "paid",
        amountDue: 5000,
        amountPaid: 5000,
        amountRemaining: 0,
        paidAt: 1_700_200_000,
      }),
      adapterInvoice({
        id: "in_other",
        customerId: "cus_other",
        number: "INV-OTHER",
      }),
    ],
  });

  const listed = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: linkedTest,
    adapter,
  });
  check(
    "provider list remains customer-scoped (Batch 5B)",
    listed.availability === "ready" &&
      listed.invoices.every((inv) => inv.id.startsWith("in_staff")),
  );
  check(
    "other customer invoices are not returned",
    listed.availability === "ready" &&
      !listed.invoices.some((inv) => inv.id === "in_other"),
  );

  const liveDenied = await listInvoicesForMappedCustomer({
    authorizedClientId: 7,
    mapping: liveMap,
    adapter,
  });
  check(
    "live mappings fail closed",
    liveDenied.availability === "unavailable" &&
      liveDenied.code === "mode_disallowed",
  );

  // 10–11. Allowlist + no raw Stripe in presentation
  const readyResult: InvoiceReadListResult = {
    availability: "ready",
    code: null,
    message: null,
    clientId: 7,
    mode: "test",
    hasMore: false,
    limit: 24,
    invoices: [
      sampleInvoice({
        id: "in_open1",
        status: "open",
        amountDue: 12500,
        amountRemaining: 12500,
      }),
      sampleInvoice({
        id: "in_paid1",
        number: "INV-5002",
        status: "paid",
        amountDue: 5000,
        amountPaid: 5000,
        amountRemaining: 0,
        paidAt: "2026-07-20T00:00:00.000Z",
        hostedInvoiceUrl: "https://invoice.stripe.com/i/test/paid",
        hostedPaymentUrl: "https://invoice.stripe.com/i/test/paid",
      }),
    ],
  };
  const readyView = projectStaffInvoiceView(readyResult, "Acme Studio");
  check("ready staff view kind", readyView.kind === "ready");
  const readyJson = JSON.stringify(readyView);
  check(
    "staff view omits customer IDs, metadata, payment intents",
    !readyJson.includes("cus_") &&
      !readyJson.includes("metadata") &&
      !readyJson.includes("payment_intent") &&
      !readyJson.includes("pi_"),
  );
  check(
    "DTO allowlist and exclusions remain documented",
    INVOICE_READ_DTO_ALLOWLIST.includes("hostedInvoiceUrl") &&
      INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("metadata"),
  );
  check(
    "presentation reuses Batch 5C projectInvoiceRow",
    presentation.includes("projectInvoiceRow") &&
      presentation.includes('from "@/lib/portal/billing/presentation"'),
  );
  check(
    "amounts format from integer minor units",
    readyView.kind === "ready" &&
      readyView.invoices[0]?.amountDueLabel.includes("125.00"),
  );

  // 12–13. Missing mapping vs empty
  const missingMapView = projectStaffInvoiceView(
    {
      availability: "unavailable",
      code: "missing_customer_mapping",
      message: "Stripe customer mapping is not configured.",
      clientId: 7,
      mode: null,
      invoices: [],
      hasMore: false,
      limit: 24,
    },
    "Acme Studio",
  );
  check(
    "missing mapping is unavailable (not empty)",
    missingMapView.kind === "unavailable" &&
      missingMapView.reasonCode === "missing_customer_mapping",
  );
  const emptyView = projectStaffInvoiceView(
    {
      availability: "empty",
      code: null,
      message: null,
      clientId: 7,
      mode: "test",
      invoices: [],
      hasMore: false,
      limit: 24,
    },
    "Acme Studio",
  );
  check("empty list is distinct kind", emptyView.kind === "empty");
  check(
    "empty copy does not invite repair controls",
    emptyView.kind === "empty" &&
      !emptyView.description.toLowerCase().includes("create") &&
      !emptyView.description.toLowerCase().includes("link"),
  );
  check(
    "missing mapping copy does not include repair control CTA language as action",
    missingMapView.kind === "unavailable" &&
      !section.includes("Link customer") &&
      !section.includes("Create customer") &&
      !section.includes("Repair"),
  );

  // 14–16. Client switch / no cache / direct route protection
  check(
    "section remounts and refetches per selected clientId",
    screen.includes("StaffClientInvoicesSection") &&
      screen.includes("key={`staff-invoices-${selectedId}`}") &&
      section.includes("useEffect") &&
      section.includes("[clientId]") &&
      section.includes('cache: "no-store"'),
  );
  check(
    "section aborts in-flight fetch on client change",
    section.includes("AbortController") && section.includes("requestSeq"),
  );
  check(
    "API Cache-Control is no-store",
    route.includes('"Cache-Control": "no-store"'),
  );
  check(
    "direct API path is independently authenticated (not nav-gated only)",
    route.includes("requirePayloadAdminApi") &&
      !route.includes("navigation") &&
      !screen.includes("href: \"/admin/operations/staff-invoices\""),
  );

  // 17–21. Hosted actions + receipt
  check(
    "open invoice exposes Pay only with payment URL + open status",
    readyView.kind === "ready" &&
      readyView.invoices[0]?.payUrl?.startsWith("https://") === true &&
      readyView.invoices[1]?.payUrl === null,
  );
  check(
    "payment action not derived from invoice URL alone (paid case)",
    projectInvoiceRow(
      sampleInvoice({
        id: "in_paid_only",
        status: "paid",
        hostedInvoiceUrl: "https://invoice.stripe.com/i/test/x",
        hostedPaymentUrl: "https://invoice.stripe.com/i/test/x",
      }),
    ).payUrl === null,
  );
  check(
    "http invoice URL is rejected for View",
    projectInvoiceRow(
      sampleInvoice({
        id: "in_http",
        hostedInvoiceUrl: "http://invoice.stripe.com/i/test/x",
        hostedPaymentUrl: null,
        status: "open",
      }),
    ).viewInvoiceUrl === null,
  );
  check(
    "no receipt action while hostedReceiptUrl is null",
    shouldRenderReceiptAction(null) === false &&
      !section.includes("Receipt") &&
      !section.includes("hostedReceiptUrl"),
  );
  check(
    "external links use noopener noreferrer + new-tab accessible context",
    section.includes('rel="noopener noreferrer"') &&
      section.includes('target="_blank"') &&
      section.includes("opens in a new tab"),
  );

  // 22–25. No mutation / repair / communication / finance platform
  check(
    "mutating HTTP methods rejected on invoices route",
    route.includes("Invoice mutation is not authorized") &&
      route.includes("export async function POST") &&
      route.includes("export async function DELETE"),
  );
  check(
    "section has no local payment form or Stripe mutation calls",
    !section.includes("<form") &&
      !section.includes("cardNumber") &&
      !section.includes("PaymentIntent") &&
      !section.includes("createAndFinalizeInvoice") &&
      !section.includes("checkout.sessions"),
  );
  check(
    "section has no Send/Remind/Void/Refund/Edit/Finalize/Repair controls",
    !section.includes("Remind") &&
      !section.includes("Void") &&
      !section.includes("Refund") &&
      !section.includes("Finalize") &&
      !section.includes("Send invoice") &&
      !section.includes("Create invoice"),
  );
  check(
    "no new top-level staff billing/finance route",
    !existsSync(
      path.join(root, "app/admin/operations/billing/page.tsx"),
    ) &&
      !existsSync(
        path.join(root, "app/admin/operations/invoices/page.tsx"),
      ) &&
      !existsSync(
        path.join(root, "app/admin/operations/staff-invoices/page.tsx"),
      ),
  );
  check(
    "Financial Command is not imported into staff invoice surface",
    !section.includes("financial-command") &&
      !route.includes("financial-command") &&
      !staffLoader.includes("financial-command"),
  );

  // 26–28. Portal + Batch 5B/5A isolation
  check(
    "portal Billing page composition unchanged (session → loadPortalBillingForSession)",
    portalPage.includes("getPortalSession") &&
      portalPage.includes("loadPortalBillingForSession"),
  );
  check(
    "portal screen still has no staff permission imports",
    !portalScreen.includes("requirePayloadAdmin") &&
      !portalScreen.includes("isRestrictedStaff") &&
      !portalScreen.includes("StaffClientInvoices"),
  );
  check(
    "Batch 5C portal screen still omits Receipt",
    !portalScreen.includes("Receipt"),
  );

  // 29–30. Navigation + surface selection
  check(
    "Batch 5D embeds on Commercial Agreements selected-client detail",
    screen.includes("StaffClientInvoicesSection") &&
      screen.includes("mode === \"idle\" && detail"),
  );

  // Client Command surfaces must not gain a duplicate Stripe staff projection
  const clientCommandHits = [
    "components/admin/operations/client-command/ClientCommandScreen.tsx",
    "components/admin/operations/client-command/CommandWorkspaceTabPanel.tsx",
    "components/admin/operations/client-command/ClientFinancialPanel.tsx",
  ].filter((rel) => existsSync(path.join(root, rel)));
  for (const rel of clientCommandHits) {
    const src = read(rel);
    check(
      `Client Command surface ${rel} does not embed StaffClientInvoicesSection`,
      !src.includes("StaffClientInvoicesSection") &&
        !src.includes("listStaffClientInvoices"),
    );
  }
  check(
    "Client Command candidates were inspected",
    clientCommandHits.length === 3,
  );

  check(
    "no new top-level nav category for staff Billing",
    !section.includes("navItems") &&
      !screen.includes('label: "Staff Billing"') &&
      !screen.includes('href: "/admin/operations/billing"'),
  );

  // Status / UX honesty
  check(
    "status labels remain Draft/Open/Paid/Uncollectible/Void/Status unavailable",
    projectInvoiceRow(sampleInvoice({ id: "d", status: "draft" }))
      .statusLabel === "Draft" &&
      projectInvoiceRow(sampleInvoice({ id: "o", status: "open" }))
        .statusLabel === "Open" &&
      projectInvoiceRow(sampleInvoice({ id: "p", status: "paid" }))
        .statusLabel === "Paid" &&
      projectInvoiceRow(sampleInvoice({ id: "u", status: "unknown" }))
        .statusLabel === "Status unavailable",
  );
  check(
    "open is not labeled overdue",
    projectInvoiceRow(sampleInvoice({ id: "ov", status: "open" }))
      .statusLabel !== "Overdue" && !section.includes("Overdue"),
  );
  check(
    "section uses semantic headings/lists and status text",
    section.includes('aria-label="Stripe invoices"') &&
      section.includes("<ul") &&
      section.includes("statusAriaLabel"),
  );

  // Package + docs
  check(
    "package.json registers Batch 5D verifier",
    pkg.includes('"verify:phase5-batch-5d"'),
  );
  check(
    "Phase 5 docs record Batch 5D implemented path",
    phase5.includes("Batch 5D") &&
      phase5.includes("Commercial Agreements") &&
      phase5.includes("StaffClientInvoicesSection"),
  );
  check(
    "Phase 5 docs keep Batch 5E unauthorized",
    phase5.includes("Batch 5E") &&
      (phase5.includes("not authorized") ||
        phase5.includes("unauthorized") ||
        phase5.includes("Optional")),
  );

  // Mutation / secrets static guards on loader
  check(
    "staff loader never creates customers or invoices",
    !staffLoader.includes("customers.create") &&
      !staffLoader.includes("invoices.create") &&
      !staffLoader.includes("invoice_create"),
  );

  console.log("\nPhase 5 Batch 5D verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
