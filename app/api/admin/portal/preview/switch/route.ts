/**
 * POST /api/admin/portal/preview/switch
 * Studio operator changes read-only preview client (founder QA portfolio only).
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "@/payload/access/index";
import { publishActivity } from "@/lib/activity-engine/publish";
import {
  getOperatorPortalPreviewCookieSession,
} from "@/lib/portal/operator-preview";
import {
  isOperatorPreviewPortfolioClientId,
} from "@/lib/portal/operator-preview/portfolio-options";
import { remintOperatorPortalPreview } from "@/lib/portal/operator-preview/remint";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      {
        success: false,
        error: "Restricted staff cannot preview client portals.",
        code: "preview_forbidden",
      },
      { status: 403 },
    );
  }

  const current = await getOperatorPortalPreviewCookieSession();
  if (!current) {
    return NextResponse.json(
      {
        success: false,
        error: "Operator Preview is not active.",
        code: "preview_inactive",
      },
      { status: 400 },
    );
  }

  const adminUserId = Number(auth.id);
  const adminEmail = String(auth.email ?? "").trim().toLowerCase();
  if (
    !Number.isFinite(adminUserId) ||
    adminUserId <= 0 ||
    !adminEmail ||
    current.adminUserId !== adminUserId
  ) {
    return NextResponse.json(
      { success: false, error: "Preview session mismatch." },
      { status: 403 },
    );
  }

  let body: { clientId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const clientId = Number(body.clientId);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json(
      { success: false, error: "clientId is required." },
      { status: 400 },
    );
  }

  if (!isOperatorPreviewPortfolioClientId(clientId)) {
    return NextResponse.json(
      {
        success: false,
        error: "That client is not in the founder preview portfolio.",
        code: "preview_client_forbidden",
      },
      { status: 403 },
    );
  }

  if (clientId === current.clientId) {
    return NextResponse.json({
      success: true,
      redirectTo: "/portal",
      preview: { clientId, clientName: current.clientName },
    });
  }

  const payload = await getPayload({ config });
  let client: AnyDoc;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return NextResponse.json(
      { success: false, error: "Client not found." },
      { status: 404 },
    );
  }

  const clientName = String(client.name ?? `Client #${clientId}`);
  const clientSlug =
    typeof client.slug === "string" && client.slug.trim()
      ? client.slug.trim()
      : null;

  await remintOperatorPortalPreview({
    adminUserId,
    adminEmail,
    clientId,
    clientName,
    clientSlug,
    draftComposition: current.draftComposition,
  });

  try {
    await publishActivity({
      eventType: "portal.operator-preview-switched",
      title: `Operator preview switched · ${clientName}`,
      summary:
        "Studio operator changed read-only client portal preview. Not a client login.",
      sourceModule: "Client Command",
      importance: "low",
      occurredAt: new Date().toISOString(),
      clientId,
      metadata: {
        adminUserId,
        adminEmail,
        fromClientId: current.clientId,
        toClientId: clientId,
        clientSlug,
        readOnly: true,
        attributedToPortalUser: false,
      },
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    success: true,
    redirectTo: "/portal",
    preview: { clientId, clientName, clientSlug },
  });
}
