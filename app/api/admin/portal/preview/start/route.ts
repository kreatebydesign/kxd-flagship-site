/**
 * POST /api/admin/portal/preview/start
 * Studio operator enters single-client portal preview (no portal membership).
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../payload/access/index";
import { publishActivity } from "@/lib/activity-engine/publish";
import { destroyPortalSession } from "@/lib/portal/session";
import {
  buildOperatorPortalPreviewSession,
  setOperatorPortalPreviewCookie,
} from "@/lib/portal/operator-preview";

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

  if (!client) {
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
  const adminUserId = Number(auth.id);
  const adminEmail = String(auth.email ?? "").trim().toLowerCase();

  if (!Number.isFinite(adminUserId) || adminUserId <= 0 || !adminEmail) {
    return NextResponse.json(
      { success: false, error: "Operator identity incomplete." },
      { status: 400 },
    );
  }

  const session = buildOperatorPortalPreviewSession({
    adminUserId,
    adminEmail,
    clientId,
    clientName,
    clientSlug,
  });

  // Never carry a real portal-user cookie into preview (avoids Don attribution).
  await destroyPortalSession();
  await setOperatorPortalPreviewCookie(session);

  try {
    await publishActivity({
      eventType: "portal.operator-preview-started",
      title: `Operator portal preview · ${clientName}`,
      summary:
        "Studio operator opened read-only client portal preview. Not a client login.",
      sourceModule: "Client Command",
      importance: "low",
      occurredAt: new Date().toISOString(),
      clientId,
      metadata: {
        adminUserId,
        adminEmail,
        clientId,
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
    preview: {
      clientId,
      clientName,
      clientSlug,
    },
  });
}
