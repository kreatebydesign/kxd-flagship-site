import Image from "next/image";
import Link from "next/link";
import type { ProjectItem } from "@/lib/projects";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: ProjectItem;
  /**
   * featured — used for the lead project (top of /work).
   * Renders a portrait/square on mobile then widens to 16/9 at sm+.
   * All other cards use aspect-[4/3] at every breakpoint.
   */
  featured?: boolean;
  className?: string;
  index?: number;
  priority?: boolean;
};

export function ProjectCard({
  project,
  featured,
  className,
  index = 0,
  priority = false,
}: ProjectCardProps) {
  return (
    <article className={cn("kxd-case-card group", className)} id={project.slug}>
      {/*
       * Image area.
       * - aspect-[4/3] on all viewports for default cards (consistent, no height conflicts)
       * - featured: aspect-[4/3] on mobile for consistency, sm:aspect-[16/9] desktop
       * - Classes are inlined (not variables) so Tailwind JIT always includes them.
       */}
      <Link
        href={`/work/${project.slug}`}
        className={cn(
          "kxd-case-card__image-wrap block",
          featured ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-[4/3]",
        )}
      >
        {project.image ? (
          <>
            {project.imageContain ? (
              <div className="absolute inset-0" style={{ background: "#050505" }} />
            ) : null}
            <Image
              src={project.image}
              alt={project.title}
              fill
              priority={priority}
              className={project.imageContain ? "object-contain" : "object-cover"}
              style={{
                objectPosition: project.imageContain
                  ? "center center"
                  : (project.imagePosition ?? "center"),
              }}
              sizes={
                featured
                  ? "100vw"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              }
            />
          </>
        ) : (
          /* Archive panel — shown when imagery is pending or unavailable */
          <div className="kxd-archive-panel absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            {project.logo ? (
              <Image
                src={project.logo}
                alt=""
                width={160}
                height={64}
                className="relative z-[1] mb-4 h-12 w-auto max-w-[52%] object-contain brightness-0 invert"
                style={{ opacity: 0.5 }}
              />
            ) : (
              <p
                className="relative z-[1] font-serif font-light uppercase"
                style={{
                  fontSize: "clamp(0.875rem, 1.5vw, 1.0625rem)",
                  letterSpacing: "0.1em",
                  color: "var(--kxd-cream-muted)",
                  opacity: 0.4,
                }}
              >
                {project.title}
              </p>
            )}
            {project.imageryPending ? (
              <p
                className="kxd-label relative z-[1] mt-4"
                style={{ fontSize: "0.5rem", color: "var(--kxd-gold-deep)", letterSpacing: "0.18em" }}
              >
                {project.imageryLabel ?? "Visual Archive in Progress"}
              </p>
            ) : null}
          </div>
        )}

        {/* Gradient overlay for text legibility */}
        <div className="kxd-case-card__overlay" />

        {/* Category badge — small, top-left of image area */}
        <span className="kxd-tag absolute left-3 top-3 z-[2]">{project.industry}</span>

        {/* Hover reveal — outcome copy */}
        <div className="kxd-case-card__reveal">
          <p
            className="kxd-label"
            style={{ fontSize: "0.5rem", letterSpacing: "0.16em" }}
          >
            {project.service}
          </p>
          <p
            className="mt-2 font-serif font-light"
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.55,
              letterSpacing: "0.005em",
              color: "var(--kxd-cream)",
            }}
          >
            {project.outcome}
          </p>
        </div>
      </Link>

      {/* Card footer — sits directly below image, no flex-1 or h-full */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderTop: "1px solid var(--kxd-border-white)" }}
      >
        <div className="min-w-0 pr-4">
          <p
            className="font-serif font-light leading-tight"
            style={{
              fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
              letterSpacing: "0.01em",
              color: "var(--kxd-cream)",
            }}
          >
            {project.title}
          </p>
          <p className="kxd-label mt-1.5">{project.year}</p>
        </div>

        <Link
          href={`/work/${project.slug}`}
          className="kxd-ui-label flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--kxd-border-gold)] text-[var(--kxd-gold)] transition hover:bg-[rgba(197,166,92,0.10)]"
          aria-label={`View ${project.title} case study`}
        >
          →
        </Link>
      </div>
    </article>
  );
}
