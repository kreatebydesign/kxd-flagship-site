import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPlatformDashboardData } from "@/lib/platform";
import {
  DEFAULT_PLATFORM_ECONOMICS_INPUTS,
  PLATFORM_ECONOMICS_CALC_VERSION,
  computePlatformEconomics,
  type PlatformEconomicsInputs,
} from "@/lib/platform/economics";
import { loadPlatformCommercialEvidence } from "@/lib/platform/economics/commercial-evidence";
import { captureEvidenceValuationSnapshot } from "@/lib/platform/economics/evidence-snapshot";
import { canAccessPlatformEconomics } from "@/lib/platform/economics/founder-access";
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

  if (!canAccessPlatformEconomics(auth)) return founderDenied();

  const snapshots = await listPlatformEconomicsSnapshots(48);
  return NextResponse.json({ ok: true, snapshots }, { headers: NO_STORE });
}

type SnapshotBody = {
  label?: string;
  inputs?: PlatformEconomicsInputs;
  milestoneNotes?: string[];
  /** manual (default): always persist. evidence-milestone: idempotent by registry fingerprint. */
  captureMode?: "manual" | "evidence-milestone";
};

export async function POST(request: NextRequest) {
  const auth = await requirePayloadAdminApi(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccessPlatformEconomics(auth)) return founderDenied();

  let body: SnapshotBody;
  try {
    body = (await request.json()) as SnapshotBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  const captureMode = body.captureMode === "evidence-milestone" ? "evidence-milestone" : "manual";
  const dashboard = await getPlatformDashboardData();
  const ctx = {
    overview: dashboard.overview,
    subsystems: dashboard.subsystems,
    health: dashboard.health,
    phases: dashboard.phases,
  };

  const inputs =
    body.inputs?.valuation && body.inputs?.saas && body.inputs?.enterprise
      ? body.inputs
      : DEFAULT_PLATFORM_ECONOMICS_INPUTS;

  const commercialEvidence = await loadPlatformCommercialEvidence();
  const outputs = computePlatformEconomics(ctx, inputs, commercialEvidence);
  const milestoneNotes = Array.isArray(body.milestoneNotes)
    ? body.milestoneNotes.map((n) => String(n))
    : [];

  if (captureMode === "evidence-milestone") {
    const label = String(body.label ?? "").trim();
    const result = await captureEvidenceValuationSnapshot({
      ctx,
      inputs,
      computed: outputs,
      milestoneNotes,
      label: label || undefined,
    });
    return NextResponse.json(
      {
        ok: true,
        created: result.created,
        skippedReason: result.skippedReason,
        snapshot: result.created
          ? { id: result.id, label: result.label, capturedAt: new Date().toISOString() }
          : undefined,
      },
      { headers: NO_STORE },
    );
  }

  const label = String(body.label ?? "").trim();
  if (!label) {
    return NextResponse.json(
      { ok: false, error: "Snapshot label is required for manual capture." },
      { status: 400, headers: NO_STORE },
    );
  }

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
