/**
 * Verify Motorsports Authority P2 packaging.
 * Run: node --import tsx scripts/verify-motorsports-authority.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOTORSPORTS_AUTOMOTIVE_WORK_SLUGS,
  MOTORSPORTS_FAQS,
  MOTORSPORTS_HUB_PATH,
  MOTORSPORTS_PAGE,
  MOTORSPORTS_SELECTED_WORK,
} from "../lib/content/motorsports-authority.ts";
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

console.log("\nverify-motorsports-authority\n");

const pagePath = "app/(site)/industries/motorsports/page.tsx";
check("motorsports page route file exists", Boolean(read(pagePath)));
check("hub path is /industries/motorsports", MOTORSPORTS_HUB_PATH === "/industries/motorsports");
check("sitemap includes motorsports hub", PUBLIC_SITEMAP_PATHS.includes(MOTORSPORTS_HUB_PATH));
check("page metadata title set", MOTORSPORTS_PAGE.title.includes("Motorsports"));

for (const slug of MOTORSPORTS_AUTOMOTIVE_WORK_SLUGS) {
  check(`selected work includes ${slug}`, MOTORSPORTS_SELECTED_WORK.some((w) => w.slug === slug));
  check(`case study data exists for ${slug}`, Boolean(CASE_STUDIES[slug]));
  const links = CASE_STUDY_CAPABILITY_LINKS[slug] ?? [];
  check(
    `Work ${slug} links to motorsports hub`,
    links.some((l) => l.href === MOTORSPORTS_HUB_PATH),
  );
}

const pageSrc = read(pagePath);
const contentSrc = read("lib/content/motorsports-authority.ts");
const authoritySurface = `${pageSrc}\n${contentSrc}`;

for (const href of [
  "/services/luxury-website-experiences",
  "/services/growth-infrastructure",
  "/services/enterprise-platforms",
  "/platforms",
  "/start-project",
  "/investment",
  "/website-audit",
]) {
  check(`hub references ${href}`, authoritySurface.includes(href));
}

for (const slug of MOTORSPORTS_AUTOMOTIVE_WORK_SLUGS) {
  check(
    `hub selected work includes slug ${slug}`,
    contentSrc.includes(`"${slug}"`) || contentSrc.includes(`'${slug}'`),
  );
}
check(
  "hub page templates Work links via /work/${item.slug}",
  pageSrc.includes("`/work/${item.slug}`"),
);

for (const insight of [
  "why-motorsports-brands-fail-digitally",
  "year-round-motorsports-digital-presence",
]) {
  check(
    `hub references insight ${insight}`,
    contentSrc.includes(insight) && pageSrc.includes("`/insights/${insight.slug}`"),
  );
}

check(
  "hub content includes website-audit or FinalCta covers secondary paths",
  pageSrc.includes("/website-audit") || pageSrc.includes("/investment"),
);

const failInsight = STATIC_INSIGHTS.find((a) => a.slug === "why-motorsports-brands-fail-digitally");
const yearInsight = STATIC_INSIGHTS.find((a) => a.slug === "year-round-motorsports-digital-presence");
check("fail digitally insight links hub", Boolean(failInsight?.body.some((p) => p.includes(MOTORSPORTS_HUB_PATH))));
check("year-round insight links hub", Boolean(yearInsight?.body.some((p) => p.includes(MOTORSPORTS_HUB_PATH))));
check("fail digitally CTA to hub", failInsight?.cta?.primaryHref === MOTORSPORTS_HUB_PATH);
check("year-round CTA to hub", yearInsight?.cta?.primaryHref === MOTORSPORTS_HUB_PATH);
check(
  "insights preserve Matt Kreate author display",
  failInsight?.author === "Matt Kreate" && yearInsight?.author === "Matt Kreate",
);

const workPage = read("app/(site)/work/[slug]/page.tsx");
check("Work pages import motorsports hub helper", workPage.includes("isMotorsportsAutomotiveWork"));
check("Work pages render hub link label", workPage.includes("MOTORSPORTS_WORK_HUB_LINK"));

const home = read("components/home/CaseStudiesSection.tsx");
check("homepage links motorsports hub", home.includes("/industries/motorsports"));

const faqSchema = faqPageSchema([...MOTORSPORTS_FAQS]);
check("FAQ schema emitted", Boolean(faqSchema));
const entities = (faqSchema as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }).mainEntity;
check("FAQ schema count matches visible FAQs", entities.length === MOTORSPORTS_FAQS.length);
check(
  "FAQ schema text parity",
  entities.every(
    (entity, i) =>
      entity.name === MOTORSPORTS_FAQS[i].question &&
      entity.acceptedAnswer.text === MOTORSPORTS_FAQS[i].answer,
  ),
);

check("no OTP Carts work slug in hub content", !contentSrc.includes("otp-carts"));
check(
  "no OTP Carts case study file created",
  !read("lib/projects.ts").includes('slug: "otp-carts"'),
);

const projectsSrc = read("lib/projects.ts");
const cmmBlock = projectsSrc.slice(
  projectsSrc.indexOf('"cusick-morgan-motorsports": {'),
  projectsSrc.indexOf('"plate-the-umpqua": {'),
);
check(
  "CMM case study block not rewritten for driver bios (no bio section keys added)",
  !cmmBlock.includes("driverBio") && !cmmBlock.includes("driver_bios"),
);

const banned = ["paddock", "sleek", "tailored", "nurture", "cutting-edge", "game-changing"];
for (const word of banned) {
  check(`hub copy avoids "${word}"`, !contentSrc.toLowerCase().includes(word));
}

console.log("\nAll motorsports authority checks passed.\n");
