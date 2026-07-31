import { NextResponse } from "next/server";
import { signContractAsClient } from "@/lib/proposal-lifecycle/services";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  try {
    const { publicToken } = await context.params;
    if (!publicToken || publicToken.length < 16) {
      return NextResponse.json({ ok: false, error: "Invalid link." }, { status: 400 });
    }

    const body = (await request.json()) as {
      name?: string;
      title?: string;
      organization?: string;
      email?: string;
      typedAcknowledgment?: string;
      authorityConfirmed?: boolean;
      reviewedConfirmed?: boolean;
      electronicRecordsConsent?: boolean;
    };

    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent");

    const result = await signContractAsClient(publicToken, {
      name: String(body.name ?? ""),
      title: String(body.title ?? ""),
      organization: String(body.organization ?? ""),
      email: String(body.email ?? ""),
      typedAcknowledgment: String(body.typedAcknowledgment ?? ""),
      authorityConfirmed: Boolean(body.authorityConfirmed),
      reviewedConfirmed: Boolean(body.reviewedConfirmed),
      electronicRecordsConsent: Boolean(body.electronicRecordsConsent),
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      alreadySigned: result.alreadySigned,
      certificate: result.pkg.executedCertificate
        ? {
            agreementId: result.pkg.executedCertificate.agreementId,
            verificationId: result.pkg.executedCertificate.verificationId,
            sealedAt: result.pkg.executedCertificate.sealedAt,
          }
        : null,
      // One-time package access token — not logged; hash stored on contract package.
      completionToken: result.completionToken ?? null,
      documentRefs: (result.pkg.documentRefs ?? []).map((d) => ({
        id: d.id,
        kind: d.kind,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to sign.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
