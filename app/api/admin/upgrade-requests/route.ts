/**
 * GET /api/admin/upgrade-requests
 * PATCH /api/admin/upgrade-requests/[id] — see [id]/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  isUpgradeRequestStatus,
  listAdminUpgradeRequests,
  type UpgradeRequestStatus,
} from "@/lib/client-upgrade-requests";
import { resolveClientEntitlements } from "@/lib/client-plans";
import { parseRouteClientId } from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") ?? "open";
    const clientRaw = url.searchParams.get("clientId");
    const clientId = clientRaw ? parseRouteClientId(clientRaw) : null;

    let status: UpgradeRequestStatus | "open" | "all" = "open";
    if (statusParam === "all") status = "all";
    else if (statusParam === "open") status = "open";
    else if (isUpgradeRequestStatus(statusParam)) status = statusParam;

    const requests = await listAdminUpgradeRequests({
      status,
      clientId: clientId ?? undefined,
    });

    const withAccess = await Promise.all(
      requests.map(async (row) => {
        try {
          const entitlements = await resolveClientEntitlements(row.clientId);
          const accessGranted = entitlements.effectiveModules.includes(
            row.moduleKey,
          );
          return {
            ...row,
            accessGranted,
            currentPlanKey: entitlements.planKey,
            currentPlanStatus: entitlements.planStatus,
            currentEffectiveModules: entitlements.effectiveModules,
          };
        } catch {
          return {
            ...row,
            accessGranted: false,
            currentPlanKey: null,
            currentPlanStatus: null,
            currentEffectiveModules: [] as string[],
          };
        }
      }),
    );

    return NextResponse.json({ ok: true, requests: withAccess });
  } catch (err) {
    console.error("[KXD Upgrade Requests] Admin list failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load upgrade requests." },
      { status: 500 },
    );
  }
}
