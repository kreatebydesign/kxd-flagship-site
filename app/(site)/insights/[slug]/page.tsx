import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { FinalCtaBand } from "@/components/ui/FinalCtaBand";
import {
  STATIC_INSIGHTS,
  INSIGHT_CATEGORIES,
  getInsightBySlug,
  getRelatedInsights,
  formatInsightDate,
  type InsightDetail,
  type InsightPreview,
} from "@/lib/insights";

// ── Static generation ─────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = STATIC_INSIGHTS.map((a) => ({ slug: a.slug }));

  try {
    const { getPayload } = await import("payload");
    const config = (await import("@payload-config")).default;
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "insights",
      where: { status: { equals: "published" } },
      limit: 200,
    });
    result.docs.forEach((doc) => {
      if (doc.slug && !slugs.some((s) => s.slug === String(doc.slug))) {
        slugs.push({ slug: String(doc.slug) });
      }
    });
  } catch {
    // Payload unavailable — use static slugs only
  }

  return slugs;
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getArticle(slug: string): Promise<InsightDetail | null> {
  // Try Payload first
  try {
    const { getPayload } = await import("payload");
    const config = (await import("@payload-config")).default;
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "insights",
      where: {
        slug: { equals: slug },
        status: { equals: "published" },
      },
      limit: 1,
    });

    if (result.docs.length > 0) {
      const doc = result.docs[0];
      return {
        slug: String(doc.slug ?? slug),
        title: String(doc.title ?? ""),
        excerpt: String(doc.excerpt ?? ""),
        category: String(doc.category ?? ""),
        categoryLabel:
          INSIGHT_CATEGORIES.find((c) => c.value === doc.category)?.label ??
          String(doc.category ?? ""),
        author:
          doc.author && typeof doc.author === "object" && "name" in doc.author
            ? String((doc.author as { name: string }).name)
            : "Matt Kreate",
        publishedAt: doc.publishedAt
          ? new Date(doc.publishedAt as string).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        readingTime: typeof doc.readingTimeMinutes === "number" ? doc.readingTimeMinutes : 5,
        featured: Boolean(doc.featured),
        body: [],
        payloadContent: doc.content,
      };
    }
  } catch {
    // Fall through to static
  }

  return getInsightBySlug(slug) ?? null;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return buildMetadata({
      title: "Article Not Found",
      path: `/insights/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/insights/${slug}`,
    type: "article",
    publishedTime: article.publishedAt,
  });
}

// ── Article body renderer ─────────────────────────────────────────────────────

