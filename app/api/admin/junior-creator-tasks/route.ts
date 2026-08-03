/**
 * Admin Assigned Tasks API for Junior Creators.
 * GET  — list tasks (optional juniorCreatorUserId filter)
 * POST — create task
 * PATCH — update / reassign / archive / cancel / complete
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  createJuniorTask,
  isJuniorTaskPriority,
  isJuniorTaskStatus,
  isJuniorTasksSchemaUnavailableError,
  JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE,
  listAllJuniorTasks,
  updateJuniorTaskAsAdmin,
} from "@/lib/junior-creators/tasks";

export const dynamic = "force-dynamic";

function schemaUnavailableResponse() {
  return NextResponse.json(
    { success: false, error: JUNIOR_TASKS_SCHEMA_UNAVAILABLE_MESSAGE },
    { status: 503 },
  );
}

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const juniorIdRaw = req.nextUrl.searchParams.get("juniorCreatorUserId");
    const juniorCreatorUserId = juniorIdRaw ? Number(juniorIdRaw) : undefined;
    const includeArchived =
      req.nextUrl.searchParams.get("includeArchived") === "1";

    const tasks = await listAllJuniorTasks({
      juniorCreatorUserId:
        juniorCreatorUserId && Number.isFinite(juniorCreatorUserId)
          ? juniorCreatorUserId
          : undefined,
      includeArchived,
    });

    return NextResponse.json({ success: true, tasks });
  } catch (err) {
    if (isJuniorTasksSchemaUnavailableError(err)) {
      return NextResponse.json({ success: true, tasks: [] });
    }
    console.error("[KXD] Admin list junior tasks failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load tasks." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const instructions = String(body.instructions ?? "").trim();
    const clientLabel = String(body.clientLabel ?? "").trim();
    const juniorCreatorUserId = Number(body.juniorCreatorUserId);
    const priorityRaw = String(body.priority ?? "medium");
    const estimatedMinutes = Number(body.estimatedMinutes);
    const dueAt = body.dueAt ? String(body.dueAt) : null;
    const relatedLink = body.relatedLink ? String(body.relatedLink) : null;

    if (!title || !instructions || !clientLabel) {
      return NextResponse.json(
        {
          success: false,
          error: "title, instructions, and clientLabel are required.",
        },
        { status: 400 },
      );
    }
    if (!juniorCreatorUserId || !Number.isFinite(juniorCreatorUserId)) {
      return NextResponse.json(
        { success: false, error: "juniorCreatorUserId is required." },
        { status: 400 },
      );
    }
    if (!isJuniorTaskPriority(priorityRaw)) {
      return NextResponse.json(
        { success: false, error: "Invalid priority." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1) {
      return NextResponse.json(
        { success: false, error: "estimatedMinutes must be at least 1." },
        { status: 400 },
      );
    }

    const task = await createJuniorTask({
      title,
      instructions,
      clientLabel,
      juniorCreatorUserId,
      priority: priorityRaw,
      estimatedMinutes,
      dueAt,
      relatedLink,
    });

    return NextResponse.json({ success: true, task });
  } catch (err) {
    if (isJuniorTasksSchemaUnavailableError(err)) {
      return schemaUnavailableResponse();
    }
    console.error("[KXD] Admin create junior task failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create task." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const taskId = Number(body.taskId);
    const action = String(body.action ?? "update");

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "taskId is required." },
        { status: 400 },
      );
    }

    if (action === "archive") {
      const task = await updateJuniorTaskAsAdmin(taskId, { archived: true });
      return NextResponse.json({ success: true, task });
    }

    if (action === "cancel") {
      const task = await updateJuniorTaskAsAdmin(taskId, {
        status: "cancelled",
      });
      return NextResponse.json({ success: true, task });
    }

    if (action === "complete") {
      const task = await updateJuniorTaskAsAdmin(taskId, {
        status: "completed",
      });
      return NextResponse.json({ success: true, task });
    }

    if (action === "reassign") {
      const juniorCreatorUserId = Number(body.juniorCreatorUserId);
      if (!juniorCreatorUserId) {
        return NextResponse.json(
          { success: false, error: "juniorCreatorUserId is required." },
          { status: 400 },
        );
      }
      const task = await updateJuniorTaskAsAdmin(taskId, {
        juniorCreatorUser: juniorCreatorUserId,
        status: "assigned",
      });
      return NextResponse.json({ success: true, task });
    }

    // Generic field update
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.instructions !== undefined) {
      data.instructions = String(body.instructions).trim();
    }
    if (body.clientLabel !== undefined) {
      data.clientLabel = String(body.clientLabel).trim();
    }
    if (body.priority !== undefined) {
      const p = String(body.priority);
      if (!isJuniorTaskPriority(p)) {
        return NextResponse.json(
          { success: false, error: "Invalid priority." },
          { status: 400 },
        );
      }
      data.priority = p;
    }
    if (body.estimatedMinutes !== undefined) {
      const mins = Number(body.estimatedMinutes);
      if (!Number.isFinite(mins) || mins < 1) {
        return NextResponse.json(
          { success: false, error: "estimatedMinutes must be at least 1." },
          { status: 400 },
        );
      }
      data.estimatedMinutes = Math.round(mins);
    }
    if (body.dueAt !== undefined) {
      data.dueAt = body.dueAt ? String(body.dueAt) : null;
    }
    if (body.relatedLink !== undefined) {
      data.relatedLink = body.relatedLink
        ? String(body.relatedLink).trim()
        : null;
    }
    if (body.completionNotes !== undefined) {
      data.completionNotes = body.completionNotes
        ? String(body.completionNotes).trim()
        : null;
    }
    if (body.status !== undefined) {
      const s = String(body.status);
      if (!isJuniorTaskStatus(s)) {
        return NextResponse.json(
          { success: false, error: "Invalid status." },
          { status: 400 },
        );
      }
      data.status = s;
    }
    if (body.juniorCreatorUserId !== undefined) {
      data.juniorCreatorUser = Number(body.juniorCreatorUserId);
    }
    if (body.archived !== undefined) {
      data.archived = Boolean(body.archived);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update." },
        { status: 400 },
      );
    }

    const task = await updateJuniorTaskAsAdmin(taskId, data);
    return NextResponse.json({ success: true, task });
  } catch (err) {
    if (isJuniorTasksSchemaUnavailableError(err)) {
      return schemaUnavailableResponse();
    }
    console.error("[KXD] Admin update junior task failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update task." },
      { status: 500 },
    );
  }
}
