import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getTrainingPermissions, seedTrainingCatalog } from "@/lib/training";

export const dynamic = "force-dynamic";

/** Explicit seed — never auto-runs from the UI without admin. */
export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const permissions = getTrainingPermissions(auth);
  if (!permissions.canManage) {
    return NextResponse.json({ success: false, error: "Admin only." }, { status: 403 });
  }

  const result = await seedTrainingCatalog();
  return NextResponse.json({ success: true, result });
}
