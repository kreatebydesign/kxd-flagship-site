"use client";

import { useState } from "react";
import Link from "next/link";
import type { InsightPreview, InsightCategory } from "@/lib/insights";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InsightsGridProps {
  articles: InsightPreview[];
  categories: InsightCategory[];
}

// ── Article Card ──────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  featured,
}: {
  article: InsightPreview;
  featured?: boolean;
}) {
  const date = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      href={`/insights/${article.slug}`}
      className="group flex h-full flex-col"
      style={{
        background: "var(--kxd-black-elevated)",
        border: "1px solid var(--kxd-border-white)",
        textDecoration: "none",
        transition: "border-color 200ms",
      }}
    >
      <div className={`flex flex-1 flex-col p-7 ${featured ? "lg:p-9" : ""}`}>
        {/* Category chip */}
        <p
          className="kxd-label inline-block self-start"
          style={{
            color: "var(--kxd-gold)",
            border: "1px solid var(--kxd-border-gold)",
            padding: "0.2rem 0.65rem",
            letterSpacing: "0.09em",
            marginBottom: "1.125rem",
          }}
        >
          {article.categoryLabel}
        </p>

        {/* Title */}
        <h3
          className="font-serif font-light transition-colors"
          style={{
            fontSize: featured
              ? "clamp(1.25rem, 2vw, 1.625rem)"
              : "clamp(1rem, 1.4vw, 1.1875rem)",
            lineHeight: 1.2,
            color: "var(--kxd-cream)",
            flexGrow: 1,
          }}
        >
          {article.title}
        </h3>

        {/* Excerpt */}
        <p
          className="mt-4 font-sans font-light leading-relaxed"
          style={{
            fontSize: "clamp(0.8125rem, 1.05vw, 0.9375rem)",
            color: "var(--kxd-cream-muted)",
            display: "-webkit-box",
            WebkitLineClamp: featured ? 4 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {article.excerpt}
        </p>

        {/* Meta */}
        <div
          className="mt-6 flex items-center justify-between border-t pt-4"
          style={{ borderColor: "var(--kxd-border-white)" }}
        >
          <p
            className="font-sans font-light"
            style={{ fontSize: "0.6875rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}
          >
            {date}
          </p>
          <p
            className="font-sans font-light"
            style={{ fontSize: "0.6875rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}
          >
            {article.readingTime} min read
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InsightsGrid({ articles, categories }: InsightsGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>("");

  const filtered = activeCategory
    ? articles.filter((a) => a.category === activeCategory)
    : articles;

  const featured = filtered.filter((a) => a.featured).slice(0, 2);
  const regular = filtered.filter((a) => !a.featured || featured.length < 2 || !featured.some(f => f.slug === a.slug));

  return (
    <div>
      {/* ── Category Tabs ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-px"
        role="tablist"
        aria-label="Filter by category"
        style={{
          background: "var(--kxd-border-white)",
          border: "1px solid var(--kxd-border-white)",
          marginBottom: "clamp(2rem, 4vw, 2.75rem)",
        }}
      >
        {[{ value: "", label: "All" }, ...categories].map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat.value)}
              className="font-sans font-medium uppercase transition-colors"
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.5625rem",
                letterSpacing: "0.12em",
                background: isActive ? "var(--kxd-gold)" : "var(--kxd-black-elevated)",
                color: isActive ? "var(--kxd-black-pure)" : "var(--kxd-cream-muted)",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── No results ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <p
          className="font-serif font-light italic"
          style={{ color: "var(--kxd-cream-muted)", fontSize: "1rem" }}
        >
          No articles in this category yet.
        </p>
      )}

      {/* ── Featured articles (2-col) ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <div className="mb-px grid gap-px sm:grid-cols-2">
          {featured.map((article) => (
            <ArticleCard key={article.slug} article={article} featured />
          ))}
        </div>
      )}

      {/* ── Regular article grid (3-col) ──────────────────────────────────── */}
      {regular.length > 0 && (
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {regular.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
