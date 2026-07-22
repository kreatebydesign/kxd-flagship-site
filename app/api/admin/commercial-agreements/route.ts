/**
 * GET /api/admin/commercial-agreements
 * List commercial terms recorded on clients (operator-only).
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isCommercialAgreementId } from "@/lib/commercial-agreements";
import { listClientCommercialAgreements } from "@/lib/commercial-agreements/ops-service";
import type {
  CommercialAgreementId,
  CommercialRecordStatus,
} from "@/lib/commercial-agreements";
import { parseRouteClientId } from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || undefined;
    const agreementRaw = url.searchParams.get("agreementId") ?? "all";
    const recordRaw = url.searchParams.get("recordStatus") ?? "all";
    const clientRaw = url.searchParams.get("clientId");
    const clientId = clientRaw ? parseRouteClientId(clientRaw) : null;

    let agreementId: CommercialAgreementId | "unset" | "all" = "all";
    if (agreementRaw === "unset") agreementId = "unset";
    else if (agreementRaw === "all") agreementId = "all";
    else if (isCommercialAgreementId(agreementRaw)) agreementId = agreementRaw;

    let recordStatus: CommercialRecordStatus | "all" = "all";
    if (recordRaw === "recorded" || recordRaw === "unset") {
      recordStatus = recordRaw;
    }

    const agreements = await listClientCommercialAgreements({
      search,
      agreementId,
      recordStatus,
      clientId: clientId ?? undefined,
    });

    const totals = {
      clients: agreements.length,
      recorded: agreements.filter((r) => r.recordStatus === "recorded").length,
      unset: agreements.filter((r) => r.recordStatus === "unset").length,
      notProvisioned: agreements.filter(
        (r) => r.provisioningState === "not_provisioned",
      ).length,
    };

    return NextResponse.json({ ok: true, agreements, totals });
  } catch (err) {
    console.error("[KXD Commercial Ops] List failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to load commercial agreements." },
      { status: 500 },
    );
  }
}
