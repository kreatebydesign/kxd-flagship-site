import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import { PRIMARY_PROJECTS, SECONDARY_PROJECTS } from "@/lib/projects";
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

export default function WorkPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <p className="kxd-eyebrow">Selected Work</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{ fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)", maxWidth: "38rem", lineHeight: 1.06 }}
          >
            Work That Holds Weight.
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "34rem" }}>
            Selected work across ambitious brands, hospitality, motorsports,
            civic organizations, and growth-focused companies.
          </p>
        </div>
      </section>

      {/* ── Featured projects ── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          {/* Featured grid — flagship left, two secondary right */}
          <div className="grid gap-4 lg:grid-cols-12">
            {PRIMARY_PROJECTS[0] ? (
              <div className="lg:col-span-7">
                <ProjectCard project={PRIMARY_PROJECTS[0]} featured index={0} />
              </div>
            ) : null}
            <div className="flex flex-col gap-4 lg:col-span-5">
              {PRIMARY_PROJECTS[1] ? (
                <ProjectCard project={PRIMARY_PROJECTS[1]} index={1} className="flex-1" />
              ) : null}
              {PRIMARY_PROJECTS[2] ? (
                <ProjectCard project={PRIMARY_PROJECTS[2]} index={2} className="flex-1" />
              ) : null}
            </div>
          </div>

          {/* Fourth primary */}
          {PRIMARY_PROJECTS[3] ? (
            <div className="mt-4">
              <ProjectCard project={PRIMARY_PROJECTS[3]} index={3} />
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Supporting work ── */}
      {SECONDARY_PROJECTS.length > 0 ? (
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
              <p className="kxd-body-sm" style={{ maxWidth: "20rem" }}>
                Civic, hospitality, and local business — every brand held to the same standard.
              </p>
            </div>

            <div className="kxd-gold-rule mb-10" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECONDARY_PROJECTS.map((project, i) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={i + PRIMARY_PROJECTS.length}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <FinalCtaBand secondaryHref="/services" secondaryLabel="View Services" />
    </>
  );
}
