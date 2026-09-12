/**
 * Verify Hospitality industry hub packaging.
 * Run: node --import tsx scripts/verify-hospitality-authority.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HOSPITALITY_FAQS,
  HOSPITALITY_HUB_PATH,
  HOSPITALITY_INSIGHT_LINKS,
  HOSPITALITY_PAGE,
  HOSPITALITY_SELECTED_WORK,
  HOSPITALITY_WORK_SLUGS,
} from "../lib/content/hospitality-authority.ts";
import { PUBLIC_SITEMAP_PATHS } from "../lib/seo/public-routes.ts";
import { faqPageSchema } from "../lib/seo/schema.ts";
import {
  CASE_STUDIES,
  CASE_STUDY_CAPABILITY_LINKS,
  CASE_STUDY_JOURNAL_LINKS,
} from "../lib/projects.ts";
import { STATIC_INSIGHTS, isJournalFeature } from "../lib/insights.ts";
import { getJournalFeatureBySlug } from "../lib/insights/features/index.ts";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

console.log("\nverify-hospitality-authority\n");

const pagePath = "app/(site)/industries/hospitality/page.tsx";
check("hospitality page route file exists", Boolean(read(pagePath)));
check("hub path is /industries/hospitality", HOSPITALITY_HUB_PATH === "/industries/hospitality");
check("sitemap includes hospitality hub", PUBLIC_SITEMAP_PATHS.includes(HOSPITALITY_HUB_PATH));
check("page metadata title set", HOSPITALITY_PAGE.title.includes("Hospitality"));
check("meta description present", HOSPITALITY_PAGE.description.length > 40);
check(
  "lead mentions operational infrastructure",
  HOSPITALITY_PAGE.lead.toLowerCase().includes("operational"),
);

for (const slug of HOSPITALITY_WORK_SLUGS) {
  check(`selected work includes ${slug}`, HOSPITALITY_SELECTED_WORK.some((w) => w.slug === slug));
  check(`case study data exists for ${slug}`, Boolean(CASE_STUDIES[slug]));
  check(
    `capability links include hospitality hub for ${slug}`,
    (CASE_STUDY_CAPABILITY_LINKS[slug] ?? []).some((l) => l.href === HOSPITALITY_HUB_PATH),
  );
}

check(
  "Plate featured in hospitality selected work",
  HOSPITALITY_SELECTED_WORK.find((w) => w.slug === "plate-the-umpqua")?.featured === true,
);
check(
  "Plate case study includes Plate OS scope",
  (CASE_STUDIES["plate-the-umpqua"]?.scope ?? []).some((s) =>
    s.toLowerCase().includes("enterprise platforms"),
  ),
);
check(
  "Plate case study links to Journal",
  CASE_STUDY_JOURNAL_LINKS["plate-the-umpqua"]?.href ===
    "/insights/building-plate-the-umpqua-with-chef-martin",
);

for (const insight of HOSPITALITY_INSIGHT_LINKS) {
  const article = STATIC_INSIGHTS.find((a) => a.slug === insight.slug);
  check(`insight exists: ${insight.slug}`, Boolean(article));

  if (isJournalFeature(article)) {
    const feature = getJournalFeatureBySlug(insight.slug);
    check(`journal feature registered: ${insight.slug}`, Boolean(feature));
    check(
      `journal feature links hospitality hub: ${insight.slug}`,
      JSON.stringify(feature?.blocks ?? []).includes("/industries/hospitality"),
    );
    check(
      `journal feature CTA points to hospitality hub: ${insight.slug}`,
      article?.cta?.primaryHref === HOSPITALITY_HUB_PATH,
    );
  } else {
    check(
      `insight CTA points to hospitality hub: ${insight.slug}`,
      article?.cta?.primaryHref === HOSPITALITY_HUB_PATH,
    );
    check(
      `insight body links hospitality hub: ${insight.slug}`,
      Boolean(article?.body.some((p) => p.includes("/industries/hospitality"))),
    );
  }
}

const faqSchema = faqPageSchema([...HOSPITALITY_FAQS]);
check("FAQ schema builds", Boolean(faqSchema));
check(
  "FAQ covers operational systems",
  HOSPITALITY_FAQS.some((f) => f.question.toLowerCase().includes("operational systems")),
);

const workPage = read("app/(site)/work/[slug]/page.tsx");
check("Work pages import hospitality hub helper", workPage.includes("isHospitalityWork"));
check("Work pages render hospitality hub link", workPage.includes("HOSPITALITY_WORK_HUB_LINK"));
check("Work pages render Journal deep-dive when present", workPage.includes("getCaseStudyJournalLink"));

const home = read("components/home/CaseStudiesSection.tsx");
check("homepage links hospitality hub", home.includes("/industries/hospitality"));

const authority = read("lib/content/hospitality-authority.ts");
check(
  "Growth Infrastructure not listed as hospitality capability proof",
  !authority.includes('eyebrow: "Growth Infrastructure"'),
);
check(
  "Platforms capability present on hospitality hub",
  authority.includes('eyebrow: "Platforms & Operations"'),
);

console.log("\nAll hospitality authority checks passed.\n");
