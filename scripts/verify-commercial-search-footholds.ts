/**
 * Batch 3 — Commercial Search Foothold Attack.
 *
 * Verifies the three approved acquisition targets without rendering UI:
 * hospitality, enterprise platforms, and luxury website experiences.
 *
 * Run: npm run verify:commercial-search-footholds
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOSPITALITY_PAGE } from "../lib/content/hospitality-authority.ts";
import { getStaticServiceDetail } from "../lib/content/service-details.ts";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

console.log("\nverify-commercial-search-footholds\n");

const enterprise = getStaticServiceDetail("enterprise-platforms");
const luxury = getStaticServiceDetail("luxury-website-experiences");

assert.ok(enterprise, "enterprise platform content exists");
assert.ok(luxury, "luxury website content exists");

check(
  "hospitality metadata answers website and operational-system intent",
  HOSPITALITY_PAGE.title.includes("Hospitality Website Design") &&
    HOSPITALITY_PAGE.title.includes("Operational Systems"),
);
check(
  "hospitality description is specific and SERP-sized",
  HOSPITALITY_PAGE.description.length >= 120 &&
    HOSPITALITY_PAGE.description.length <= 160,
);
check(
  "hospitality opening establishes design, development, and selective systems",
  HOSPITALITY_PAGE.lead.includes("designs and develops") &&
    HOSPITALITY_PAGE.lead.includes("custom operational systems") &&
    HOSPITALITY_PAGE.lead.includes("when the business requires"),
);

check(
  "enterprise metadata names custom business platforms",
  enterprise.title === "Custom Business Platforms & Operational Systems",
);
check(
  "enterprise opening explains connected commercial scope",
  [
    "custom business platforms",
    "client and customer experiences",
    "workflow infrastructure",
    "connected tools",
  ].every((term) => enterprise.summary.includes(term)),
);
check(
  "enterprise proof includes Plate OS",
  enterprise.proof.some(
    (item) =>
      item.slug === "plate-the-umpqua" && item.note.includes("Plate OS"),
  ),
);

check(
  "luxury metadata establishes design and development",
  luxury.title === "Premium Website Design & Development",
);
check(
  "luxury opening covers rebuild, performance, search, and measurement",
  [
    "serious rebuilds",
    "responsive performance",
    "search foundations",
    "measurement",
  ].every((term) => luxury.summary.includes(term)),
);
check("luxury proof remains selective", luxury.proof.length === 3);

const servicePage = read("app/(site)/services/[slug]/page.tsx");
for (const href of [
  "/platforms",
  "/work/plate-the-umpqua",
  "/insights/building-plate-the-umpqua-with-chef-martin",
]) {
  check(
    `enterprise capability evidence links ${href}`,
    servicePage.includes(href),
  );
}

const platformsPage = read("app/(site)/platforms/page.tsx");
check(
  "platforms hub links commercial enterprise engagement",
  platformsPage.includes('href="/services/enterprise-platforms"'),
);
check(
  "platforms hub presents Plate systems proof",
  platformsPage.includes('slug: "plate-the-umpqua"') &&
    platformsPage.includes("Plate OS"),
);

const targetedCopy = [
  HOSPITALITY_PAGE.title,
  HOSPITALITY_PAGE.description,
  HOSPITALITY_PAGE.lead,
  enterprise.title,
  enterprise.headline,
  enterprise.summary,
  luxury.title,
  luxury.headline,
  luxury.summary,
].join(" ");

for (const phrase of [
  "cutting-edge",
  "seamless",
  "innovative solutions",
  "digital transformation",
  "elevate your brand",
  "oregon",
  "beverly hills",
]) {
  check(
    `targeted copy excludes "${phrase}"`,
    !targetedCopy.toLowerCase().includes(phrase),
  );
}

check(
  "the three metadata titles remain distinct",
  new Set([HOSPITALITY_PAGE.title, enterprise.title, luxury.title]).size === 3,
);

console.log("\nAll commercial search foothold checks passed.\n");
