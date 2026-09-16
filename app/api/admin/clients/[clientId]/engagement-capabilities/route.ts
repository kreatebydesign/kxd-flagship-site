/**
 * Engagement → capability bridge (operator-reviewed).
 * GET: propose mappings from commercial evidence (read-only).
 * POST action=apply: materialize selected capabilities as assignments.
 *
 * Never mutates pricing, obligations, paymentEvents, accepted snapshots, or Stripe.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../payload/access/index";
import { parseRouteClientId, rejectBodyClientIdMismatch } from "@/lib/client-plans/validate";
import {
  applyEngagementCapabilityMapping,
  loadEngagementCapabilityProposal,
} from "@/lib/service-capabilities/apply-engagement-mapping";
import { applyLegacyBaselineCapabilities } from "@/lib/service-capabilities/apply-legacy-baseline";
import { loadResolvedServiceScope } from "@/lib/service-capabilities/assignments";
import { isServiceCapabilityId } from "@/lib/service-capabilities/catalog";
import type { ServiceCapabilityId } from "@/lib/service-capabilities/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot review engagement mappings." },
      { status: 403 },
    );
  }
  const clientId = parseRouteClientId((await context.params).clientId);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }
  const [proposal, scope] = await Promise.all([
    loadEngagementCapabilityProposal(clientId),
    loadResolvedServiceScope(clientId),
  ]);
  return NextResponse.json({
    ok: true,
    proposal,
    scope,
    mutatesEconomics: false,
    mutatesPortal: false,
    drivesExperienceDefault: false,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot apply engagement mappings." },
      { status: 403 },
    );
  }
  const clientId = parseRouteClientId((await context.params).clientId);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as {
      clientId?: unknown;
      action?: unknown;
      capabilityIds?: unknown;
      reason?: unknown;
    };
    const identityError = rejectBodyClientIdMismatch(clientId, body);
    if (identityError) {
      return NextResponse.json({ ok: false, message: identityError }, { status: 400 });
    }
    const action = String(body.action ?? "");
    if (action !== "apply" && action !== "apply-legacy-baseline") {
      return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
    }
    if (!Array.isArray(body.capabilityIds) || body.capabilityIds.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            action === "apply-legacy-baseline"
              ? "Select at least one capability for legacy baseline."
              : "Select at least one proposed capability.",
        },
        { status: 400 },
      );
    }
    const capabilityIds: ServiceCapabilityId[] = [];
    for (const raw of body.capabilityIds) {
      if (!isServiceCapabilityId(raw)) {
        return NextResponse.json(
          { ok: false, message: `Unknown capability: ${String(raw)}` },
          { status: 400 },
        );
      }
      capabilityIds.push(raw);
    }

    const actor =
      typeof auth === "object" && auth && "email" in auth
        ? String((auth as { email?: string }).email ?? "operator")
        : "operator";

    if (action === "apply-legacy-baseline") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Legacy baseline requires an explicit operator reason (not fabricated contract evidence).",
          },
          { status: 400 },
        );
      }
      const result = await applyLegacyBaselineCapabilities({
        clientId,
        capabilityIds,
        actor,
        reason,
      });
      const scope = await loadResolvedServiceScope(clientId);
      return NextResponse.json({
        ok: true,
        result,
        scope,
        mutatesEconomics: false,
        mutatesPortal: false,
        provenance: "legacy-baseline",
      });
    }

    const result = await applyEngagementCapabilityMapping({
      clientId,
      capabilityIds,
      actor,
    });
    const scope = await loadResolvedServiceScope(clientId);
    return NextResponse.json({
      ok: true,
      result,
      scope,
      mutatesEconomics: false,
      mutatesPortal: false,
      provenance: "engagement-bridge",
    });
  } catch (err) {
    console.error("[KXD] Engagement capability mapping failed:", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to apply mapping." },
      { status: 400 },
    );
  }
}
