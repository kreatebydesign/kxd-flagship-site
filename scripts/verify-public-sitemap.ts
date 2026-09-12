/**
 * Verify public sitemap registry + generation invariants.
 * Run: node --import tsx scripts/verify-public-sitemap.ts
 */
import assert from "node:assert/strict";
import sitemap from "../app/sitemap.ts";
import { PUBLIC_SITEMAP_PATHS } from "../lib/seo/public-routes.ts";
import { HIDDEN_PROJECT_SLUGS } from "../lib/projects.ts";
import { SITE } from "../lib/site.ts";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

console.log("\nverify-public-sitemap\n");

const entries = sitemap();
const urls = entries.map((e) => e.url);

check("sitemap returns entries", entries.length > 0);
check("no duplicate URLs", urls.length === new Set(urls).size);
check(
  "all URLs use canonical SITE.url origin",
  urls.every((u) => u.startsWith(`${SITE.url}/`) || u === SITE.url || u === `${SITE.url}/`),
);
check(
  "Plate Journal included",
  urls.some((u) => u.endsWith("/insights/building-plate-the-umpqua-with-chef-martin")),
);
check(
  "industry hubs included",
  ["/industries/motorsports", "/industries/hospitality", "/industries/construction"].every(
    (p) => urls.some((u) => u.endsWith(p)),
  ),
);
check(
  "core commercial routes included",
  ["/services", "/platforms", "/work", "/start-project", "/contact"].every((p) =>
    urls.some((u) => u.endsWith(p) || u === `${SITE.url}${p}`),
  ),
);

for (const denied of ["/admin", "/portal", "/proposal", "/contract", "/os/", "/api/"]) {
  check(
    `no private prefix ${denied}`,
    !urls.some((u) => u.includes(denied)),
  );
}

for (const slug of HIDDEN_PROJECT_SLUGS) {
  check(`hidden work excluded: ${slug}`, !urls.some((u) => u.endsWith(`/work/${slug}`)));
}

check(
  "registry paths are unique",
  PUBLIC_SITEMAP_PATHS.length === new Set(PUBLIC_SITEMAP_PATHS).size,
);

console.log(`\n${entries.length} sitemap entries validated.\n`);
console.log("All public sitemap checks passed.\n");
