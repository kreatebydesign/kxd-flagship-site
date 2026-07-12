import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { runAvailabilityRegressionSuite } from "@/lib/scheduling/availability/validation/suite";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/calendar/availability/validation/suite
 * Permanent synthetic regression suite (no Google calls, no private data).
 */
export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const suite = runAvailabilityRegressionSuite();
  return NextResponse.json({
    ok: suite.failed === 0,
    suite,
    writeEnabled: false,
    phase: "25E",
  });
}
