/**
 * Focused coverage: proposal primary-contact phone (prefill, persistence, snapshots).
 *   npx tsx scripts/verify-proposal-contact-phone.ts
 */
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { mapAcceptedProposalToContractDraft } from "../lib/proposal-builder/contract-draft.ts";
import {
  emptyProposalDocument,
  formatProposalContactSummary,
  normalizeProposalDocument,
  prefillIdentityFromProspect,
} from "../lib/proposal-builder/document.ts";
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import {
  formatUsPhoneInput,
  normalizePhoneForStorage,
} from "../lib/formatting/phone-us.ts";

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

console.log("\nProposal contact phone verification\n");

// Existing proposals without phone remain valid
const legacy = normalizeProposalDocument({
  contacts: [{ id: "c1", name: "Legacy Contact", email: "a@b.co", isPrimary: true }],
});
check("legacy contact has no phone", legacy.contacts[0]?.phone === undefined);
check(
  "legacy contact summary omits phone",
  formatProposalContactSummary(legacy.contacts[0]) === "Legacy Contact · a@b.co",
);

// U.S. formatting helper (proposal Identity uses same helper)
check("US progressive format", formatUsPhoneInput("5416731234") === "(541) 673-1234");
check(
  "international left unforced",
  formatUsPhoneInput("+44 7700 900123") === "+44 7700 900123",
);

// Prefill when empty
const empty = emptyProposalDocument();
const prefilled = prefillIdentityFromProspect(empty, {
  companyName: "Acme Local LLC",
  contactName: "Ada Operator",
  email: "ada@example.test",
  phone: "541.673.1234",
});
check("prefill org", prefilled.organizations[0]?.name === "Acme Local LLC");
check("prefill name", prefilled.contacts[0]?.name === "Ada Operator");
check("prefill email", prefilled.contacts[0]?.email === "ada@example.test");
check(
  "prefill phone normalized",
  prefilled.contacts[0]?.phone === "(541) 673-1234",
);

// Do not overwrite non-empty proposal phone
const edited = {
  ...prefilled,
  contacts: [
    {
      ...prefilled.contacts[0]!,
      phone: "+44 7700 900123",
    },
  ],
};
const reselected = prefillIdentityFromProspect(edited, {
  companyName: "Acme Local LLC",
  contactName: "Ada Operator",
  email: "ada@example.test",
  phone: "5416739999",
});
check(
  "manual international phone not overwritten on reselect",
  reselected.contacts[0]?.phone === "+44 7700 900123",
);

// Prefill phone into existing primary with empty phone
const nameOnly = emptyProposalDocument({
  contacts: [
    {
      id: "c2",
      name: "Name Only",
      email: "",
      phone: "",
      isPrimary: true,
    },
  ],
});
const phoneFilled = prefillIdentityFromProspect(nameOnly, {
  contactName: "Name Only",
  phone: "15416731234",
});
check(
  "prefill phone onto existing empty primary",
  phoneFilled.contacts[0]?.phone === "(541) 673-1234",
);

// Manual persistence through normalize
const manual = normalizeProposalDocument({
  contacts: [
    {
      id: "c3",
      name: "Manual Edit",
      phone: formatUsPhoneInput("5035551212"),
      isPrimary: true,
    },
  ],
  internal: { internalNotes: "KEEP SECRET NOTES" },
});
check("manual phone persisted", manual.contacts[0]?.phone === "(503) 555-1212");
check(
  "storage normalize matches",
  normalizePhoneForStorage(manual.contacts[0]!.phone!) === "(503) 555-1212",
);

// Canonical snapshot includes phone; excludes internal notes
const canonical = buildCanonicalProposal({
  id: 501,
  proposalNumber: "KXD-P-LOCAL-PHONE",
  title: "Phone coverage proposal",
  status: "draft",
  revisionNumber: 1,
  builderDocument: {
    ...manual,
    organizations: [{ id: "o1", name: "Local Org" }],
    executive: { executiveSummary: "Public summary" },
  },
});
check("canonical primary phone present", canonical.primaryContact?.phone === "(503) 555-1212");
check(
  "canonical has no internal leakage",
  assertNoInternalLeakage(canonical).length === 0,
);
check(
  "canonical JSON excludes internal notes",
  !JSON.stringify(canonical).includes("KEEP SECRET NOTES"),
);

const noPhoneCanonical = buildCanonicalProposal({
  id: 502,
  proposalNumber: "KXD-P-LOCAL-NOPHONE",
  title: "No phone",
  status: "draft",
  builderDocument: legacy,
});
check(
  "existing no-phone proposal canonicalizes",
  noPhoneCanonical.primaryContact?.phone === undefined,
);

// Preview HTML / contact section
const html = renderProposalPreviewHtml(canonical);
check("preview HTML includes phone", html.includes("(503) 555-1212"));
check("preview HTML labels primary contact", /Primary contact/i.test(html));
check("preview HTML excludes internal notes", !html.includes("KEEP SECRET NOTES"));

const htmlNoPhone = renderProposalPreviewHtml(noPhoneCanonical);
check(
  "no-phone preview still renders name",
  htmlNoPhone.includes("Legacy Contact"),
);

// Contract mapping
const contract = mapAcceptedProposalToContractDraft({
  ...canonical,
  status: "accepted-contract-pending",
});
check(
  "contract parties include phone",
  contract.parties.primaryContactPhone === "(503) 555-1212",
);
check(
  "contract body includes phone",
  contract.body.includes("(503) 555-1212"),
);
check(
  "contract excludes internal notes",
  !contract.body.includes("KEEP SECRET NOTES") &&
    !JSON.stringify(contract).includes("KEEP SECRET NOTES"),
);

const contractNoPhone = mapAcceptedProposalToContractDraft({
  ...noPhoneCanonical,
  status: "accepted-contract-pending",
});
check(
  "contract without phone omits phone party field",
  contractNoPhone.parties.primaryContactPhone === undefined,
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
