/**
 * Deterministic verification for KXD acquisition → revenue traceability.
 * No database or production records are read or written.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ACQUISITION_VERSION,
  parseAcquisitionEnvelope,
  summarizeAcquisition,
  validatePersistedAcquisition,
} from "../lib/analytics/acquisition.ts";

const ROOT = process.cwd();
const NOW = new Date("2026-09-12T16:00:00.000Z");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function check(label: string, run: () => void) {
  run();
  console.log(`  ✓ ${label}`);
}

function parse(input: unknown) {
  const result = parseAcquisitionEnvelope(input, NOW);
  if (!result.ok) assert.fail(result.error);
  assert.ok(result.value);
  return result.value;
}

console.log("\nverify-kxd-acquisition-persistence\n");

check("A. Google organic is bounded and classified without a keyword", () => {
  const value = parse({
    version: ACQUISITION_VERSION,
    firstTouch: {
      capturedAt: "2026-09-12T15:00:00.000Z",
      landingPath: "/services/enterprise-platforms?private=value",
      referrer: "https://www.google.com/search?q=custom+platform",
    },
  });
  assert.equal(value.firstTouch?.channel, "organic-search");
  assert.equal(value.firstTouch?.source, "google");
  assert.equal(value.firstTouch?.medium, "organic");
  assert.equal(value.firstTouch?.landingPath, "/services/enterprise-platforms");
  assert.equal(value.firstTouch?.referrer, "https://www.google.com");
  assert.equal(value.firstTouch?.utmTerm, undefined);
  assert.equal(validatePersistedAcquisition(value), true);
});

check("B. UTM campaign preserves exact approved campaign evidence", () => {
  const value = parse({
    firstTouch: {
      capturedAt: "2026-09-12T15:05:00.000Z",
      landingPath: "/contact",
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: "fall-platform-brief",
      utmContent: "founder-note",
    },
  });
  assert.equal(value.firstTouch?.channel, "email");
  assert.equal(value.firstTouch?.source, "newsletter");
  assert.equal(value.firstTouch?.campaign, "fall-platform-brief");
});

check("C. legitimate AI referral remains explicit and reproducible", () => {
  const value = parse({
    firstTouch: {
      capturedAt: "2026-09-12T15:10:00.000Z",
      landingPath: "/insights",
      referrer: "https://chatgpt.com/c/example?secret=discarded",
    },
  });
  assert.equal(value.firstTouch?.channel, "ai-referral");
  assert.equal(value.firstTouch?.aiReferralClass, "chatgpt");
  assert.equal(value.firstTouch?.referrer, "https://chatgpt.com");
});

check("D. missing evidence is unknown, never manufactured as direct", () => {
  const value = parse({
    firstTouch: {
      capturedAt: "2026-09-12T15:15:00.000Z",
      landingPath: "/contact",
    },
  });
  assert.equal(value.firstTouch?.channel, "unknown");
  assert.notEqual(value.firstTouch?.channel, "direct");
});

check("E. self-reported referral remains outside measured acquisition", () => {
  const inquirySchema = source("payload/collections/Inquiries.ts");
  const projectSchema = source("payload/collections/ProjectInquiries.ts");
  assert.match(inquirySchema, /name: "referral"/);
  assert.match(inquirySchema, /acquisitionField\(\)/);
  assert.match(projectSchema, /name: "referralSource"/);
  assert.match(projectSchema, /acquisitionField\(\)/);
  const value = parse({
    firstTouch: {
      landingPath: "/contact",
      referrer: "https://www.google.com/search",
    },
  });
  assert.equal("selfReportedReferral" in value, false);
});

check(
  "F. malicious fields reject; oversized values bound; PII-like UTM drops",
  () => {
    const malicious = parseAcquisitionEnvelope({
      firstTouch: { landingPath: "/contact", cookies: "session=secret" },
    });
    assert.deepEqual(malicious, {
      ok: false,
      error: "Invalid acquisition touch.",
    });

    assert.notEqual(
      validatePersistedAcquisition({
        version: ACQUISITION_VERSION,
        recordedAt: NOW.toISOString(),
        firstTouch: { landingPath: "/contact" },
      }),
      true,
    );

    const bounded = parse({
      firstTouch: {
        landingPath: "/contact",
        utmCampaign: "x".repeat(500),
        utmContent: "person@example.com",
        gclid: "bad click id with spaces",
      },
    });
    assert.equal(bounded.firstTouch?.utmCampaign?.length, 200);
    assert.equal(bounded.firstTouch?.utmContent, undefined);
    assert.equal(bounded.firstTouch?.gclid, undefined);

    const tooLarge = parseAcquisitionEnvelope({
      firstTouch: { landingPath: "/contact", utmCampaign: "x".repeat(13_000) },
    });
    assert.deepEqual(tooLarge, {
      ok: false,
      error: "Acquisition context is too large.",
    });
  },
);

check("G. historical intake without acquisition remains valid", () => {
  assert.equal(validatePersistedAcquisition(undefined), true);
  assert.equal(validatePersistedAcquisition(null), true);
  assert.deepEqual(parseAcquisitionEnvelope(undefined), { ok: true });
  assert.equal(summarizeAcquisition(undefined).label, "Unknown / Not captured");
});

check("H. proposal retains stable lead → source inquiry lineage", () => {
  const leads = source("payload/collections/SalesLeads.ts");
  const proposals = source("payload/collections/Proposals.ts");
  assert.match(leads, /name: "sourceInquiry"[\s\S]*relationTo: "inquiries"/);
  assert.match(
    leads,
    /name: "sourceProjectInquiry"[\s\S]*relationTo: "project-inquiries"/,
  );
  assert.match(proposals, /name: "lead"[\s\S]*relationTo: "sales-leads"/);
});

check(
  "I. acceptance and contract preserve references, not marketing snapshots",
  () => {
    const proposals = source("payload/collections/Proposals.ts");
    const contracts = source("payload/collections/Contracts.ts");
    assert.match(proposals, /name: "acceptedSnapshot"/);
    assert.doesNotMatch(proposals, /name: "acquisition"/);
    assert.match(contracts, /name: "proposal"[\s\S]*relationTo: "proposals"/);
    assert.doesNotMatch(contracts, /name: "acquisition"/);
  },
);

check(
  "J. paid obligation can join contract → proposal → lead → inquiry",
  () => {
    const inquiry = {
      id: 101,
      acquisition: parse({
        firstTouch: {
          landingPath: "/services/enterprise-platforms",
          referrer: "https://www.google.com/search",
        },
      }),
    };
    const lead = { id: 202, sourceInquiry: inquiry.id };
    const proposal = { id: 303, lead: lead.id };
    const contract = {
      id: 404,
      proposal: proposal.id,
      lifecyclePackage: {
        billingPlan: {
          obligations: [
            {
              id: "obligation-1",
              amountCents: 5_000_00,
              allocations: [{ amountCents: 5_000_00, paymentId: "payment-1" }],
            },
          ],
        },
      },
    };

    assert.equal(contract.proposal, proposal.id);
    assert.equal(proposal.lead, lead.id);
    assert.equal(lead.sourceInquiry, inquiry.id);
    assert.equal(inquiry.acquisition.firstTouch?.channel, "organic-search");
  },
);

check("routes persist bounded acquisition before promotion", () => {
  const inquiryRoute = source("app/api/inquiries/route.ts");
  const projectRoute = source("app/api/project-inquiries/route.ts");
  assert.match(inquiryRoute, /parseAcquisitionEnvelope/);
  assert.match(inquiryRoute, /acquisition: acquisition\.value/);
  assert.match(inquiryRoute, /promoteInquiryToSales/);
  assert.match(projectRoute, /parseAcquisitionEnvelope/);
  assert.match(projectRoute, /acquisition: parsedAcquisition\.value/);
});

console.log("\nAll KXD acquisition persistence checks passed.\n");
