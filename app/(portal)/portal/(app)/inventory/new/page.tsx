import { redirect } from "next/navigation";
import { InventoryEditor } from "@/components/ces/modules/inventory";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function InventoryNewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "inventory");

  return <InventoryEditor profile={profile} mode="create" />;
}
