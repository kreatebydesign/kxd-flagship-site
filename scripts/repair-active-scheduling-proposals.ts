/**
 * Phase 26B.1 — Repair duplicate active scheduling proposals.
 *
 * Dry-run (default):
 *   npx tsx --import ./scripts/shims/register-server-only.mjs scripts/repair-active-scheduling-proposals.ts
 *
 * Apply:
 *   APPLY=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/repair-active-scheduling-proposals.ts
 *
 * Requires KXD_SERVER_ONLY_SHIM=1 when using the server-only shim import.
 */

process.env.KXD_SERVER_ONLY_SHIM = process.env.KXD_SERVER_ONLY_SHIM ?? "1";

import { loadEnv } from "payload/node";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.resolve(dirname, ".."));

const APPLY = process.env.APPLY === "1";

async function main(): Promise<void> {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const {
    ACTIVE_SCHEDULE_PROPOSAL_STATUSES,
    isActiveScheduleProposal,
    selectAuthoritativeActiveProposal,
    repairActiveProposalsForWork,
  } = await import("../lib/scheduling/index.ts");

  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work-schedule-links" as any,
    where: {
      status: { in: [...ACTIVE_SCHEDULE_PROPOSAL_STATUSES] },
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyDoc = Record<string, any>;

  function relId(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "object" && value !== null && "id" in value) {
      const id = Number((value as { id: unknown }).id);
      return Number.isFinite(id) ? id : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  const byWork = new Map<
    number,
    Array<{
      id: number;
      status: string;
      updatedAt: string;
      metadata: Record<string, unknown> | null;
    }>
  >();

  for (const raw of result.docs as AnyDoc[]) {
    const workId = relId(raw.work);
    if (workId == null) continue;
    const row = {
      id: Number(raw.id),
      status: String(raw.status),
      updatedAt: String(raw.updatedAt ?? ""),
      metadata:
        raw.metadata && typeof raw.metadata === "object"
          ? (raw.metadata as Record<string, unknown>)
          : null,
    };
    if (
      !isActiveScheduleProposal({
        status: row.status as never,
        metadata: row.metadata,
      })
    ) {
      continue;
    }
    const list = byWork.get(workId) ?? [];
    list.push(row);
    byWork.set(workId, list);
  }

  const duplicates = [...byWork.entries()].filter(([, rows]) => rows.length > 1);

  console.log("Phase 26B.1 — Active scheduling proposal integrity repair");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Active proposals scanned: ${result.docs.length}`);
  console.log(`Work items with active proposals: ${byWork.size}`);
  console.log(`Work items with duplicates: ${duplicates.length}`);

  const actor = {
    userId: 1,
    email: "system@kreatebydesign.com",
    role: "admin" as const,
    displayName: "Integrity repair",
  };

  let retained = 0;
  let superseded = 0;
  let projections = 0;

  for (const [workId, rows] of duplicates) {
    const survivor = selectAuthoritativeActiveProposal(
      rows.map((r) => ({
        id: r.id,
        status: r.status as never,
        updatedAt: r.updatedAt,
        metadata: r.metadata,
      })),
    );
    const losers = rows.filter((r) => r.id !== survivor?.id);
    console.log(
      `\nWork ${workId}: keep #${survivor?.id} (${survivor?.status}); supersede ${losers
        .map((l) => `#${l.id}/${l.status}`)
        .join(", ")}`,
    );

    const report = await repairActiveProposalsForWork(workId, actor, {
      dryRun: !APPLY,
    });
    if (report.retainedId != null) retained += 1;
    superseded += report.supersededIds.length;
    if (report.projectionRepaired) projections += 1;
  }

  // Also heal sole actives with mismatched projections when applying
  if (APPLY) {
    for (const [workId, rows] of byWork.entries()) {
      if (rows.length !== 1) continue;
      const report = await repairActiveProposalsForWork(workId, actor, {
        dryRun: false,
      });
      if (report.projectionRepaired) projections += 1;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Duplicate Work items: ${duplicates.length}`);
  console.log(`Proposals retained (groups): ${retained}`);
  console.log(`Proposals superseded/canceled: ${superseded}`);
  console.log(`Projections repaired: ${projections}`);
  if (!APPLY) {
    console.log("\nRe-run with APPLY=1 to apply changes.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
