/**
 * Client Site Intelligence institutional memory pack — Human Decision gate.
 *
 * Architecture authorized / V1 scoped. NOT implemented. NOT shipped.
 */

import { DOCTRINE_OBJECT_ID } from "../archive/doctrine-seed";
import { PRODUCT_DNA_OBJECT_ID } from "../archive/product-dna-seed";
import type {
  ArchitectureObject,
  ProductEvolutionObject,
  ProductInventoryObject,
  ProductKillListObject,
  RoadmapItemObject,
  TechnicalDebtObject,
} from "../contracts";
import type { EvidenceObject, EvidenceRegistry } from "../evidence";
import { createProductEvolutionObject } from "../evolution/rules";
import { createProductKillListObject } from "../kill-list/rules";
import type { ProductIntelligenceIndex } from "../product-index";
import {
  CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES,
  CLIENT_SITE_INTELLIGENCE_PI_VERDICT,
  CLIENT_SITE_INTELLIGENCE_V1_SCOPE,
} from "./architecture";
import {
  CLIENT_SITE_INTELLIGENCE_EVIDENCE,
  CLIENT_SITE_INTELLIGENCE_EVIDENCE_IDS,
} from "./evidence";
import { CSI_IDS, CSI_RECORDED_AT, CSI_REVIEW_AT, CSI_V1A_RECORDED_AT } from "./ids";

const DNA = PRODUCT_DNA_OBJECT_ID;
const DOCTRINE = DOCTRINE_OBJECT_ID;
const RECORDED = CSI_RECORDED_AT;
const REVIEW = CSI_REVIEW_AT;
const ALL_EVIDENCE = CLIENT_SITE_INTELLIGENCE_EVIDENCE_IDS;

