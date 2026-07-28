import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  ContactNotFoundError,
  ContactOwnershipError,
  ContactValidationError,
  Phase3SchemaUnavailableError,
  updateClientContactForClient,
  type ClientContactWriteInput,
} from "@/lib/executive-client-workspace/contacts-data";
import { phase3UnavailableHttpResponse } from "@/lib/executive-client-workspace/phase3-http";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/admin/client-relationship/contacts/[id]
 * Update a contact only when it belongs to the trusted clientId from the
 * operator workspace context. Client reassignment is rejected.
 */
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await context.params;
    const contactId = Number(idParam);
    if (!Number.isFinite(contactId) || contactId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid contact id." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const clientId = Number(body.clientId);
    if (!Number.isFinite(clientId) || clientId <= 0) {
      return NextResponse.json(
        { success: false, error: "clientId is required." },
        { status: 400 },
      );
    }

    // Ignore any browser-supplied client reassignment attempt on the contact itself.
    const input: Partial<ClientContactWriteInput> = {};
    if (body.name !== undefined) input.name = String(body.name ?? "");
    if (body.roleTitle !== undefined) {
      input.roleTitle = (body.roleTitle as string | null) ?? null;
    }
    if (body.email !== undefined) input.email = (body.email as string | null) ?? null;
    if (body.phone !== undefined) input.phone = (body.phone as string | null) ?? null;
    if (body.status !== undefined) {
      input.status = body.status === "inactive" ? "inactive" : "active";
    }
    if (body.preferredCommunication !== undefined) {
      input.preferredCommunication =
        (body.preferredCommunication as string | null) ?? null;
    }
    if (body.relationshipNotes !== undefined) {
      input.relationshipNotes = (body.relationshipNotes as string | null) ?? null;
    }
    if (body.preferences !== undefined) {
      input.preferences = (body.preferences as string | null) ?? null;
    }
    if (body.dietaryNotes !== undefined) {
      input.dietaryNotes = (body.dietaryNotes as string | null) ?? null;
    }
    if (body.accessibilityNotes !== undefined) {
      input.accessibilityNotes = (body.accessibilityNotes as string | null) ?? null;
    }

    const doc = await updateClientContactForClient(contactId, clientId, input);

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
    if (err instanceof ContactNotFoundError || err instanceof ContactOwnershipError) {
      return NextResponse.json(
        { success: false, error: "Contact not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update contact." },
      { status: 500 },
    );
  }
}
