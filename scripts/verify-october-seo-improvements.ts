/**
 * Verifies October 2026 public SEO / conversion improvements (static checks).
 * Run: npx tsx scripts/verify-october-seo-improvements.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getContactInvestmentRanges,
  getStartProjectInvestmentRanges,
  resolveContactBudgetContext,
  resolveStartProjectBudgetContext,
} from "../lib/inquiries/investment-range-options";
import { getCaseStudySeoOverride } from "../lib/seo/case-study-metadata";

const root = resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
}

const nextConfig = read("next.config.ts");
check(
  "Permanent redirect /work/spur → spur-restaurant",
  nextConfig.includes('source: "/work/spur"') &&
    nextConfig.includes('destination: "/work/spur-restaurant"') &&
    nextConfig.includes("permanent: true"),
);
check(
  "No redirect loop (spur-restaurant must not redirect to spur)",
  !nextConfig.includes('source: "/work/spur-restaurant"'),
);

const spurSeo = getCaseStudySeoOverride("spur-restaurant");
check(
  "Spur SEO override present",
  Boolean(spurSeo?.title && spurSeo.description.includes("website")),
);

const websiteBands = getContactInvestmentRanges(
  resolveContactBudgetContext("luxury-website-experiences"),
);
check(
  "Website contact bands exclude under-5k",
  !websiteBands.some((b) => b.value === "under-5k"),
);
check(
  "Website contact band labels $7,500 floor",
  websiteBands.some((b) => b.label.includes("$7,500")),
);

const brandBands = getContactInvestmentRanges(
  resolveContactBudgetContext("brand-systems-identity"),
);
check(
  "Brand contact bands retain under-5k",
  brandBands.some((b) => b.value === "under-5k" && b.label.includes("$4,500")),
);

const startWebsite = getStartProjectInvestmentRanges(
  resolveStartProjectBudgetContext(["Premium Website Experience"]),
);
check(
  "Start-project website bands exclude under-5k",
  !startWebsite.some((b) => b.value === "under-5k"),
);

const tracked = read("components/analytics/TrackedLink.tsx");
const workPage = read("app/(site)/work/[slug]/page.tsx");
check(
  "Case study view + CTA tracking wired",
  workPage.includes("caseStudyView") && workPage.includes("TrackedLink"),
);
check(
  "Header uses TrackedLink",
  read("components/layout/SiteHeader.tsx").includes("TrackedLink"),
);
check(
  "Analytics helper exports track on click",
  tracked.includes("trackPublicEvent"),
);

const contactForm = read("components/contact/ContactForm.tsx");
check(
  "Contact form uses contextual budget resolver",
  contactForm.includes("getContactInvestmentRanges"),
);

let failed = 0;
for (const c of checks) {
  const mark = c.ok ? "✓" : "✗";
  if (!c.ok) failed += 1;
  console.log(`${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} checks passed.`);
