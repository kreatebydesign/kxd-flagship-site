import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  EventValidationError,
  listOperatorClientOptions,
  listOperatorContactOptionsForClient,
} from "@/lib/executive-client-workspace/events-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/client-relationship/form-options
 * Client options always; contact options only when clientId is provided.
 * Contact payloads are id/name/status/role only — no private notes.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const clientRaw = url.searchParams.get("clientId");
    const clients = await listOperatorClientOptions();

    let contacts: Awaited<ReturnType<typeof listOperatorContactOptionsForClient>> =
      [];
    if (clientRaw) {
      const clientId = Number(clientRaw);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid clientId." },
          { status: 400 },
        );
      }
      contacts = await listOperatorContactOptionsForClient(clientId);
    }

    return NextResponse.json({ success: true, clients, contacts });
  } catch (err) {
    if (err instanceof EventValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to load form options.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
