import { NextResponse } from "next/server";
import { resolvePortalAccountContext } from "@/lib/portal/account-context";
import {
  canAccessDonYourSpace,
  isDonDeliverableReadyForClient,
  openDonDeliverableArtifact,
  type DonDeliverableArtifact,
} from "@/lib/portal/don-your-space";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ARTIFACTS = new Set<DonDeliverableArtifact>(["report-pdf", "supporting-zip"]);

export async function GET(req: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const accountContext = session.isOperatorPreview
    ? null
    : await resolvePortalAccountContext(session);

  if (!canAccessDonYourSpace({ session, accountContext })) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const artifact = url.searchParams.get("artifact") as DonDeliverableArtifact | null;
  if (!artifact || !ARTIFACTS.has(artifact)) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const readiness = await isDonDeliverableReadyForClient();
  if (!readiness.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Supporting records are not ready for download.",
        missing: readiness.missing,
      },
      { status: 503 },
    );
  }

  const file = await openDonDeliverableArtifact(artifact);
  if (!file) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
      "X-KXD-Delivery": "portal-don-your-space",
    },
  });
}