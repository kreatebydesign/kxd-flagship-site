/**
 * Portal Account Statement PDF — live ledger composition.
 *
 * GET only. Session-scoped client identity.
 * Never files commercial-document snapshots.
 * Never mutates payments, obligations, invoices, or Stripe.
 */

import { NextResponse } from "next/server";
import {
  renderAccountStatementPdf,
  validateAccountStatement,
} from "@/lib/commercial-documents/account-statement";
import { loadPortalLiveAccountStatement } from "@/lib/portal/billing/load";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const statement = await loadPortalLiveAccountStatement(session);
  if (!statement) {
    return NextResponse.json(
      { ok: false, error: "No commercial ledger is available for a statement yet." },
      { status: 404 },
    );
  }

  if (statement.clientId !== session.clientId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 403 });
  }

  const issues = validateAccountStatement(statement.document);
  if (issues.length) {
    return NextResponse.json(
      { ok: false, error: "Statement arithmetic invalid." },
      { status: 409 },
    );
  }

  const { buffer, filename } = await renderAccountStatementPdf(statement.document);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
