import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import { createExecutiveNote } from "@/lib/executive-notes/engine";

export const dynamic = "force-dynamic";

type TimelineEventBody = {
  action: "timeline-event";
  clientId: number;
  title: string;
  summary?: string;
  details?: string;
  author?: string;
};

type NoteBody = {
  action: "note";
  clientId: number;
  title: string;
  summary?: string;
  author?: string;
};

type MeetingBody = {
  action: "meeting";
  clientId: number;
  summary: string;
  meetingDate?: string;
  satisfaction?: string;
};

type ActivityBody = TimelineEventBody | NoteBody | MeetingBody;

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as ActivityBody;

    if (!body.clientId || !body.action) {
      return NextResponse.json(
        { success: false, error: "clientId and action are required." },
        { status: 400 },
      );
    }

    if (body.action === "timeline-event") {
      if (!body.title?.trim()) {
        return NextResponse.json(
          { success: false, error: "Title is required." },
          { status: 400 },
        );
      }

      const sourceId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await publishClientActivity({
        clientId: body.clientId,
        sourceModule: "Client Command",
        sourceType: "manual-timeline",
        sourceId,
        eventType: "timeline.manual",
        title: body.title.trim(),
        summary: body.summary?.trim(),
        details: body.details?.trim() ?? body.summary?.trim(),
        author: body.author?.trim(),
      });

      return NextResponse.json({
        success: true,
        created: result.created,
        skipped: result.skipped,
        eventId: result.id,
      });
    }

    if (body.action === "note") {
      if (!body.title?.trim()) {
        return NextResponse.json(
          { success: false, error: "Title is required." },
          { status: 400 },
        );
      }

      const note = await createExecutiveNote({
        clientId: body.clientId,
        title: body.title.trim(),
        summary: body.summary?.trim(),
        author: body.author?.trim(),
        noteType: "internal",
      });

      return NextResponse.json({ success: true, noteId: note.id });
    }

    if (body.action === "meeting") {
      if (!body.summary?.trim()) {
        return NextResponse.json(
          { success: false, error: "Meeting summary is required." },
          { status: 400 },
        );
      }

      const payload = await getPayload({ config });
      const meeting = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "success-check-ins" as any,
        data: {
          client: body.clientId,
          summary: body.summary.trim(),
          meetingDate: body.meetingDate ?? new Date().toISOString(),
          satisfaction: body.satisfaction,
          completed: true,
        },
        overrideAccess: true,
      });

      return NextResponse.json({ success: true, meetingId: meeting.id });
    }

    return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Activity publish failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
