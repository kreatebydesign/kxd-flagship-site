/**
 * Verify Construction & Trades industry hub packaging.
 * Run: node --import tsx scripts/verify-construction-authority.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSTRUCTION_FAQS,
  CONSTRUCTION_HUB_PATH,
  CONSTRUCTION_INSIGHT_LINKS,
  CONSTRUCTION_PAGE,
  CONSTRUCTION_SELECTED_WORK,
  CONSTRUCTION_WORK_SLUGS,
} from "../lib/content/construction-authority.ts";
import { PUBLIC_SITEMAP_PATHS } from "../lib/seo/public-routes.ts";
import { faqPageSchema } from "../lib/seo/schema.ts";
import { CASE_STUDIES, CASE_STUDY_CAPABILITY_LINKS } from "../lib/projects.ts";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

console.log("\nverify-construction-authority\n");

const pagePath = "app/(site)/industries/construction/page.tsx";
check("construction page route file exists", Boolean(read(pagePath)));
check("hub path is /industries/construction", CONSTRUCTION_HUB_PATH === "/industries/construction");
check("sitemap includes construction hub", PUBLIC_SITEMAP_PATHS.includes(CONSTRUCTION_HUB_PATH));
check(
  "page metadata title set",
  CONSTRUCTION_PAGE.title === "Construction & Contractor Website Design",
);
check(
  "meta description preserved",
  CONSTRUCTION_PAGE.description ===
    "Premium construction and contractor website design for established trades businesses built by Kreate by Design.",
);

const pageSrc = read(pagePath);
const authoritySrc = read("lib/content/construction-authority.ts");
check("page still links start-project", pageSrc.includes("/start-project"));
check("page still links website-audit", pageSrc.includes("/website-audit"));
check(
  "page still links website experiences",
  authoritySrc.includes("/services/luxury-website-experiences") &&
    pageSrc.includes("CONSTRUCTION_CAPABILITIES"),
);
check(
  "page still links growth infrastructure",
  authoritySrc.includes("/services/growth-infrastructure") &&
    pageSrc.includes("CONSTRUCTION_CAPABILITIES"),
);
check(
  "no internal-validation disclaimer copy",
  !pageSrc.includes("No invented metrics") &&
    !pageSrc.includes("Public construction case studies only") &&
    !pageSrc.includes("Dialed In Electric excluded"),
);
check("no Journal section without insights", !pageSrc.includes("Further reading."));
check(
  "no forced insight links",
  CONSTRUCTION_INSIGHT_LINKS.length === 0,
);

for (const slug of CONSTRUCTION_WORK_SLUGS) {
  check(`selected work includes ${slug}`, CONSTRUCTION_SELECTED_WORK.some((w) => w.slug === slug));
  check(`case study data exists for ${slug}`, Boolean(CASE_STUDIES[slug]));
  check(
    `capability links include construction hub for ${slug}`,
    (CASE_STUDY_CAPABILITY_LINKS[slug] ?? []).some((l) => l.href === CONSTRUCTION_HUB_PATH),
  );
}

check(
  "Dialed In Electric not in selected work",
  !(CONSTRUCTION_WORK_SLUGS as readonly string[]).includes("dialed-in-electric") &&
    !CONSTRUCTION_SELECTED_WORK.some((w) => (w.slug as string) === "dialed-in-electric"),
);

const faqSchema = faqPageSchema([...CONSTRUCTION_FAQS]);
check("FAQ schema builds", Boolean(faqSchema));

const workPage = read("app/(site)/work/[slug]/page.tsx");
check("Work pages import construction hub helper", workPage.includes("isConstructionWork"));
check("Work pages render construction hub link", workPage.includes("CONSTRUCTION_WORK_HUB_LINK"));

const home = read("components/home/CaseStudiesSection.tsx");
check("homepage links construction hub", home.includes("/industries/construction"));

check(
  "Brand Systems not listed as construction capability proof",
  !authoritySrc.includes('eyebrow: "Brand Systems"'),
);

console.log("\nAll construction authority checks passed.\n");
