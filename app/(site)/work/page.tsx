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

function heroImageUrl(doc: Record<string, unknown>): string | null {
  const img = doc.hero_image ?? doc.heroImage;
  if (!img || typeof img !== "object") return null;
  const url = (img as Record<string, unknown>).url;
  return typeof url === "string" ? url : null;
}

function payloadToProjectItem(doc: Record<string, unknown>): ProjectItem {
  return {
    slug: String(doc.slug),
    title: String(doc.title),
    industry: String(doc.industry ?? ""),
    service: String(doc.service ?? doc.project_type ?? doc.projectType ?? "Luxury Website Experiences"),
    outcome: String(doc.outcome ?? doc.summary ?? ""),
    description: String(doc.description ?? doc.summary ?? ""),
    image: heroImageUrl(doc),
    logo: typeof doc.logo_url === "string" ? doc.logo_url : undefined,
    year: String(doc.year ?? 2025),
    featured: Boolean(doc.featured),
    tier: (doc.tier as "primary" | "secondary") ?? "secondary",
    imagePosition: typeof doc.image_position === "string" ? doc.image_position : undefined,
    imageContain: Boolean(doc.image_contain ?? doc.imageContain),
  };
}

interface WorkLists {
  primary: ProjectItem[];
  secondary: ProjectItem[];
}

async function fetchProjects(): Promise<WorkLists> {
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
      const items = (docs as unknown as Array<Record<string, unknown>>).map(
        payloadToProjectItem,
      );
      return {
        primary: items.filter((p) => p.tier === "primary"),
        secondary: items.filter((p) => p.tier === "secondary"),
      };
    }
  } catch {
    // fall through to static data
  }
  return { primary: PRIMARY_PROJECTS as ProjectItem[], secondary: SECONDARY_PROJECTS as ProjectItem[] };
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
            Selected work across ambitious brands — motorsports, hospitality,
            civic, automotive, and growth-focused companies. Every project held
            to the same standard.
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
            <div className="grid gap-4 lg:grid-cols-12">
              {primary[0] ? (
                <div className="lg:col-span-7">
                  <ProjectCard
                    project={primary[0]}
                    featured
                    index={0}
                    priority
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-4 lg:col-span-5">
                {primary[1] ? (
                  <ProjectCard
                    project={primary[1]}
                    index={1}
                    className="flex-1"
                  />
                ) : null}
                {primary[2] ? (
                  <ProjectCard
                    project={primary[2]}
                    index={2}
                    className="flex-1"
                  />
                ) : null}
              </div>
            </div>

            {primary[3] ? (
              <div className="mt-4">
                <ProjectCard project={primary[3]} index={3} />
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
                style={{ maxWidth: "20rem" }}
              >
                Civic, hospitality, and local business — every brand held to the
                same standard.
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
