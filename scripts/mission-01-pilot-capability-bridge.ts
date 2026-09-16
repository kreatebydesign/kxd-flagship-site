/**
 * Mission 01 pilot closeout — de Bois (engagement bridge) + Primal (legacy baseline).
 *
 * Default: dry-run (propose / plan + financial fingerprints, no writes).
 * Apply: CONFIRM_MISSION_01_APPLY=mission-01-apply …
 *
 * Never mutates pricing, obligations, paymentEvents, accepted snapshots, or Stripe.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  applyEngagementCapabilityMapping,
  loadEngagementCapabilityProposal,
} from "../lib/service-capabilities/apply-engagement-mapping";
import {
  applyLegacyBaselineCapabilities,
} from "../lib/service-capabilities/apply-legacy-baseline";
import { isLegacyBaselineNote } from "../lib/service-capabilities/legacy-baseline";
import { loadResolvedServiceScope } from "../lib/service-capabilities/assignments";
import { resolveClientRecurringCommercialTruth } from "../lib/financial-command/recurring-commercial-truth";
import { normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package";
import type { ServiceCapabilityId } from "../lib/service-capabilities/types";

const CONFIRM = "mission-01-apply";

const DE_BOIS_EXPECTED = [
  "managed_website",
  "media_vault",
  "hosting_infrastructure",
] as const satisfies readonly ServiceCapabilityId[];

const PRIMAL_EXPECTED = [
  "managed_website",
  "inventory_experience",
] as const satisfies readonly ServiceCapabilityId[];

const PRIMAL_LEGACY_REASON =
  "Operator-authorized Mission 001 baseline for pre-contract retainer relationship; structured Contracts unavailable — do not invent engagement text.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

async function findPilotClient(
  payload: Awaited<ReturnType<typeof getPayload>>,
  hint: string,
) {
  const found = await payload.find({
    collection: "clients",
    where: {
      or: [{ slug: { contains: hint } }, { name: { contains: hint } }],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const docs = found.docs as AnyDoc[];
  return (
    docs.find((d) => String(d.slug ?? "").toLowerCase().includes(hint)) ||
    docs.find((d) => String(d.name ?? "").toLowerCase().includes(hint)) ||
    null
  );
}

async function financialFingerprint(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
) {
  const [contracts, retainers] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "contracts" as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "retainers",
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const obligationFingerprints: string[] = [];
  const paymentFingerprints: string[] = [];
  let mediaVaultFacts: Record<string, unknown> | null = null;

  for (const doc of contracts.docs as AnyDoc[]) {
    const pkg = normalizeLifecyclePackage(doc.lifecyclePackage);
    for (const charge of pkg.structuredPaymentTerms?.ancillaryCharges ?? []) {
      if (/media\s*vault/i.test(String(charge.title ?? ""))) {
        mediaVaultFacts = {
          ancillaryTitle: charge.title,
          ancillaryAmountCents: charge.amountCents ?? null,
          ancillaryDueDate: charge.dueDate ?? null,
          ancillaryStatus: charge.status ?? null,
        };
      }
    }
    for (const obl of pkg.billingPlan?.obligations ?? []) {
      obligationFingerprints.push(
        [
          obl.id,
          obl.amountCents,
          obl.dueDate ?? "",
          obl.status,
          obl.amountPaidCents ?? 0,
          (obl.paymentEvents ?? []).length,
        ].join("|"),
      );
      for (const ev of obl.paymentEvents ?? []) {
        paymentFingerprints.push(
          [ev.id, ev.amountCents, ev.recordedAt, ev.externalReference ?? ""].join("|"),
        );
      }
      if (obl.id === "deb-media-vault-y1") {
        mediaVaultFacts = {
          ...(mediaVaultFacts ?? {}),
          obligationId: obl.id,
          obligationLabel: obl.label,
          obligationAmountCents: obl.amountCents,
          obligationDueDate: obl.dueDate ?? null,
          obligationStatus: obl.status,
          obligationPaidCents: obl.amountPaidCents ?? 0,
          obligationPaymentEvents: (obl.paymentEvents ?? []).length,
        };
      }
    }
  }

  const retainerFingerprints = (retainers.docs as AnyDoc[])
    .map((r) =>
      [r.id, r.monthlyAmount ?? "", r.billingStatus ?? "", r.billingCadence ?? ""].join("|"),
    )
    .sort();

  const truth = resolveClientRecurringCommercialTruth({
    clientId,
    retainerDocs: retainers.docs as AnyDoc[],
    contractPackages: (contracts.docs as AnyDoc[]).map((d) => d.lifecyclePackage),
  });

  return {
    obligationFingerprints: obligationFingerprints.sort(),
    paymentFingerprints: paymentFingerprints.sort(),
    retainerFingerprints,
    truthSource: truth.source,
    portfolioMrr: truth.portfolioMrrDollars,
    commercialMonthly: truth.commercialMonthlyDollars,
    mediaVaultFacts,
  };
}

function assertSafety(
  label: string,
  before: Awaited<ReturnType<typeof financialFingerprint>>,
  after: Awaited<ReturnType<typeof financialFingerprint>>,
  beforeModules: string[],
  afterModules: string[],
) {
  const obligationsUnchanged =
    JSON.stringify(before.obligationFingerprints) ===
    JSON.stringify(after.obligationFingerprints);
  const paymentsUnchanged =
    JSON.stringify(before.paymentFingerprints) === JSON.stringify(after.paymentFingerprints);
  const retainersUnchanged =
    JSON.stringify(before.retainerFingerprints) === JSON.stringify(after.retainerFingerprints);
  const mrrUnchanged = before.portfolioMrr === after.portfolioMrr;
  const modulesUnchanged = JSON.stringify(beforeModules) === JSON.stringify(afterModules);
  console.log(obligationsUnchanged ? "  ✔ obligations unchanged" : "  ✗ obligations CHANGED");
  console.log(paymentsUnchanged ? "  ✔ paymentEvents unchanged" : "  ✗ paymentEvents CHANGED");
  console.log(retainersUnchanged ? "  ✔ retainers unchanged" : "  ✗ retainers CHANGED");
  console.log(mrrUnchanged ? "  ✔ portfolio MRR unchanged" : "  ✗ portfolio MRR CHANGED");
  console.log(modulesUnchanged ? "  ✔ granted modules unchanged" : "  ✗ granted modules CHANGED");
  if (
    !obligationsUnchanged ||
    !paymentsUnchanged ||
    !retainersUnchanged ||
    !mrrUnchanged ||
    !modulesUnchanged
  ) {
    throw new Error(`Financial/portal safety failed for ${label}`);
  }
}

async function runDeBois(
  payload: Awaited<ReturnType<typeof getPayload>>,
  apply: boolean,
) {
  const client = await findPilotClient(payload, "de-bois");
  if (!client) throw new Error("de Bois client not found");
  const clientId = Number(client.id);
  console.log(`\n=== ${client.name} (id=${clientId}, slug=${client.slug}) ===`);
  console.log("Path: engagement-bridge (commercial evidence)");

  const beforeFinance = await financialFingerprint(payload, clientId);
  const beforeScope = await loadResolvedServiceScope(clientId);
  const proposal = await loadEngagementCapabilityProposal(clientId);

  console.log("Recurring truth source:", beforeFinance.truthSource);
  console.log("Portfolio MRR $:", beforeFinance.portfolioMrr);
  console.log("Media Vault facts:", JSON.stringify(beforeFinance.mediaVaultFacts));
  console.log("Active capabilities:", beforeScope.activeCapabilityIds.join(", ") || "(none)");
  console.log(
    "Proposed:",
    proposal.proposals.map((p) => `${p.capabilityId}:${p.confidence}`).join(", ") || "(none)",
  );

  const hosting = proposal.proposals.find((p) => p.capabilityId === "hosting_infrastructure");
  if (!hosting) {
    throw new Error(
      "STOP: hosting_infrastructure not proposed from commercial evidence — refuse to invent.",
    );
  }
  console.log("Hosting evidence decision: YES");
  console.log("  evidence:", hosting.evidence.join(" | "));

  for (const expected of DE_BOIS_EXPECTED) {
    const hit = proposal.proposals.some((p) => p.capabilityId === expected);
    const already = beforeScope.activeCapabilityIds.includes(expected);
    if (!hit && !already) {
      throw new Error(`STOP: expected ${expected} missing from de Bois proposal`);
    }
    console.log(
      hit || already
        ? `  ✔ expected ${expected} (${already ? "already assigned" : "proposed"})`
        : `  ✗ expected ${expected} missing`,
    );
  }

  const extras = proposal.proposals
    .map((p) => p.capabilityId)
    .filter((id) => !(DE_BOIS_EXPECTED as readonly string[]).includes(id));
  if (extras.length) {
    throw new Error(`STOP: unexpected de Bois proposals: ${extras.join(", ")}`);
  }

  console.log("Final capability set:", DE_BOIS_EXPECTED.join(", "));
  console.log("Provenance: source=agreement, drivesExperience=false, note=mission-01-engagement-bridge");

  if (!apply) {
    console.log("DRY-RUN — no assignment writes.");
    return;
  }

  const result = await applyEngagementCapabilityMapping({
    clientId,
    capabilityIds: [...DE_BOIS_EXPECTED],
    actor: "mission-01-pilot-script",
  });
  console.log(
    "Applied:",
    result.applied.map((a) => a.capabilityId).join(", ") || "(none)",
  );
  for (const row of result.applied) {
    console.log(
      `  provenance ${row.capabilityId}: source=${row.source}; drivesExperience=${row.drivesExperience}; contract=${row.relatedContractId}; note=${(row.note ?? "").slice(0, 120)}`,
    );
  }

  const afterFinance = await financialFingerprint(payload, clientId);
  const afterScope = await loadResolvedServiceScope(clientId);
  assertSafety(
    "de Bois",
    beforeFinance,
    afterFinance,
    beforeScope.grantedModules,
    afterScope.grantedModules,
  );

  const dupes = afterScope.assignments.filter(
    (a) => a.status === "active" && (DE_BOIS_EXPECTED as readonly string[]).includes(a.capabilityId),
  );
  const byCap = new Map<string, number>();
  for (const row of dupes) byCap.set(row.capabilityId, (byCap.get(row.capabilityId) ?? 0) + 1);
  for (const [cap, count] of byCap) {
    if (count > 1) throw new Error(`Duplicate active assignment for ${cap}`);
  }
  console.log("  ✔ no duplicate active assignments");
  console.log("After active:", afterScope.activeCapabilityIds.join(", "));
}

async function runPrimal(
  payload: Awaited<ReturnType<typeof getPayload>>,
  apply: boolean,
) {
  const client = await findPilotClient(payload, "primal");
  if (!client) throw new Error("Primal client not found");
  const clientId = Number(client.id);
  console.log(`\n=== ${client.name} (id=${clientId}, slug=${client.slug}) ===`);
  console.log("Path: operator-authorized legacy baseline (no fabricated contracts)");

  const beforeFinance = await financialFingerprint(payload, clientId);
  const beforeScope = await loadResolvedServiceScope(clientId);
  const proposal = await loadEngagementCapabilityProposal(clientId);

  console.log("Recurring truth source:", beforeFinance.truthSource);
  console.log("Portfolio MRR $:", beforeFinance.portfolioMrr);
  console.log("Retainer fingerprints:", beforeFinance.retainerFingerprints.join("; ") || "(none)");
  console.log("Active capabilities:", beforeScope.activeCapabilityIds.join(", ") || "(none)");
  console.log(
    "Engagement proposals:",
    proposal.proposals.map((p) => p.capabilityId).join(", ") || "(none) — expected empty",
  );
  if (proposal.proposals.length > 0) {
    console.log(
      "  note: engagement text present but Primal pilot still uses explicit legacy baseline authority.",
    );
  }

  console.log("Final capability set:", PRIMAL_EXPECTED.join(", "));
  console.log(
    "Provenance: source=legacy-manual; drivesExperience=false; relatedContract=null; note=legacy-baseline:…",
  );
  console.log("Reason:", PRIMAL_LEGACY_REASON);

  if (!apply) {
    console.log("DRY-RUN — no assignment writes.");
    return;
  }

  const result = await applyLegacyBaselineCapabilities({
    clientId,
    capabilityIds: [...PRIMAL_EXPECTED],
    actor: "mission-01-pilot-script",
    reason: PRIMAL_LEGACY_REASON,
  });
  console.log(
    "Applied:",
    result.applied.map((a) => a.capabilityId).join(", ") || "(none)",
  );
  for (const row of result.applied) {
    if (row.source !== "legacy-manual" || row.drivesExperience !== false) {
      throw new Error(`Bad provenance for ${row.capabilityId}`);
    }
    if (row.relatedContractId != null) {
      throw new Error(`Legacy baseline must not attach contract for ${row.capabilityId}`);
    }
    if (!isLegacyBaselineNote(row.note)) {
      throw new Error(`Missing legacy-baseline note for ${row.capabilityId}`);
    }
    console.log(
      `  provenance ${row.capabilityId}: source=${row.source}; drivesExperience=${row.drivesExperience}; note=${(row.note ?? "").slice(0, 140)}`,
    );
  }

  const afterFinance = await financialFingerprint(payload, clientId);
  const afterScope = await loadResolvedServiceScope(clientId);
  assertSafety(
    "Primal",
    beforeFinance,
    afterFinance,
    beforeScope.grantedModules,
    afterScope.grantedModules,
  );

  for (const expected of PRIMAL_EXPECTED) {
    if (!afterScope.activeCapabilityIds.includes(expected)) {
      throw new Error(`Missing active assignment after apply: ${expected}`);
    }
  }
  const activeExpected = afterScope.assignments.filter(
    (a) =>
      a.status === "active" && (PRIMAL_EXPECTED as readonly string[]).includes(a.capabilityId),
  );
  const byCap = new Map<string, number>();
  for (const row of activeExpected) {
    byCap.set(row.capabilityId, (byCap.get(row.capabilityId) ?? 0) + 1);
  }
  for (const [cap, count] of byCap) {
    if (count > 1) throw new Error(`Duplicate active assignment for ${cap}`);
  }
  console.log("  ✔ no duplicate active assignments");
  console.log("After active:", afterScope.activeCapabilityIds.join(", "));
}

async function main() {
  const apply = process.env.CONFIRM_MISSION_01_APPLY === CONFIRM;
  console.log(`\nMission 01 pilot closeout — mode=${apply ? "APPLY" : "DRY-RUN"}\n`);

  const payload = await getPayload({ config });
  await runDeBois(payload, apply);
  await runPrimal(payload, apply);

  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
