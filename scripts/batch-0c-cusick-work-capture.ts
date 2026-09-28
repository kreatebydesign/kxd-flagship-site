/**
 * Batch 0C — Cusick Operator Work Capture (production-controlled).
 *
 * Writes ONLY operator-verified facts into monthly-deliverables.
 * Does NOT invent dates, duplicate OTP Carts August completions, publish reports,
 * invite Don, or modify Google mappings.
 *
 * Usage:
 *   KXD_CONFIRM_CUSICK_BATCH_0C=1 APPLY=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-0c-cusick-work-capture.ts
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_BATCH_0C === "1";
const APPLY = process.env.APPLY === "1";

const OWNER = "Kreate by Design";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type DeliverableInput = {
  clientId: number;
  title: string;
  category:
    | "website"
    | "seo"
    | "content"
    | "reporting"
    | "strategy"
    | "support"
    | "design"
    | "development"
    | "admin";
  month: number;
  year: number;
  status:
    | "not-started"
    | "in-progress"
    | "waiting-on-client"
    | "complete"
    | "blocked";
  completedDate?: string | null;
  notes: string;
};

async function findByTitle(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
  title: string,
): Promise<AnyDoc | null> {
  const res = await payload.find({
    collection: "monthly-deliverables",
    where: {
      and: [{ client: { equals: clientId } }, { title: { equals: title } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (res.docs[0] as AnyDoc) ?? null;
}

async function upsertDeliverable(
  payload: Awaited<ReturnType<typeof getPayload>>,
  input: DeliverableInput,
  log: string[],
): Promise<"created" | "updated" | "unchanged" | "planned"> {
  const existing = await findByTitle(payload, input.clientId, input.title);
  const data = {
    client: input.clientId,
    title: input.title,
    category: input.category,
    month: input.month,
    year: input.year,
    status: input.status,
    completedDate: input.completedDate ?? null,
    owner: OWNER,
    notes: input.notes,
  };

  if (!APPLY) {
    log.push(
      `PLAN ${existing ? "UPDATE" : "CREATE"} client=${input.clientId} "${input.title}" status=${input.status}`,
    );
    return "planned";
  }

  if (existing) {
    await payload.update({
      collection: "monthly-deliverables",
      id: existing.id,
      data,
      overrideAccess: true,
    });
    log.push(`UPDATED #${existing.id} client=${input.clientId} "${input.title}"`);
    return "updated";
  }

  const created = await payload.create({
    collection: "monthly-deliverables",
    data,
    overrideAccess: true,
  });
  log.push(`CREATED #${created.id} client=${input.clientId} "${input.title}"`);
  return "created";
}

async function updateById(
  payload: Awaited<ReturnType<typeof getPayload>>,
  id: number,
  data: Record<string, unknown>,
  log: string[],
  label: string,
): Promise<void> {
  if (!APPLY) {
    log.push(`PLAN UPDATE #${id} ${label}`);
    return;
  }
  await payload.update({
    collection: "monthly-deliverables",
    id,
    data,
    overrideAccess: true,
  });
  log.push(`UPDATED #${id} ${label}`);
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== BATCH 0C — Cusick Work Capture ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing Batch 0C against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error("Set KXD_CONFIRM_CUSICK_BATCH_0C=1 to acknowledge production scope.");
  }

  const payload = await getPayload({ config });
  const log: string[] = [];
  const unwritten: string[] = [];
  const duplicatesAvoided: string[] = [];

  // ── CMM #5 ────────────────────────────────────────────────────────────────
  const cmmHistorical: DeliverableInput[] = [
    {
      clientId: 5,
      title: "Website reliability and content persistence improvements",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work. Exact completion day not recorded in source. CMM documented as live entering September 2026. Do not treat this as a September completion.",
    },
    {
      clientId: 5,
      title: "News/content persistence work",
      category: "content",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work. Exact completion day not recorded in source.",
    },
    {
      clientId: 5,
      title: "URL reliability improvements",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work. Exact completion day not recorded in source.",
    },
    {
      clientId: 5,
      title: "Sitemap/search-indexing cleanup",
      category: "seo",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work. Exact completion day not recorded in source.",
    },
    {
      clientId: 5,
      title: "Driver search-title/SEO improvements",
      category: "seo",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work. Exact completion day not recorded in source.",
    },
    {
      clientId: 5,
      title: "Social metadata improvements",
      category: "content",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work. Exact completion day not recorded in source.",
    },
    {
      clientId: 5,
      title: "Search Console / measurement setup and monitoring",
      category: "seo",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 client-facing work (setup). Exact completion day not recorded. Ongoing monitoring continues as separate September in-progress items.",
    },
  ];

  const cmmCurrent: DeliverableInput[] = [
    {
      clientId: 5,
      title: "Search performance monitoring and ongoing SEO optimization",
      category: "seo",
      month: 9,
      year: 2026,
      status: "in-progress",
      completedDate: null,
      notes:
        "Current September 2026 retainer work. No completion date. Next: continue Search Console performance monitoring and optimization based on actual search opportunities.",
    },
    {
      clientId: 5,
      title: "Ongoing website/search health monitoring",
      category: "support",
      month: 9,
      year: 2026,
      status: "in-progress",
      completedDate: null,
      notes:
        "Current September 2026 retainer work. No completion date. Ongoing website and search health monitoring.",
    },
  ];

  for (const item of [...cmmHistorical, ...cmmCurrent]) {
    await upsertDeliverable(payload, item, log);
  }
  unwritten.push(
    "CMM: No September completed items (operator left blank).",
    "CMM: Next-up captured as notes on SEO monitoring deliverable (no separate fake completed item).",
  );

  // ── OTP #9 ────────────────────────────────────────────────────────────────
  const otpHistorical: DeliverableInput[] = [
    {
      clientId: 9,
      title: "Major OTP website rebuild developed and staged",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded. Historical portfolio status entering September: staged and awaiting Don review/approval and production/DNS cutover. Recorded as historical status — not asserted as current waiting-on-client without new evidence.",
    },
    {
      clientId: 9,
      title: "Lead-generation / conversion-oriented website work",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
    {
      clientId: 9,
      title: "Search/SEO foundation work",
      category: "seo",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
    {
      clientId: 9,
      title: "Search Console/measurement setup and monitoring",
      category: "seo",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work (setup). Exact completion day not recorded. Ongoing follow-through continues as separate September in-progress items.",
    },
  ];

  const otpCurrent: DeliverableInput[] = [
    {
      clientId: 9,
      title: "Website/search performance monitoring",
      category: "seo",
      month: 9,
      year: 2026,
      status: "in-progress",
      completedDate: null,
      notes:
        "Current September 2026 retainer work. No completion date. Next: continue search/indexing monitoring and optimization.",
    },
    {
      clientId: 9,
      title: "Search Console/indexing follow-through",
      category: "seo",
      month: 9,
      year: 2026,
      status: "in-progress",
      completedDate: null,
      notes:
        "Current September 2026 retainer work. No completion date. Continues Search Console and indexing follow-through from prior foundation work.",
    },
  ];

  for (const item of [...otpHistorical, ...otpCurrent]) {
    await upsertDeliverable(payload, item, log);
  }
  unwritten.push(
    "OTP: No September completed items (no independently dated completion confirmed).",
    "OTP: Staging/approval dependency preserved as historical note on rebuild deliverable — NOT written as current waiting-on-client.",
    "OTP: Next-up captured as notes on performance monitoring deliverable.",
  );

  // ── OTP Carts #14 ─────────────────────────────────────────────────────────
  const otpCartsCompleted = await payload.find({
    collection: "monthly-deliverables",
    where: {
      and: [
        { client: { equals: 14 } },
        { status: { equals: "complete" } },
        { month: { equals: 8 } },
        { year: { equals: 2026 } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  for (const d of otpCartsCompleted.docs as AnyDoc[]) {
    duplicatesAvoided.push(
      `OTP Carts: preserved existing complete #${d.id} "${d.title}" (no rewrite of August completions).`,
    );
  }

  duplicatesAvoided.push(
    "OTP Carts: broader launch themes (production launch, sales/lead paths, analytics/measurement, location pages, mobile QA) left unwritten — already covered by existing August deliverables #1–#6 without creating duplicates.",
  );
  unwritten.push(
    "OTP Carts: No new September completed deliverable (operator instructed not to invent one).",
    "OTP Carts: Broader launch themes not duplicated as new records.",
  );

  // #7 Westlake GBP — waiting on Nicole verification
  await updateById(
    payload,
    7,
    {
      status: "waiting-on-client",
      month: 9,
      year: 2026,
      completedDate: null,
      notes:
        "OTP Carts Westlake Google Business Profile recovered and configured (Townsgate). Public name remains OTP Carts. Nicole has been given/identified for Business Profile access to complete Google’s required verification. Video/location verification remains the outstanding client step. After verification, continue/finish Westlake local-search profile optimization.",
    },
    log,
    'OTP Carts Westlake GBP → waiting-on-client (Nicole verification)',
  );

  // #8 Local search — depends on verified profile
  await updateById(
    payload,
    8,
    {
      status: "in-progress",
      month: 9,
      year: 2026,
      completedDate: null,
      notes:
        "Westlake local search / showroom setup remains in progress insofar as it depends on the verified Google Business Profile. Thermal OTP Carts listing was not launched. Continue/finish Westlake local-search profile optimization after Nicole completes verification.",
    },
    log,
    "OTP Carts local search → in-progress (depends on verified GBP)",
  );

  // #9 Access recovery — do not mark complete; stop describing Westlake path as open Google support case
  await updateById(
    payload,
    9,
    {
      status: "in-progress",
      month: 9,
      year: 2026,
      completedDate: null,
      notes:
        "Westlake OTP Carts Business Profile access path is now with Nicole for Google video/location verification (see deliverable “Google Business Profile setup (Westlake)”). This item is not marked complete — verification and any remaining ownership/local-presence follow-through are still open. Do not describe the active Westlake path as an unresolved Google support case; prior Aug 9 Google support case context applied to the separate On Track Performance profile access situation and is not asserted here as the current Westlake blocker.",
    },
    log,
    "OTP Carts profile ownership/access → notes/status clarified (not complete)",
  );

  // ── 2475 #10 ──────────────────────────────────────────────────────────────
  const townsgateHistorical: DeliverableInput[] = [
    {
      clientId: 10,
      title: "2475 Townsgate website rebuild",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded. Historical reporting documented the rebuild as staged entering September and awaiting approval/deployment/DNS — recorded as historical status, not asserted as current waiting-on-client.",
    },
    {
      clientId: 10,
      title: "Eight tenant/business profiles implemented",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
    {
      clientId: 10,
      title: "Accessibility and mobile QA",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
    {
      clientId: 10,
      title: "Contact/mailto routing",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
    {
      clientId: 10,
      title: "On Track Performance tenant alignment",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
    {
      clientId: 10,
      title: "Legacy redirect/cutover documentation",
      category: "website",
      month: 8,
      year: 2026,
      status: "complete",
      completedDate: null,
      notes:
        "Documented July/August 2026 historical work. Exact completion day not recorded in source.",
    },
  ];

  const townsgateCurrent: DeliverableInput[] = [
    {
      clientId: 10,
      title: "Google Analytics 4 tracking installation and production verification",
      category: "reporting",
      month: 9,
      year: 2026,
      status: "complete",
      completedDate: "2026-09-28",
      notes:
        "September 2026 completion (2026-09-28). GA4 Measurement ID G-23KB7JQDML installed on the production website. Production deployment verified. GA4 Realtime subsequently showed an active user, confirming event receipt.",
    },
    {
      clientId: 10,
      title: "Search/analytics monitoring following production measurement setup",
      category: "seo",
      month: 9,
      year: 2026,
      status: "in-progress",
      completedDate: null,
      notes:
        "Current September 2026 work after GA4 install. No completion date. Next: monitor newly installed GA4 data as sufficient post-installation data accumulates; continue Search Console/search visibility monitoring. Google performance facts for the September report remain the completed August 2026 period unless September facts are later synced.",
    },
  ];

  for (const item of [...townsgateHistorical, ...townsgateCurrent]) {
    await upsertDeliverable(payload, item, log);
  }

  // Don safety
  const don = (
    await payload.find({
      collection: "portal-users",
      where: { email: { equals: "don.cusick@deezco.com" } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as AnyDoc | undefined;
  const invite = (
    await payload.find({
      collection: "portal-invitations",
      where: { email: { equals: "don.cusick@deezco.com" } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as AnyDoc | undefined;

  console.log("\n--- LOG ---");
  for (const line of log) console.log(line);
  console.log("\n--- DUPLICATES AVOIDED ---");
  for (const line of duplicatesAvoided) console.log(line);
  console.log("\n--- UNWRITTEN ---");
  for (const line of unwritten) console.log(line);
  console.log(
    "\nDON",
    JSON.stringify({
      id: don?.id ?? null,
      active: don?.active ?? null,
    }),
  );
  console.log(
    "INVITE",
    JSON.stringify({
      id: invite?.id ?? null,
      status: invite?.status ?? null,
      sendCount: invite?.sendCount ?? 0,
      sentAt: invite?.sentAt ?? null,
    }),
  );

  // Final inventory
  for (const clientId of [5, 9, 14, 10]) {
    const res = await payload.find({
      collection: "monthly-deliverables",
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
      sort: "id",
    });
    console.log(
      "\nINVENTORY",
      clientId,
      JSON.stringify(
        (res.docs as AnyDoc[]).map((d) => ({
          id: d.id,
          title: d.title,
          month: d.month,
          year: d.year,
          status: d.status,
          completedDate: d.completedDate ?? null,
        })),
      ),
    );
  }

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with APPLY=1 to write.");
  }
  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
