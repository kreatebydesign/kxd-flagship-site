import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  EventOwnershipError,
  EventValidationError,
  createRelationshipEvent,
  listOperatorClientOptions,
  listRelationshipEvents,
  type RelationshipEventWriteInput,
} from "@/lib/executive-client-workspace/events-data";
import type {
  RelationshipEventCategory,
  RelationshipEventStatus,
} from "@/lib/executive-client-workspace/relationship-types";

export const dynamic = "force-dynamic";

function parseEnumStatus(
  value: string | null,
): RelationshipEventStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  if (value === "planned" || value === "completed" || value === "cancelled") {
    return value;
  }
  return undefined;
}

function parseEnumCategory(
  value: string | null,
): RelationshipEventCategory | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  if (
    value === "meeting" ||
    value === "dinner" ||
    value === "engagement" ||
    value === "visit" ||
    value === "other"
  ) {
    return value;
  }
  return undefined;
}

/**
 * GET /api/admin/client-relationship/events
 * List relationship events with optional filters. Operator-only.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const clientRaw = url.searchParams.get("clientId");
    const clientId = clientRaw ? Number(clientRaw) : undefined;
    const status = parseEnumStatus(url.searchParams.get("status"));
    const category = parseEnumCategory(url.searchParams.get("category"));
    const timeframeParam = url.searchParams.get("timeframe");
    const timeframe =
      timeframeParam === "upcoming" ||
      timeframeParam === "recent" ||
      timeframeParam === "all"
        ? timeframeParam
        : "all";

    const events = await listRelationshipEvents({
      q,
      clientId:
        clientId != null && Number.isFinite(clientId) && clientId > 0
          ? clientId
          : undefined,
      status: status ?? "all",
      category: category ?? "all",
      timeframe,
    });

    const clients = await listOperatorClientOptions();

    return NextResponse.json({ success: true, events, clients });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load relationship events.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/client-relationship/events
 * Create a relationship event. Client ownership from trusted clientId.
 * Associated contacts must belong to that client. internalOnly forced true.
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

    const contactIds = Array.isArray(body.contactIds)
      ? body.contactIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [];

    const input: RelationshipEventWriteInput = {
      title: String(body.title ?? ""),
      eventAt: String(body.eventAt ?? ""),
      eventCategory: body.eventCategory as RelationshipEventCategory | undefined,
      status: body.status as RelationshipEventStatus | undefined,
      location: (body.location as string | null | undefined) ?? null,
      contextNotes: (body.contextNotes as string | null | undefined) ?? null,
      followUpNotes: (body.followUpNotes as string | null | undefined) ?? null,
      dietaryNotes: (body.dietaryNotes as string | null | undefined) ?? null,
      accessibilityNotes:
        (body.accessibilityNotes as string | null | undefined) ?? null,
      contactIds,
    };

    const doc = await createRelationshipEvent(clientId, input);

    return NextResponse.json({
      success: true,
      id: doc.id,
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
      err instanceof Error ? err.message : "Failed to create relationship event.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
