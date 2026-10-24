/**
 * Regression: lead-scoped mutual exclusion for proposal acceptance.
 *   npx tsx scripts/verify-kn-lead-mutual-acceptance.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateLeadAcceptanceEligibility,
  findLeadSiblingAcceptanceBlock,
  isProposalAcceptanceComplete,
} from "../lib/proposal-builder/lead-mutual-acceptance-core.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const services = readFileSync(join(root, "lib/proposal-builder/services.ts"), "utf8");
const leadMod = readFileSync(join(root, "lib/proposal-builder/lead-mutual-acceptance.ts"), "utf8");
const builderRoute = readFileSync(
  join(root, "app/api/proposal/[publicToken]/builder/route.ts"),
  "utf8",
);
const publicUi = readFileSync(
  join(root, "components/proposal/PublicProposalBuilderExperience.tsx"),
  "utf8",
);

check("acceptance complete when snapshot + record", isProposalAcceptanceComplete({
  id: 11,
  acceptedSnapshot: {},
  acceptanceRecord: {},
  status: "sent",
}));

check("accepted-contract-pending blocks siblings", isProposalAcceptanceComplete({
  id: 12,
  status: "accepted-contract-pending",
}));

check("sent alone does not block", !isProposalAcceptanceComplete({ id: 12, status: "sent" }));

const block = findLeadSiblingAcceptanceBlock(12, [
  { id: 11, proposalNumber: "KXD-P-2026-0009", status: "accepted-contract-pending" },
  { id: 12, proposalNumber: "KXD-P-2026-0010", status: "sent" },
]);
check(
  "sibling 11 blocks accept on 12",
  block.canAccept === false && Boolean(block.reason?.includes("0009")),
);

const open = findLeadSiblingAcceptanceBlock(12, [
  { id: 11, proposalNumber: "KXD-P-2026-0009", status: "sent" },
  { id: 12, proposalNumber: "KXD-P-2026-0010", status: "sent" },
]);
check("both open allows accept", open.canAccept === true);

const selfDone = evaluateLeadAcceptanceEligibility({
  proposalId: 11,
  alreadyAccepted: true,
  siblings: [{ id: 11, status: "accepted-contract-pending" }],
});
check("already accepted proposal not re-opened via eligibility", selfDone.canAccept === false);

check(
  "acceptProposal uses lead transaction guard",
  /withLeadProposalAcceptanceTransaction/.test(services) &&
    /assertLeadSiblingAcceptanceAllowed/.test(services),
);

check(
  "lead lock uses FOR UPDATE on lead_id",
  /FOR UPDATE/.test(leadMod) && /lead_id/.test(leadMod),
);

check(
  "public builder API returns acceptanceEligibility",
  builderRoute.includes("getPublicProposalAcceptanceEligibility") &&
    builderRoute.includes("acceptanceEligibility"),
);

check(
  "public UI shows acceptance unavailable message",
  publicUi.includes("Acceptance unavailable") && publicUi.includes("acceptanceEligibility"),
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
