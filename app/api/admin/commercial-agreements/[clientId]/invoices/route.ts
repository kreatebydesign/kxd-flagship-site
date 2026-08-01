/**
 * GET /api/admin/commercial-agreements/[clientId]/invoices
 * Phase 5 Batch 5D — Operator-only, read-only Stripe TEST invoice visibility.
 *
 * Never mutates invoices, customers, billing profiles, agreements, or entitlements.
 * Browser-supplied Stripe customer / mode / invoice fields are rejected.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { projectStaffInvoiceView } from "@/lib/commercial-agreements/staff-invoice-presentation";
import { parseRouteClientId } from "@/lib/client-plans/validate";
import { rejectBrowserInvoiceReadAuthority } from "@/lib/stripe/invoice-read-logic";
import {
  listStaffClientInvoices,
  StaffInvoiceReadError,
} from "@/lib/stripe/invoice-read-staff";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

const FORBIDDEN_QUERY_KEYS = [
  "stripeCustomerId",
  "customerId",
  "clientId",
  "billingProfileId",
  "stripeMode",
  "mode",
  "accountId",
  "stripeAccountId",
  "invoiceId",
] as const;

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Invalid client id." },
      { status: 400 },
    );
  }

  for (const key of FORBIDDEN_QUERY_KEYS) {
    if (req.nextUrl.searchParams.has(key)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Browser-supplied customer, client, mode, or invoice fields cannot authorize invoice access.",
        },
        { status: 400 },
      );
    }
  }

  const browserRejected = rejectBrowserInvoiceReadAuthority(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!browserRejected.ok) {
    return NextResponse.json(
      { ok: false, message: browserRejected.message },
      { status: 400 },
    );
  }

  try {
    const result = await listStaffClientInvoices({
      authorizedClientId: clientId,
    });
    const clientLabel =
      typeof result.clientId === "number"
        ? `Client ${result.clientId}`
        : `Client ${clientId}`;
    const view = projectStaffInvoiceView(result, clientLabel);
    return NextResponse.json(
      {
        ok: true,
        clientId,
        view,
        notice:
          "Read-only Stripe TEST invoice visibility. No invoice, customer, payment, agreement, or entitlement was created or changed.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    if (err instanceof StaffInvoiceReadError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Staff Invoices] List failed");
    return NextResponse.json(
      { ok: false, message: "Unable to load Stripe invoices." },
      { status: 500 },
    );
  }
}

/** Reject mutating methods explicitly — Batch 5D is read-only. */
export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Invoice mutation is not authorized." },
    { status: 405 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { ok: false, message: "Invoice mutation is not authorized." },
    { status: 405 },
  );
}

export async function PATCH() {
  return NextResponse.json(
    { ok: false, message: "Invoice mutation is not authorized." },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, message: "Invoice mutation is not authorized." },
    { status: 405 },
  );
}
