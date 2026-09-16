/**
 * Mission 01 — recurring commercial truth dual-read + engagement→capability bridge.
 * Pure verification (no DB, no Stripe).
 *
 * Run: npx tsx scripts/verify-mission-01-commercial-truth-bridge.ts
 */
import assert from "node:assert/strict";
import {
  resolveClientRecurringCommercialTruth,
  monthlyDollarsFromCents,
} from "../lib/financial-command/recurring-commercial-truth";
import { proposeCapabilitiesFromEngagement } from "../lib/service-capabilities/propose-from-engagement";
import {
  buildLegacyBaselineNote,
  isLegacyBaselineNote,
  LEGACY_BASELINE_NOTE_PREFIX,
} from "../lib/service-capabilities/legacy-baseline";
import { resolveServiceScope } from "../lib/service-capabilities/resolve";
import { getServiceCapability, SERVICE_CAPABILITY_CATALOG } from "../lib/service-capabilities/catalog";
import type { ClientServiceAssignmentRecord } from "../lib/service-capabilities/types";
import { CLIENT_PROVISIONING_ENGINE_QUARANTINED } from "../lib/client-provisioning";

let failed = 0;
function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) failed += 1;
}

console.log("\nMission 01 — commercial truth + capability bridge\n");

// --- Phase 0 dual-read ---
{
  const retainerOnly = resolveClientRecurringCommercialTruth({
    clientId: 1,
    retainerDocs: [{ monthlyAmount: 1200, billingCadence: "monthly", billingStatus: "active" }],
    contractPackages: [],
  });
  check("retainer-only uses legacy source", retainerOnly.source === "retainer-legacy");
  check("retainer-only portfolio MRR $1200", retainerOnly.portfolioMrrDollars === 1200);

  const contractPkg = {
    schemaVersion: 1,
    structuredPaymentTerms: {
      currency: "USD",
      recurring: {
        amountCents: 120000,
        cadence: "monthly",
        serviceTitle: "Website Growth & Management",
        includes: ["Website management"],
        status: "active",
        startTrigger: "on-date",
        startBillingDate: "2026-01-01",
        startBillingDateStatus: "confirmed",
      },
    },
    operatorRecurringServices: [],
    billingPlan: { currency: "USD", obligations: [] },
  };
  const contractOnly = resolveClientRecurringCommercialTruth({
    clientId: 2,
    retainerDocs: [],
    contractPackages: [contractPkg],
  });
  check("contract-only uses contract authority", contractOnly.source === "contract-authority");
  check("contract-only portfolio MRR $1200", contractOnly.portfolioMrrDollars === 1200);

  const conflict = resolveClientRecurringCommercialTruth({
    clientId: 3,
    retainerDocs: [{ monthlyAmount: 900, billingCadence: "monthly", billingStatus: "active" }],
    contractPackages: [contractPkg],
  });
  check("disagreement is conflict", conflict.source === "conflict");
  check("conflict keeps retainer portfolio MRR", conflict.portfolioMrrDollars === 900);
  check("conflict still exposes contract commercial monthly", conflict.commercialMonthlyDollars === 1200);

  check(
    "annual Media Vault monthly-equivalent is $25",
    monthlyDollarsFromCents(30000, "annual") === 25,
  );
}

// --- Phase 1 media_vault catalog ---
{
  const vault = getServiceCapability("media_vault");
  check("media_vault catalog exists", vault?.id === "media_vault");
  check("media_vault is resource kind", vault?.kind === "resource");
  check("media_vault does not affect experience", vault?.affectsExperience === false);
  check(
    "catalog includes media_vault",
    SERVICE_CAPABILITY_CATALOG.some((row) => row.id === "media_vault"),
  );
}

