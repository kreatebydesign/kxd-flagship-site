import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { buildDeterministicStaffGuidance } from "@/lib/staff/guidance";
import { loadStaffToday } from "@/lib/staff/load";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.guidance");
  if (gated instanceof NextResponse) return gated;

  let body: { promptId?: string; pagePath?: string; workId?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const promptId = typeof body.promptId === "string" ? body.promptId : "next";
  const pagePath =
    typeof body.pagePath === "string" ? body.pagePath : "/admin/operations/staff";

  let today = null;
  try {
    today = await loadStaffToday(gated.user);
  } catch {
    today = null;
  }

  const guidance = buildDeterministicStaffGuidance({
    actor: gated.actor,
    request: {
      promptId,
      pagePath,
      workId: typeof body.workId === "number" ? body.workId : null,
    },
    today,
  });

  return NextResponse.json({ success: true, guidance });
}
