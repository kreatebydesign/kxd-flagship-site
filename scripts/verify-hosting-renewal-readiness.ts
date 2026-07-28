/**
 * Hosting Renewal Readiness — Batch A (Operator Visibility).
 * Static verification only — no DB writes, notifications, or migrations.
 *
 * Run: npm run verify:hosting-renewal-readiness
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  classifyHostingProvider,
  compareHostingRenewalReadiness,
  daysRemainingDateOnly,
  deriveResponsibilityHint,
  evaluateHostingRenewalReadiness,
  urgencyFromDaysRemaining,
} from "../lib/infrastructure/hosting-renewal-readiness";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkTs(dir: string, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (["node_modules", ".next", ".git", ".tmp"].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function main() {
  console.log("\nHosting Renewal Readiness — Batch A verification\n");

  // Date-only: missing
  assert.equal(daysRemainingDateOnly(null), null);
  assert.equal(urgencyFromDaysRemaining(null), "unknown");

  // Fixed "now" as Pacific calendar 2026-07-28
  const now = new Date("2026-07-28T18:00:00.000Z"); // afternoon UTC → still Jul 28 Pacific
  assert.equal(daysRemainingDateOnly("2026-07-28", now), 0);
  assert.equal(urgencyFromDaysRemaining(0), "critical");
  assert.equal(daysRemainingDateOnly("2026-07-27", now), -1);
  assert.equal(urgencyFromDaysRemaining(-1), "critical");
  assert.equal(daysRemainingDateOnly("2026-08-10", now), 13);
  assert.equal(urgencyFromDaysRemaining(13), "attention");
  assert.equal(daysRemainingDateOnly("2026-09-10", now), 44);
  assert.equal(urgencyFromDaysRemaining(44), "watch");
  assert.equal(daysRemainingDateOnly("2026-12-01", now), 126);
  assert.equal(urgencyFromDaysRemaining(126), "ok");
  console.log("  ✔ date-only daysRemaining and urgency thresholds");

  assert.equal(classifyHostingProvider("Wix (current)"), "wix");
  assert.equal(classifyHostingProvider("KXD platform"), "kxd");
  assert.equal(classifyHostingProvider("Vercel"), "kxd");
  assert.equal(classifyHostingProvider("Squarespace"), "other");
  assert.equal(classifyHostingProvider(""), "unknown");
  assert.equal(classifyHostingProvider(null), "unknown");
  console.log("  ✔ provider classification (Wix / KXD / other / unknown)");

  assert.equal(
    deriveResponsibilityHint({
      hostingProvider: "Wix — client-managed",
      hostingAccess: false,
    }),
    "likely_client",
  );
  assert.equal(
    deriveResponsibilityHint({
      hostingProvider: "KXD platform",
      hostingAccess: true,
    }),
    "likely_kxd",
  );
  assert.equal(
    deriveResponsibilityHint({ hostingProvider: "Wix", hostingAccess: null }),
    "unknown",
  );
  console.log("  ✔ soft responsibility hints (no invented authority)");

  const missing = evaluateHostingRenewalReadiness(
    {
      hostingProvider: null,
      nextRenewalDate: null,
      domainExpirationDate: null,
    },
    now,
  );
  assert.equal(missing.overallUrgency, "unknown");
  assert.match(missing.overallRecommendedAction, /Record hosting provider/i);

  const pastDue = evaluateHostingRenewalReadiness(
    {
      hostingProvider: "Wix (current)",
      nextRenewalDate: "2026-06-01",
      domainExpirationDate: "2026-12-01",
    },
    now,
  );
  assert.equal(pastDue.providerClass, "wix");
  assert.equal(pastDue.hosting.urgency, "critical");
  assert.equal(pastDue.overallUrgency, "critical");
  assert.match(pastDue.overallRecommendedAction, /Past due/i);

  const healthy = evaluateHostingRenewalReadiness(
    {
      hostingProvider: "KXD platform",
      nextRenewalDate: "2026-12-01",
      domainExpirationDate: "2027-01-15",
    },
    now,
  );
  assert.equal(healthy.overallUrgency, "ok");

  const ordered = [healthy, pastDue, missing].sort(compareHostingRenewalReadiness);
  assert.equal(ordered[0].overallUrgency, "critical");
  console.log("  ✔ evaluateHostingRenewalReadiness + sort order");

  const helpers = read("lib/infrastructure/hosting-renewal-readiness.ts");
  const dataSrc = read("lib/infrastructure/data.ts");
  const typesSrc = read("lib/infrastructure/types.ts");
  const fleet = read(
    "components/admin/operations/infrastructure/InfrastructureScreen.tsx",
  );
  const detail = read(
    "components/admin/operations/infrastructure/InfrastructureClientScreen.tsx",
  );
  const pkg = read("package.json");
  const currentState = read("docs/KXD-OS-CURRENT-STATE.md");

  assert.match(helpers, /daysRemainingDateOnly/);
  assert.match(helpers, /America\/Los_Angeles/);
  assert.match(dataSrc, /buildHostingRenewalWatchlist/);
  assert.match(dataSrc, /hostingRenewalReadiness/);
  assert.match(typesSrc, /hostingRenewalWatchlist/);
  assert.match(fleet, /Hosting renewal readiness/);
  assert.match(detail, /Hosting renewal readiness/);
  assert.doesNotMatch(detail, /renewal alerts… will appear here/);
  assert.doesNotMatch(detail, /KXD Intelligence is coming/);
  assert.match(detail, /no automated reminders or emails/i);
  assert.match(pkg, /"verify:hosting-renewal-readiness"/);
  assert.match(currentState, /Hosting Renewal Readiness/);
  assert.match(currentState, /migration-independent|provider-neutral/i);
  console.log("  ✔ helpers, loaders, and UI wiring present");

  const migrations = readdirSync(path.join(root, "migrations")).filter((n) =>
    n.endsWith(".ts"),
  );
  assert.ok(!migrations.some((n) => /hosting.?renewal/i.test(n)));
  assert.doesNotMatch(read("migrations/index.ts"), /hosting.?renewal/i);
  console.log("  ✔ no hosting-renewal migration added");

  const scanned = [
    ...walkTs(path.join(root, "lib/infrastructure")),
    ...walkTs(path.join(root, "components/admin/operations/infrastructure")),
  ];
  const forbidden = [
    "Account" + "Switcher",
    "switch" + "ActiveClient",
    "Combined" + "Portfolio",
    "portal/" + "portfolio",
    "RESEND_API_KEY",
    "nodemailer",
    "createTransport",
  ];
  for (const file of scanned) {
    const src = readFileSync(file, "utf8");
    for (const token of forbidden) {
      assert.ok(!src.includes(token), `${file} must not contain ${token}`);
    }
    assert.doesNotMatch(src, /password\s*[:=]/i);
    assert.doesNotMatch(src, /api[_-]?key\s*[:=]/i);
  }
  console.log("  ✔ no Batch B paths, secrets, or notification senders in infra surfaces");

  console.log("\nHosting Renewal Readiness Batch A verification passed.\n");
}

main();
