/**
 * OTP Carts Launch Readiness — Batch A (Gate Hardening).
 *
 * Static gate helpers for the Phase 4 prerequisite: OTP Carts must be
 * confirmed/launched as its own Client before any Cusick membership linking.
 *
 * Payload-safe (no server-only). No DB writes. Does not invent client IDs.
 */

import { OTP_CARTS_IMPORT_EXAMPLE } from "./examples/otp-carts-import";
import { slugifyBusinessName } from "./slug";
import { validateImportDraft } from "./validate-import-draft";
import type { ClientLaunchDraft } from "./types";

/** Expected slug derived from business name — never invent numeric client IDs. */
export const OTP_CARTS_EXPECTED_SLUG = "otp-carts";

/** On Track Performance seeded slug — must remain a separate client. */
export const ON_TRACK_PERFORMANCE_SEED_SLUG = "otp";

export const OTP_CARTS_BUSINESS_NAME = "OTP Carts";

export type OtpCartsGateItemStatus = "ready" | "pending" | "blocked";

export type OtpCartsGateChecklistItem = {
  id: string;
  label: string;
  detail: string;
  status: OtpCartsGateItemStatus;
};

export type OtpCartsImportGateResult = {
  ok: boolean;
  expectedSlug: string;
  errors: string[];
  warnings: string[];
  checklist: OtpCartsGateChecklistItem[];
};

