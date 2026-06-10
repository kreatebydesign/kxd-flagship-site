import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { FlyerForm, type ClientOption, type ProjectOption, type CampaignOption } from "@/components/admin/creative/FlyerForm";

export const metadata: Metadata = {
  title: "New Flyer Request · KXD Creative Engine",
  robots: { index: false, follow: false },
};

export default async function NewFlyerPage() {
  let clients:   ClientOption[]   = [];
  let projects:  ProjectOption[]  = [];
  let campaigns: CampaignOption[] = [];

  try {
    const payload = await getPayload({ config });
    const [clientsR, projectsR, campaignsR] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "clients" as any, limit: 200, depth: 0, sort: "name", where: { status: { in: ["active", "prospect"] } } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "client-projects" as any, limit: 300, depth: 0, sort: "projectName", where: { status: { not_in: ["archived"] } } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "creative-campaigns" as any, limit: 200, depth: 0, sort: "campaignTitle", where: { status: { not_in: ["archived"] } } }),
    ]);
    if (clientsR.status === "fulfilled")
      clients   = (clientsR.value.docs   as Array<Record<string, unknown>>).map(d => ({ id: d.id as number, name: d.name as string }));
    if (projectsR.status === "fulfilled")
      projects  = (projectsR.value.docs  as Array<Record<string, unknown>>).map(d => ({ id: d.id as number, projectName: (d.projectName as string) || "Untitled", client: typeof d.client === "number" ? d.client : null }));
    if (campaignsR.status === "fulfilled")
      campaigns = (campaignsR.value.docs as Array<Record<string, unknown>>).map(d => ({ id: d.id as number, campaignTitle: (d.campaignTitle as string) || "Untitled", client: typeof d.client === "number" ? d.client : null }));
  } catch { /* Payload unavailable */ }

  return <FlyerForm clients={clients} projects={projects} campaigns={campaigns} />;
}
