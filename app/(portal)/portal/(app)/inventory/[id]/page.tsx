import { redirect, notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { InventoryEditor } from "@/components/ces/modules/inventory";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { getInventoryVehicleForClient } from "@/lib/inventory/server";
import { toPublicInventoryVehicle } from "@/lib/inventory/public-map";

export const dynamic = "force-dynamic";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "inventory");

  const { id } = await params;
  const vehicleId = Number(id);
  if (!Number.isFinite(vehicleId)) notFound();

  const payload = await getPayload({ config });
  const vehicle = await getInventoryVehicleForClient(
    payload,
    session.clientId,
    vehicleId,
  );
  if (!vehicle) notFound();

  return (
    <InventoryEditor
      profile={profile}
      mode="edit"
      initial={vehicle}
      initialPreview={toPublicInventoryVehicle(vehicle)}
    />
  );
}
