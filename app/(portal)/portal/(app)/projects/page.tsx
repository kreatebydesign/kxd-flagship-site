import { redirect } from "next/navigation";
import { getPortalProjects } from "@/lib/portal/data";
import { fmtPortalDate, projectProgress, PROJECT_STATUS_COLOR, statusLabel } from "@/lib/portal/format";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalProjectsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const projects = await getPortalProjects(session);

  return (
    <div className="kxd-container py-10 lg:py-14">
      <div className="mb-8">
        <p className="kxd-eyebrow" style={{ opacity: 0.55 }}>Projects</p>
        <h1 className="mt-2 font-serif font-light" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: "var(--kxd-cream)" }}>
          Your Projects
        </h1>
      </div>

      {projects.length === 0 ? (
        <p className="font-sans" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.3)" }}>
          No projects on record yet.
        </p>
      ) : (
        <div className="space-y-px" style={{ border: "1px solid var(--kxd-border-white)" }}>
          {projects.map((project) => {
            const progress = projectProgress(project.status as string);
            const status = project.status as string;
            return (
              <div
                key={project.id as number}
                style={{ background: "var(--kxd-black-elevated)", padding: "1.5rem 1.75rem" }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-serif font-light" style={{ fontSize: "1.125rem", color: "var(--kxd-cream)" }}>
                      {project.projectName as string}
                    </h2>
                    <p className="mt-1 font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.14em", color: PROJECT_STATUS_COLOR[status] ?? "rgba(255,255,255,0.4)" }}>
                      {statusLabel(status)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}>
                      Start {fmtPortalDate(project.startDate as string)}
                    </p>
                    <p className="mt-1 font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}>
                      Target {fmtPortalDate(project.targetLaunchDate as string)}
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex gap-1">
                    <div style={{ flex: progress, height: "2px", background: "var(--kxd-gold)" }} />
                    <div style={{ flex: 100 - progress, height: "2px", background: "rgba(255,255,255,0.08)" }} />
                  </div>
                  <p className="mt-2 font-sans" style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.25)" }}>
                    {progress}% complete
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
