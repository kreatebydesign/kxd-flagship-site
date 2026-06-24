import Link from "next/link";
import type { ProjectItem } from "@/lib/projects";
import { cn } from "@/lib/utils";

const KXD_FALLBACK = "/migrated-assets/textures/hero-bg.jpg";

function isWebsiteScreenshot(image: string | null): boolean {
  if (!image) return false;
  return (
    image.includes("homepage-full") ||
    image.includes("homepage-02") ||
    image.includes("desktop-home") ||
    image.includes("/media/cusickmotorsports-com-hero") ||
    (image.includes("/case-studies/") && image.endsWith("/hero.webp"))
  );
}

type ProjectCardProps = {
  project: ProjectItem;
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
  const websiteShot = isWebsiteScreenshot(project.image);
  const objectPosition =
    project.imagePosition ?? (websiteShot ? "top center" : "center");

  // Featured cards always use a fixed 16:9 aspect — large, intentional, never collapsing.
  // Non-featured cards use 16:10 for a slightly taller portrait feel in the grid.
  const imageAspect = featured ? "aspect-[16/9]" : "aspect-[16/10]";

  return (
    <article
      className={cn("kxd-case-card group", className)}
      id={project.slug}
    >
      <Link
        href={`/work/${project.slug}`}
        className={cn(
          "kxd-case-card__image-wrap relative block overflow-hidden",
          imageAspect,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={project.title}
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition }}
        />

        <div className="kxd-case-card__overlay" />

        <span className="kxd-tag absolute left-3 top-3 z-[2]">
          {project.industry}
        </span>

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
