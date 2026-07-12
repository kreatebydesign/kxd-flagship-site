import { TrainingDashboard } from "@/components/admin/training";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getTrainingDashboard } from "@/lib/training";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const user = await getPayloadAdminUser();
  const data = await getTrainingDashboard(user);
  return <TrainingDashboard data={data} />;
}
