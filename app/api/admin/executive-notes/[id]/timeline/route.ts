import { NextResponse } from "next/server";
import { convertNoteToTimeline } from "@/lib/executive-notes/engine";
import type { TimelinePromotionType } from "@/lib/executive-notes/types";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<TimelinePromotionType>([
  "meeting-summary",
  "decision",
  "major-milestone",
  "opportunity",
  "follow-up",
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as { promotionType?: TimelinePromotionType };
  const promotionType = body.promotionType ?? "decision";

  if (!VALID_TYPES.has(promotionType)) {
    return NextResponse.json({ success: false, error: "Invalid promotion type." }, { status: 400 });
  }

  const result = await convertNoteToTimeline(Number(id), promotionType);
  if (!result) {
    return NextResponse.json({ success: false, error: "Note not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    timelineEventId: result.timelineEventId,
    href: `/admin/operations/timeline`,
  });
}
