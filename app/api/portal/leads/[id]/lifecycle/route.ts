/**
 * POST /api/portal/leads/[id]/lifecycle
 * Client Command — Lead Command (Primal Phase 1, Build 1).
 *
 * Membership-scoped lead action API. Strict allowlist of action types (no raw
 * field passthrough) — never accepts verificationState, assignedOwnerId
 * (staff), confirmedSaleReference, reconciliationState, or
 * googleConversionObserved from portal callers. Does not broaden Payload
 * collection access. Does not write sales-leads. Does not mint commission.
 */

import { NextResponse } from "next/server";
import { canWriteLeadCommand, requireLeadCommandAccess, resolveLeadCommandPolicy } from "@/lib/client-command/leads/access";
import { applyLeadCommandAction, type LeadCommandAction } from "@/lib/client-command/leads/update";
import type { LostReason } from "@/lib/managed-client-leads/types";
import type { LeadPresentationStage } from "@/lib/client-command/leads/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STAGES = new Set<LeadPresentationStage>([
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "WON",
  "LOST",
]);

const VALID_LOST_REASONS = new Set<LostReason>([
  "not_interested",
  "budget",
  "timing",
  "competitor",
  "no_response",
  "wrong_fit",
  "other",
]);

function parseAction(body: Record<string, unknown>): LeadCommandAction | null {
  const type = String(body.type ?? "");
  switch (type) {
    case "assign": {
      const raw = body.portalOwnerId;
      return {
        type: "assign",
        portalOwnerId: raw == null ? null : Number(raw),
      };
    }
    case "stage": {
      const stage = String(body.stage ?? "");
      if (!VALID_STAGES.has(stage as LeadPresentationStage)) return null;
      return { type: "stage", stage: stage as LeadPresentationStage };
    }
    case "note": {
      const note = typeof body.note === "string" ? body.note : "";
      return { type: "note", note };
    }
    case "follow-up": {
      const raw = body.nextFollowUpAt;
      return {
        type: "follow-up",
        nextFollowUpAt: raw == null ? null : String(raw),
      };
    }
    case "qualify":
      return { type: "qualify" };
    case "won": {
      const revenueRaw = body.wonRevenueCents;
      const programRaw = body.bookedProgram;
      return {
        type: "won",
        wonRevenueCents:
          revenueRaw == null || revenueRaw === "" ? null : Number(revenueRaw),
        bookedProgram:
          programRaw == null || programRaw === "" ? null : String(programRaw),
      };
    }
    case "lost": {
      const reason = String(body.lostReason ?? "");
      if (!VALID_LOST_REASONS.has(reason as LostReason)) return null;
      return { type: "lost", lostReason: reason as LostReason };
    }
    default:
      return null;
  }
}

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireLeadCommandAccess();
  if ("error" in gate) return gate.error;

  const write = await canWriteLeadCommand(gate.session, gate.canManage);
  if (!write.ok) {
    return NextResponse.json({ success: false, error: write.reason }, { status: 403 });
  }

  const { id: idParam } = await context.params;
  const inquiryId = Number(idParam);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return NextResponse.json(
      { success: false, error: "A valid lead id is required." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const action = parseAction(body);
  if (!action) {
    return NextResponse.json(
      { success: false, error: "Unsupported or invalid lead action." },
      { status: 400 },
    );
  }

  const policy = resolveLeadCommandPolicy({
    clientKey: gate.tenant.clientKey,
    displayName: gate.tenant.clientName,
  });
  if (!policy) {
    return NextResponse.json(
      { success: false, error: "Lead operations are not available for this workspace." },
      { status: 403 },
    );
  }

  const result = await applyLeadCommandAction({
    inquiryId,
    tenant: gate.tenant,
    policy,
    actorId: write.actorId,
    action,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found" ? 404 : result.code === "forbidden" || result.code === "policy" ? 403 : 400;
    return NextResponse.json({ success: false, error: result.message }, { status });
  }

  return NextResponse.json({ success: true, inquiry: result.inquiry });
}
