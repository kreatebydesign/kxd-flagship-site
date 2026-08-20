/**
 * Public builder proposal API — token-authorized, no login.
 * GET — canonical client-facing proposal
 * POST — view | request-changes | accept
 */
import { NextRequest, NextResponse } from "next/server";
import { ProposalBuilderError } from "@/lib/proposal-builder/errors";
import { calculateProposalTotals } from "@/lib/proposal-builder/pricing";
import { publicBookingUrl } from "@/lib/proposal-builder/booking-url";
import { normalizeProposalDocument } from "@/lib/proposal-builder/document";
import { renderProposalPdf } from "@/lib/proposal-builder/export-pdf";
import {
  acceptProposal,
  getPublicProposalByToken,
  recordPublicView,
  submitChangeRequest,
} from "@/lib/proposal-builder/services";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;
  const wantPdf = req.nextUrl.searchParams.get("download") === "pdf";

  const view = await getPublicProposalByToken(publicToken);
  if (!view) {
    return NextResponse.json({ success: false, error: "Proposal not available." }, { status: 404 });
  }

  if (wantPdf) {
    const { buffer, filename } = await renderProposalPdf(view.canonical);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const doc = normalizeProposalDocument(view.proposal.builderDocument);
  const liveTotals = calculateProposalTotals(doc, {
    selectedLineIds: view.canonical.selectedLineIds,
    selectedPackageKeys: view.canonical.selectedPackageKeys,
  });

  return NextResponse.json({
    success: true,
    accepted: view.accepted,
    canonical: view.canonical,
    clientCanSelect: doc.options.clientCanSelect,
    options: doc.options,
    scheduleCallUrl: publicBookingUrl(doc.scheduleCallUrl),
    totals: view.accepted ? view.canonical.totals : liveTotals,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;

  try {
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "view") {
      await recordPublicView(publicToken);
      return NextResponse.json({ success: true });
    }

    if (action === "request-changes") {
      await submitChangeRequest(publicToken, {
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        organization: body.organization ? String(body.organization) : undefined,
        message: String(body.message ?? ""),
        sectionReference: body.sectionReference ? String(body.sectionReference) : undefined,
      });
      return NextResponse.json({ success: true, status: "revision-requested" });
    }

    if (action === "accept") {
      const result = await acceptProposal(publicToken, {
        name: String(body.name ?? ""),
        title: String(body.title ?? ""),
        organization: String(body.organization ?? ""),
        email: String(body.email ?? ""),
        authorityConfirmed: Boolean(body.authorityConfirmed),
        reviewedConfirmed: Boolean(body.reviewedConfirmed),
        typedAcknowledgment: body.typedAcknowledgment
          ? String(body.typedAcknowledgment)
          : String(body.name ?? ""),
        selectedLineIds: Array.isArray(body.selectedLineIds) ? body.selectedLineIds : undefined,
        selectedPackageKeys: Array.isArray(body.selectedPackageKeys)
          ? body.selectedPackageKeys
          : undefined,
        ipAddress: clientIp(req),
        userAgent: req.headers.get("user-agent"),
      });

      return NextResponse.json({
        success: true,
        alreadyAccepted: result.alreadyAccepted,
        status: "accepted-contract-pending",
        contractId: result.contractId,
        acceptance: {
          acceptedAt: result.acceptance.acceptedAt,
          version: result.acceptance.version,
          totals: result.acceptance.totals,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[KXD Proposal Builder] public action failed:", err);
    return NextResponse.json({ success: false, error: "Request failed." }, { status: 500 });
  }
}
