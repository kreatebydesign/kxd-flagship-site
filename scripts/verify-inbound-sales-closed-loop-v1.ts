/**
 * Inbound Sales closed-loop V1 — architecture + policy verification.
 * Pure. Does not write production data or promote historical inquiries.
 *
 * Run: npm run verify:inbound-sales-closed-loop-v1
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  addBusinessDays,
  defaultDueForNextAction,
  defaultObligationAfterOutreach,
  FIRST_PARTY_INQUIRY_SOURCES,
  initialResponseDueAt,
  isFirstPartyInquirySource,
  isLostReason,
  LOST_REASONS,
  SALES_FOLLOW_UP_POLICY,
} from "../lib/sales/follow-up-policy";
import { classifyIdentityCollision, normalizeDomain, normalizeEmail } from "../lib/sales/identity";
import {
  deriveAttentionKind,
  isOverdue,
  isStale,
} from "../lib/sales/attention";
import { validateObligationPatch } from "../lib/sales/obligation";
import { zonedWallTimeToUtcMs } from "../lib/scheduling/availability/time";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function assertFileContains(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(text.includes(needle), `${rel} should contain: ${needle}`);
}

function assertFileDoesNotContain(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(!text.includes(needle), `${rel} must not contain: ${needle}`);
}

function pt(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(
    zonedWallTimeToUtcMs(year, month, day, hour, minute, SALES_FOLLOW_UP_POLICY.timeZone),
  );
}

async function main() {
  console.log("\nverify-inbound-sales-closed-loop-v1\n");

  await check("first-party sources include project-application", () => {
    assert.ok(FIRST_PARTY_INQUIRY_SOURCES.includes("project-application"));
    assert.equal(isFirstPartyInquirySource("project-application"), true);
    assert.equal(isFirstPartyInquirySource("partnership-pricing"), true);
    assert.equal(isFirstPartyInquirySource("craigslist"), false);
  });

  await check("inquiry route auto-promotes without research or managed-client paths", () => {
    assertFileContains("app/api/inquiries/route.ts", "promoteInquiryToSales");
    assertFileContains("app/api/inquiries/route.ts", "isFirstPartyInquirySource");
    assertFileDoesNotContain("app/api/inquiries/route.ts", "research-leads");
    assertFileDoesNotContain("app/api/inquiries/route.ts", "client-inquiries");
    assertFileDoesNotContain("app/api/inquiries/route.ts", "notifyInquiryCreated");
  });

  await check("Resend distinguishes thrown errors from returned error objects", () => {
    assertFileContains("app/api/inquiries/route.ts", "result.error");
    assertFileContains(
      "app/api/inquiries/route.ts",
      "Resend returned an error (inquiry still saved)",
    );
    assertFileContains("app/api/inquiries/route.ts", "Resend email failed (inquiry still saved)");
  });

  await check("promote writes nextFollowUp and inbound activity", () => {
    assertFileContains("lib/sales/promote-inbound.ts", "nextFollowUp");
    assertFileContains("lib/sales/promote-inbound.ts", "Inbound application received");
    assertFileContains("lib/sales/promote-inbound.ts", "classifyIdentityCollision");
    assertFileContains("lib/sales/promote-inbound.ts", "needs_review");
  });

  await check("SLA: weekday morning due same day ~4h later", () => {
    const from = pt(2026, 8, 19, 10, 0);
    const due = initialResponseDueAt(from);
    const deltaHours = (due.getTime() - from.getTime()) / (1000 * 60 * 60);
    assert.ok(deltaHours >= 3.5 && deltaHours <= 4.5, `expected ~4h, got ${deltaHours}`);
  });

  await check("SLA: late weekday due next business morning", () => {
    const from = pt(2026, 8, 19, 16, 0);
    const due = initialResponseDueAt(from);
    assert.ok(due.getTime() > from.getTime());
    const morning = addBusinessDays(from, 1);
    assert.equal(due.toISOString(), morning.toISOString());
  });

  await check("waiting-on-prospect has no implicit due", () => {
    assert.equal(defaultDueForNextAction("waiting-on-prospect"), null);
  });

  await check("identity: exact email links; different email+same company is ambiguous", () => {
    assert.equal(normalizeEmail("Randy@DeBoisEntertainment.com"), "randy@deboisentertainment.com");
    assert.equal(normalizeDomain("https://www.deboisentertainment.com"), "deboisentertainment.com");
    const open = [
      {
        id: 9,
        status: "new",
        email: "randy@deboisentertainment.com",
        companyName: "de Bois Entertainment",
        website: "https://deboisentertainment.com",
      },
    ];
    const exact = classifyIdentityCollision({
      email: "randy@deboisentertainment.com",
      website: "deboisentertainment.com",
      company: "de Bois Entertainment",
      openLeads: open,
    });
    assert.equal(exact.kind, "exact");
    if (exact.kind === "exact") assert.equal(exact.via, "email");

    const ambiguous = classifyIdentityCollision({
      email: "other@example.com",
      website: "https://other.example",
      company: "de Bois Entertainment",
      openLeads: open,
    });
    assert.equal(ambiguous.kind, "ambiguous");

    const companyOnly = classifyIdentityCollision({
      email: "randy@deboisentertainment.com",
      website: null,
      company: "de Bois Entertainment",
      openLeads: [
        {
          id: 11,
          status: "new",
          email: null,
          companyName: "de Bois Entertainment",
        },
      ],
    });
    assert.equal(companyOnly.kind, "ambiguous");
  });

  await check("closed same-email does not auto-link", () => {
    const result = classifyIdentityCollision({
      email: "randy@deboisentertainment.com",
      website: "deboisentertainment.com",
      company: "de Bois Entertainment",
      openLeads: [],
      closedLeads: [
        {
          id: 12,
          status: "lost",
          email: "randy@deboisentertainment.com",
          companyName: "de Bois Entertainment",
        },
      ],
    });
    assert.equal(result.kind, "ambiguous");
  });

  await check("overdue / stale / open-none derivation", () => {
    const now = new Date("2026-08-19T20:00:00.000Z");
    assert.equal(
      isOverdue("2026-08-19T18:00:00.000Z", now),
      true,
    );
    const overdueKind = deriveAttentionKind({
      status: "new",
      nextAction: "respond-today",
      nextFollowUp: "2026-08-19T18:00:00.000Z",
      createdAt: "2026-08-18T18:00:00.000Z",
      lastMeaningfulAt: "2026-08-18T18:00:00.000Z",
      now,
    });
    assert.equal(overdueKind, "overdue-response");

    const hidden = deriveAttentionKind({
      status: "new",
      nextAction: "none",
      nextFollowUp: null,
      createdAt: "2026-08-18T18:00:00.000Z",
      lastMeaningfulAt: "2026-08-18T18:00:00.000Z",
      now,
    });
    assert.equal(hidden, "overdue");

    const waiting = deriveAttentionKind({
      status: "nurturing",
      nextAction: "waiting-on-prospect",
      nextFollowUp: "2026-09-01T17:00:00.000Z",
      createdAt: "2026-08-01T18:00:00.000Z",
      lastMeaningfulAt: "2026-08-01T18:00:00.000Z",
      now,
    });
    assert.equal(waiting, null);

    assert.equal(
      isStale({
        status: "nurturing",
        nextAction: "follow-up-tomorrow",
        nextFollowUp: "2026-09-01T17:00:00.000Z",
        createdAt: "2026-08-01T18:00:00.000Z",
        lastMeaningfulAt: "2026-08-01T18:00:00.000Z",
        now,
      }),
      true,
    );
  });

  await check("lost requires reason; waiting requires future date; none invalid on open", () => {
    const lost = validateObligationPatch({
      currentStatus: "new",
      currentNextAction: "respond-today",
      patch: { status: "lost" },
    });
    assert.equal(lost.ok, false);

    const lostOk = validateObligationPatch({
      currentStatus: "new",
      currentNextAction: "respond-today",
      patch: { status: "lost", lostReason: "no-response" },
    });
    assert.equal(lostOk.ok, true);

    const waiting = validateObligationPatch({
      currentStatus: "new",
      currentNextAction: "respond-today",
      patch: { nextAction: "waiting-on-prospect" },
    });
    assert.equal(waiting.ok, false);

    const noneOpen = validateObligationPatch({
      currentStatus: "new",
      currentNextAction: "respond-today",
      patch: { nextAction: "none" },
    });
    assert.equal(noneOpen.ok, false);

    assert.equal(isLostReason("no-response"), true);
    assert.equal(LOST_REASONS.length >= 6, true);
  });

  await check("outreach default does not imply a stage change", () => {
    const after = defaultObligationAfterOutreach("email", pt(2026, 8, 19, 11, 0));
    assert.equal(after.nextAction, "follow-up-tomorrow");
    assertFileContains(
      "app/api/admin/sales/leads/[id]/outreach/route.ts",
      "Log meaningful outreach without auto-advancing commercial stage",
    );
  });

  await check("Today commercial adapter and Pipeline history exist", () => {
    assertFileContains("lib/executive-today/load.ts", "commercial");
    assertFileContains("components/admin/executive-today/ExecutiveTodayScreen.tsx", "today-commercial");
    assertFileDoesNotContain("lib/executive-today/load.ts", "/admin/operations/focus");
    assertFileContains("components/admin/sales/OpportunityCard.tsx", "History");
    assertFileContains("components/admin/sales/OpportunityCard.tsx", "Email sent");
    assertFileContains("payload/collections/SalesLeads.ts", "lostReason");
    assertFileContains("migrations/index.ts", "20260831_sales_closed_loop_v1");
  });

  await check("boundaries: research, managed-client, work engine untouched as destinations", () => {
    assertFileDoesNotContain("lib/sales/promote-inbound.ts", "client-inquiries");
    assertFileDoesNotContain("lib/sales/promote-inbound.ts", "client-site-events");
    assertFileDoesNotContain("app/api/inquiries/route.ts", "promoteResearchLeadToSales");
    assertFileContains("lib/sales/promote-research-lead.ts", "promoteResearchLeadToSales");
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
