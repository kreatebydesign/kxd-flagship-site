import { ActivitiesScreen } from "@/components/admin/sales/ActivitiesScreen";
import { getSalesActivities } from "@/lib/sales/activities";

export const dynamic = "force-dynamic";

export default async function SalesActivitiesPage() {
  const activities = await getSalesActivities();
  return <ActivitiesScreen activities={activities} />;
}