export interface ClientSiteIntelligenceMemoryPack {
  evidence: EvidenceObject[];
  productInventory: ProductInventoryObject[];
  architecture: ArchitectureObject[];
  technicalDebt: TechnicalDebtObject[];
  roadmapItems: RoadmapItemObject[];
  productKillList: ProductKillListObject[];
  productEvolution: ProductEvolutionObject[];
  hallOfFame: [];
  futureBets: [];
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function mergeEvidenceRegistry(
  registry: EvidenceRegistry,
  records: EvidenceObject[],
): EvidenceRegistry {
  const merged = mergeById(registry.records, records);
  const byType = { ...registry.byType };
  for (const key of Object.keys(byType) as Array<keyof typeof byType>) {
    byType[key] = [];
  }
  for (const record of merged) {
    const type = record.detail.evidenceType;
    if (!byType[type].includes(record.id)) {
      byType[type].push(record.id);
    }
  }
  return { ...registry, records: merged, byType };
}

function buildInventory(): ProductInventoryObject[] {
  return [
    {
      id: CSI_IDS.inventoryCapability,
      type: "product_inventory",
      title: "Client Site Intelligence",
      status: "in_flight",
      ownerRole: "cpo",
      createdAt: RECORDED,
      lastReviewedAt: CSI_V1A_RECORDED_AT,
      nextReviewAt: REVIEW,
      evidenceIds: ALL_EVIDENCE,
      relatedObjectIds: [
        CSI_IDS.architecture,
        CSI_IDS.decisionV1,
        CSI_IDS.roadmapV1,
        CSI_IDS.roadmapOtpSeo,
        CSI_IDS.inventoryModule,
      ],
      confidence: "declared",
      summary:
        "IN IMPLEMENTATION — csi-v1-a ingest foundation local; Client Site Intelligence V1 not complete / not shipped / not production-proven. Not a CRM. Not Continuous Intelligence.",
      detail: {
        kind: "capability",
        inventoryStatus: "planned",
        systemKey: "client-site-intelligence",
        ownerSurface: "platform",
      },
      updateChannel: "generated_draft",
      version: "1.1.0",
    },
    {
      id: CSI_IDS.inventoryModule,
      type: "product_inventory",
      title: "Client Site Intelligence Shared Core ingest module",
      status: "active",
      ownerRole: "cto",
      createdAt: CSI_V1A_RECORDED_AT,
      lastReviewedAt: CSI_V1A_RECORDED_AT,
      nextReviewAt: REVIEW,
      evidenceIds: [CSI_IDS.evidenceCsiV1a, CSI_IDS.evidencePreBuild],
      relatedObjectIds: [CSI_IDS.inventoryCapability],
      confidence: "observed",
      summary:
        "lib/client-site-intelligence + client-site-events collection + signed OTP webhook — local only; production migration not authorized.",
      detail: {
        kind: "module",
        inventoryStatus: "live",
        systemKey: "lib/client-site-intelligence",
        ownerSurface: "platform",
      },
      updateChannel: "generated_draft",
      version: "1.0.0",
    },
  ];
}

function buildArchitecture(): ArchitectureObject[] {
  return [
    {
      id: CSI_IDS.architecture,
      type: "architecture",
      title: "Client Site Event ingest architecture",
      status: "authorized",
      ownerRole: "cto",
      createdAt: RECORDED,
      lastReviewedAt: CSI_V1A_RECORDED_AT,
      nextReviewAt: REVIEW,
      evidenceIds: ALL_EVIDENCE,
      relatedObjectIds: [CSI_IDS.decisionV1, CSI_IDS.inventoryCapability, DNA, DOCTRINE],
      confidence: "declared",
      summary:
        `${CLIENT_SITE_INTELLIGENCE_PI_VERDICT.verdict}: ClientSiteEvent Shared Core facts → Activity Engine memory → selective portal surfaces. OTP first. Commission orthogonal. V1 in=${CLIENT_SITE_INTELLIGENCE_V1_SCOPE.inScope.length} out=${CLIENT_SITE_INTELLIGENCE_V1_SCOPE.outOfScopeV1.length} batches=${CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES.length}. csi-v1-a local; V1 incomplete.`,
      detail: {
        layerMapNotes: [
          "Managed client website emits signed ClientSiteEvent facts (website_lead first).",
          "Shared Core Client Site Event Registry is system of record for ingest (not sales-leads CRM).",
          "Activity Engine remains canonical relationship/work memory for monthly value.",
          "Commission obligation is created only after human-confirmed sold_confirmed — orthogonal to Stripe payment and service activation.",
          "Portal Work & Performance / client-visible timeline consume Activity Engine — no second monthly-work ledger.",
          "OTP Carts (otp-carts) is the first reference client; On Track Performance (otp) remains separate.",
          "Product Intelligence / Continuous Intelligence are institutional meaning — never the operational lead store.",
        ],
        boundaries: [
          "Website leads are attribution events — not a CRM pipeline.",
          "No commission due on form submission alone.",
          "HMAC + freshness + per-client secret required before accept.",
          "Idempotency by sourceSystem + externalEventId + eventClass.",
          "Client-visible activity must communicate meaningful business value only.",
          "Developer noise (commits, CI, failed deploys, diffs, dependency bumps) never client-facing as work.",
          "V1 sync webhook persist + Activity publish; queues deferred until need demonstrated.",
          "July/August 2026 OTP monthly value backfill is manual and evidence-honest only.",
        ],
        systemMapKeys: [
          "lib/client-site-intelligence/",
          "payload/collections/ClientSiteEvents.ts",
          "app/api/webhooks/client-site/[clientKey]/route.ts",
          "lib/activity-engine/",
          "lib/portal/work-performance/",
          "lib/client-launch/otp-carts-readiness.ts",
          "lib/product-intelligence/client-site-intelligence/",
        ],
        integrationMapKeys: [
          "otp-carts-website-lead-seam",
          "kxd-csi-otp-carts-ingest-hmac",
        ],
        prohibitedParallelSystems: [
          "Website-lead CRM / sales pipeline for form leads",
          "Parallel monthly-work database or ledger",
          "Automatic commission on lead submit",
          "Stripe auto-invoice for website-attribution commissions (V1)",
          "Client portal commit/deploy/CI noise feed",
          "Using Product Intelligence or Continuous Intelligence as operational lead store",
          "Merging otp-carts with On Track Performance (otp)",
          "Event bus / queue infrastructure without demonstrated need",
        ],
      },
      updateChannel: "manual_approval",
      version: "1.0.0",
    },
  ];
}

function buildTechnicalDebt(): TechnicalDebtObject[] {
  return [
    {
      id: CSI_IDS.debtTimelineUnification,
      type: "technical_debt",
      title: "Client-visible activity / timeline unification gap",
      status: "open",
      ownerRole: "cto",
      createdAt: RECORDED,
      lastReviewedAt: RECORDED,
      nextReviewAt: REVIEW,
      evidenceIds: [CSI_IDS.evidenceActivityEngine, CSI_IDS.evidencePreBuild],
      relatedObjectIds: [
        CSI_IDS.architecture,
        CSI_IDS.decisionV1,
        CSI_IDS.roadmapV1,
      ],
      confidence: "observed",
      summary:
        "KNOWN GAP — Activity Engine writes executive-timeline-events; portal still has legacy client-timeline-events paths. Client Site Intelligence must not invent a third memory plane.",
      detail: {
        costOfDelay: "high",
        dragDescription:
          "CES and Phase 12 already document that portal/client-visible activity is not fully unified on Activity Engine. Building Client Site Intelligence monthly value without respecting this gap risks a parallel ledger or dual-write confusion.",
        proposedDirection:
          "Reuse Activity Engine + Work & Performance compose; prefer single canonical store long-term (Phase 12 Timeline Unification). Client Site Intelligence publishes through Activity Engine with explicit visibility controls — never a new monthly-work collection.",
      },
      updateChannel: "generated_draft",
      version: "1.0.0",
    },
  ];
}

function buildRoadmap(): RoadmapItemObject[] {
  return [
    {
      id: CSI_IDS.roadmapV1,
      type: "roadmap_item",
      title: "Client Site Intelligence V1",
      status: "in_flight",
      ownerRole: "founder",
      createdAt: RECORDED,
      lastReviewedAt: CSI_V1A_RECORDED_AT,
      nextReviewAt: REVIEW,
      evidenceIds: ALL_EVIDENCE,
      relatedObjectIds: [
        CSI_IDS.decisionV1,
        CSI_IDS.architecture,
        CSI_IDS.inventoryCapability,
        CSI_IDS.roadmapOtpSeo,
        DNA,
        DOCTRINE,
      ],
      confidence: "declared",
      summary:
        "HUMAN-AUTHORIZED PROCEED WITH CHANGES — IN IMPLEMENTATION. csi-v1-a local only; NOT complete; NOT shipped; NOT production-proven. Next: csi-v1-b sale confirmation. No CRM. No auto-commission. No parallel monthly ledger.",
      detail: {
        lifecycle: "authorized",
        decisionIds: [CSI_IDS.decisionV1],
        batchKey: "client-site-intelligence-v1",
        sourceFutureBetId: null,
      },
      updateChannel: "manual_approval",
      version: "1.1.0",
    },
    {
      id: CSI_IDS.roadmapOtpSeo,
      type: "roadmap_item",
      title: "OTP Carts SEO / organic growth",
      status: "authorized",
      ownerRole: "cpo",
      createdAt: RECORDED,
      lastReviewedAt: RECORDED,
      nextReviewAt: REVIEW,
      evidenceIds: [
        CSI_IDS.evidenceOtpSeoBatch1,
        CSI_IDS.evidenceOtpGscSiteConfig,
        CSI_IDS.evidenceOtpLaunchReadiness,
        CSI_IDS.evidencePreBuild,
      ],
      relatedObjectIds: [CSI_IDS.decisionV1, CSI_IDS.roadmapV1],
      confidence: "declared",
      summary:
        "PARALLEL TRACK — OTP website SEO/content growth proceeds independently of Client Site Intelligence ingest. Continue indexing ops + content differentiation; do not block SEO for OS plumbing.",
      detail: {
        lifecycle: "authorized",
        decisionIds: [CSI_IDS.decisionV1],
        batchKey: "otp-carts-seo-organic-growth",
        sourceFutureBetId: null,
      },
      updateChannel: "manual_approval",
      version: "1.0.0",
    },
  ];
}

function buildEvolution(): ProductEvolutionObject[] {
  return [
    createProductEvolutionObject({
      id: CSI_IDS.evolution,
      title: "Client Site Intelligence V1 Human Decision",
      evolutionType: "platform_milestone",
      summary:
        "Human Decision authorized scoped Client Site Intelligence V1 with OTP Carts as first reference — overall capability still IN IMPLEMENTATION.",
      detailedReasoning:
        "PI strategic review returned PROCEED WITH CHANGES. Human Decision approved generalized ClientSiteEvent, OTP Carts reference implementation, attribution-not-CRM lifecycle, commission orthogonality, Activity Engine as work memory, and parallel OTP SEO growth — while explicitly refusing website-lead CRM, auto-commission, parallel monthly ledger, and client-visible developer noise.",
      milestoneDate: RECORDED,
      evidenceIds: ALL_EVIDENCE.filter((id) => id !== CSI_IDS.evidenceCsiV1a),
      relatedReleaseIds: [],
      relatedCommitShas: [],
      relatedVerifierIds: [
        "scripts/verify-product-intelligence-client-site-intelligence.ts",
      ],
      relatedInventoryIds: [CSI_IDS.inventoryCapability],
      relatedDecisionIds: [CSI_IDS.decisionV1],
      relatedProductDnaIds: [DNA],
      relatedHealthMovementIds: [],
      relatedFrictionIds: [],
      gitEvidence: [],
      ownerRole: "cpo",
      objectSummary:
        "Decision gate — csi-v1-a ingest foundation begins implementation; Hall of Fame not applicable.",
    }),
    createProductEvolutionObject({
      id: CSI_IDS.evolutionCsiV1a,
      title: "Client Site Intelligence csi-v1-a ingest foundation",
      evolutionType: "platform_milestone",
      summary:
        "csi-v1-a implemented locally: ClientSiteEvent registry, HMAC OTP webhook, idempotency, internal Activity publish — not production-proven.",
      detailedReasoning:
        "Batch csi-v1-a establishes trustworthy Shared Core ingest for OTP website_lead events without CRM, auto-commission, portal changes, or July/August backfill. " +
        "Production migration not authorized. Next batch csi-v1-b is operator sale confirmation.",
      milestoneDate: CSI_V1A_RECORDED_AT,
      evidenceIds: [CSI_IDS.evidenceCsiV1a, CSI_IDS.evidencePreBuild, CSI_IDS.evidenceActivityEngine],
      relatedReleaseIds: [],
      relatedCommitShas: [],
      relatedVerifierIds: [
        "scripts/verify-client-site-intelligence-csi-v1-a.ts",
        "scripts/verify-product-intelligence-client-site-intelligence.ts",
      ],
      relatedInventoryIds: [CSI_IDS.inventoryCapability, CSI_IDS.inventoryModule],
      relatedDecisionIds: [CSI_IDS.decisionV1],
      relatedProductDnaIds: [DNA],
      relatedHealthMovementIds: [],
      relatedFrictionIds: [],
      gitEvidence: [],
      ownerRole: "cto",
      objectSummary:
        "Ingest foundation local — Client Site Intelligence V1 incomplete; sale/commission UI deferred.",
    }),
  ];
}

function buildKillList(): ProductKillListObject[] {
  const shared = {
    decisionDate: RECORDED,
    evidenceIds: ALL_EVIDENCE,
    relatedDecisionIds: [CSI_IDS.decisionV1],
    relatedProductDnaIds: [DNA],
    relatedEvolutionIds: [CSI_IDS.evolution],
    relatedInventoryIds: [CSI_IDS.inventoryCapability],
    relatedHealthDomainIds: ["architecture" as const],
    killConfidence: "long_term" as const,
    reviewPolicy:
      "Revisit only with a new Human Decision if commercial model or client-site architecture doctrine changes.",
    ownerRole: "founder" as const,
    reconsiderAt: null,
  };

  return [
    createProductKillListObject({
      ...shared,
      id: CSI_IDS.killWebsiteLeadCrm,
      title: "Website-lead CRM",
      category: "product",
      qualificationClass: "philosophy_conflict",
      rejectedConcept:
        "Turn website form leads into a full CRM/sales pipeline inside KXD OS for OTP or other client sites",
      problemAttemptedToSolve:
        "Track website leads through sales stages for OTP staff and KXD operators",
      reasonRejected:
        "KXD OS is not a CRM. OTP staff must not be forced into heavy pipeline hygiene. Website leads are attribution events; operator sales CRM remains a separate surface.",
      alternativesConsidered: [
        "Minimal attribution lifecycle with human sale confirmation only",
        "Force portal salesPipelineAvailable and website-lead stages",
      ],
      chosenDirection:
        "Attribution + human-confirmed sale/commission states — never website-lead CRM",
      tradeoffsAccepted:
        "No nurture stages or pipeline analytics for anonymous website leads in V1.",
      longTermProductImpact:
        "Preserves product identity while still enabling attributable website sales value.",
      relatedFutureBetId: null,
      whatKxdProtects: "Business operating system identity — not CRM gravity",
      whatKxdRefusesToBecome: "A website-lead CRM bolted onto client sites",
      whyRejectionStrengthensProduct:
        "Keeps Client Site Intelligence thin, multi-client, and orthogonal to operator sales tools.",
      summary: "No website-lead CRM for Client Site Intelligence.",
      ownerRole: "cpo",
    }),
    createProductKillListObject({
      ...shared,
      id: CSI_IDS.killAutoCommission,
      title: "Automatic commission on website lead submit",
      category: "commercial",
      qualificationClass: "commercial_boundary",
      rejectedConcept:
        "Mark $300 KXD commission due when a website form is submitted",
      problemAttemptedToSolve:
        "Automate OTP website-attribution commission without human sale confirmation",
      reasonRejected:
        "Lead capture ≠ sale ≠ payment. Commission becomes due only after explicit human confirmation of a website-attributed cart sale.",
      alternativesConsidered: [
        "Human-confirmed sold_confirmed → commission_due",
        "Auto-due on form submit with later clawback",
      ],
      chosenDirection:
        "Human confirmation required; form submit never creates commission due",
      tradeoffsAccepted:
        "Manual confirmation step remains; trust and commercial honesty preserved.",
      longTermProductImpact:
        "Extends signature/payment/service orthogonality to lead/sale/commission.",
      relatedFutureBetId: null,
      whatKxdProtects: "Commercial trust and honest attribution",
      whatKxdRefusesToBecome: "A system that invoices itself on form spam",
      whyRejectionStrengthensProduct:
        "Makes the $300 OTP rule enforceable and defensible.",
      summary: "No automatic commission on form submission.",
      ownerRole: "founder",
    }),
    createProductKillListObject({
      ...shared,
      id: CSI_IDS.killPortalNoiseFeed,
      title: "Client portal commit / deploy noise feed",
      category: "experience",
      qualificationClass: "cognitive_load_protection",
      rejectedConcept:
        "Expose commits, CI runs, failed deploys, file diffs, or dependency bumps as client-facing KXD work",
      problemAttemptedToSolve:
        "Make Don see continuous activity so KXD looks busy",
      reasonRejected:
        "Client-facing reporting must communicate meaningful business value. Developer noise destroys trust and violates calm executive UX.",
      alternativesConsidered: [
        "Curated milestones with visibility controls and trustworthy evidence",
        "Raw GitHub/Vercel/GSC feeds into the portal",
      ],
      chosenDirection:
        "Curated client-visible milestones only; developer noise internal-only",
      tradeoffsAccepted:
        "Less frequent client-visible updates; higher signal quality.",
      longTermProductImpact:
        "Portal remains a confidence surface, not an engineering status page.",
      relatedFutureBetId: null,
      whatKxdProtects: "Client trust and cognitive load",
      whatKxdRefusesToBecome: "A vanity activity feed of engineering noise",
      whyRejectionStrengthensProduct:
        "Forces monthly value to be earned by meaningful outcomes.",
      summary: "No client portal commit/deploy/CI noise feed.",
      ownerRole: "cdo",
    }),
  ];
}

export function loadClientSiteIntelligenceMemory(): ClientSiteIntelligenceMemoryPack {
  return {
    evidence: [...CLIENT_SITE_INTELLIGENCE_EVIDENCE],
    productInventory: buildInventory(),
    architecture: buildArchitecture(),
    technicalDebt: buildTechnicalDebt(),
    roadmapItems: buildRoadmap(),
    productKillList: buildKillList(),
    productEvolution: buildEvolution(),
    hallOfFame: [],
    futureBets: [],
  };
}

export function attachClientSiteIntelligenceMemory(
  index: ProductIntelligenceIndex,
  pack: ClientSiteIntelligenceMemoryPack,
): ProductIntelligenceIndex {
  const stores = index.stores;
  return {
    ...index,
    evidenceRegistry: mergeEvidenceRegistry(index.evidenceRegistry, pack.evidence),
    stores: {
      ...stores,
      productInventory: mergeById(stores.productInventory, pack.productInventory),
      architecture: mergeById(stores.architecture, pack.architecture),
      technicalDebt: mergeById(stores.technicalDebt, pack.technicalDebt),
      roadmapItems: mergeById(stores.roadmapItems, pack.roadmapItems),
      productKillList: mergeById(stores.productKillList, pack.productKillList),
      productEvolution: mergeById(stores.productEvolution, pack.productEvolution),
      evidence: mergeById(stores.evidence, pack.evidence),
      hallOfFame: stores.hallOfFame,
      futureBets: stores.futureBets,
    },
  };
}