// --- Phase 1 propose de Bois-shaped evidence ---
{
  const deBoisProposal = proposeCapabilitiesFromEngagement({
    clientId: 19,
    contracts: [
      {
        id: 4,
        title: "de Bois Entertainment — Direct Agreement",
        lifecyclePackage: {
          schemaVersion: 1,
          operatorRecurringServices: [
            {
              serviceKey: "website-growth-management",
              title: "Website Growth & Management",
              amountCents: 60000,
              currency: "USD",
              cadence: "monthly",
              billDay: 1,
              active: true,
              updatedAt: "2026-09-01T00:00:00.000Z",
              description: "Managed website relationship",
            },
            {
              serviceKey: "kxd-media-vault-250-gb",
              title: "KXD Media Vault — 250 GB",
              amountCents: 30000,
              currency: "USD",
              cadence: "annual",
              billDay: 22,
              effectiveDate: "2026-09-15",
              active: true,
              updatedAt: "2026-09-15T00:00:00.000Z",
              description: "250 GB private media storage",
            },
          ],
          billingPlan: {
            currency: "USD",
            obligations: [
              {
                id: "deb-media-vault-y1",
                kind: "ancillary",
                label: "KXD Media Vault — 250 GB",
                amountCents: 30000,
                status: "upcoming",
                dueDate: "2026-09-22",
                serviceTitle: "KXD Media Vault — 250 GB",
                billingCadence: "annual",
                serviceEffectiveDate: "2026-09-15",
              },
            ],
          },
        },
      },
    ],
  });
  const ids = deBoisProposal.proposals.map((p) => p.capabilityId).sort();
  check(
    "de Bois proposes managed_website",
    deBoisProposal.proposals.some((p) => p.capabilityId === "managed_website"),
  );
  check(
    "de Bois proposes media_vault",
    deBoisProposal.proposals.some((p) => p.capabilityId === "media_vault"),
  );
  check(
    "de Bois bridge proposals set drivesExperience false",
    deBoisProposal.proposals.every((p) => p.drivesExperience === false),
  );
  check("de Bois proposal ids include vault+managed", ids.includes("media_vault") && ids.includes("managed_website"));
}

// --- Phase 1 propose Primal-shaped evidence ---
{
  const primal = proposeCapabilitiesFromEngagement({
    clientId: 1,
    contracts: [
      {
        id: 10,
        title: "Primal Motorsports — Monthly Platform Retainer",
        lifecyclePackage: {
          schemaVersion: 1,
          structuredPaymentTerms: {
            currency: "USD",
            recurring: {
              amountCents: 250000,
              cadence: "monthly",
              serviceTitle: "Website Growth & Management",
              includes: ["Managed website", "Inventory experience", "Showroom"],
              status: "active",
              startTrigger: "on-date",
              startBillingDate: "2026-01-01",
              startBillingDateStatus: "confirmed",
            },
          },
          operatorRecurringServices: [],
          billingPlan: { currency: "USD", obligations: [] },
        },
      },
    ],
    commercialNotes: "Inventory listings and showroom managed in portal.",
  });
  check(
    "Primal proposes managed_website",
    primal.proposals.some((p) => p.capabilityId === "managed_website"),
  );
  check(
    "Primal proposes inventory_experience",
    primal.proposals.some((p) => p.capabilityId === "inventory_experience"),
  );
  check(
    "Primal does not invent media_vault",
    !primal.proposals.some((p) => p.capabilityId === "media_vault"),
  );
}

// --- drivesExperience does not grant modules ---
{
  const assignments: ClientServiceAssignmentRecord[] = [
    {
      id: 1,
      clientId: 19,
      capabilityId: "managed_website",
      source: "agreement",
      status: "active",
      effectiveAt: "2026-09-15T00:00:00.000Z",
      endedAt: null,
      relatedContractId: 4,
      note: "mission-01-engagement-bridge",
      drivesExperience: false,
    },
    {
      id: 2,
      clientId: 19,
      capabilityId: "media_vault",
      source: "agreement",
      status: "active",
      effectiveAt: "2026-09-15T00:00:00.000Z",
      endedAt: null,
      relatedContractId: 4,
      note: "mission-01-engagement-bridge",
      drivesExperience: false,
    },
  ];
  const scope = resolveServiceScope({ assignments });
  check("scope lists both capability ids", scope.activeCapabilityIds.length === 2);
  check("bridge assignments grant zero portal modules", scope.grantedModules.length === 0);
  check("hasAuthoritativeScope true", scope.hasAuthoritativeScope === true);
}

