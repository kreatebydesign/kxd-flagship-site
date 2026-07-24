import { notFound } from "next/navigation";
import { TrainingLessonScreen } from "@/components/admin/training";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getTrainingLesson } from "@/lib/training";
import { isRestrictedStaff, staffActorFromUser } from "@/lib/staff";

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
  const actor = staffActorFromUser(user);
  const shellVariant =
    actor && isRestrictedStaff(actor) ? ("staff" as const) : ("full" as const);
  return <TrainingLessonScreen lesson={lesson} shellVariant={shellVariant} />;
}
