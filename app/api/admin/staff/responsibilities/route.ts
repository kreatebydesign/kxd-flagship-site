import { NextResponse } from "next/server";
import { requireAdminOversightApi } from "@/lib/staff/guard";
import {
  STAFF_RESPONSIBILITY_LIBRARY,
  listStaffResponsibilities,
  upsertStaffResponsibility,
} from "@/lib/staff/responsibilities";
import type { StaffResponsibilityCadence } from "@/lib/staff/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireAdminOversightApi();
  if (gated instanceof NextResponse) return gated;

  const responsibilities = await listStaffResponsibilities();
  return NextResponse.json({
    success: true,
    responsibilities,
    library: STAFF_RESPONSIBILITY_LIBRARY,
  });
}

export async function POST(request: Request) {
  const gated = await requireAdminOversightApi();
  if (gated instanceof NextResponse) return gated;

  const body = (await request.json()) as {
    id?: number;
    libraryKey?: string;
    title?: string;
    purpose?: string;
    expectedOutcome?: string;
    estimatedMinutes?: number | null;
    ownerUserId?: number | null;
    cadence?: StaffResponsibilityCadence;
    weekdayMask?: number[];
    scope?: "internal" | "client";
    clientId?: number | null;
    requiresApproval?: boolean;
    active?: boolean;
  };

  let title = body.title?.trim() ?? "";
  let purpose = body.purpose?.trim() ?? "";
  let expectedOutcome = body.expectedOutcome?.trim() ?? "";
  let estimatedMinutes = body.estimatedMinutes ?? null;
  let libraryKey = body.libraryKey ?? null;

  if (body.libraryKey) {
    const lib = STAFF_RESPONSIBILITY_LIBRARY.find((row) => row.key === body.libraryKey);
    if (lib) {
      title = title || lib.title;
      purpose = purpose || lib.purpose;
      expectedOutcome = expectedOutcome || lib.expectedOutcome;
      estimatedMinutes = estimatedMinutes ?? lib.estimatedMinutes;
      libraryKey = lib.key;
    }
  }

  if (!title || !purpose || !expectedOutcome) {
    return NextResponse.json(
      { success: false, error: "title, purpose, and expectedOutcome are required." },
      { status: 400 },
    );
  }

  const responsibility = await upsertStaffResponsibility({
    id: body.id,
    title,
    purpose,
    expectedOutcome,
    estimatedMinutes,
    ownerUserId: body.ownerUserId ?? null,
    cadence: body.cadence ?? "weekdays",
    weekdayMask: body.weekdayMask,
    scope: body.scope,
    clientId: body.clientId,
    requiresApproval: body.requiresApproval,
    active: body.active,
    libraryKey,
  });

  return NextResponse.json({ success: true, responsibility });
}
