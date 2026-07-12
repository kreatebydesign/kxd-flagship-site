import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  planWorkForDate,
  planWorkForToday,
  planWorkForTomorrow,
  removeWorkFromPlan,
} from "@/lib/work/planning";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/work/[id]/plan
 * Body: { action: "today" | "tomorrow" | "remove" | "date", date?: "YYYY-MM-DD" }
 * Never mutates dueDate.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const workId = Number.parseInt(id, 10);
  if (!Number.isFinite(workId)) {
    return NextResponse.json({ ok: false, error: "Invalid work id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    date?: string;
  };
  const actorEmail = typeof auth.email === "string" ? auth.email : undefined;
  const action = body.action ?? "today";

  try {
    let work;
    if (action === "remove") {
      work = await removeWorkFromPlan(workId, actorEmail);
    } else if (action === "tomorrow") {
      work = await planWorkForTomorrow(workId, actorEmail);
    } else if (action === "date") {
      if (!body.date) {
        return NextResponse.json(
          { ok: false, error: "date is required for action=date." },
          { status: 400 },
        );
      }
      work = await planWorkForDate(workId, body.date, actorEmail);
    } else {
      work = await planWorkForToday(workId, actorEmail);
    }

    return NextResponse.json({ ok: true, work });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update plan.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
