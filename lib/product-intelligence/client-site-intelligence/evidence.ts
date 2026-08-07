/**
 * Client Site Intelligence evidence — decision institutionalization only.
 * Do not fabricate GSC indexing/performance metrics or local commits that do not exist here.
 */

import type { EvidenceObject } from "../evidence";
import {
  CSI_IDS,
  CSI_RECORDED_AT,
  CSI_V1A_RECORDED_AT,
  OTP_CARTS_LEAD_ATTRIBUTION_SHA,
  OTP_CARTS_PRODUCTION_URL,
} from "./ids";

function evidence(
  partial: Omit<EvidenceObject, "type" | "updateChannel" | "status" | "confidence">,
): EvidenceObject {
  return {
    ...partial,
    type: "evidence",
    status: "active",
    confidence: "observed",
    updateChannel: "automatic",
  };
}

export const CLIENT_SITE_INTELLIGENCE_EVIDENCE: EvidenceObject[] = [
  evidence({
    id: CSI_IDS.evidencePreBuild,
    title: "Client Site Intelligence V1 Human Decision / PI gate",
    ownerRole: "cpo",
    createdAt: CSI_RECORDED_AT,
    lastReviewedAt: CSI_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [
      CSI_IDS.decisionV1,
      CSI_IDS.architecture,
      CSI_IDS.roadmapV1,
      CSI_IDS.inventoryCapability,
    ],
    summary:
      "Human Decision APPROVED Client Site Intelligence V1 with PROCEED WITH CHANGES — NOT implemented.",
    version: "1.0.0",
    detail: {
      evidenceType: "architecture_review",
      assertion:
        "Product Intelligence recorded a Human Decision authorizing scoped Client Site Intelligence V1 (generalized ClientSiteEvent, OTP Carts reference, no CRM, commission orthogonality, Activity Engine as work memory) before any Shared Core ingest implementation.",
      locators: [
        {
          ref: "lib/product-intelligence/client-site-intelligence/",
          label: "Client Site Intelligence PI pack",
        },
        {
          ref: "lib/product-intelligence/archive/decisions.ts",
          label: "Decision Archive entry",
        },
        {
          ref: "lib/product-intelligence/archive/doctrine-seed.ts",
          label: "Doctrine laws",
        },
        {
          ref: "lib/product-intelligence/client-site-intelligence/architecture.ts",
          label: "MAJOR_CAPABILITY_PI_GATE (CSI pack)",
        },
      ],
      observedAt: CSI_RECORDED_AT,
      artifactId: "client-site-intelligence-v1-human-decision",
    },
  }),
  evidence({
    id: CSI_IDS.evidenceOtpLeadAttribution,
    title: "OTP Carts Website Lead Attribution Phase 1 production commit",
    ownerRole: "cto",
    createdAt: CSI_RECORDED_AT,
    lastReviewedAt: CSI_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [CSI_IDS.decisionV1, CSI_IDS.architecture, CSI_IDS.roadmapV1],
    summary:
      "Human Decision cites OTP website production SHA for recordWebsiteLead() / WebsiteLeadEvent seam — commit lives outside this repository.",
    version: "1.0.0",
    detail: {
      evidenceType: "commit",
      assertion:
        "OTP Carts production Website Lead Attribution Phase 1 is identified by commit 88da435f647e5d24be7a5f49ff739f2dcb552a2d (OTP website repository, not kxd-rebuild). That seam is the intended future ClientSiteEvent ingest source. This evidence does not claim KXD OS already ingests those events.",
      locators: [
        {
          ref: OTP_CARTS_LEAD_ATTRIBUTION_SHA,
          label: "OTP website production commit (external repo)",
        },
        {
          ref: OTP_CARTS_PRODUCTION_URL,
          label: "OTP Carts production hostname",
        },
      ],
      observedAt: CSI_RECORDED_AT,
      artifactId: OTP_CARTS_LEAD_ATTRIBUTION_SHA,
    },
  }),
  evidence({
    id: CSI_IDS.evidenceOtpSeoBatch1,
    title: "OTP Carts SEO Foundation Batch 1 production hostname",
    ownerRole: "cpo",
    createdAt: CSI_RECORDED_AT,
    lastReviewedAt: CSI_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [
      CSI_IDS.decisionV1,
      CSI_IDS.roadmapOtpSeo,
      CSI_IDS.evidenceOtpLaunchReadiness,
    ],
    summary:
      "Production site https://www.otpcarts.com is the OTP Carts digital sales asset referenced by KXD OS launch readiness — SEO Batch 1 is a Human Decision production fact, not a local commit inventory.",
    version: "1.0.0",
    detail: {
      evidenceType: "observation",
      assertion:
        "OTP Carts production is operated at https://www.otpcarts.com and is recognized in KXD OS OTP Carts launch/import readiness as the client website. Human Decision records SEO Foundation Batch 1 as deployed on that hostname. This repository does not contain OTP website SEO implementation commits; GSC indexing counts and non-branded ranking performance are not evidenced here and must not be invented.",
      locators: [
        { ref: OTP_CARTS_PRODUCTION_URL, label: "OTP Carts production URL" },
        {
          ref: "lib/client-launch/otp-carts-readiness.ts",
          label: "OTP Carts readiness gate",
        },
        {
          ref: "lib/client-launch/examples/otp-carts-import.ts",
          label: "OTP Carts import example",
        },
      ],
      observedAt: CSI_RECORDED_AT,
      artifactId: "otp-carts-seo-foundation-batch-1-production",
    },
  }),
  evidence({
    id: CSI_IDS.evidenceOtpGscSiteConfig,
    title: "OTP Carts Search Console site URL recognized in KXD OS resource patterns",
    ownerRole: "cto",
    createdAt: CSI_RECORDED_AT,
    lastReviewedAt: CSI_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [CSI_IDS.decisionV1, CSI_IDS.roadmapOtpSeo],
    summary:
      "KXD OS client resource directory tests recognize sc-domain:otpcarts.com — not GSC indexing/performance reality.",
    version: "1.0.0",
    detail: {
      evidenceType: "code",
      assertion:
        "This repository evidences only that KXD OS client resource directory patterns understand an OTP Carts Search Console site URL form (sc-domain:otpcarts.com). It does not evidence Google indexing status, Discover coverage, branded vs non-branded performance, or daily indexing quota outcomes.",
      locators: [
        {
          ref: "scripts/verify-client-resource-directory.ts",
          label: "Client resource directory verifier (otpcarts.com / GSC URL)",
        },
      ],
      observedAt: CSI_RECORDED_AT,
      artifactId: "otp-carts-gsc-site-url-config-only",
    },
  }),
  evidence({
    id: CSI_IDS.evidenceOtpLaunchReadiness,
    title: "OTP Carts launch readiness keeps otp-carts distinct from On Track Performance",
    ownerRole: "cto",
    createdAt: CSI_RECORDED_AT,
    lastReviewedAt: CSI_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [CSI_IDS.decisionV1, CSI_IDS.inventoryCapability],
    summary:
      "KXD OS launch gate requires slug otp-carts and forbids merging with On Track Performance (otp).",
    version: "1.0.0",
    detail: {
      evidenceType: "verifier",
      assertion:
        "OTP Carts is a distinct client identity (expected slug otp-carts) from On Track Performance (otp). Client Site Intelligence must use otp-carts as the reference clientKey and must not merge clients.",
      locators: [
        {
          ref: "lib/client-launch/otp-carts-readiness.ts",
          label: "OTP Carts readiness library",
        },
        {
          ref: "scripts/verify-otp-carts-readiness.ts",
          label: "OTP Carts readiness verifier",
        },
        {
          ref: "docs/PHASE-4-MULTI-CLIENT-PORTAL.md",
          label: "Phase 4 multi-client portal docs",
        },
      ],
      observedAt: CSI_RECORDED_AT,
      artifactId: "otp-carts-launch-readiness",
    },
  }),
  evidence({
    id: CSI_IDS.evidenceActivityEngine,
    title: "Activity Engine is the canonical relationship memory write path",
    ownerRole: "cto",
    createdAt: CSI_RECORDED_AT,
    lastReviewedAt: CSI_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [
      CSI_IDS.decisionV1,
      CSI_IDS.architecture,
      CSI_IDS.debtTimelineUnification,
    ],
    summary:
      "publishActivity → executive-timeline-events is the relationship-memory ingress; portal Work & Performance already composes monthly views.",
    version: "1.0.0",
    detail: {
      evidenceType: "code",
      assertion:
        "Client Site Intelligence must reuse Activity Engine as canonical work/relationship memory and existing Work & Performance monthly presentation — not invent a parallel monthly-work database.",
      locators: [
        { ref: "lib/activity-engine/", label: "Activity Engine" },
        {
          ref: "lib/portal/work-performance/",
          label: "Portal Work & Performance",
        },
        {
          ref: "docs/CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md",
          label: "CES timeline unification note",
        },
        {
          ref: "docs/KXD-OS-ROADMAP.md",
          label: "Phase 12 Timeline Unification",
        },
      ],
      observedAt: CSI_RECORDED_AT,
      artifactId: "activity-engine-canonical-memory",
    },
  }),
  evidence({
    id: CSI_IDS.evidenceCsiV1a,
    title: "Client Site Intelligence csi-v1-a ingest foundation implemented locally",
    ownerRole: "cto",
    createdAt: CSI_V1A_RECORDED_AT,
    lastReviewedAt: CSI_V1A_RECORDED_AT,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [
      CSI_IDS.decisionV1,
      CSI_IDS.architecture,
      CSI_IDS.roadmapV1,
      CSI_IDS.inventoryCapability,
      CSI_IDS.inventoryModule,
    ],
    summary:
      "csi-v1-a implemented locally: ClientSiteEvent registry, HMAC OTP ingest webhook, idempotency, internal Activity publish. NOT production-proven. No sale/commission UI. No July/August backfill. Client Site Intelligence V1 not complete.",
    version: "1.0.0",
    detail: {
      evidenceType: "code",
      assertion:
        "Batch csi-v1-a established the Shared Core Client Site Event Registry and signed OTP website_lead ingest path without CRM, auto-commission, portal changes, or client-visible lead notifications.",
      locators: [
        {
          ref: "lib/client-site-intelligence/",
          label: "Client Site Intelligence Shared Core module",
        },
        {
          ref: "payload/collections/ClientSiteEvents.ts",
          label: "Client Site Events collection",
        },
        {
          ref: "migrations/20260823_client_site_events.ts",
          label: "Registry migration + unique idempotency index",
        },
        {
          ref: "app/api/webhooks/client-site/[clientKey]/route.ts",
          label: "Signed ingest webhook",
        },
        {
          ref: "scripts/verify-client-site-intelligence-csi-v1-a.ts",
          label: "csi-v1-a verifier",
        },
      ],
      observedAt: CSI_V1A_RECORDED_AT,
      artifactId: "client-site-intelligence-csi-v1-a",
    },
  }),
];

export const CLIENT_SITE_INTELLIGENCE_EVIDENCE_IDS =
  CLIENT_SITE_INTELLIGENCE_EVIDENCE.map((e) => e.id);
