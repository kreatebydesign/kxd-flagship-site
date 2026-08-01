import { redirect } from "next/navigation";
import { RequestsScreen } from "@/components/client-hq";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalProjects, getPortalRequests } from "@/lib/portal/data";
import { isBatchGClientHqSurfaceAvailable } from "@/lib/portal/requests-files-reports";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalRequestsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  if (!isBatchGClientHqSurfaceAvailable("requests", profile)) {
    redirect("/portal");
  }

  const [requests, projects] = await Promise.all([
    getPortalRequests(session),
    getPortalProjects(session),
  ]);

  const projectOptions = projects.map((p) => ({
    id: p.id as number,
    name: String(p.projectName ?? "Project"),
  }));

  return <RequestsScreen requests={requests} projectOptions={projectOptions} />;
}
