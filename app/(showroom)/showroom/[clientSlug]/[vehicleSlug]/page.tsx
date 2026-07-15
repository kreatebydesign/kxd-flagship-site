import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { ShowroomVehicleDetail } from "@/components/showroom/ShowroomVehicleDetail";
import {
  getPublicInventoryVehicle,
  resolvePublicInventoryClient,
} from "@/lib/inventory/server";
import {
  buildInventorySeo,
  buildInventoryVehicleJsonLd,
} from "@/lib/inventory/presentation";
import { absoluteUrl, buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientSlug: string; vehicleSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientSlug, vehicleSlug } = await params;
  const payload = await getPayload({ config });
  const client = await resolvePublicInventoryClient(payload, clientSlug);
  const vehicle = client
    ? await getPublicInventoryVehicle(payload, client.slug, vehicleSlug)
    : null;

  if (!client || !vehicle) {
    return buildMetadata({
      title: "Vehicle",
      path: `/showroom/${clientSlug}/${vehicleSlug}`,
      noIndex: true,
    });
  }

  const seo = buildInventorySeo(vehicle, client.name);
  return buildMetadata({
    title: seo.title,
    description: seo.description,
    path: `/showroom/${client.slug}/${vehicle.slug}`,
    ogImage: seo.ogImageUrl ?? undefined,
  });
}

export default async function ShowroomVehiclePage({ params }: Props) {
  const { clientSlug, vehicleSlug } = await params;
  const payload = await getPayload({ config });
  const client = await resolvePublicInventoryClient(payload, clientSlug);
  if (!client) notFound();

  const vehicle = await getPublicInventoryVehicle(
    payload,
    client.slug,
    vehicleSlug,
  );
  if (!vehicle) notFound();

  const pageUrl = absoluteUrl(`/showroom/${client.slug}/${vehicle.slug}`);
  const jsonLd = buildInventoryVehicleJsonLd({
    vehicle,
    clientName: client.name,
    pageUrl,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShowroomVehicleDetail client={client} vehicle={vehicle} />
    </>
  );
}
