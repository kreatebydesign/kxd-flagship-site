import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  EventOwnershipError,
  EventValidationError,
  getRelationshipEventById,
  listOperatorContactOptionsForClient,
  updateRelationshipEvent,
  type RelationshipEventWriteInput,
} from "@/lib/executive-client-workspace/events-data";
import type {
  RelationshipEventCategory,
  RelationshipEventStatus,
} from "@/lib/executive-client-workspace/relationship-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/client-relationship/events/[id]
 * Load one event plus contact options for its owning client.
 */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await context.params;
    const eventId = Number(idParam);
    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid event id." },
        { status: 400 },
      );
    }

    const event = await getRelationshipEventById(eventId);
    const contacts = await listOperatorContactOptionsForClient(event.clientId);

    return NextResponse.json({ success: true, event, contacts });
  } catch (err) {
    if (err instanceof EventValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    if (err instanceof EventOwnershipError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 404 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to load relationship event.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/client-relationship/events/[id]
 * Update event fields. Owning client is immutable. Contacts revalidated
 * against the authoritative client on the existing record.
 */
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await context.params;
    const eventId = Number(idParam);
    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid event id." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const expectedClientId =
      body.clientId != null && Number.isFinite(Number(body.clientId))
        ? Number(body.clientId)
        : undefined;

    const input: Partial<RelationshipEventWriteInput> & {
      expectedClientId?: number;
    } = {
      expectedClientId,
    };

    if (body.title !== undefined) input.title = String(body.title ?? "");
    if (body.eventAt !== undefined) input.eventAt = String(body.eventAt ?? "");
    if (body.eventCategory !== undefined) {
      input.eventCategory = body.eventCategory as RelationshipEventCategory;
    }
    if (body.status !== undefined) {
      input.status = body.status as RelationshipEventStatus;
    }
    if (body.location !== undefined) {
      input.location = (body.location as string | null) ?? null;
    }
    if (body.contextNotes !== undefined) {
      input.contextNotes = (body.contextNotes as string | null) ?? null;
    }
    if (body.followUpNotes !== undefined) {
      input.followUpNotes = (body.followUpNotes as string | null) ?? null;
    }
    if (body.dietaryNotes !== undefined) {
      input.dietaryNotes = (body.dietaryNotes as string | null) ?? null;
    }
    if (body.accessibilityNotes !== undefined) {
      input.accessibilityNotes = (body.accessibilityNotes as string | null) ?? null;
    }
    if (body.contactIds !== undefined) {
      input.contactIds = Array.isArray(body.contactIds)
        ? body.contactIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id))
        : [];
    }

    const doc = await updateRelationshipEvent(eventId, input);
    const event = await getRelationshipEventById(doc.id);

    return NextResponse.json({
      success: true,
      id: doc.id,
      event,
      href: `/admin/operations/events/${doc.id}`,
    });
  } catch (err) {
    if (err instanceof EventValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    if (err instanceof EventOwnershipError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update relationship event.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
