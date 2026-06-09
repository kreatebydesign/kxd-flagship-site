import Link from "next/link";
import { PRIMARY_PROJECTS } from "@/lib/projects";
import { ProjectCard } from "@/components/ui/ProjectCard";

export function CaseStudiesSection() {
  const [flagship, ...others] = PRIMARY_PROJECTS;

  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-base)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        {/* Header */}
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
            Across ambitious brands, motorsports, hospitality, and growth-focused companies.
          </p>
        </div>

        {/* Featured grid */}
        <div className="grid gap-4 lg:grid-cols-12">
          {flagship ? (
            <div className="lg:col-span-7">
              <ProjectCard project={flagship} featured index={0} priority />
            </div>
          ) : null}

          <div className="flex flex-col gap-4 lg:col-span-5">
            {others[0] ? (
              <ProjectCard project={others[0]} index={1} className="flex-1" />
            ) : null}
            {others[1] ? (
              <ProjectCard project={others[1]} index={2} className="flex-1" />
            ) : null}
          </div>
        </div>

        {others[2] ? (
          <div className="mt-4">
            <ProjectCard project={others[2]} index={3} />
          </div>
        ) : null}

        {/* Footer link */}
        <div
          className="mt-10 flex items-center justify-between border-t pt-7"
          style={{ borderColor: "var(--kxd-border-white)" }}
        >
          <p className="kxd-label">{PRIMARY_PROJECTS.length} projects</p>
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
