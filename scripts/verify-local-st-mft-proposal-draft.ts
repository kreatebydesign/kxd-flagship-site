/**
 * Read-only local check of the ST+MFT draft.
 *   npx tsx --env-file=.env.local scripts/verify-local-st-mft-proposal-draft.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { calculateProposalTotals } from "../lib/proposal-builder/pricing.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { formatCents } from "../lib/proposal-builder/money.ts";

const TITLE =
  "Sutherlin Throwdown + Made for Trades Website & Marketing Partnership";

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  const host = new URL(uri).hostname;
  const database = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(host);
  if (database !== "kxd_audit_report_review") throw new Error(database);
}

async function main() {
  assertLocal();
  const payload = await getPayload({ config });
  const found = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    where: { title: { equals: TITLE } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  if (!found.docs.length) throw new Error("Draft not found");
  const p = found.docs[0] as Record<string, unknown>;
  const lead =
    p.lead && typeof p.lead === "object"
      ? (p.lead as Record<string, unknown>)
      : null;
  const doc = normalizeProposalDocument(p.builderDocument);
  const totals = calculateProposalTotals(doc);
  const canonical = buildCanonicalProposal({
    id: Number(p.id),
    proposalNumber: String(p.proposalNumber ?? ""),
    title: String(p.title ?? ""),
    status: String(p.status ?? ""),
    revisionNumber: Number(p.revisionNumber ?? 1),
    builderDocument: doc,
  });
  const leaks = assertNoInternalLeakage(canonical);

  let passed = 0;
  let failed = 0;
  const check = (label: string, ok: boolean) => {
    if (ok) {
      passed += 1;
      console.log(`  ✓ ${label}`);
    } else {
      failed += 1;
      console.error(`  ✗ ${label}`);
    }
  };

  console.log("\nLocal ST+MFT draft verification\n");
  check("status draft", p.status === "draft");
  check("internal owner Matt Lunger", p.internalOwner === "Matt Lunger");
  check("two organizations", doc.organizations.length === 2);
  check("three scope groups", doc.scopeGroups.length === 3);
  check("contact Terry Brock", doc.contacts[0]?.name === "Terry Brock");
  check("phone from lead", Boolean(doc.contacts[0]?.phone) && doc.contacts[0]?.phone === lead?.phone);
  check("one-time total $4,500", totals.oneTimeTotalCents === 450_000);
  check("monthly total $500", totals.monthlyTotalCents === 50_000);
  check("no deposit", doc.depositCents === 0);
  check("no payment schedule", doc.paymentSchedule.length === 0);
  check("no canonical leaks", leaks.length === 0);
  check(
    "internal notes excluded from canonical",
    !JSON.stringify(canonical).includes("LOCAL DRAFT ONLY"),
  );
  check("share links empty", !Array.isArray(p.shareLinks) || p.shareLinks.length === 0);

  console.log(
    JSON.stringify(
      {
        id: p.id,
        status: p.status,
        editUrl: `/admin/sales/proposals/${p.id}`,
        oneTime: formatCents(totals.oneTimeTotalCents),
        monthly: formatCents(totals.monthlyTotalCents),
        phone: doc.contacts[0]?.phone,
      },
      null,
      2,
    ),
  );
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