function draftTextBlob(draft: ClientLaunchDraft): string {
  const contacts = draft.contacts as ClientLaunchDraft["contacts"] & {
    notes?: string;
  };
  const roadmap = draft.roadmap as ClientLaunchDraft["roadmap"] & {
    northStarMetric?: string;
  };
  return [
    draft.business.businessName,
    draft.business.businessDescription,
    draft.business.website,
    contacts.notes ?? "",
    draft.financial.paymentTerms,
    draft.technical.hosting,
    draft.technical.technicalNotes,
    draft.technical.loginNotesReference,
    draft.executive.executiveSummary,
    draft.executive.strategicNotes,
    draft.executive.currentPriority,
    draft.roadmap.current,
    draft.roadmap.next,
    roadmap.northStarMetric ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

/** Operator-facing checklist — Batch A marks only import-example / doctrine items ready. */
export function buildOtpCartsGateChecklist(
  importExampleOk: boolean,
): OtpCartsGateChecklistItem[] {
  return [
    {
      id: "import-example",
      label: "Import example is complete and doctrine-safe",
      detail:
        "OTP Carts example exists under Client Import, validates as a launch draft, and asserts a separate client from On Track Performance (no parent organization).",
      status: importExampleOk ? "ready" : "blocked",
    },
    {
      id: "expected-slug",
      label: `Expected slug is “${OTP_CARTS_EXPECTED_SLUG}” (not “${ON_TRACK_PERFORMANCE_SEED_SLUG}”)`,
      detail:
        "Slug is derived from the business name. Do not invent or hard-code a production client ID.",
      status: importExampleOk ? "ready" : "blocked",
    },
    {
      id: "not-seeded-as-production",
      label: "Not treated as a seeded production identity",
      detail:
        "OTP Carts is absent from scripts/seed-clients.ts. Presence of an import example is not proof the Client exists in production.",
      status: "ready",
    },
    {
      id: "production-launch",
      label: "Confirm or launch the Client in the target environment",
      detail:
        "Use Client Launch / Client Import in the approved environment. Resolve the stable client ID from that environment only.",
      status: "pending",
    },
    {
      id: "plans-ces-reporting",
      label: "Plans, CES modules, and reporting connections verified",
      detail:
        "After the Client record exists, confirm entitlements and reporting before any portal membership work.",
      status: "pending",
    },
    {
      id: "membership-linking",
      label: "Membership linking deferred",
      detail:
        "Do not add portal-client-memberships for OTP Carts or Cusick until this gate clears and Phase 4 Batch A migration is production-verified. Batch B remains untouched.",
      status: "pending",
    },
  ];
}

/**
 * Validate an OTP Carts-shaped Client Launch draft (typically the import example).
 * Fail closed on parent-org doctrine, OTP slug collision, secrets, or invented IDs.
 */
export function evaluateOtpCartsImportGate(
  draft: ClientLaunchDraft = OTP_CARTS_IMPORT_EXAMPLE,
): OtpCartsImportGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  errors.push(...validateImportDraft(draft));

  const name = draft.business?.businessName?.trim() ?? "";
  if (name !== OTP_CARTS_BUSINESS_NAME) {
    errors.push(
      `business.businessName must be exactly “${OTP_CARTS_BUSINESS_NAME}” (got “${name || "(empty)"}”).`,
    );
  }

  const expectedSlug = slugifyBusinessName(OTP_CARTS_BUSINESS_NAME);
  if (expectedSlug !== OTP_CARTS_EXPECTED_SLUG) {
    errors.push(
      `Slug derivation drifted: expected “${OTP_CARTS_EXPECTED_SLUG}”, got “${expectedSlug}”.`,
    );
  }

  if (expectedSlug === ON_TRACK_PERFORMANCE_SEED_SLUG) {
    errors.push(
      `OTP Carts slug must not collide with On Track Performance seed slug “${ON_TRACK_PERFORMANCE_SEED_SLUG}”.`,
    );
  }

  const blob = draftTextBlob(draft);
  if (!blob.includes("no parent organization") && !blob.includes("do not combine into one profile")) {
    errors.push(
      "Draft must explicitly preserve separate-client doctrine (no parent organization / do not combine profiles).",
    );
  }

  if (!blob.includes("on track performance") && !blob.includes("otp carts and on track")) {
    warnings.push(
      "Draft should reference On Track Performance as a separate related business (same owner, separate profile).",
    );
  }

  if (blob.includes("parent organization") && !blob.includes("no parent organization")) {
    errors.push("Draft must not introduce a parent-organization authorization model.");
  }

  const website = (draft.business.website || "").toLowerCase();
  const productionUrl = (draft.technical.productionUrl || "").toLowerCase();
  if (!website.includes("otpcarts.com") && !productionUrl.includes("otpcarts.com")) {
    errors.push("business.website or technical.productionUrl must reference otpcarts.com.");
  }

  const roadmap = draft.roadmap as ClientLaunchDraft["roadmap"] & {
    northStarMetric?: string;
  };
  const northStar = roadmap.northStarMetric?.trim() || "";
  if (!northStar) {
    errors.push("roadmap.northStarMetric is required for OTP Carts sales-growth posture.");
  }

  const loginNotes = (draft.technical.loginNotesReference || "").toLowerCase();
  if (
    !loginNotes.includes("secure storage") &&
    !loginNotes.includes("do not store password")
  ) {
    errors.push(
      "technical.loginNotesReference must point operators to secure storage and forbid storing passwords in KXD OS.",
    );
  }

  // Reject invented numeric client IDs if someone extends the example later.
  const serialized = JSON.stringify(draft);
  if (/"clientId"\s*:\s*\d+/i.test(serialized) || /"id"\s*:\s*\d{1,6}\b/.test(serialized)) {
    // Allow healthScore-like numerics in strings; only flag explicit id/clientId keys.
    if (/"clientId"\s*:\s*\d+/i.test(serialized)) {
      errors.push("Do not hard-code clientId on the OTP Carts import example.");
    }
  }

  const checklist = buildOtpCartsGateChecklist(errors.length === 0);

  return {
    ok: errors.length === 0,
    expectedSlug: OTP_CARTS_EXPECTED_SLUG,
    errors,
    warnings,
    checklist,
  };
}

/** True when seed source defines a client with slug otp-carts (should remain false). */
export function seedClientsDefinesOtpCarts(seedSource: string): boolean {
  return (
    /slug:\s*["']otp-carts["']/.test(seedSource) ||
    /slug:\s*["']otp_carts["']/.test(seedSource)
  );
}
