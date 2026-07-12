import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  completeTrainingLesson,
  updateTrainingChecklist,
} from "@/lib/training";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: {
    action?: string;
    pathSlug?: string;
    lessonSlug?: string;
    checklistCompletedIds?: string[];
    checklistTotal?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const pathSlug = body.pathSlug?.trim();
  const lessonSlug = body.lessonSlug?.trim();
  if (!pathSlug || !lessonSlug) {
    return NextResponse.json(
      { success: false, error: "pathSlug and lessonSlug are required." },
      { status: 400 },
    );
  }

  if (body.action === "complete") {
    const lesson = await completeTrainingLesson({
      pathSlug,
      lessonSlug,
      user: auth,
      checklistCompletedIds: body.checklistCompletedIds,
    });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Unable to complete." }, { status: 400 });
    }
    return NextResponse.json({ success: true, lesson });
  }

  if (body.action === "checklist") {
    const lesson = await updateTrainingChecklist({
      pathSlug,
      lessonSlug,
      user: auth,
      checklistCompletedIds: body.checklistCompletedIds ?? [],
      checklistTotal: body.checklistTotal ?? 1,
    });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Unable to update." }, { status: 400 });
    }
    return NextResponse.json({ success: true, lesson });
  }

  return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
}
