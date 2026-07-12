import { notFound } from "next/navigation";
import { TrainingLessonScreen } from "@/components/admin/training";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getTrainingLesson } from "@/lib/training";

export const dynamic = "force-dynamic";

export default async function TrainingLessonPage({
  params,
}: {
  params: Promise<{ pathSlug: string; lessonSlug: string }>;
}) {
  const { pathSlug, lessonSlug } = await params;
  const user = await getPayloadAdminUser();
  const lesson = await getTrainingLesson(
    decodeURIComponent(pathSlug),
    decodeURIComponent(lessonSlug),
    user,
  );
  if (!lesson) notFound();
  return <TrainingLessonScreen lesson={lesson} />;
}
