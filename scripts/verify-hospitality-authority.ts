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
import { CASE_STUDIES, CASE_STUDY_CAPABILITY_LINKS } from "../lib/projects.ts";
import { STATIC_INSIGHTS } from "../lib/insights.ts";

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

for (const slug of HOSPITALITY_WORK_SLUGS) {
  check(`selected work includes ${slug}`, HOSPITALITY_SELECTED_WORK.some((w) => w.slug === slug));
  check(`case study data exists for ${slug}`, Boolean(CASE_STUDIES[slug]));
  check(
    `capability links include hospitality hub for ${slug}`,
    (CASE_STUDY_CAPABILITY_LINKS[slug] ?? []).some((l) => l.href === HOSPITALITY_HUB_PATH),
  );
}

for (const insight of HOSPITALITY_INSIGHT_LINKS) {
  const article = STATIC_INSIGHTS.find((a) => a.slug === insight.slug);
  check(`insight exists: ${insight.slug}`, Boolean(article));
  check(
    `insight CTA points to hospitality hub: ${insight.slug}`,
    article?.cta?.primaryHref === HOSPITALITY_HUB_PATH,
  );
  check(
    `insight body links hospitality hub: ${insight.slug}`,
    Boolean(article?.body.some((p) => p.includes("/industries/hospitality"))),
  );
}

const faqSchema = faqPageSchema([...HOSPITALITY_FAQS]);
check("FAQ schema builds", Boolean(faqSchema));

const workPage = read("app/(site)/work/[slug]/page.tsx");
check("Work pages import hospitality hub helper", workPage.includes("isHospitalityWork"));
check("Work pages render hospitality hub link", workPage.includes("HOSPITALITY_WORK_HUB_LINK"));

const home = read("components/home/CaseStudiesSection.tsx");
check("homepage links hospitality hub", home.includes("/industries/hospitality"));

const authority = read("lib/content/hospitality-authority.ts");
check(
  "Growth Infrastructure not listed as hospitality capability proof",
  !authority.includes('eyebrow: "Growth Infrastructure"'),
);

console.log("\nAll hospitality authority checks passed.\n");
