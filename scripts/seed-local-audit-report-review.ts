/**
 * LOCAL ONLY — seed fictional Website Audit + local admin for Audit Report review.
 * Never targets Neon/production. Requires DATABASE_URL → 127.0.0.1.
 *
 *   npx tsx scripts/seed-local-audit-report-review.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

function assertLocalhost(): void {
  const uri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!uri) throw new Error("DATABASE_URI/DATABASE_URL missing");
  const host = new URL(uri).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing seed against non-localhost host: ${host}`);
  }
  if (/neon\.tech|twilight-math|mute-violet/i.test(uri)) {
    throw new Error("Refusing seed: Neon markers detected in connection string");
  }
  console.log(`[seed] DB host=${host} database=${new URL(uri).pathname.replace(/^\//, "")}`);
}

async function main() {
  assertLocalhost();
  const payload = await getPayload({ config });

  const email = "demo-operator@localhost.invalid";
  const password = "LocalReview2026!";

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.docs.length === 0) {
    await payload.create({
      collection: "users",
      data: {
        email,
        password,
        displayName: "Demo Operator",
        role: "admin",
      },
      overrideAccess: true,
    });
    console.log(`[seed] Created local admin user: ${email}`);
  } else {
    console.log(`[seed] Local admin already exists: ${email}`);
  }

  const strengths = [
    "[LOCAL DEMO] Viewport meta tag configured for mobile rendering.",
    "[LOCAL DEMO] Page title is present and within a strong SEO length range.",
    "[LOCAL DEMO] Favicon present — supports brand recognition in browser tabs.",
    "[LOCAL DEMO] Lead capture form detected on the page.",
  ].join("\n");

  const opportunities = [
    "[LOCAL DEMO] Meta description could be refined for stronger search click-through.",
    "[LOCAL DEMO] Page response time is slow — visitors may abandon before content loads.",
    "[LOCAL DEMO] Conversion language is present but could be stronger and more focused.",
    "[LOCAL DEMO] Limited custom typography — brand may feel generic.",
    "[LOCAL DEMO] Accessibility gap (manual review note): low-contrast text in secondary navigation.",
    "[LOCAL DEMO] Security/technical gap (manual review note): mixed content warning on a staging asset URL.",
  ].join("\n");

  const recommendations = [
    "[LOCAL DEMO] Add a compelling meta description aligned to your primary service.",
    "[LOCAL DEMO] Optimize hosting, caching, and image delivery to improve load speed.",
    "[LOCAL DEMO] Clarify one primary conversion path — book, apply, or contact — across hero and footer.",
    "[LOCAL DEMO] Define a premium type system aligned to your brand positioning.",
    "[LOCAL DEMO] Raise secondary navigation contrast and verify keyboard focus states.",
    "[LOCAL DEMO] Serve all assets over HTTPS and remove mixed-content references.",
  ].join("\n");

  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audits" as any,
    data: {
      name: "Demo Operator",
      email: "demo-audit@localhost.invalid",
      company: "KXD Audit Review Demo",
      website: "https://example.com",
      overallScore: 72,
      grade: "C",
      performanceScore: 68,
      seoScore: 74,
      mobileScore: 81,
      conversionScore: 63,
      brandScore: 70,
      strengths,
      opportunities,
      recommendations,
      status: "new-lead",
      completedAt: new Date().toISOString(),
      internalNotes:
        "LOCAL/DEMO FIXTURE ONLY — not production data. Safe for Matt visual review of Report Generator.",
      reportStatus: "none",
    },
    overrideAccess: true,
  });

  console.log(`[seed] Created fictional audit id=${created.id}`);
  console.log(`[seed] Admin login email=${email}`);
  console.log(`[seed] Admin login password=LocalReview2026!`);
  console.log(`[seed] Marked LOCAL/DEMO — do not use as real client deliverable`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
