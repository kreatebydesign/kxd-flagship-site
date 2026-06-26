import { redirect } from "next/navigation";
import { ProjectsScreen } from "@/components/client-hq";
import { getPortalProjects } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalProjectsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const projects = await getPortalProjects(session);
  return <ProjectsScreen projects={projects} />;
}