function ArticleBody({
  body,
  payloadContent,
}: {
  body: string[];
  payloadContent?: unknown;
}) {
  // Static content (string paragraphs)
  if (body.length > 0) {
    return (
      <div className="space-y-6">
        {body.map((paragraph, i) => (
          <p
            key={i}
            className="font-sans font-light leading-[1.85]"
            style={{
              fontSize: "clamp(1rem, 1.3vw, 1.0625rem)",
              color: "var(--kxd-cream-soft)",
            }}
          >
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  // Payload Lexical JSON — basic paragraph extraction
  if (payloadContent && typeof payloadContent === "object") {
    try {
      const lexical = payloadContent as {
        root?: { children?: Array<{ type: string; children?: Array<{ text?: string }> }> };
      };
      const nodes = lexical.root?.children ?? [];

      return (
        <div className="space-y-6">
          {nodes.map((node, i) => {
            const text = node.children?.map((c) => c.text ?? "").join("") ?? "";
            if (!text.trim()) return null;

            if (node.type === "heading") {
              return (
                <h3
                  key={i}
                  className="font-serif font-light"
                  style={{
                    fontSize: "clamp(1.125rem, 1.6vw, 1.25rem)",
                    color: "var(--kxd-cream)",
                    lineHeight: 1.3,
                    marginTop: "2.5rem",
                  }}
                >
                  {text}
                </h3>
              );
            }

            return (
              <p
                key={i}
                className="font-sans font-light leading-[1.85]"
                style={{
                  fontSize: "clamp(1rem, 1.3vw, 1.0625rem)",
                  color: "var(--kxd-cream-soft)",
                }}
              >
                {text}
              </p>
            );
          })}
        </div>
      );
    } catch {
      return (
        <p className="kxd-body" style={{ color: "var(--kxd-cream-muted)" }}>
          Content coming soon.
        </p>
      );
    }
  }

  return null;
}

// ── Related article card ──────────────────────────────────────────────────────

function RelatedCard({ article }: { article: InsightPreview }) {
  return (
    <Link
      href={`/insights/${article.slug}`}
      className="group block"
      style={{
        background: "var(--kxd-black-elevated)",
        border: "1px solid var(--kxd-border-white)",
        padding: "1.5rem",
        textDecoration: "none",
      }}
    >
      <p
        className="kxd-label"
        style={{ color: "var(--kxd-gold)", opacity: 0.75, marginBottom: "0.75rem" }}
      >
        {article.categoryLabel}
      </p>
      <h4
        className="font-serif font-light transition-colors"
        style={{
          fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
          color: "var(--kxd-cream)",
          lineHeight: 1.25,
        }}
      >
        {article.title}
      </h4>
      <p
        className="mt-3 font-sans font-light"
        style={{
          fontSize: "0.8125rem",
          color: "var(--kxd-cream-muted)",
          lineHeight: 1.6,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {article.excerpt}
      </p>
      <p
        className="mt-4 font-sans uppercase transition-colors"
        style={{ fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--kxd-gold)" }}
      >
        Read →
      </p>
    </Link>
  );
}

// ── JSON-LD ────────────────────────────────────────────────────────────────────

function ArticleJsonLd({ article }: { article: InsightDetail }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kreatebydesign.com";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      "@type": "Person",
      name: article.author,
      url: `${siteUrl}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "Kreate by Design",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/insights/${article.slug}`,
    },
    articleSection: article.categoryLabel,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const related = getRelatedInsights(article.slug, article.category, 3);
  const publishedDate = formatInsightDate(article.publishedAt);

  return (
    <>
      <ArticleJsonLd article={article} />

      {/* ── Article Hero ────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "52rem" }}>
          {/* Back link */}
          <Link
            href="/insights"
            className="kxd-label mb-8 inline-flex items-center gap-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--kxd-cream-muted)", display: "flex" }}
          >
            <span aria-hidden style={{ color: "var(--kxd-gold)" }}>←</span>
            KXD Journal
          </Link>

          {/* Category + Reading time */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p
              className="kxd-label inline-block"
              style={{
                color: "var(--kxd-gold)",
                border: "1px solid var(--kxd-border-gold)",
                padding: "0.2rem 0.75rem",
                letterSpacing: "0.09em",
              }}
            >
              {article.categoryLabel}
            </p>
            <span
              className="font-sans"
              style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}
            >
              {article.readingTime} min read
            </span>
          </div>

          {/* Headline */}
          <h1
            className="kxd-serif-title mt-6"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              lineHeight: 1.07,
              maxWidth: "44rem",
            }}
          >
            {article.title}
          </h1>

          {/* Excerpt */}
          <p
            className="mt-6 font-serif font-light italic"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
              color: "var(--kxd-cream-soft)",
              lineHeight: 1.7,
              maxWidth: "42rem",
            }}
          >
            {article.excerpt}
          </p>

          {/* Author + date */}
          <div
            className="mt-8 flex items-center gap-4 border-t pt-6"
            style={{ borderColor: "var(--kxd-border-white)", maxWidth: "42rem" }}
          >
            {/* Author initials avatar */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center font-sans text-[0.5625rem] font-medium uppercase"
              style={{
                background: "rgba(197,166,92,0.08)",
                border: "1px solid var(--kxd-border-gold)",
                color: "var(--kxd-gold)",
                letterSpacing: "0.08em",
              }}
            >
              {article.author
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <p
                className="font-sans"
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "0.08em",
                  color: "var(--kxd-cream)",
                }}
              >
                {article.author}
              </p>
              <p
                className="mt-0.5 font-sans"
                style={{ fontSize: "0.625rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}
              >
                {publishedDate}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Article Body ─────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--kxd-black-base)",
          padding: "clamp(3.5rem, 7vw, 5.5rem) 0",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "46rem" }}>
          {/* Ornamental rule */}
          <div
            aria-hidden
            style={{
              width: "3rem",
              height: "1px",
              background: "linear-gradient(to right, var(--kxd-gold), transparent)",
              marginBottom: "2.5rem",
              opacity: 0.5,
            }}
          />

          <ArticleBody body={article.body} payloadContent={article.payloadContent} />

          {/* End ornament */}
          <div
            aria-hidden
            style={{
              width: "3rem",
              height: "1px",
              background: "linear-gradient(to right, var(--kxd-gold), transparent)",
              marginTop: "3.5rem",
              opacity: 0.3,
            }}
          />

          {/* Byline close */}
          <p
            className="mt-6 font-sans"
            style={{
              fontSize: "0.625rem",
              letterSpacing: "0.10em",
              color: "rgba(255,255,255,0.2)",
            }}
          >
            {article.author} · Kreate by Design · {publishedDate}
          </p>
        </div>
      </section>

      {/* ── Related Articles ──────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section
          style={{
            background: "var(--kxd-black-pure)",
            padding: "clamp(3rem, 6vw, 4.5rem) 0",
            borderBottom: "1px solid var(--kxd-border-white)",
          }}
        >
          <div className="kxd-container">
            <div className="flex items-end justify-between gap-6 mb-10">
              <div>
                <p className="kxd-eyebrow">Related Reading</p>
                <h2
                  className="mt-3 font-serif font-light"
                  style={{
                    fontSize: "clamp(1.25rem, 2vw, 1.625rem)",
                    color: "var(--kxd-cream)",
                    lineHeight: 1.2,
                  }}
                >
                  More in {article.categoryLabel}
                </h2>
              </div>
              <Link
                href="/insights"
                className="hidden font-sans font-medium uppercase transition-colors hover:text-[var(--kxd-cream)] sm:block"
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "var(--tracking-button)",
                  color: "var(--kxd-cream-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                All Articles →
              </Link>
            </div>

            <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3"
              style={{
                background: "var(--kxd-border-white)",
                border: "1px solid var(--kxd-border-white)",
              }}
            >
              {related.map((r) => (
                <RelatedCard key={r.slug} article={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <FinalCtaBand
        headline="Ready to Build Something Exceptional?"
        subCopy="KXD partners with ambitious businesses to create digital experiences, operational systems, and brands built to endure."
        primaryLabel="Start a Partnership"
        primaryHref="/start-project"
        secondaryHref="/work"
        secondaryLabel="Explore Our Work"
      />
    </>
  );
}
