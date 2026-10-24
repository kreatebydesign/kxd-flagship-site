/**
 * Recoverable snapshot of K&N proposals 11 & 12 before content apply.
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs --env-file=.env.production.local scripts/snapshot-kn-proposals-production.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const IDS = [11, 12] as const;
const OUT = resolve(process.cwd(), "deliverables/kn-proposals-for-matt-approval/snapshots");

async function main(): Promise<void> {
  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });
  mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const id of IDS) {
    const doc = (await payload.findByID({
      collection: "proposals" as never,
      id,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>;
    const file = resolve(OUT, `proposal-${id}-pre-apply-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          id: doc.id,
          proposalNumber: doc.proposalNumber,
          title: doc.title,
          status: doc.status,
          investment: doc.investment,
          lead: doc.lead,
          updatedAt: doc.updatedAt,
          revisionNumber: doc.revisionNumber,
          versionHistory: doc.versionHistory,
          builderDocument: doc.builderDocument,
          shareSnapshot: doc.shareSnapshot,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(JSON.stringify({ id, file, updatedAt: doc.updatedAt, status: doc.status }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
