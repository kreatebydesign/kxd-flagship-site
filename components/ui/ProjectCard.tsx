import Link from "next/link";
import type { ProjectItem } from "@/lib/projects";
import { cn } from "@/lib/utils";

/*
 * ProjectCard — Work page listing card.
 *
 * Uses a plain <img> (not next/image fill) because Tailwind v4 + next/image
 * fill + aspect-ratio creates an interaction where the absolutely-positioned
 * fill image doesn't size correctly against the aspect-ratio-derived height
 * on mobile viewports. The plain <img> with absolute inset + object-cover is
 * fully reliable at every viewport width.
 *
 * Mobile requirements (390px):
 * - Cards stack vertically, single column.
 * - Image wrapper: aspect-[16/10] — always produces a visible image box.
 * - Image: absolute inset-0 h-full w-full object-cover — fills wrapper exactly.
 * - No h-full, flex-1, min-h-*, or row-span on the card itself.
 * - All images render at full opacity — no dark placeholder dimming.
 */

/* Fallback used when a project has no image asset */
const KXD_FALLBACK = "/migrated-assets/textures/hero-bg.jpg";

type ProjectCardProps = {
  project: ProjectItem;
  /** featured — cinematic wide ratio on desktop (sm+), standard on mobile */
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
  const imageSrc = project.image ?? KXD_FALLBACK;

  return (
    <article className={cn("kxd-case-card group", className)} id={project.slug}>
      {/* ── Image area ─────────────────────────────────────────────────────── */}
      <Link
        href={`/work/${project.slug}`}
        className={cn(
          "kxd-case-card__image-wrap relative block overflow-hidden",
          featured ? "aspect-[16/10] sm:aspect-[21/9]" : "aspect-[16/10]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={project.title}
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: project.imagePosition ?? "center" }}
        />

        {/* Dark gradient overlay */}
        <div className="kxd-case-card__overlay" />

        {/* Category badge — small, top-left */}
        <span className="kxd-tag absolute left-3 top-3 z-[2]">
          {project.industry}
        </span>

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

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
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
