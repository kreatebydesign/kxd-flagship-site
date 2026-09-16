/**
 * Mission 003B — Commercial Truth corrections + legacy baselines + universe reconcile.
 *
 * Default: dry-run (fingerprints + plan, no writes).
 * Apply: CONFIRM_MISSION_03B_APPLY=mission-03b-apply …
 *
 * Never invents payments, fake agreements, Stripe writes, or silent auto-charge.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { applyLegacyBaselineCapabilities } from "../lib/service-capabilities/apply-legacy-baseline";
import { isLegacyBaselineNote } from "../lib/service-capabilities/legacy-baseline";
import { resolveClientRecurringCommercialTruth } from "../lib/financial-command/recurring-commercial-truth";
import { normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package";
import { upsertMarkerInNotes } from "../lib/commercial/markers";
import type { ServiceCapabilityId } from "../lib/service-capabilities/types";

const CONFIRM = "mission-03b-apply";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

type BaselinePlan = {
  clientId: number;
  slugHint: string;
  capabilityIds: readonly ServiceCapabilityId[];
  reason: string;
};

const BASELINES: BaselinePlan[] = [
  {
    clientId: 9,
    slugHint: "otp",
    capabilityIds: [
      "managed_website",
      "seo_visibility",
      "analytics_reporting",
      "growth_strategy",
    ],
    reason:
      "Operator-authorized Mission 003B baseline for On Track Performance ongoing digital management.",
  },
  {
    clientId: 5,
    slugHint: "cusick",
    capabilityIds: [
      "managed_website",
      "seo_visibility",
      "analytics_reporting",
      "lead_conversion",
      "growth_strategy",
    ],
    reason:
      "Operator-authorized Mission 003B baseline for Cusick Morgan Motorsports managed digital relationship.",
  },
  {
    clientId: 8,
    slugHint: "e-davis",
    capabilityIds: [
      "managed_website",
      "seo_visibility",
      "analytics_reporting",
      "lead_conversion",
      "growth_strategy",
    ],
    reason:
      "Operator-authorized Mission 003B baseline for E. Davis Enterprises managed website + systems support.",
  },
  {
    clientId: 7,
    slugHint: "dialed-in",
    capabilityIds: [
      "managed_website",
      "seo_visibility",
      "analytics_reporting",
      "growth_strategy",
    ],
    reason:
      "Operator-authorized Mission 003B baseline for Dialed In Electric managed website + growth support.",
  },
  {
    clientId: 3,
    slugHint: "autodv8ions",
    capabilityIds: ["managed_website", "lead_conversion", "growth_strategy"],
    reason:
      "Operator-authorized Mission 003B baseline for AutoDV8ions managed website + operations systems. Payment processor is future — not included.",
  },
  {
    clientId: 11,
    slugHint: "hair-mafia",
    capabilityIds: ["managed_website"],
    reason:
      "Operator-authorized Mission 003B baseline for Hair Mafia managed website. Meevo API not included.",
  },
  {
    clientId: 4,
    slugHint: "plate-the-umpqua",
    capabilityIds: ["managed_website", "growth_strategy"],
    reason:
      "Operator-authorized Mission 003B baseline for Plate The Umpqua managed website + content/growth support.",
  },
  {
    clientId: 2,
    slugHint: "greater-tracy",
    capabilityIds: ["managed_website", "growth_strategy"],
    reason:
      "Operator-authorized Mission 003B baseline for Greater Tracy Dems managed website + digital/content support.",
  },
  {
    clientId: 10,
    slugHint: "2475-townsgate",
    capabilityIds: [
      "managed_website",
      "seo_visibility",
      "analytics_reporting",
      "growth_strategy",
    ],
    reason:
      "Operator-authorized Mission 003B baseline for 2475 Townsgate managed website + local/search support.",
  },
  {
    clientId: 18,
    slugHint: "platinum",
    capabilityIds: [
      "managed_website",
      "seo_visibility",
      "analytics_reporting",
      "growth_strategy",
      "hosting_infrastructure",
    ],
    reason:
      "Operator-authorized Mission 003B baseline from executed Platinum Film Workz contract #2 Website Growth & Management — drivesExperience false.",
  },
];

/** Apply client commercial metadata; tolerate pre-migration schema. */
async function updateClientCommercial(
  payload: Awaited<ReturnType<typeof getPayload>>,
  id: number,
  data: Record<string, unknown>,
) {
  try {
    await payload.update({
      collection: "clients",
      id,
      data,
      overrideAccess: true,
    });
  } catch (err) {
    const fallback: Record<string, unknown> = {};
    if (typeof data.commercialNotes === "string") fallback.commercialNotes = data.commercialNotes;
    if (typeof data.status === "string") fallback.status = data.status;
    if (typeof data.commercialReviewReason === "string") {
      // fold into notes if column missing
      fallback.commercialNotes = [
        String(fallback.commercialNotes ?? data.commercialNotes ?? ""),
        `commercial-review-reason: ${data.commercialReviewReason}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (Object.keys(fallback).length === 0) throw err;
    console.log(`  ⚠ client ${id} schema fallback (migration may be pending):`, String(err).slice(0, 120));
    await payload.update({
      collection: "clients",
      id,
      data: fallback,
      overrideAccess: true,
    });
  }
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
    portfolioMrr: truth.portfolioMrrDollars,
    truthSource: truth.source,
    pendingServices: truth.services
      .filter((s) => s.activationStatus === "pending-trigger")
      .map((s) => `${s.serviceKey}:${s.amountCents}`),
  };
}

function assertObligationsUnchanged(
  label: string,
  before: Awaited<ReturnType<typeof financialFingerprint>>,
  after: Awaited<ReturnType<typeof financialFingerprint>>,
  allowRetainerChange: boolean,
) {
  const oblOk =
    JSON.stringify(before.obligationFingerprints) ===
    JSON.stringify(after.obligationFingerprints);
  const payOk =
    JSON.stringify(before.paymentFingerprints) ===
    JSON.stringify(after.paymentFingerprints);
  const retOk =
    allowRetainerChange ||
    JSON.stringify(before.retainerFingerprints) ===
      JSON.stringify(after.retainerFingerprints);
  console.log(oblOk ? `  ✔ ${label} obligations unchanged` : `  ✗ ${label} obligations CHANGED`);
  console.log(payOk ? `  ✔ ${label} payments unchanged` : `  ✗ ${label} payments CHANGED`);
  console.log(retOk ? `  ✔ ${label} retainers ok` : `  ✗ ${label} retainers unexpected`);
  if (!oblOk || !payOk || !retOk) {
    throw new Error(`Safety stop: ${label} financial fingerprint violated.`);
  }
}

async function main() {
  const apply = process.env.CONFIRM_MISSION_03B_APPLY === CONFIRM;
  console.log(`Mission 003B — mode: ${apply ? "APPLY" : "DRY-RUN"}`);

  const payload = await getPayload({ config });

  const affectedIds = [8, 3, 14, 18, 12, 6, 19, 9, 5, 7, 11, 4, 2, 10];
  const beforeMap = new Map<number, Awaited<ReturnType<typeof financialFingerprint>>>();
  for (const id of affectedIds) {
    beforeMap.set(id, await financialFingerprint(payload, id));
  }

  console.log("\n=== BEFORE FINGERPRINTS ===");
  for (const id of [8, 3, 14, 18, 12, 6, 19]) {
    const fp = beforeMap.get(id)!;
    console.log(id, {
      mrr: fp.portfolioMrr,
      src: fp.truthSource,
      retainers: fp.retainerFingerprints,
      pending: fp.pendingServices,
    });
  }

  // Expected preconditions
  const davisBefore = beforeMap.get(8)!;
  if (!davisBefore.retainerFingerprints.some((r) => r.startsWith("3|250|") || r.startsWith("3|275|"))) {
    throw new Error("Safety stop: E.Davis retainer #3 amount not 250 or already 275.");
  }
  const autoBefore = beforeMap.get(3)!;
  if (!autoBefore.retainerFingerprints.some((r) => r.startsWith("4|450|") || r.startsWith("4|350|"))) {
    throw new Error("Safety stop: AutoDV8ions retainer #4 amount not 450 or already 350.");
  }

  const platinum = await payload.findByID({
    collection: "clients",
    id: 18,
    depth: 0,
    overrideAccess: true,
  });
  if (String(platinum.slug ?? "").includes("platinum") === false) {
    throw new Error("Safety stop: client 18 is not Platinum — abort.");
  }

  const plan = {
    davis: { retainerId: 3, from: 250, to: 275 },
    autodv8: { retainerId: 4, from: 450, to: 350, plannedTo: 375 },
    platinumStatus: { from: platinum.status, to: "active" },
    laCocinaReview: 12,
    spurReview: 6,
    deBoisPricingClass: "friends_family",
    otpNoteFix: true,
    baselines: BASELINES.map((b) => ({
      clientId: b.clientId,
      caps: b.capabilityIds,
    })),
  };
  console.log("\n=== MUTATION PLAN ===");
  console.log(JSON.stringify(plan, null, 2));

  if (!apply) {
    console.log("\nDry-run complete. Re-run with CONFIRM_MISSION_03B_APPLY=mission-03b-apply to apply.");
    process.exit(0);
  }

  // 1) E.Davis rate correction
  const davisRetainer = await payload.findByID({
    collection: "retainers",
    id: 3,
    depth: 0,
    overrideAccess: true,
  });
  if (Number(davisRetainer.monthlyAmount) === 250) {
    const notes = upsertMarkerInNotes(davisRetainer.notes as string, "rate-correction", {
      from: 250,
      to: 275,
      actor: "matt",
      asOf: "2026-09-16",
      authority: "operator-confirmed-current-commercial-truth",
      reason: "storage/infrastructure cost associated with Supabase; Eric notified by text",
      notNewAgreement: true,
    });
    await payload.update({
      collection: "retainers",
      id: 3,
      data: { monthlyAmount: 275, notes },
      overrideAccess: true,
    });
    console.log("✔ E.Davis retainer #3 $250 → $275");
  } else if (Number(davisRetainer.monthlyAmount) === 275) {
    console.log("↷ E.Davis already $275");
  } else {
    throw new Error(`Unexpected E.Davis amount ${davisRetainer.monthlyAmount}`);
  }

  const davisClient = (await payload.findByID({
    collection: "clients",
    id: 8,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  await updateClientCommercial(payload, 8, {
      commercialNotes: upsertMarkerInNotes(davisClient.commercialNotes, "rate-correction", {
        from: 250,
        to: 275,
        actor: "matt",
        asOf: "2026-09-16",
        authority: "operator-confirmed",
        notNewAgreement: true,
      }),
      commercialCategories: ["active_recurring"],
    });

  // 2) AutoDV8ions correction + planned trigger
  const autoRetainer = await payload.findByID({
    collection: "retainers",
    id: 4,
    depth: 0,
    overrideAccess: true,
  });
  const autoNotesBase =
    Number(autoRetainer.monthlyAmount) === 450 || Number(autoRetainer.monthlyAmount) === 350
      ? upsertMarkerInNotes(autoRetainer.notes as string, "rate-correction", {
          from: 450,
          to: 350,
          actor: "matt",
          asOf: "2026-09-16",
          authority: "operator-confirmed-stale-legacy-correction",
          reason: "Correction of inaccurate legacy data — NOT a new discount",
          notNewAgreement: true,
        })
      : String(autoRetainer.notes ?? "");
  const autoNotes = upsertMarkerInNotes(autoNotesBase, "planned-mrr-increase", {
    from: 350,
    to: 375,
    delta: 25,
    gate: "payment-processor-deposit-system-launch",
    status: "pending",
    note: "Do not activate $375 until payment processor/deposit system goes live",
  });
  if (Number(autoRetainer.monthlyAmount) === 450) {
    await payload.update({
      collection: "retainers",
      id: 4,
      data: { monthlyAmount: 350, notes: autoNotes },
      overrideAccess: true,
    });
    console.log("✔ AutoDV8ions retainer #4 $450 → $350 + planned +$25 marker");
  } else if (Number(autoRetainer.monthlyAmount) === 350) {
    await payload.update({
      collection: "retainers",
      id: 4,
      data: { notes: autoNotes },
      overrideAccess: true,
    });
    console.log("↷ AutoDV8ions already $350 — planned marker refreshed");
  } else {
    throw new Error(`Unexpected AutoDV8ions amount ${autoRetainer.monthlyAmount}`);
  }

  await updateClientCommercial(payload, 3, {
      commercialCategories: ["active_recurring"],
      commercialNotes: upsertMarkerInNotes(
        ((await payload.findByID({
          collection: "clients",
          id: 3,
          depth: 0,
          overrideAccess: true,
        })) as AnyDoc).commercialNotes,
        "planned-mrr-increase",
        {
          from: 350,
          to: 375,
          delta: 25,
          gate: "payment-processor-deposit-system-launch",
          status: "pending",
        },
      ),
    });

  // 3) Platinum reconcile — reuse id 18, do not duplicate
  await updateClientCommercial(payload, 18, {
      status: "active",
      commercialCategories: ["active_recurring", "active_project"],
      commercialNotes: upsertMarkerInNotes(
        (platinum as AnyDoc).commercialNotes,
        "rate-correction",
        {
          note: "Reconciled into commercial universe from executed contract #2; status prospect→active",
          actor: "mission-03b",
          asOf: "2026-09-16",
          amount: 325,
          effective: "2026-09-01",
        },
      ),
    });
  console.log("✔ Platinum Film Workz client #18 prospect → active (no duplicate)");

  // 4) La Cocina + SPUR review
  for (const [id, name] of [
    [12, "La Cocina"],
    [6, "SPUR Restaurant & Bar"],
  ] as const) {
    const c = (await payload.findByID({
      collection: "clients",
      id,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    await updateClientCommercial(payload, id, {
        commercialCategories: ["review_required", "historical"],
        commercialReviewReason: `${name}: historical commercial evidence exists but current commercial activity is not proven in production — excluded from verified MRR.`,
        commercialNotes: upsertMarkerInNotes(c.commercialNotes, "review-required", {
          reason: "current-commercial-activity-unproven",
          actor: "mission-03b",
          asOf: "2026-09-16",
        }),
      });
    console.log(`✔ ${name} marked review_required (no invented MRR)`);
  }

  // 5) de Bois friends & family label only — no amount rewrite
  const deBois = (await payload.findByID({
    collection: "clients",
    id: 19,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  await updateClientCommercial(payload, 19, {
      pricingClassification: "friends_family",
      commercialCategories: ["active_project", "annual_only"],
      commercialNotes: upsertMarkerInNotes(deBois.commercialNotes, "pricing-class", {
        class: "friends_family",
        actor: "mission-03b",
        note: "Label only — contract economics preserved exactly",
      }),
    });
  console.log("✔ de Bois pricingClassification=friends_family (amounts untouched)");

  // 6) OTP Carts — performance marker + fix Cusick provenance on assignments
  const otpClient = (await payload.findByID({
    collection: "clients",
    id: 14,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  await updateClientCommercial(payload, 14, {
      commercialCategories: ["active_recurring", "performance"],
      commercialNotes: upsertMarkerInNotes(otpClient.commercialNotes, "performance-rule", {
        amount: 300,
        unit: "per_confirmed_qualifying_cart_sale",
        path: "otp-carts-online-form-web-lead",
        notPercent: true,
        notMrr: true,
        notOnTrack: true,
        lifecycle: "lead→sale_confirmed→commission_earned→commission_paid",
        actor: "mission-03b",
      }),
    });

  const otpCaps = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-service-assignments" as any,
    where: { client: { equals: 14 } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  for (const cap of otpCaps.docs as AnyDoc[]) {
    const note = String(cap.note ?? "");
    if (/Cusick/i.test(note) && !isLegacyBaselineNote(note)) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-service-assignments" as any,
        id: cap.id,
        data: {
          note: `OTP Carts commercial/capability assignment (Mission 003B provenance correction). Prior note incorrectly referenced Cusick. capability=${cap.capabilityId}`,
        },
        overrideAccess: true,
      });
      console.log(`✔ OTP assignment #${cap.id} Cusick provenance corrected`);
    }
  }

  // 7) Operator sales-memory activities (idempotent by title)
  const memorySeeds = [
    {
      client: 3,
      activityType: "commercial-trigger" as const,
      title: "AutoDV8ions — +$25 MRR at payment processor launch",
      summary:
        "Planned recurring increase $350→$375 when payment processor/deposit system goes live. Not current MRR.",
    },
    {
      client: 19,
      activityType: "commercial-trigger" as const,
      title: "de Bois — $600/mo unlocks at website launch",
      summary:
        "Pending-trigger Website + Digital Management. Media Vault service start 2026-09-15; charge due 2026-09-22.",
    },
    {
      client: 12,
      activityType: "commercial-review" as const,
      title: "La Cocina — commercial review required",
      summary: "Historical terms do not prove current commercial activity. Excluded from verified MRR.",
    },
    {
      client: 6,
      activityType: "commercial-review" as const,
      title: "SPUR — commercial review required",
      summary: "Current commercial relationship not sufficiently established. No revenue counted.",
    },
  ];
  for (const seed of memorySeeds) {
    const existing = await payload.find({
      collection: "sales-activities",
      where: {
        and: [{ client: { equals: seed.client } }, { title: { equals: seed.title } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.totalDocs > 0) {
      console.log(`↷ sales-memory exists: ${seed.title}`);
      continue;
    }
    try {
      await payload.create({
        collection: "sales-activities",
        data: {
          ...seed,
          occurredAt: new Date().toISOString(),
        },
        overrideAccess: true,
      });
      console.log(`✔ sales-memory: ${seed.title}`);
    } catch (err) {
      console.log(`⚠ sales-memory skipped (enum migration pending?): ${seed.title} — ${String(err).slice(0, 100)}`);
    }
  }

  // 8) Legacy baselines (idempotent via activateClientService)
  for (const baseline of BASELINES) {
    const client = await payload.findByID({
      collection: "clients",
      id: baseline.clientId,
      depth: 0,
      overrideAccess: true,
    });
    if (!String(client.slug ?? "").toLowerCase().includes(baseline.slugHint.split("-")[0]!)) {
      // softer check — platinum slug contains platinum
      if (!String(client.slug ?? "").toLowerCase().includes(baseline.slugHint)) {
        console.log(
          `⚠ skip baseline client ${baseline.clientId} — slug ${client.slug} missing ${baseline.slugHint}`,
        );
        continue;
      }
    }
    const result = await applyLegacyBaselineCapabilities({
      clientId: baseline.clientId,
      capabilityIds: baseline.capabilityIds,
      actor: "mission-03b",
      reason: baseline.reason,
    });
    console.log(
      `✔ baseline ${client.name}: applied=${result.applied.length} skipped=${result.skipped.length}`,
    );
  }

  // OTP performance rule marker on existing performance_component if present
  // (already has assignment)

  console.log("\n=== AFTER FINGERPRINTS ===");
  for (const id of affectedIds) {
    const before = beforeMap.get(id)!;
    const after = await financialFingerprint(payload, id);
    const allowRetainer = id === 8 || id === 3;
    assertObligationsUnchanged(`client:${id}`, before, after, allowRetainer);
    if (id === 8 && after.portfolioMrr !== 275) {
      throw new Error(`E.Davis MRR expected 275 got ${after.portfolioMrr}`);
    }
    if (id === 3 && after.portfolioMrr !== 350) {
      throw new Error(`AutoDV8ions MRR expected 350 got ${after.portfolioMrr}`);
    }
    if (id === 18 && after.portfolioMrr !== 325) {
      throw new Error(`Platinum MRR expected 325 got ${after.portfolioMrr}`);
    }
    console.log(id, { mrr: after.portfolioMrr, src: after.truthSource, pending: after.pendingServices });
  }

  console.log("\nMission 003B apply complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
