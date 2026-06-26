import { redirect } from "next/navigation";
import { ResourcesScreen } from "@/components/client-hq";
import { getPortalResourceCategories } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalResourcesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const categories = getPortalResourceCategories();
  return <ResourcesScreen categories={categories} />;
}
