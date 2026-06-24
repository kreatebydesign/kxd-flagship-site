import Link from "next/link";
import { PROJECTS, type ProjectItem } from "@/lib/projects";
import { HOMEPAGE_CASE_STUDY_SLUGS } from "@/lib/homepage/work-visuals";
import { ProjectCard } from "@/components/ui/ProjectCard";

function projectBySlug(slug: string): ProjectItem | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export function CaseStudiesSection() {
  const featured = projectBySlug(HOMEPAGE_CASE_STUDY_SLUGS.featured);
  const secondary = HOMEPAGE_CASE_STUDY_SLUGS.secondary
    .map((slug) => projectBySlug(slug))
    .filter((p): p is ProjectItem => p !== undefined);

  const projectCount = secondary.length + (featured ? 1 : 0);

  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-base)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="kxd-eyebrow">Selected Work</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)" }}
            >
              Proof over promises.
            </h2>
          </div>
          <p
            className="kxd-body-sm lg:text-right"
            style={{ maxWidth: "24rem" }}
          >
            Website rebuilds, brand systems, and operational platforms for
            ambitious brands across motorsports and hospitality.
          </p>
        </div>

        <div className="grid gap-px lg:grid-cols-12">
          {featured ? (
            <div className="lg:col-span-8">
              <ProjectCard project={featured} featured index={0} priority />
            </div>
          ) : null}

          {secondary.length > 0 ? (
            <div className="flex flex-col gap-px lg:col-span-4">
              {secondary.map((project, i) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={i + 1}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="mt-10 flex items-center justify-between border-t pt-7"
          style={{ borderColor: "var(--kxd-border-white)" }}
        >
          <p className="kxd-label">{projectCount} featured projects</p>
          <Link
            href="/work"
            className="kxd-ui-label inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
          >
            View All Work
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
