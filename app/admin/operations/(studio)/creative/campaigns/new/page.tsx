import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { CampaignForm, type ClientOption, type ProjectOption } from "@/components/admin/creative/CampaignForm";

export const metadata: Metadata = {
  title: "New Campaign · KXD Creative Engine",
  robots: { index: false, follow: false },
};

export default async function NewCampaignPage() {
  let clients:  ClientOption[]  = [];
  let projects: ProjectOption[] = [];

  try {
    const payload = await getPayload({ config });
    const [clientsR, projectsR] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "clients" as any, limit: 200, depth: 0, sort: "name", where: { status: { in: ["active", "prospect"] } } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "client-projects" as any, limit: 300, depth: 0, sort: "projectName", where: { status: { not_in: ["archived"] } } }),
    ]);
    if (clientsR.status === "fulfilled")
      clients  = (clientsR.value.docs  as Array<Record<string, unknown>>).map(d => ({ id: d.id as number, name: d.name as string }));
    if (projectsR.status === "fulfilled")
      projects = (projectsR.value.docs as Array<Record<string, unknown>>).map(d => ({ id: d.id as number, projectName: (d.projectName as string) || "Untitled", client: typeof d.client === "number" ? d.client : null }));
  } catch { /* Payload unavailable — form renders with empty dropdowns */ }

  return <CampaignForm clients={clients} projects={projects} />;
}
