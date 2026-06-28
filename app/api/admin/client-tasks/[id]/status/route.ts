import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { updateTaskStatus } from "@/lib/client-tasks";
import type { TaskStatus } from "@/lib/client-tasks/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const status = body.status as TaskStatus;

  if (!status) {
    return NextResponse.json({ success: false, error: "status required" }, { status: 400 });
  }

  const result = await updateTaskStatus(
    Number(id),
    status,
    body.blockedReason ? String(body.blockedReason) : undefined,
  );

  return NextResponse.json(result);
}
