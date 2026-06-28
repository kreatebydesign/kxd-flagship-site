import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { assignTask } from "@/lib/client-tasks";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const userId = body.userId != null ? Number(body.userId) : null;

  const result = await assignTask(Number(id), userId);
  return NextResponse.json(result);
}
