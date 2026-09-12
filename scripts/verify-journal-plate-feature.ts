/**
 * Focused verification for KXD Journal Plate feature.
 * Run: npx tsx scripts/verify-journal-plate-feature.ts
 */
import assert from "node:assert/strict";
import { STATIC_INSIGHTS, getInsightBySlug, isJournalFeature } from "../lib/insights";
import { getJournalFeatureBySlug } from "../lib/insights/features";
import { PUBLIC_SITEMAP_PATHS } from "../lib/seo/public-routes";

const SLUG = "building-plate-the-umpqua-with-chef-martin";

const insight = getInsightBySlug(SLUG);
assert.ok(insight, "static insight registered");
assert.equal(insight?.format, "feature");
assert.equal(isJournalFeature(insight), true);
assert.equal(
  insight?.title,
  "I Thought I Was Building Martin a Website. We Ended Up Building Plate OS.",
);
assert.match(
  insight?.excerpt ?? "",
  /operating system around the way Plate the Umpqua actually works/,
);

const feature = getJournalFeatureBySlug(SLUG);
assert.ok(feature, "feature article registered");
assert.equal(feature?.seoTitle, "How We Built Plate OS for Plate the Umpqua");
assert.equal(feature?.showCta, false);
assert.ok(feature?.blocks.some((b) => b.type === "under-the-hood"));
assert.ok(feature?.blocks.some((b) => b.type === "diagram"));
assert.ok(
  feature?.blocks.some(
    (b) => b.type === "under-the-hood" && b.filePath?.includes("partnerConciergePricing"),
  ),
);

assert.ok(
  PUBLIC_SITEMAP_PATHS.includes(`/insights/${SLUG}`),
  "slug present in public sitemap paths",
);

assert.ok(
  STATIC_INSIGHTS.filter((a) => a.featured).length >= 1,
  "at least one featured insight",
);

console.log("verify-journal-plate-feature: OK");
