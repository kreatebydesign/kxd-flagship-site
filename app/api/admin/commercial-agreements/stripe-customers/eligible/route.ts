/**
 * GET /api/admin/commercial-agreements/stripe-customers/eligible
 * Lists clients that currently have a billing profile (eligibility for linking UI).
 * No Stripe network. No profile creation.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { listLinkableBillingClients } from "@/lib/stripe/customer-linking-service";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return auth;
  }

  try {
    const clients = await listLinkableBillingClients();
    return NextResponse.json(
      {
        ok: true,
        clients,
        notice:
          clients.length === 0
            ? "No billing profiles exist. Customer linking requires an existing billing profile — profiles are not auto-created."
            : "Eligible clients with billing profiles. Linking remains test-mode and operator-confirmed.",
      },
      { headers: NO_STORE },
    );
  } catch {
    console.error("[KXD Stripe Eligible Clients] Failed");
    return NextResponse.json(
      { ok: false, message: "Unable to list linkable clients." },
      { status: 500, headers: NO_STORE },
    );
  }
}
