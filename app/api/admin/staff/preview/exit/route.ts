import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { clearStaffPreviewCookie } from "@/lib/staff/preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const gated = await requireStaffCapabilityApi("admin.preview-staff");
  if (gated instanceof NextResponse) return gated;

  await clearStaffPreviewCookie();

  return NextResponse.json({
    success: true,
    redirectTo: "/admin/operations/staff/oversight",
  });
}
