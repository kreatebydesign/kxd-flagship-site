/**
 * Phase 5 Batch 5C — Client Invoice Visibility.
 * Deterministic static + pure presentation verification. No live Stripe. No DB.
 *
 * Run: npm run verify:phase5-batch-5c
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ResolvedExperienceProfile } from "../lib/ces/types";
import {
  isPortalBillingNavEligible,
  portalBillingDtoAllowlist,
  projectInvoiceRow,
  projectPortalBillingView,
  shouldRenderReceiptAction,
} from "../lib/portal/billing";
import { isPortalNavVisibleForCesLaunch } from "../lib/portal/ces-launch-safety";
import { getEnabledPortalNavGroups } from "../lib/portal/nav";
import {
  INVOICE_READ_DTO_ALLOWLIST,
  INVOICE_READ_EXCLUDED_PROVIDER_FIELDS,
  type InvoiceReadListResult,
  type PortalSafeStripeInvoice,
} from "../lib/stripe";

function flagshipProfile(): ResolvedExperienceProfile {
  return {
    profileId: 1,
    source: "profile",
    identity: {
      clientId: 1,
      clientName: "Acme Studio",
      clientSlug: "acme-studio-phase5c",
      logoUrl: null,
      logoAlt: "Acme Studio",
      websiteUrl: null,
    },
    visual: {
      primaryColor: "#1d1d1f",
      secondaryColor: "#6e6e73",
      accentColor: "#c5a65c",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Welcome",
      reassuranceLine: "Steady partnership",
      supportTone: "warm-professional",
      portalSidebarLabel: "Acme",
      partnerFooterLine: "Kreate by Design",
      showPartnerMark: true,
    },
    enabledModules: ["website-review"],
    reportingCapabilities: [],
    presentation: null,
    terminology: {},
    cssVars: {},
  };
}

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

function sampleInvoice(
  partial: Partial<PortalSafeStripeInvoice> & { id: string },
): PortalSafeStripeInvoice {
  return {
    id: partial.id,
    number: "number" in partial ? (partial.number ?? null) : "INV-1001",
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

function main() {
  console.log("\nPhase 5 Batch 5C — Client Invoice Visibility\n");

  const page = read("app/(portal)/portal/(app)/invoices/page.tsx");
  const screen = read("components/client-hq/InvoicesScreen.tsx");
  const load = read("lib/portal/billing/load.ts");
  const presentation = read("lib/portal/billing/presentation.ts");
  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  const nav = read("lib/portal/nav.ts");
  const launch = read("lib/portal/ces-launch-safety.ts");
  const pkg = read("package.json");

  // 1–3. Auth + server composition
  check(
    "route requires getPortalSession and redirects when missing",
    page.includes("getPortalSession") &&
      page.includes('redirect("/portal/login")'),
  );
  check(
    "route uses Batch 5B composition via loadPortalBillingForSession",
    page.includes("loadPortalBillingForSession") &&
      load.includes("listPortalSessionInvoices"),
  );
  check(
    "loader is server-only and uses session.clientId indirectly via 5B",
    load.includes('import "server-only"') &&
      load.includes("listPortalSessionInvoices"),
  );
  check(
    "page does not accept browser clientId / customer authority",
    !page.includes("searchParams") &&
      !page.includes("stripeCustomerId") &&
      !page.includes("params.clientId"),
  );

  // 4–7. DTO-only presentation
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
        number: "INV-1002",
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
  const readyView = projectPortalBillingView(readyResult, "Acme Studio");
  check("ready view kind", readyView.kind === "ready");
  check(
    "presentation allowlist matches Batch 5B DTO allowlist",
    JSON.stringify(portalBillingDtoAllowlist()) ===
      JSON.stringify(INVOICE_READ_DTO_ALLOWLIST),
  );
  check(
    "excluded provider fields remain documented",
    INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("metadata") &&
      INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("payment_intent") &&
      INVOICE_READ_EXCLUDED_PROVIDER_FIELDS.includes("customer"),
  );
  const readyJson = JSON.stringify(readyView);
  check(
    "view model omits customer IDs and metadata",
    !readyJson.includes("cus_") &&
      !readyJson.includes("metadata") &&
      !readyJson.includes("payment_intent") &&
      !readyJson.includes("pi_"),
  );
  check(
    "amounts format from integer minor units",
    readyView.kind === "ready" &&
      readyView.invoices[0]?.amountDueLabel.includes("125.00"),
  );
  check(
    "open invoice exposes Pay only with payment URL + open status",
    readyView.kind === "ready" &&
      readyView.invoices[0]?.payUrl?.startsWith("https://") === true &&
      readyView.invoices[1]?.payUrl === null,
  );
  check(
    "paid invoice can still offer View invoice without Pay",
    readyView.kind === "ready" &&
      readyView.invoices[1]?.viewInvoiceUrl?.startsWith("https://") === true &&
      readyView.invoices[1]?.payUrl === null,
  );
  check(
    "no receipt action while hostedReceiptUrl is null",
    shouldRenderReceiptAction(null) === false &&
      shouldRenderReceiptAction(undefined) === false &&
      !screen.includes("Receipt") &&
      !screen.includes("hostedReceiptUrl"),
  );
  check(
    "payment action not rendered from invoice URL alone (paid case)",
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
    "unknown status stays honest",
    projectInvoiceRow(
      sampleInvoice({ id: "in_u", status: "unknown", number: null }),
    ).statusLabel === "Status unavailable",
  );
  check(
    "missing dates stay omitted (null labels)",
    projectInvoiceRow(
      sampleInvoice({
        id: "in_nodates",
        createdAt: null,
        dueDate: null,
        paidAt: null,
      }),
    ).dueLabel === null,
  );

  // 8–9. Empty vs unavailable
  const emptyView = projectPortalBillingView(
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
  const missingMapView = projectPortalBillingView(
    {
      availability: "unavailable",
      code: "missing_customer_mapping",
      message: "Stripe customer mapping is not configured for this account.",
      clientId: 7,
      mode: null,
      invoices: [],
      hasMore: false,
      limit: 24,
    },
    "Acme Studio",
  );
  check(
    "missing mapping produces unavailable (not empty)",
    missingMapView.kind === "unavailable" &&
      missingMapView.reasonCode === "missing_customer_mapping" &&
      !missingMapView.description.includes("stripeCustomerId") &&
      !missingMapView.description.includes("invoice_list"),
  );
  check(
    "live mode disallowed maps to calm unavailable copy",
    projectPortalBillingView(
      {
        availability: "unavailable",
        code: "mode_disallowed",
        message: "Live-mode invoice reads are not authorized in Batch 5B.",
        clientId: 7,
        mode: null,
        invoices: [],
        hasMore: false,
        limit: 24,
      },
      "Acme Studio",
    ).kind === "unavailable",
  );

  // 10–12. Nav eligibility + isolation
  check(
    "billing nav eligible only with valid test mapping",
    isPortalBillingNavEligible(
      {
        clientId: 7,
        stripeCustomerId: "cus_testphase5c",
        stripeMode: "test",
        stripeCustomerMappingStatus: "linked",
      },
      7,
    ) === true,
  );
  check(
    "live mapping is not nav-eligible",
    isPortalBillingNavEligible(
      {
        clientId: 7,
        stripeCustomerId: "cus_testphase5c",
        stripeMode: "live",
        stripeCustomerMappingStatus: "linked",
      },
      7,
    ) === false,
  );
  check(
    "missing mapping is not nav-eligible",
    isPortalBillingNavEligible(null, 7) === false,
  );
  const profile = flagshipProfile();
  check(
    "CES flagship hides invoices without billingNavAvailable",
    isPortalNavVisibleForCesLaunch("invoices", profile, {
      billingNavAvailable: false,
    }) === false,
  );
  check(
    "Billing nav visible when billingNavAvailable",
    isPortalNavVisibleForCesLaunch("invoices", profile, {
      billingNavAvailable: true,
    }) === true,
  );
  const navHidden = getEnabledPortalNavGroups(profile, {
    billingNavAvailable: false,
  });
  const navShown = getEnabledPortalNavGroups(profile, {
    billingNavAvailable: true,
  });
  check(
    "nav groups omit Billing when ineligible",
    !navHidden.some((g) => g.items.some((i) => i.id === "invoices")),
  );
  check(
    "nav groups include Billing when eligible",
    navShown.some((g) =>
      g.items.some((i) => i.id === "invoices" && i.href === "/portal/invoices"),
    ),
  );
  check(
    "layout resolves billingNavAvailable from active session mapping",
    layout.includes("resolvePortalBillingNavAvailable") &&
      layout.includes("billingNavAvailable={billingNavAvailable}") &&
      layout.includes("portal-client-${session.clientId}"),
  );
  check(
    "account switch remount key remains client-scoped",
    layout.includes("key={`portal-client-${session.clientId}`}"),
  );

  // 13–18. UI / security static guards
  check(
    "screen has no local payment form fields",
    !screen.includes("<form") &&
      !screen.includes("cardNumber") &&
      !screen.includes("payment_method") &&
      !screen.includes("createAndFinalizeInvoice"),
  );
  check(
    "screen has no fake sample invoices",
    !screen.includes("Preview only") &&
      !screen.includes("$1,234") &&
      !screen.includes("sample"),
  );
  check(
    "screen uses allowlisted presentation props only",
    screen.includes("view.kind") &&
      screen.includes("View invoice") &&
      screen.includes("Pay securely through Stripe"),
  );
  check(
    "external links use noopener noreferrer",
    screen.includes('rel="noopener noreferrer"') &&
      screen.includes('target="_blank"'),
  );
  check(
    "invoices remain in CES_LAUNCH_HIDDEN list (gated carve-out, not global expose)",
    launch.includes('"invoices"') &&
      launch.includes("billingNavAvailable"),
  );
  const canonical = read("lib/ces/modules/canonical.ts");
  check(
    "nav label is Billing for /portal/invoices",
    (nav.includes('label: "Billing"') && nav.includes('href: "/portal/invoices"')) ||
      (canonical.includes('key: "invoices"') &&
        canonical.includes('label: "Billing"') &&
        canonical.includes('href: "/portal/invoices"')),
  );
  check(
    "no HTTP invoice API route introduced",
    !load.includes("NextResponse") &&
      !page.includes("export async function GET"),
  );
  check(
    "presentation never spreads Stripe objects",
    !presentation.includes("...invoice") &&
      !presentation.includes("...result"),
  );
  check(
    "hasMore pagination note when bounded",
    projectPortalBillingView(
      { ...readyResult, hasMore: true },
      "Acme",
    ).kind === "ready" &&
      (
        projectPortalBillingView(
          { ...readyResult, hasMore: true },
          "Acme",
        ) as { paginationNote: string | null }
      ).paginationNote != null,
  );

  // Package + docs registration
  check(
    "package.json registers Batch 5C verifier",
    pkg.includes('"verify:phase5-batch-5c"'),
  );
  const phase5 = read("docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md");
  check(
    "Phase 5 docs mention Batch 5C implementation path",
    phase5.includes("Batch 5C") && phase5.includes("/portal/invoices"),
  );

  // Cross-client mapping eligibility isolation
  check(
    "stale other-client mapping is not nav-eligible",
    isPortalBillingNavEligible(
      {
        clientId: 1,
        stripeCustomerId: "cus_otherclient",
        stripeMode: "test",
        stripeCustomerMappingStatus: "linked",
      },
      2,
    ) === false,
  );

  console.log("\nPhase 5 Batch 5C verification passed.\n");
}

main();
