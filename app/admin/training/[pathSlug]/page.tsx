import { notFound } from "next/navigation";
import { TrainingPathScreen } from "@/components/admin/training";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getTrainingPath } from "@/lib/training";

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
  return <TrainingPathScreen path={path} />;
}
