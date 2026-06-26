import { redirect } from "next/navigation";
import { RequestsScreen } from "@/components/client-hq";
import { getPortalProjects, getPortalRequests } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalRequestsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

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
