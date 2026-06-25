import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { INSIGHT_CATEGORIES, STATIC_INSIGHTS, type InsightPreview } from "@/lib/insights";
import { InsightsGrid } from "@/components/insights/InsightsGrid";
import { StructuredData } from "@/components/seo/StructuredData";
import { breadcrumbSchema, itemListSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "KXD Journal",
  description:
    "Perspectives on digital experiences, operational systems, brand strategy, hospitality growth, and motorsports innovation — from the studio behind KXD.",
  path: "/insights",
  noIndex: false,
});

// Try to fetch live insights from Payload; fall back to static seed data.
async function getInsights(): Promise<InsightPreview[]> {
  try {
    const { getPayload } = await import("payload");
    const config = (await import("@payload-config")).default;
    const payload = await getPayload({ config });

    const result = await payload.find({
      collection: "insights",
      where: { status: { equals: "published" } },
      sort: "-publishedAt",
      limit: 100,
    });

    if (result.docs.length > 0) {
      return result.docs.map((doc) => ({
        slug: String(doc.slug ?? ""),
        title: String(doc.title ?? ""),
        excerpt: String(doc.excerpt ?? ""),
        category: String(doc.category ?? ""),
        categoryLabel:
          INSIGHT_CATEGORIES.find((c) => c.value === doc.category)?.label ??
          String(doc.category ?? ""),
        author:
          doc.author && typeof doc.author === "object" && "name" in doc.author
            ? String((doc.author as { name: string }).name)
            : "KXD",
        publishedAt: doc.publishedAt
          ? new Date(doc.publishedAt as string).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        readingTime: typeof doc.readingTimeMinutes === "number" ? doc.readingTimeMinutes : 5,
        featured: Boolean(doc.featured),
      }));
    }
  } catch {
    // Payload unavailable at build time — use static seed
  }

  return STATIC_INSIGHTS;
}

export default async function InsightsPage() {
  const articles = await getInsights();

  const schema = [
    breadcrumbSchema([{ name: "Insights", path: "/insights" }]),
    itemListSchema(
      articles.map((a) => ({
        name: a.title,
        path: `/insights/${a.slug}`,
      })),
    ),
  ];

  return (
    <>
      <StructuredData data={schema} />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div style={{ maxWidth: "52rem" }}>
              <p className="kxd-eyebrow">KXD Journal</p>
              <h1
                className="kxd-serif-title mt-5"
                style={{
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
                  lineHeight: 1.04,
                  maxWidth: "26rem",
                }}
              >
                Thinking in public.
              </h1>
              <p
                className="kxd-body mt-6"
                style={{ maxWidth: "42rem", lineHeight: 1.8 }}
              >
                Perspectives on digital experiences, operational systems, brand
                strategy, hospitality growth, and motorsports innovation — from
                the studio behind KXD.
              </p>
            </div>

            {/* Article count */}
            <div className="hidden lg:block" style={{ textAlign: "right" }}>
              <p
                className="font-serif font-light leading-none"
                style={{
                  fontSize: "clamp(3rem, 5vw, 4.5rem)",
                  color: "var(--kxd-gold)",
                  opacity: 0.18,
                }}
              >
                {String(articles.length).padStart(2, "0")}
              </p>
              <p
                className="mt-1 font-sans uppercase"
                style={{
                  fontSize: "0.5rem",
                  letterSpacing: "0.14em",
                  color: "var(--kxd-cream-muted)",
                  opacity: 0.5,
                }}
              >
                Articles
              </p>
            </div>
          </div>

          {/* Category list */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
            {INSIGHT_CATEGORIES.map((cat) => (
              <p
                key={cat.value}
                className="kxd-label"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.09em",
                }}
              >
                {cat.label}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Article Grid ─────────────────────────────────────────────────────── */}
      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
      >
        <div className="kxd-container">
          <InsightsGrid articles={articles} categories={INSIGHT_CATEGORIES} />
        </div>
      </section>

      {/* ── Newsletter strip ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--kxd-black-pure)",
          borderTop: "1px solid var(--kxd-border-white)",
          padding: "clamp(3rem, 6vw, 4.5rem) 0",
        }}
      >
        <div className="kxd-container">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div style={{ maxWidth: "34rem" }}>
              <p className="kxd-eyebrow">Stay in the Journal</p>
              <p
                className="mt-3 font-serif font-light"
                style={{
                  fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
                  color: "var(--kxd-cream-soft)",
                  lineHeight: 1.6,
                }}
              >
                New perspectives published regularly. No newsletter — just the
                work, here when you need it.
              </p>
            </div>
            <a
              href="/start-project"
              className="kxd-btn-primary shrink-0"
            >
              Start a Project
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
