/**
 * Reproduce K&N proposal load + preview pipeline against env DATABASE (read-only).
 * Run: npx tsx --env-file=.env.production.local scripts/repro-kn-proposal-production.ts
 */
import { Client } from "pg";
import { buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import { getPayload } from "payload";
import config from "@payload-config";

type Row = {
  id: number;
  proposal_number: string;
  title: string;
  status: string;
  acceptance_mode: string;
  proposal_date: string | null;
  expires_at: string | null;
  revision_number: number | null;
  builder_document: unknown;
};

async function exercisePayloadFind(id: number, depth: number): Promise<void> {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    collection: "proposals",
    id,
    depth,
    overrideAccess: true,
  });
  const canonical = buildCanonicalProposal({
    id: Number(doc.id),
    proposalNumber: doc.proposalNumber as string,
    title: doc.title as string,
    status: doc.status as string,
    acceptanceMode: doc.acceptanceMode as string,
    proposalDate: doc.proposalDate as string,
    expiresAt: doc.expiresAt as string,
    revisionNumber: doc.revisionNumber as number,
    builderDocument: doc.builderDocument,
    shareSnapshot: doc.shareSnapshot,
    acceptedSnapshot: doc.acceptedSnapshot,
  });
  const html = renderProposalPreviewHtml(canonical);
  console.log(
    JSON.stringify({
      mode: "payload",
      id,
      depth,
      htmlChars: html.length,
      ok: true,
    }),
  );
}

async function exerciseSql(id: number): Promise<void> {
  const raw =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!raw) throw new Error("DATABASE_URI unset");
  const client = new Client({ connectionString: raw, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const result = await client.query<Row>(
    `SELECT id, proposal_number, title, status, acceptance_mode, proposal_date, expires_at, revision_number, builder_document
     FROM proposals WHERE id = $1`,
    [id],
  );
  await client.end();
  const row = result.rows[0];
  if (!row) throw new Error(`sql: proposal ${id} missing`);
  const canonical = buildCanonicalProposal({
    id: row.id,
    proposalNumber: row.proposal_number,
    title: row.title,
    status: row.status,
    acceptanceMode: row.acceptance_mode,
    proposalDate: row.proposal_date,
    expiresAt: row.expires_at,
    revisionNumber: row.revision_number,
    builderDocument: row.builder_document,
  });
  const html = renderProposalPreviewHtml(canonical);
  console.log(JSON.stringify({ mode: "sql", id, htmlChars: html.length, ok: true }));
}

async function main(): Promise<void> {
  const host = (() => {
    try {
      const raw =
        process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
      return raw ? new URL(raw).hostname : "(unset)";
    } catch {
      return "(invalid)";
    }
  })();
  console.log(JSON.stringify({ host, isMain: host.includes("ep-twilight-math") }));

  for (const id of [11, 12]) {
    await exerciseSql(id);
    for (const depth of [0, 1, 2] as const) {
      await exercisePayloadFind(id, depth);
    }
  }
}

main().catch((err) => {
  console.error("repro-kn-proposal-production: FAILED");
  console.error(err);
  process.exit(1);
});
