/**
 * GET /api/admin/clients/[clientId]/experience/discover
 * Read-only discovery. Does not write. Does not activate. Does not invite.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../../payload/access/index";
import { parseRouteClientId } from "@/lib/client-plans/validate";
import { discoverExperienceDependencies } from "@/lib/client-command/experience/composer/discover";
import type { ExperienceDiscoverKind } from "@/lib/client-command/experience/composer/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KINDS = new Set<ExperienceDiscoverKind | "all">([
  "all",
  "branding",
  "ga4",
  "search-console",
]);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot discover client experience." },
      { status: 403 },
    );
  }

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  const kindRaw = req.nextUrl.searchParams.get("kind") || "all";
  const kind = kindRaw as ExperienceDiscoverKind | "all";
  if (!KINDS.has(kind)) {
    return NextResponse.json({ ok: false, message: "Unknown discovery kind." }, { status: 400 });
  }

  try {
    const result = await discoverExperienceDependencies(clientId, kind);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[KXD CES] Experience discover failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to discover experience dependencies." },
      { status: 500 },
    );
  }
}
