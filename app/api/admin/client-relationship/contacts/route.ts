import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  ContactOwnershipError,
  ContactValidationError,
  Phase3SchemaUnavailableError,
  createClientContactForClient,
  type ClientContactWriteInput,
} from "@/lib/executive-client-workspace/contacts-data";
import { phase3UnavailableHttpResponse } from "@/lib/executive-client-workspace/phase3-http";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/client-relationship/contacts
 * Create a client-scoped contact. Client ownership comes from trusted clientId
 * in the body (must match the operator workspace context). Forged alternate
 * client fields on the contact payload are ignored by the data layer.
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const clientId = Number(body.clientId);
    if (!Number.isFinite(clientId) || clientId <= 0) {
      return NextResponse.json(
        { success: false, error: "clientId is required." },
        { status: 400 },
      );
    }

    const input: ClientContactWriteInput = {
      name: String(body.name ?? ""),
      roleTitle: (body.roleTitle as string | null | undefined) ?? null,
      email: (body.email as string | null | undefined) ?? null,
      phone: (body.phone as string | null | undefined) ?? null,
      status: body.status === "inactive" ? "inactive" : "active",
      preferredCommunication:
        (body.preferredCommunication as string | null | undefined) ?? null,
      relationshipNotes: (body.relationshipNotes as string | null | undefined) ?? null,
      preferences: (body.preferences as string | null | undefined) ?? null,
      dietaryNotes: (body.dietaryNotes as string | null | undefined) ?? null,
      accessibilityNotes: (body.accessibilityNotes as string | null | undefined) ?? null,
    };

    const doc = await createClientContactForClient(clientId, input);

    return NextResponse.json({
      success: true,
      id: doc.id,
      href: `/admin/collections/client-contacts/${doc.id}`,
    });
  } catch (err) {
    if (err instanceof Phase3SchemaUnavailableError) {
      return phase3UnavailableHttpResponse();
    }
    if (err instanceof ContactValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    if (err instanceof ContactOwnershipError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to create contact." },
      { status: 500 },
    );
  }
}
