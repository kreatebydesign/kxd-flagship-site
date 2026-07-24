import { TrainingDashboard } from "@/components/admin/training";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getTrainingDashboard } from "@/lib/training";
import { isRestrictedStaff, staffActorFromUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const user = await getPayloadAdminUser();
  const data = await getTrainingDashboard(user);
  const actor = staffActorFromUser(user);
  const shellVariant =
    actor && isRestrictedStaff(actor) ? ("staff" as const) : ("full" as const);
  return <TrainingDashboard data={data} shellVariant={shellVariant} />;
}
