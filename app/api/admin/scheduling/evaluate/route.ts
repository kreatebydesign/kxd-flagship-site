import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { evaluateSchedulingPolicy } from "@/lib/scheduling/policy";
import type { SchedulingPolicyInput } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scheduling/evaluate
 * Policy-only evaluation — no persistence, no Google.
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    work?: SchedulingPolicyInput["work"];
    slot?: SchedulingPolicyInput["slot"];
    intent?: "suggest" | "direct";
    externalAttendees?: boolean;
    displacesProtectedTime?: boolean;
    highImpactChange?: boolean;
  };

  if (!body.work || !body.slot) {
    return NextResponse.json(
      { ok: false, error: "work and slot are required." },
      { status: 400 },
    );
  }

  try {
    const policy = evaluateSchedulingPolicy({
      actor: schedulingActorFromUser(auth),
      work: body.work,
      slot: body.slot,
      intent: body.intent ?? "suggest",
      externalAttendees: body.externalAttendees,
      displacesProtectedTime: body.displacesProtectedTime,
      highImpactChange: body.highImpactChange,
    });
    return NextResponse.json({ ok: true, policy });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not evaluate policy.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