check("provisioning engine quarantined flag", CLIENT_PROVISIONING_ENGINE_QUARANTINED === true);

// --- Legacy baseline provenance (pure; no DB) ---
{
  const note = buildLegacyBaselineNote({
    capabilityId: "managed_website",
    actor: "operator@kxd.test",
    reason: "Pre-contract retainer relationship; no structured Contracts.",
  });
  check("legacy baseline note uses stable prefix", note.startsWith(LEGACY_BASELINE_NOTE_PREFIX));
  check("legacy baseline note records actor", note.includes("actor=operator@kxd.test"));
  check("legacy baseline note records reason", note.includes("Pre-contract retainer"));
  check("isLegacyBaselineNote recognizes prefix", isLegacyBaselineNote(note) === true);
  check("isLegacyBaselineNote rejects engagement notes", isLegacyBaselineNote("mission-01-engagement-bridge: x") === false);

  const legacyAssignments: ClientServiceAssignmentRecord[] = [
    {
      id: 101,
      clientId: 1,
      capabilityId: "managed_website",
      source: "legacy-manual",
      status: "active",
      effectiveAt: "2026-09-16T00:00:00.000Z",
      endedAt: null,
      relatedContractId: null,
      note,
      drivesExperience: false,
    },
    {
      id: 102,
      clientId: 1,
      capabilityId: "inventory_experience",
      source: "legacy-manual",
      status: "active",
      effectiveAt: "2026-09-16T00:00:00.000Z",
      endedAt: null,
      relatedContractId: null,
      note: buildLegacyBaselineNote({
        capabilityId: "inventory_experience",
        actor: "operator@kxd.test",
        reason: "Pre-contract retainer relationship; no structured Contracts.",
      }),
      drivesExperience: false,
    },
  ];
  const legacyScope = resolveServiceScope({ assignments: legacyAssignments });
  check(
    "legacy baseline lists both Primal capabilities",
    legacyScope.activeCapabilityIds.includes("managed_website") &&
      legacyScope.activeCapabilityIds.includes("inventory_experience"),
  );
  check("legacy baseline grants zero portal modules", legacyScope.grantedModules.length === 0);
  check(
    "legacy baseline has no fabricated contract refs",
    legacyAssignments.every((row) => row.relatedContractId == null && row.source === "legacy-manual"),
  );
}

// --- de Bois hosting evidence from commercial ancillary ---
{
  const deBois = proposeCapabilitiesFromEngagement({
    clientId: 19,
    contracts: [
      {
        id: 4,
        title: "KXD Digital Management & Growth Partnership",
        lifecyclePackage: {
          schemaVersion: 1,
          structuredPaymentTerms: {
            currency: "USD",
            recurring: {
              amountCents: 60000,
              cadence: "monthly",
              serviceTitle: "Website + Digital Management",
              includes: ["Ongoing website and digital management"],
              status: "pending-trigger",
            },
            ancillaryCharges: [
              {
                id: "deb-media-vault-y1",
                title: "KXD Media Vault — 250 GB",
                amountCents: 30000,
                termNotes: "Annual Media Vault allocation (250 GB).",
              },
              {
                id: "deb-hosting-y1",
                title: "KXD Managed Website Hosting",
                amountCents: 29900,
                termNotes: "Annual hosting charge becomes due at website launch.",
              },
            ],
          },
          billingPlan: { currency: "USD", obligations: [] },
        },
      },
    ],
  });
  check(
    "de Bois proposes managed_website + media_vault + hosting_infrastructure",
    deBois.proposals.some((p) => p.capabilityId === "managed_website") &&
      deBois.proposals.some((p) => p.capabilityId === "media_vault") &&
      deBois.proposals.some((p) => p.capabilityId === "hosting_infrastructure"),
  );
}

console.log("");
if (failed > 0) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("All Mission 01 checks passed.");
assert.equal(failed, 0);
