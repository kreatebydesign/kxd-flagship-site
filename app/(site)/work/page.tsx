import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { GoldAtmosphere } from "@/components/ui/surfaces/GoldAtmosphere";
import {
  PROJECTS,
  PRIMARY_PROJECTS,
  SECONDARY_PROJECTS,
  type ProjectItem,
} from "@/lib/projects";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Work",
  description:
    "Selected work from Kreate by Design — luxury websites, brand systems, growth infrastructure, and operational platforms across ambitious brands.",
  path: "/work",
  keywords: [
    "Luxury Website Design",
    "Premium Web Design Portfolio",
    "Brand Systems Agency",
    "Growth Infrastructure",
  ],
});

// ── Data layer ────────────────────────────────────────────────────────────────

/*
 * Slug-keyed fallback map from the static PROJECTS array.
 * Used by payloadToProjectItem so that when a Payload project doc lacks an
 * uploaded hero image (e.g. fresh Neon DB with no media records), we still
 * display the correct asset from /public rather than an archive panel.
 */
const STATIC_BY_SLUG = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]));

function heroImageUrl(doc: Record<string, unknown>): string | null {
  const img = doc.hero_image ?? doc.heroImage;
  if (!img || typeof img !== "object") return null;
  const url = (img as Record<string, unknown>).url;
  return typeof url === "string" ? url : null;
}

function payloadToProjectItem(doc: Record<string, unknown>): ProjectItem {
  const slug = String(doc.slug);
  const ref = STATIC_BY_SLUG[slug]; // static fallback for image data
  const payloadImage = heroImageUrl(doc);
  return {
    slug,
    title: String(doc.title),
    industry: String(doc.industry ?? ""),
    service: String(doc.service ?? doc.project_type ?? doc.projectType ?? "Luxury Website Experiences"),
    outcome: String(doc.outcome ?? doc.summary ?? ""),
    description: String(doc.description ?? doc.summary ?? ""),
    // prefer Payload-uploaded image, fall back to static asset path
    image: payloadImage ?? ref?.image ?? null,
    logo: typeof doc.logo_url === "string" ? doc.logo_url : ref?.logo,
    year: String(doc.year ?? 2025),
    featured: Boolean(doc.featured),
    tier: (doc.tier as "primary" | "secondary") ?? "secondary",
    imagePosition: typeof doc.image_position === "string" ? doc.image_position : ref?.imagePosition,
    imageContain: Boolean(doc.image_contain ?? doc.imageContain ?? ref?.imageContain),
  };
}

interface WorkLists {
  primary: ProjectItem[];
  secondary: ProjectItem[];
}

async function fetchProjects(): Promise<WorkLists> {
  /*
   * Static data is the authoritative source for the Work page.
   * Every project defined in lib/projects.ts will always appear.
   *
   * Payload is used only to ENRICH individual slugs — when a matching
   * Payload doc exists (with an uploaded image or overridden copy), that
   * data wins for that slug; all other slugs fall back to static data.
   *
   * This prevents Payload's DB state (which may be a subset of the full
   * project list) from silently hiding projects that exist only in the
   * static data file.
   */
  const base: ProjectItem[] = PROJECTS as ProjectItem[];

  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "projects",
      where: { status: { equals: "published" } },
      sort: "order",
      limit: 30,
      depth: 1,
    });

    if (docs.length > 0) {
      // Build a slug-keyed map of Payload-enriched items
      const payloadMap: Record<string, ProjectItem> = {};
      for (const doc of docs as unknown as Array<Record<string, unknown>>) {
        const item = payloadToProjectItem(doc);
        payloadMap[item.slug] = item;
      }

      // Merge: Payload data wins per slug; static data fills the gaps
      const merged = base.map((s) => payloadMap[s.slug] ?? s);
      return {
        primary: merged.filter((p) => p.tier === "primary"),
        secondary: merged.filter((p) => p.tier === "secondary"),
      };
    }
  } catch {
    // Payload unavailable — fall through to pure static data
  }

  return {
    primary: PRIMARY_PROJECTS as ProjectItem[],
    secondary: SECONDARY_PROJECTS as ProjectItem[],
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function WorkPage() {
  const { primary, secondary } = await fetchProjects();
  const totalCount = primary.length + secondary.length;

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden border-b"
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <GoldAtmosphere intensity="hero" />
        <div className="kxd-container relative z-10">
          <p className="kxd-eyebrow">Selected Work</p>
          <h1
            className="mt-5 font-serif font-light"
            style={{
              fontSize: "clamp(2.75rem, 5.5vw, 4.5rem)",
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
              color: "var(--kxd-cream)",
              maxWidth: "16ch",
            }}
          >
            Work That
            <br />
            <em style={{ fontStyle: "italic", color: "var(--kxd-cream-soft)" }}>
              Holds Weight.
            </em>
          </h1>
          <p
            className="mt-7 font-serif font-light"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
              lineHeight: 1.78,
              color: "var(--kxd-cream-muted)",
              maxWidth: "34rem",
            }}
          >
            Selected work across ambitious brands, local leaders, and growing
            companies — each built with the same level of care, clarity, and
            intent.
          </p>

          {totalCount > 0 && (
            <p
              className="mt-6 font-sans uppercase"
              style={{
                fontSize: "0.5625rem",
                letterSpacing: "var(--tracking-label)",
                color: "var(--kxd-gold)",
                opacity: 0.6,
              }}
            >
              {totalCount} projects
            </p>
          )}
        </div>
      </section>

      {/* ── Featured / primary projects ── */}
      {primary.length > 0 && (
        <section
          className="kxd-section"
          style={{ background: "var(--kxd-black-base)" }}
        >
          <div className="kxd-container">
            {/* Full-width featured card */}
            {primary[0] ? (
              <ProjectCard
                project={primary[0]}
                featured
                index={0}
                priority
              />
            ) : null}

            {/* Remaining primary — clean 2/3-col grid; no height-matching */}
            {primary.length > 1 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {primary.slice(1).map((p, i) => (
                  <ProjectCard key={p.slug} project={p} index={i + 1} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Supporting / secondary work ── */}
      {secondary.length > 0 && (
        <section
          className="kxd-section"
          style={{
            background: "var(--kxd-black-deep)",
            borderTop: "1px solid var(--kxd-border-white)",
          }}
        >
          <div className="kxd-container">
            <div className="mb-10 grid gap-4 sm:flex sm:items-end sm:justify-between">
              <div>
                <p className="kxd-eyebrow">Further Work</p>
                <h2
                  className="kxd-serif-title mt-3"
                  style={{ fontSize: "clamp(1.375rem, 2.5vw, 1.875rem)" }}
                >
                  Same discipline. Different scale.
                </h2>
              </div>
              <p
                className="kxd-body-sm"
                style={{ maxWidth: "22rem" }}
              >
                From emerging businesses to established brands, every project is
                approached with the same standard: sharp positioning, refined
                execution, and a digital presence built to perform.
              </p>
            </div>

            <div className="kxd-gold-rule mb-10" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {secondary.map((project, i) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={i + primary.length}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCtaBand secondaryHref="/services" secondaryLabel="View Services" />
    </>
  );
}
