import { redirect } from "next/navigation";
import { InventoryLanding } from "@/components/ces/modules/inventory";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { getPayload } from "payload";
import config from "@payload-config";
import { listInventoryForClient } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "inventory");

  const payload = await getPayload({ config });
  const vehicles = await listInventoryForClient(payload, session.clientId);

  return <InventoryLanding profile={profile} vehicles={vehicles} />;
}
