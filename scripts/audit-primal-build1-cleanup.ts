/**
 * Read-only Primal Build 1 cleanup audit. Prints classification evidence only.
 *
 *   node --env-file=.env.vercel.local --import ./scripts/shims/register-server-only.mjs \
 *     ./node_modules/tsx/dist/cli.mjs scripts/audit-primal-build1-cleanup.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";
import { createMonthPeriod } from "../lib/reporting/domain/period";
import { loadReportingFacts } from "../lib/reporting/persistence";

const SLUG = "primal-motorsports";

function redactEmail(email: string | null | undefined): string {
  const v = String(email ?? "").trim().toLowerCase();
  if (!v) return "(none)";
  const [user, domain] = v.split("@");
  if (!domain) return "(invalid)";
  return `${user.slice(0, 3)}…@${domain}`;
}

function looksLikeQaLead(row: Record<string, unknown>): { qa: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const name = String(row.contactName ?? "");
  const email = String(row.contactEmail ?? "").toLowerCase();
  const summary = String(row.messageSummary ?? "");
  const key = String(row.inquiryKey ?? "");
  const source = String(row.sourceSystem ?? "");
  const sourceExt = String(row.sourceExternalId ?? "");
  const notes = String(row.operatorNotes ?? "");
  const hay = `${name} ${email} ${summary} ${key} ${source} ${sourceExt} ${notes}`.toLowerCase();

  if (/phase3smoke|kxd phase3smoke/.test(hay)) reasons.push("KXD Phase3Smoke identifier");
  if (/\bsmoke\b/.test(hay)) reasons.push("smoke identifier");
  if (/\bqa\b/.test(hay) || email.includes("+qa")) reasons.push("QA identifier");
  if (email.endsWith("@kxd.local") || email.endsWith("@kxd.local.com") || email.endsWith("@kreatebydesign.com")) {
    reasons.push(`studio/QA email domain (${email.split("@")[1]})`);
  }
  if (/test0|test01|test-lead|kxd test/.test(hay)) reasons.push("explicit test identifier");
  if (key.includes("TEST") || key.includes("SMOKE") || key.includes("QA")) reasons.push("test inquiryKey");
  if (source.includes("qa") || source.includes("smoke") || source.includes("verify")) reasons.push(`sourceSystem=${source}`);

  return { qa: reasons.length > 0, reasons };
}

async function main() {
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL || "";
  let host = "(unset)";
  try {
    host = new URL(uri).hostname || "(unparsed)";
  } catch {
    host = "(invalid)";
  }
  console.log("=== Primal Build 1 cleanup audit (read-only) ===");
  console.log("DB host:", host);

  const payload = await getPayload({ config });
  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (!clients.docs[0]) {
    console.log("No primal-motorsports client.");
    return;
  }
  const client = clients.docs[0] as { id: number; name: string };
  console.log("Client:", client);

  const users = await payload.find({
    collection: "portal-users" as never,
    where: { lastActiveClientId: { equals: client.id } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const usersByEmail = await payload.find({
    collection: "portal-users" as never,
    where: { email: { contains: "primalmotorsports.com" } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  const mergedUsers = new Map<number, Record<string, unknown>>();
  for (const doc of [...users.docs, ...usersByEmail.docs] as Array<Record<string, unknown>>) {
    mergedUsers.set(Number(doc.id), doc);
  }
  console.log("\n--- Portal users (Primal-related) ---");
  for (const u of mergedUsers.values()) {
    console.log({
      id: u.id,
      email: redactEmail(String(u.email)),
      displayName: u.displayName,
      active: u.active,
    });
  }

  const memberships = await payload.find({
    collection: "portal-client-memberships" as never,
    where: { client: { equals: client.id } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });
  console.log("\n--- Memberships ---");
  for (const m of memberships.docs as Array<Record<string, unknown>>) {
    const pu = m.portalUser as Record<string, unknown> | number | null;
    const obj = typeof pu === "object" && pu ? pu : null;
    console.log({
      id: m.id,
      status: m.status,
      role: m.role,
      email: redactEmail(obj ? String(obj.email) : ""),
      displayName: obj?.displayName ?? null,
      active: obj?.active ?? null,
    });
  }

  const inquiries = await payload.find({
    collection: "client-inquiries" as never,
    where: {
      and: [{ client: { equals: client.id } }, { clientKey: { equals: SLUG } }],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    sort: "-receivedAt",
  });
  console.log(`\n--- Client inquiries (${inquiries.totalDocs}) ---`);
  const qa: Array<Record<string, unknown>> = [];
  const keep: Array<Record<string, unknown>> = [];
  for (const row of inquiries.docs as Array<Record<string, unknown>>) {
    const classified = looksLikeQaLead(row);
    const summary = {
      id: row.id,
      inquiryKey: row.inquiryKey,
      contactName: row.contactName,
      email: redactEmail(String(row.contactEmail)),
      receivedAt: row.receivedAt,
      outcomeState: row.outcomeState,
      operationalStatus: row.operationalStatus,
      programInterest: row.programInterest,
      bookedProgram: row.bookedProgram,
      sourceSystem: row.sourceSystem,
      sourceExternalId: row.sourceExternalId,
      assignedPortalOwner: row.assignedPortalOwner,
      reasons: classified.reasons,
    };
    if (classified.qa) qa.push(summary);
    else keep.push(summary);
    console.log(classified.qa ? "QA?" : "KEEP", summary);
  }
  console.log("\nQA candidates:", qa.length);
  console.log("Keep (not classified as QA):", keep.length);

  const infra = await payload.find({
    collection: "client-infrastructure" as never,
    where: { client: { equals: client.id } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  console.log("\n--- Infrastructure ---");
  for (const i of infra.docs as Array<Record<string, unknown>>) {
    console.log({
      id: i.id,
      ga4PropertyId: i.ga4PropertyId ?? null,
      searchConsoleSiteUrl: i.searchConsoleSiteUrl ?? null,
      googleAdsCustomerId: i.googleAdsCustomerId ?? null,
      googleAdsLoginCustomerId: i.googleAdsLoginCustomerId ?? null,
      deploymentStatus: i.deploymentStatus ?? null,
    });
  }

  const profiles = await payload.find({
    collection: "client-experience-profiles" as never,
    where: { client: { equals: client.id } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  console.log("\n--- Experience profiles ---");
  for (const p of profiles.docs as Array<Record<string, unknown>>) {
    console.log({
      id: p.id,
      status: p.status,
      enabledModules: p.enabledModules,
      enabledPortalModules: p.enabledPortalModules,
    });
  }

  const months = [
    createMonthPeriod(2026, 7),
    createMonthPeriod(2026, 8),
    createMonthPeriod(2026, 9),
    createMonthPeriod(2026, 10),
  ];
  console.log("\n--- Reporting facts by month ---");
  for (const period of months) {
    const facts = await loadReportingFacts({ clientId: client.id, period });
    const byProvider: Record<string, number> = {};
    const metrics: Array<{ provider: string; key: string; value: unknown; domain: string }> = [];
    for (const f of facts) {
      const provider = f.source?.providerId ?? "unknown";
      byProvider[provider] = (byProvider[provider] || 0) + 1;
      metrics.push({
        provider,
        key: f.metricKey,
        value: f.value,
        domain: f.domain,
      });
    }
    console.log({
      period: period.label,
      count: facts.length,
      byProvider,
      metrics,
    });
  }

  const factsAll = await payload.find({
    collection: "reporting-facts" as never,
    where: { client: { equals: client.id } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });
  const periods = new Map<string, { providers: Set<string>; keys: Set<string>; n: number }>();
  for (const f of factsAll.docs as Array<Record<string, unknown>>) {
    const start = String((f as { periodStart?: string }).periodStart ?? "").slice(0, 10);
    const bucket = periods.get(start) ?? { providers: new Set(), keys: new Set(), n: 0 };
    bucket.n += 1;
    bucket.providers.add(String(f.providerId ?? ""));
    bucket.keys.add(String(f.metricKey ?? ""));
    periods.set(start, bucket);
  }
  console.log("\n--- All reporting-facts buckets ---");
  for (const [start, bucket] of [...periods.entries()].sort()) {
    console.log({
      start,
      n: bucket.n,
      providers: [...bucket.providers],
      keys: [...bucket.keys],
    });
  }

  const vehicles = await payload.find({
    collection: "client-inventory-vehicles" as never,
    where: { client: { equals: client.id } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  console.log(`\n--- KXD inventory vehicles: ${vehicles.totalDocs} ---`);
  const byStatus: Record<string, number> = {};
  const byCondition: Record<string, number> = {};
  for (const v of vehicles.docs as Array<Record<string, unknown>>) {
    const st = String(v.listingStatus ?? "unknown");
    const c = String(v.condition ?? "unknown");
    byStatus[st] = (byStatus[st] || 0) + 1;
    byCondition[c] = (byCondition[c] || 0) + 1;
  }
  console.log({ byStatus, byCondition });
  for (const v of (vehicles.docs as Array<Record<string, unknown>>).slice(0, 15)) {
    console.log({
      id: v.id,
      title: v.title,
      vin: v.vin ?? null,
      stock: v.stockNumber ?? null,
      status: v.listingStatus,
      condition: v.condition,
      sourceSystem: v.sourceSystem ?? null,
      sourceExternalId: v.sourceExternalId ?? null,
    });
  }

  const reports = await payload.find({
    collection: "monthly-reports" as never,
    where: { client: { equals: client.id } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  }).catch(() => ({ docs: [], totalDocs: 0 }));
  console.log("\n--- Monthly reports ---", reports.totalDocs);
  for (const r of reports.docs as Array<Record<string, unknown>>) {
    console.log({ id: r.id, title: r.title, year: r.reportingYear, month: r.reportingMonth });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
