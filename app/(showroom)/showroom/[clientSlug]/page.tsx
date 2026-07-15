import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { ShowroomListing } from "@/components/showroom/ShowroomListing";
import {
  listPublicInventory,
  resolvePublicInventoryClient,
} from "@/lib/inventory/server";
import type { InventoryGroup } from "@/lib/inventory/types";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientSlug: string }>;
  searchParams: Promise<{ group?: string }>;
};

const GROUPS = new Set<InventoryGroup>(["new", "used", "coming_soon"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientSlug } = await params;
  const payload = await getPayload({ config });
  const client = await resolvePublicInventoryClient(payload, clientSlug);
  if (!client) {
    return buildMetadata({
      title: "Showroom",
      description: "Vehicle inventory",
      path: `/showroom/${clientSlug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${client.name} Inventory`,
    description: `Curated vehicle inventory from ${client.name}.`,
    path: `/showroom/${client.slug}`,
  });
}

export default async function ShowroomClientPage({ params, searchParams }: Props) {
  const { clientSlug } = await params;
  const { group: groupParam } = await searchParams;
  const payload = await getPayload({ config });
  const client = await resolvePublicInventoryClient(payload, clientSlug);
  if (!client) notFound();

  const group =
    groupParam && GROUPS.has(groupParam as InventoryGroup)
      ? (groupParam as InventoryGroup)
      : undefined;

  const vehicles = await listPublicInventory(payload, client.slug, { group });

  return (
    <ShowroomListing
      clientSlug={client.slug}
      clientName={client.name}
      vehicles={vehicles}
      group={group ?? "all"}
    />
  );
}
