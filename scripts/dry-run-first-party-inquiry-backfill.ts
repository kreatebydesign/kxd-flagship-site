/**
 * Read-only dry-run: eligible historical first-party inquiries for Sales backfill.
 * DOES NOT promote. DOES NOT write. Safe to run locally.
 *
 * Run: npm run dry-run:first-party-inquiry-backfill
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { isFirstPartyInquirySource } from "../lib/sales/follow-up-policy";
import { isInquiryEligibleForPromotion, relId } from "../lib/sales/promote-helpers";
import {
  classifyIdentityCollision,
  normalizeEmail,
} from "../lib/sales/identity";

async function main() {
  const payload = await getPayload({ config });

  const [inquiriesR, leadsR] = await Promise.all([
    payload.find({
      collection: "inquiries",
      limit: 500,
      depth: 0,
      sort: "-createdAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const inquiries = inquiriesR.docs as unknown as Array<Record<string, unknown>>;
  const leads = leadsR.docs as unknown as Array<Record<string, unknown>>;
  const open = leads.filter((l) => !["won", "lost"].includes(String(l.status)));
  const closed = leads.filter((l) => ["won", "lost"].includes(String(l.status)));

  const eligible: Array<Record<string, unknown>> = [];
  const alreadyPromoted: Array<Record<string, unknown>> = [];
  const ineligible: Array<Record<string, unknown>> = [];
  const collisions: Array<Record<string, unknown>> = [];

  for (const inquiry of inquiries) {
    const id = Number(inquiry.id);
    const source = String(inquiry.source ?? "project-application");
    const status = String(inquiry.status ?? "new");
    if (!isFirstPartyInquirySource(source)) continue;
    if (!isInquiryEligibleForPromotion(status)) {
      ineligible.push({ id, status, email: inquiry.email });
      continue;
    }
    if (relId(inquiry.promotedSalesLead)) {
      alreadyPromoted.push({ id, email: inquiry.email });
      continue;
    }
    const sourceLinked = leads.some((l) => relId(l.sourceInquiry) === id);
    if (sourceLinked) {
      alreadyPromoted.push({ id, email: inquiry.email, via: "sourceInquiry" });
      continue;
    }
    const collision = classifyIdentityCollision({
      email: inquiry.email as string,
      website: inquiry.website as string,
      company: inquiry.company as string,
      openLeads: open,
      closedLeads: closed,
    });
    if (collision.kind !== "none") {
      collisions.push({
        id,
        email: inquiry.email,
        kind: collision.kind,
        candidates:
          collision.kind === "ambiguous"
            ? collision.candidates
            : [{ id: collision.salesLead.id, via: collision.via }],
      });
      continue;
    }
    eligible.push({
      id,
      name: inquiry.name,
      email: inquiry.email,
      company: inquiry.company,
      source,
      createdAt: inquiry.createdAt,
    });
  }

  const randy = inquiries.find((doc) => {
    return (
      Number(doc.id) === 43 ||
      normalizeEmail(doc.email) === "randy@deboisentertainment.com"
    );
  });

  console.log(
    JSON.stringify(
      {
        scanned: inquiries.length,
        eligibleForPromote: eligible.length,
        alreadyPromoted: alreadyPromoted.length,
        ineligible: ineligible.length,
        identityCollisions: collisions.length,
        eligibleSample: eligible.slice(0, 20),
        collisionSample: collisions.slice(0, 20),
        randyInquiry43: randy
          ? {
              id: randy.id,
              email: randy.email,
              company: randy.company,
              status: randy.status,
              promotedSalesLead: randy.promotedSalesLead ?? null,
              source: randy.source,
            }
          : null,
        wrote: false,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
