import { KxdBadge, KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate, projectProgress, statusLabel } from "@/lib/portal/format";

export function ProjectsScreen({ projects }: { projects: PortalDoc[] }) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Work"
        title="Projects"
        lead="Active delivery, milestones, and launch targets for your engagement."
      />

      {projects.length === 0 ? (
        <KxdEmptyState
          title="No projects yet"
          description="Your KXD team will add projects as delivery begins."
        />
      ) : (
        <div className="kxd-os-ops-list">
          {projects.map((project) => {
            const progress = projectProgress(project.status as string);
            return (
              <article key={project.id as number} className="kxd-os-card">
                <div className="kxd-os-ops-list__head">
                  <h2 className="kxd-os-card__title">{String(project.projectName)}</h2>
                  <KxdBadge variant="status">{statusLabel(project.status as string)}</KxdBadge>
                </div>
                <p className="kxd-os-meta">
                  Start {fmtPortalDate(project.startDate as string)} · Target{" "}
                  {fmtPortalDate(project.targetLaunchDate as string)}
                </p>
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", gap: "2px", height: "2px" }}>
                    <div style={{ flex: progress, background: "var(--kxd-os-gold)" }} />
                    <div
                      style={{ flex: 100 - progress, background: "var(--kxd-os-border-divider)" }}
                    />
                  </div>
                  <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
                    {progress}% complete
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </KxdPage>
  );
}
