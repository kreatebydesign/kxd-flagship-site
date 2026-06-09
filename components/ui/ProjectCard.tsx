import Image from "next/image";
import Link from "next/link";
import type { ProjectItem } from "@/lib/projects";
import { cn } from "@/lib/utils";


type ProjectCardProps = {
  project: ProjectItem;
  featured?: boolean;
  className?: string;
  index?: number;
};

export function ProjectCard({ project, featured, className, index = 0 }: ProjectCardProps) {
  const aspectClass = featured
    ? "aspect-[4/5] lg:aspect-auto lg:min-h-[38rem]"
    : "aspect-[5/4]";

  return (
    <article className={cn("kxd-case-card group", className)} id={project.slug}>
      <Link href={`/work/${project.slug}`} className={cn("kxd-case-card__image-wrap block", aspectClass)}>
        {project.image ? (
          <Image
            src={project.image}
            alt={project.title}
            fill
            className="object-cover object-center"
            sizes={
              featured
                ? "(max-width: 1024px) 100vw, 60vw"
                : "(max-width: 768px) 100vw, 40vw"
            }
          />
        ) : (
          /* Archive panel — intentional, not broken */
          <div className="kxd-archive-panel absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            {project.logo ? (
              <Image
                src={project.logo}
                alt=""
                width={160}
                height={64}
                className="relative z-[1] mb-6 h-14 w-auto max-w-[52%] object-contain brightness-0 invert"
                style={{ opacity: 0.50 }}
              />
            ) : (
              <p
                className="relative z-[1] font-serif font-light uppercase"
                style={{
                  fontSize: "clamp(0.875rem, 1.5vw, 1.0625rem)",
                  letterSpacing: "0.1em",
                  color: "var(--kxd-cream-muted)",
                  opacity: 0.40,
                }}
              >
                {project.title}
              </p>
            )}
            {project.imageryPending ? (
              <p
                className="kxd-label relative z-[1] mt-5"
                style={{ fontSize: "0.5rem", color: "var(--kxd-gold-deep)", letterSpacing: "0.18em" }}
              >
                Visual Archive in Progress
              </p>
            ) : null}
          </div>
        )}

        {/* Always-present gradient overlay */}
        <div className="kxd-case-card__overlay" />

        {/* Industry tag */}
        <span className="kxd-tag absolute left-4 top-4 z-[2]">{project.industry}</span>

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

      {/* Card footer */}
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
          className="kxd-ui-label flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--kxd-border-gold)] text-[var(--kxd-gold)] transition hover:bg-[rgba(194,160,80,0.10)]"
          aria-label={`View ${project.title} case study`}
        >
          →
        </Link>
      </div>
    </article>
  );
}
