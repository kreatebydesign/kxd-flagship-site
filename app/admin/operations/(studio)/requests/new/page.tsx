/**
 * /admin/operations/requests/new
 * Internal client request intake page.
 * Server component — fetches clients + projects from Payload, renders client form.
 * Inherits layout from app/admin/operations/layout.tsx (fonts, CSS vars, html/body).
 */
import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { NewRequestForm, type ClientOption, type ProjectOption } from "@/components/admin/NewRequestForm";

export const metadata: Metadata = {
  title: "New Request · KXD OS",
  description: "Internal client request intake.",
  robots: { index: false, follow: false },
};

export default async function NewRequestPage() {
  let clients:  ClientOption[]  = [];
  let projects: ProjectOption[] = [];

  try {
    const payload = await getPayload({ config });

    const [clientsRes, projectsRes] = await Promise.allSettled([
      // Active clients only, sorted alphabetically
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "clients" as any,
        limit: 200,
        depth: 0,
        sort: "name",
        where: { status: { in: ["active", "prospect"] } },
      }),
      // All projects not archived — for project dropdown
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-projects" as any,
        limit: 300,
        depth: 0,
        sort: "projectName",
        where: { status: { not_in: ["archived"] } },
      }),
    ]);

    if (clientsRes.status === "fulfilled") {
      clients = (clientsRes.value.docs as Array<Record<string, unknown>>).map(d => ({
        id:   d.id   as number,
        name: d.name as string,
      }));
    }

    if (projectsRes.status === "fulfilled") {
      projects = (projectsRes.value.docs as Array<Record<string, unknown>>).map(d => ({
        id:          d.id          as number,
        projectName: (d.projectName as string) || "Untitled Project",
        client:      typeof d.client === "number" ? d.client : null,
      }));
    }
  } catch {
    // Payload unavailable — form renders with empty dropdowns + graceful note
  }

  return <NewRequestForm clients={clients} projects={projects} />;
}
