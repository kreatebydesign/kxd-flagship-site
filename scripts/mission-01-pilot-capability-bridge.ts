/**
 * Mission 01 pilot dry-run / apply for de Bois + Primal.
 *
 * Default: dry-run (propose + financial safety snapshot, no writes).
 * Apply: CONFIRM_MISSION_01_APPLY=mission-01-apply node --import tsx --env-file=.env.local scripts/mission-01-pilot-capability-bridge.ts
 *
 * Never mutates pricing, obligations, paymentEvents, accepted snapshots, or Stripe.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  applyEngagementCapabilityMapping,
  loadEngagementCapabilityProposal,
} from "../lib/service-capabilities/apply-engagement-mapping";
import { loadResolvedServiceScope } from "../lib/service-capabilities/assignments";
import { resolveClientRecurringCommercialTruth } from "../lib/financial-command/recurring-commercial-truth";
import { normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package";

const CONFIRM = "mission-01-apply";
const PILOTS = [
  { slugHint: "de-bois", nameHint: "de bois", expected: ["managed_website", "media_vault"] as const },
  {
    slugHint: "primal",
    nameHint: "primal",
    expected: ["managed_website", "inventory_experience"] as const,
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function findPilotClient(payload: Awaited<ReturnType<typeof getPayload>>, hint: string) {
  const found = await payload.find({
    collection: "clients",
    where: {
      or: [
        { slug: { contains: hint } },
        { name: { contains: hint } },
      ],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  const docs = found.docs as AnyDoc[];
  const match =
    docs.find((d) => String(d.slug ?? "").toLowerCase().includes(hint)) ||
    docs.find((d) => String(d.name ?? "").toLowerCase().includes(hint)) ||
    null;
  return match;
}

async function financialFingerprint(payload: Awaited<ReturnType<typeof getPayload>>, clientId: number) {
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
  for (const doc of contracts.docs as AnyDoc[]) {
    const pkg = normalizeLifecyclePackage(doc.lifecyclePackage);
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
    }
  }

  const truth = resolveClientRecurringCommercialTruth({
    clientId,
    retainerDocs: retainers.docs as AnyDoc[],
    contractPackages: (contracts.docs as AnyDoc[]).map((d) => d.lifecyclePackage),
  });

  return {
    obligationFingerprints: obligationFingerprints.sort(),
    paymentFingerprints: paymentFingerprints.sort(),
    truthSource: truth.source,
    portfolioMrr: truth.portfolioMrrDollars,
    commercialMonthly: truth.commercialMonthlyDollars,
  };
}

async function main() {
  const apply = process.env.CONFIRM_MISSION_01_APPLY === CONFIRM;
  console.log(`\nMission 01 pilot bridge — mode=${apply ? "APPLY" : "DRY-RUN"}\n`);

  const payload = await getPayload({ config });

  for (const pilot of PILOTS) {
    const client = await findPilotClient(payload, pilot.slugHint);
    if (!client) {
      console.log(`⚠ Client not found for hint "${pilot.slugHint}" — skip`);
      continue;
    }
    const clientId = Number(client.id);
    console.log(`\n=== ${client.name} (id=${clientId}, slug=${client.slug}) ===`);

    const beforeFinance = await financialFingerprint(payload, clientId);
    const beforeScope = await loadResolvedServiceScope(clientId);
    const proposal = await loadEngagementCapabilityProposal(clientId);

    console.log("Recurring truth source:", beforeFinance.truthSource);
    console.log("Portfolio MRR $:", beforeFinance.portfolioMrr);
    console.log("Active capabilities:", beforeScope.activeCapabilityIds.join(", ") || "(none)");
    console.log(
      "Proposed:",
      proposal.proposals.map((p) => `${p.capabilityId}:${p.confidence}`).join(", ") || "(none)",
    );

    for (const expected of pilot.expected) {
      const hit = proposal.proposals.some((p) => p.capabilityId === expected);
      const already = beforeScope.activeCapabilityIds.includes(expected);
      console.log(
        hit || already
          ? `  ✔ expected ${expected} (${already ? "already assigned" : "proposed"})`
          : `  ✗ expected ${expected} missing from proposal`,
      );
    }

    if (!apply) {
      console.log("DRY-RUN — no assignment writes.");
      continue;
    }

    const toApply = proposal.proposals
      .filter((p) => (pilot.expected as readonly string[]).includes(p.capabilityId))
      .map((p) => p.capabilityId);

    if (toApply.length === 0) {
      console.log("Nothing to apply (already assigned or no proposal).");
      continue;
    }

    const result = await applyEngagementCapabilityMapping({
      clientId,
      capabilityIds: toApply,
      actor: "mission-01-pilot-script",
    });
    console.log(
      "Applied:",
      result.applied.map((a) => a.capabilityId).join(", ") || "(none)",
    );

    const afterFinance = await financialFingerprint(payload, clientId);
    const afterScope = await loadResolvedServiceScope(clientId);

    const obligationsUnchanged =
      JSON.stringify(beforeFinance.obligationFingerprints) ===
      JSON.stringify(afterFinance.obligationFingerprints);
    const paymentsUnchanged =
      JSON.stringify(beforeFinance.paymentFingerprints) ===
      JSON.stringify(afterFinance.paymentFingerprints);
    const mrrUnchanged = beforeFinance.portfolioMrr === afterFinance.portfolioMrr;
    const modulesUnchanged =
      JSON.stringify(beforeScope.grantedModules) === JSON.stringify(afterScope.grantedModules);

    console.log(obligationsUnchanged ? "  ✔ obligations unchanged" : "  ✗ obligations CHANGED");
    console.log(paymentsUnchanged ? "  ✔ paymentEvents unchanged" : "  ✗ paymentEvents CHANGED");
    console.log(mrrUnchanged ? "  ✔ portfolio MRR unchanged" : "  ✗ portfolio MRR CHANGED");
    console.log(modulesUnchanged ? "  ✔ granted modules unchanged" : "  ✗ granted modules CHANGED");

    if (!obligationsUnchanged || !paymentsUnchanged || !mrrUnchanged || !modulesUnchanged) {
      throw new Error(`Financial/portal safety failed for client ${clientId}`);
    }
  }

  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
