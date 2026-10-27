import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { staffActorFromUser } from "@/lib/staff/actor";
import { isFounderOrAdmin } from "@/lib/staff/permissions";
import { getPlatformDashboardData } from "@/lib/platform";
import {
  PLATFORM_ECONOMICS_CALC_VERSION,
  computePlatformEconomics,
  type PlatformEconomicsInputs,
} from "@/lib/platform/economics";
import {
  createPlatformEconomicsSnapshot,
  listPlatformEconomicsSnapshots,
} from "@/lib/platform/economics/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function founderDenied() {
  return NextResponse.json(
    { ok: false, error: "Founder access required." },
    { status: 403, headers: NO_STORE },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requirePayloadAdminApi(request);
  if (auth instanceof NextResponse) return auth;

  const actor = staffActorFromUser(auth);
  if (!actor || !isFounderOrAdmin(actor)) return founderDenied();

  const snapshots = await listPlatformEconomicsSnapshots(48);
  return NextResponse.json({ ok: true, snapshots }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const auth = await requirePayloadAdminApi(request);
  if (auth instanceof NextResponse) return auth;

  const actor = staffActorFromUser(auth);
  if (!actor || !isFounderOrAdmin(actor)) return founderDenied();

  let body: { label?: string; inputs?: PlatformEconomicsInputs; milestoneNotes?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  const label = String(body.label ?? "").trim();
  if (!label) {
    return NextResponse.json(
      { ok: false, error: "Snapshot label is required." },
      { status: 400, headers: NO_STORE },
    );
  }

  const dashboard = await getPlatformDashboardData();
  const inputs = body.inputs;
  if (!inputs?.valuation || !inputs.saas || !inputs.enterprise) {
    return NextResponse.json(
      { ok: false, error: "Complete economics inputs are required." },
      { status: 400, headers: NO_STORE },
    );
  }

  const ctx = {
    overview: dashboard.overview,
    subsystems: dashboard.subsystems,
    health: dashboard.health,
    phases: dashboard.phases,
  };
  const outputs = computePlatformEconomics(ctx, inputs);
  const milestoneNotes = Array.isArray(body.milestoneNotes)
    ? body.milestoneNotes.map((n) => String(n))
    : [];

  const doc = await createPlatformEconomicsSnapshot({
    label,
    calculationVersion: PLATFORM_ECONOMICS_CALC_VERSION,
    sourceFingerprint: outputs.sourceFingerprint,
    inputs,
    outputs,
    milestoneNotes,
  });

  return NextResponse.json(
    {
      ok: true,
      snapshot: {
        id: String(doc.id),
        label: doc.label,
        capturedAt: doc.capturedAt,
      },
    },
    { headers: NO_STORE },
  );
}
