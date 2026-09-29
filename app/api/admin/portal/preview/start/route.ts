/**
 * POST /api/admin/portal/preview/start
 * Studio operator enters portal preview (no portal membership / credentials).
 *
 * Body:
 * - { clientId } — single-client preview (Client Command)
 * - { portalUserId, clientId? } — membership-scoped preview (Portal Access)
 *   Uses the subject's active memberships; does not activate the user.
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
  getOperatorPortalPreviewCookieSession,
  setOperatorPortalPreviewCookie,
} from "@/lib/portal/operator-preview";
import { sanitizeSelectedPortalModules } from "@/lib/client-command/experience/compose";
import type { OperatorPreviewDraftComposition } from "@/lib/portal/operator-preview/types";
import {
  dedupeActiveMembershipsByClient,
  listPortalMembershipsForUser,
} from "@/lib/portal/memberships";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function displayNameForUser(user: AnyDoc): string {
  const name = String(user.displayName ?? "").trim();
  if (name) return name;
  const email = String(user.email ?? "").trim();
  if (email.includes("@")) return email.split("@")[0] || email;
  return email || `Portal user #${user.id}`;
}

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

  let body: {
    clientId?: number;
    portalUserId?: number;
    draftComposition?: OperatorPreviewDraftComposition;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const adminUserId = Number(auth.id);
  const adminEmail = String(auth.email ?? "").trim().toLowerCase();
  if (!Number.isFinite(adminUserId) || adminUserId <= 0 || !adminEmail) {
    return NextResponse.json(
      { success: false, error: "Operator identity incomplete." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });
  const prior = await getOperatorPortalPreviewCookieSession();

  let clientId: number;
  let clientName: string;
  let clientSlug: string | null;
  let asPortalUserId: number | undefined;
  let asPortalUserDisplayName: string | undefined;

  const requestedPortalUserId = Number(body.portalUserId);
  if (Number.isFinite(requestedPortalUserId) && requestedPortalUserId > 0) {
    let subject: AnyDoc;
    try {
      subject = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        id: requestedPortalUserId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
    } catch {
      return NextResponse.json(
        { success: false, error: "Portal user not found." },
        { status: 404 },
      );
    }

    const memberships = await listPortalMembershipsForUser(requestedPortalUserId, {
      payload,
    });
    const active = dedupeActiveMembershipsByClient(
      memberships.filter((m) => m.status === "active"),
    );
    if (active.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "This portal user has no active client memberships to preview.",
          code: "preview_no_memberships",
        },
        { status: 400 },
      );
    }

    const preferredClientId = Number(body.clientId);
    const preferred =
      Number.isFinite(preferredClientId) && preferredClientId > 0
        ? active.find((m) => m.clientId === preferredClientId)
        : undefined;
    const defaultMembership = active.find((m) => m.isDefault) ?? active[0];
    const selected = preferred ?? defaultMembership;

    clientId = selected.clientId;
    clientName = selected.clientName;
    clientSlug = selected.clientSlug;
    asPortalUserId = requestedPortalUserId;
    asPortalUserDisplayName = displayNameForUser(subject);
  } else {
    clientId = Number(body.clientId);
    if (!Number.isFinite(clientId) || clientId <= 0) {
      return NextResponse.json(
        { success: false, error: "clientId or portalUserId is required." },
        { status: 400 },
      );
    }

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

    clientName = String(client.name ?? `Client #${clientId}`);
    clientSlug =
      typeof client.slug === "string" && client.slug.trim()
        ? client.slug.trim()
        : null;
  }

  const draftRaw = body.draftComposition;
  const draftComposition: OperatorPreviewDraftComposition | undefined =
    draftRaw && typeof draftRaw === "object"
      ? {
          modules: sanitizeSelectedPortalModules(
            Array.isArray(draftRaw.modules) ? draftRaw.modules.map(String) : [],
          ),
          branding:
            draftRaw.branding && typeof draftRaw.branding === "object"
              ? draftRaw.branding
              : undefined,
        }
      : undefined;

  const session = buildOperatorPortalPreviewSession({
    adminUserId,
    adminEmail,
    clientId,
    clientName,
    clientSlug,
    asPortalUserId,
    asPortalUserDisplayName,
    draftComposition,
  });

  // Never carry a real portal-user cookie into preview (avoids client attribution).
  await destroyPortalSession();
  await setOperatorPortalPreviewCookie(session);

  const switchedFrom =
    prior &&
    prior.adminUserId === adminUserId &&
    prior.clientId !== clientId
      ? prior
      : null;

  try {
    await publishActivity({
      eventType: switchedFrom
        ? "portal.operator-preview-switched"
        : "portal.operator-preview-started",
      title: switchedFrom
        ? `Operator portal preview switched · ${clientName}`
        : asPortalUserDisplayName
          ? `Operator portal preview · ${asPortalUserDisplayName}`
          : `Operator portal preview · ${clientName}`,
      summary: switchedFrom
        ? "Studio operator reminted client portal preview for another client scope."
        : "Studio operator opened read-only client portal preview. Not a client login.",
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
        ...(asPortalUserId != null
          ? {
              asPortalUserId,
              asPortalUserDisplayName,
              membershipScoped: true,
            }
          : {}),
        ...(switchedFrom
          ? {
              fromClientId: switchedFrom.clientId,
              toClientId: clientId,
            }
          : {}),
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
      ...(asPortalUserId != null
        ? {
            asPortalUserId,
            asPortalUserDisplayName,
          }
        : {}),
    },
  });
}
