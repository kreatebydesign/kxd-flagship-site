import { notFound } from "next/navigation";
import { TrainingPathScreen } from "@/components/admin/training";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getTrainingPath } from "@/lib/training";
import { isRestrictedStaff, staffActorFromUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function TrainingPathPage({
  params,
}: {
  params: Promise<{ pathSlug: string }>;
}) {
  const { pathSlug } = await params;
  const user = await getPayloadAdminUser();
  const path = await getTrainingPath(decodeURIComponent(pathSlug), user);
  if (!path) notFound();
  const actor = staffActorFromUser(user);
  const shellVariant =
    actor && isRestrictedStaff(actor) ? ("staff" as const) : ("full" as const);
  return <TrainingPathScreen path={path} shellVariant={shellVariant} />;
}
