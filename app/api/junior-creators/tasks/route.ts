/**
 * GET  /api/junior-creators/tasks — list tasks for authenticated junior
 * PATCH /api/junior-creators/tasks — update status / notes on own task
 */
import { NextRequest, NextResponse } from "next/server";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import {
  isJuniorTaskStatus,
  isJuniorTasksSchemaUnavailableError,
  JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE,
  listTasksForJunior,
  updateTaskAsJunior,
} from "@/lib/junior-creators/tasks";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const tasks = await listTasksForJunior(session.juniorCreatorUserId);
    return NextResponse.json({ ok: true, tasks });
  } catch (err) {
    if (isJuniorTasksSchemaUnavailableError(err)) {
      return NextResponse.json({ ok: true, tasks: [] });
    }
    console.error("[KXD Junior Creators] List tasks failed:", err);
    return NextResponse.json({ ok: false, message: "Failed to load tasks." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const taskId = Number(body.taskId);
    if (!taskId) {
      return NextResponse.json(
        { ok: false, message: "taskId is required." },
        { status: 400 },
      );
    }

    const statusRaw =
      body.status !== undefined && body.status !== null
        ? String(body.status)
        : undefined;
    if (statusRaw !== undefined && !isJuniorTaskStatus(statusRaw)) {
      return NextResponse.json(
        { ok: false, message: "Invalid status." },
        { status: 400 },
      );
    }

    const completionNotes =
      body.completionNotes !== undefined
        ? String(body.completionNotes)
        : undefined;

    const task = await updateTaskAsJunior({
      taskId,
      juniorCreatorUserId: session.juniorCreatorUserId,
      status: statusRaw,
      completionNotes,
    });

    return NextResponse.json({ ok: true, task });
  } catch (err) {
    if (isJuniorTasksSchemaUnavailableError(err)) {
      return NextResponse.json(
        { ok: false, message: JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }
    if (err instanceof Error) {
      if (err.message === "JUNIOR_TASK_FORBIDDEN") {
        return NextResponse.json(
          { ok: false, message: "You cannot update this task." },
          { status: 403 },
        );
      }
      if (err.message === "JUNIOR_TASK_STATUS_FORBIDDEN") {
        return NextResponse.json(
          {
            ok: false,
            message:
              "You can only set In Progress, Ready for Review, or Blocked.",
          },
          { status: 403 },
        );
      }
      if (err.message === "JUNIOR_TASK_LOCKED") {
        return NextResponse.json(
          { ok: false, message: "This task is already completed." },
          { status: 409 },
        );
      }
    }
    console.error("[KXD Junior Creators] Update task failed:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to update task." },
      { status: 500 },
    );
  }
}
