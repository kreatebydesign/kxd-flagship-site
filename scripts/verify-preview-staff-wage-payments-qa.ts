/**
 * Preview-only Tyler wage ledger QA (Postgres).
 *
 * Requires:
 *   DATABASE_URI with wage-ledger QA endpoint (not ep-twilight-math)
 *   KXD_CONFIRM_PREVIEW_DB_WRITE=1
 *   KXD_SERVER_ONLY_SHIM=1
 *   Optional: KXD_WAGE_LEDGER_QA_ENDPOINT_ID for ephemeral branches
 */
import assert from "node:assert/strict";
import pg from "pg";
import { assertPreviewKxdOsDatabase, resolvedWageLedgerQaEndpointId } from "./lib/preview-kxd-os-db.ts";
import { TYLER_RETHWILL_STAFF_USER_ID } from "../lib/staff-pay/tyler-october-historical-reference.ts";
import {
  TYLER_OCT_2026_UNPAID_SHIFT_ID,
  TYLER_OCT_2026_ZELLE_REFERENCE,
  tylerDocumentedGrossCentsFixture,
  tylerCoveredPaymentGrossCentsFixture,
  tylerOutstandingGrossCentsFixture,
} from "../lib/staff-pay/wage-payments/tyler-oct-2026-fixture.ts";
import {
  mapProductionShiftIdsToPreviewShiftIds,
  resolvePreviewShiftId,
  tylerCoveredShiftAllocationRefsForPreview,
} from "../lib/staff-pay/preview-tyler-fixture-shift-map.ts";
import { actorHasStaffCapability, resolveStaffCapabilities } from "../lib/staff/permissions.ts";

function bootstrapPreviewDatabaseUri(): void {
  const uri = process.env.NEON_PREVIEW_URI?.trim() || process.env.DATABASE_URI?.trim();
  assert.ok(uri, "NEON_PREVIEW_URI or DATABASE_URI is required");
  assert.ok(uri.includes(resolvedWageLedgerQaEndpointId()), "wage-ledger QA DATABASE_URI required");
  assert.ok(!uri.includes("ep-twilight-math"), "production endpoint refused");
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;
}

bootstrapPreviewDatabaseUri();
assertPreviewKxdOsDatabase();

const { getPayload } = await import("payload");
const config = (await import("@payload-config")).default;
const { recordStaffWagePayment, voidStaffWagePayment } = await import(
  "../lib/staff-pay/wage-payments/record.ts"
);
const { loadStaffWageSettlementSummary, loadStaffWagePeriodSettlement } = await import(
  "../lib/staff-pay/wage-payments/load-settlement.ts"
);
const { listStaffPayHistoricalEntriesForStaff } = await import(
  "../lib/staff-pay/historical-entries.ts"
);
const { findActiveStaffWagePaymentByReference } = await import(
  "../lib/staff-pay/wage-payments/queries.ts"
);
const { staffActorFromUser } = await import("../lib/staff/actor.ts");
const { getConnectPostgresExecutor } = await import("../lib/connect/db.ts");

const payload = await getPayload({ config });
const operatorUser = await payload.findByID({
  collection: "users",
  id: 1,
  depth: 0,
  overrideAccess: true,
});
const operator = staffActorFromUser(operatorUser);
assert.ok(operator);
assert.ok(actorHasStaffCapability(operator, "admin.payroll.review"));

const tylerUser = await payload.findByID({
  collection: "users",
  id: TYLER_RETHWILL_STAFF_USER_ID,
  depth: 0,
  overrideAccess: true,
});
const tylerActor = staffActorFromUser(tylerUser);
assert.ok(tylerActor);
assert.ok(!resolveStaffCapabilities(tylerActor).has("admin.payroll.review"));

const pgUri = process.env.DATABASE_URI!;
const pgClient = new pg.Client({ connectionString: pgUri });
await pgClient.connect();
const shiftRows = await pgClient.query<{ id: number; audit_events: unknown }>(
  `SELECT id, audit_events FROM staff_time_shifts WHERE staff_user_id = $1 AND status <> 'voided'`,
  [TYLER_RETHWILL_STAFF_USER_ID],
);
const shiftIdMap = mapProductionShiftIdsToPreviewShiftIds(shiftRows.rows);
const coveredShiftRefs = tylerCoveredShiftAllocationRefsForPreview(shiftIdMap);
const unpaidShiftId = resolvePreviewShiftId(shiftIdMap, TYLER_OCT_2026_UNPAID_SHIFT_ID);

const tylerId = TYLER_RETHWILL_STAFF_USER_ID;
const historical = await listStaffPayHistoricalEntriesForStaff(tylerId);
assert.equal(historical.length, 5, "apply Tyler historical entries on preview before QA");

const allocations = [
  ...historical.map((h) => ({
    sourceKind: "historical_entry" as const,
    historicalEntryId: h.id,
  })),
  ...coveredShiftRefs,
];

const qaRef = `KXD-QA-WAGE-${Date.now()}`;

const first = await recordStaffWagePayment(operator, {
  staffUserId: tylerId,
  paymentMethod: "zelle",
  officialPayrollDate: "2026-10-30",
  settledAt: "2026-11-03T12:00:00.000Z",
  externalReference: qaRef,
  allocations,
});
assert.equal(first.idempotent, false);
assert.equal(first.allocations, allocations.length);

const dupRef = await recordStaffWagePayment(operator, {
  staffUserId: tylerId,
  paymentMethod: "zelle",
  officialPayrollDate: "2026-10-30",
  settledAt: "2026-11-03T12:00:00.000Z",
  externalReference: qaRef,
  allocations,
});
assert.equal(dupRef.idempotent, true);

let dupSourceFailed = false;
try {
  await recordStaffWagePayment(operator, {
    staffUserId: tylerId,
    paymentMethod: "zelle",
    officialPayrollDate: "2026-10-30",
    settledAt: "2026-11-04T12:00:00.000Z",
    externalReference: `${qaRef}-dup-source`,
    allocations: [coveredShiftRefs[0]!],
  });
} catch {
  dupSourceFailed = true;
}
assert.equal(dupSourceFailed, true);

let tylerRecordFailed = false;
try {
  await recordStaffWagePayment(tylerActor, {
    staffUserId: tylerId,
    paymentMethod: "zelle",
    officialPayrollDate: "2026-10-30",
    settledAt: "2026-11-04T12:00:00.000Z",
    externalReference: `${qaRef}-tyler-forbidden`,
    allocations: [{ sourceKind: "time_shift", shiftId: unpaidShiftId }],
  });
} catch {
  tylerRecordFailed = true;
}
assert.equal(tylerRecordFailed, true, "Tyler must not record wage payments");

const concurrentRefA = `${qaRef}-concurrent-a`;
const concurrentRefB = `${qaRef}-concurrent-b`;
const alreadySettledAlloc = [coveredShiftRefs[0]!];

const concurrent = await Promise.allSettled([
  recordStaffWagePayment(operator, {
    staffUserId: tylerId,
    paymentMethod: "zelle",
    officialPayrollDate: "2026-10-30",
    settledAt: "2026-11-04T12:00:00.000Z",
    externalReference: concurrentRefA,
    allocations: alreadySettledAlloc,
  }),
  recordStaffWagePayment(operator, {
    staffUserId: tylerId,
    paymentMethod: "zelle",
    officialPayrollDate: "2026-10-30",
    settledAt: "2026-11-04T12:00:01.000Z",
    externalReference: concurrentRefB,
    allocations: alreadySettledAlloc,
  }),
]);
assert.equal(
  concurrent.filter((r) => r.status === "rejected").length,
  2,
  "concurrent duplicate source settlement must both fail",
);

const db = getConnectPostgresExecutor(payload);
assert.ok(db);
const badRef = `${qaRef}-rollback`;
let rollbackFailed = false;
try {
  await recordStaffWagePayment(operator, {
    staffUserId: tylerId,
    paymentMethod: "zelle",
    officialPayrollDate: "2026-10-30",
    settledAt: "2026-11-05T12:00:00.000Z",
    externalReference: badRef,
    allocations: [
      { sourceKind: "historical_entry", historicalEntryId: 9_999_999 },
      ...coveredShiftRefs.slice(0, 1),
    ],
  });
} catch {
  rollbackFailed = true;
}
assert.equal(rollbackFailed, true, "invalid allocation must fail and roll back");
const orphanPayment = await findActiveStaffWagePaymentByReference(tylerId, badRef);
assert.equal(orphanPayment, null, "rolled-back payment must not persist");

const summary = await loadStaffWageSettlementSummary(tylerId);
assert.equal(summary.documentedGrossCents, tylerDocumentedGrossCentsFixture());
assert.equal(summary.settledGrossCents, tylerCoveredPaymentGrossCentsFixture());
assert.equal(summary.outstandingGrossCents, tylerOutstandingGrossCentsFixture());

const period2 = await loadStaffWagePeriodSettlement({
  staffUserId: tylerId,
  payPeriodId: 2,
  periodStart: "2026-10-26",
  periodEnd: "2026-11-08",
});
assert.equal(period2.documentedGrossCents, 48_033);
assert.equal(period2.settledGrossCents, 40_200);
assert.equal(period2.outstandingGrossCents, 7_833);

const shift12Settled = await pgClient.query(
  `SELECT 1 FROM staff_wage_payment_allocations WHERE shift_id = $1 AND status = 'active' LIMIT 1`,
  [unpaidShiftId],
);
assert.equal(shift12Settled.rowCount, 0, "November 5 shift 12 must remain unpaid");

const paymentRow = await pgClient.query<{ audit_events: unknown }>(
  `SELECT audit_events FROM staff_wage_payments WHERE id = $1`,
  [first.payment.id],
);
const auditEvents = paymentRow.rows[0]?.audit_events;
assert.ok(Array.isArray(auditEvents) && auditEvents.length >= 1, "payment audit preserved");

await voidStaffWagePayment(operator, first.payment.id, "preview QA cleanup");
const afterVoid = await loadStaffWageSettlementSummary(tylerId);
assert.equal(afterVoid.settledGrossCents, 0);

const voided = await findActiveStaffWagePaymentByReference(tylerId, qaRef);
assert.equal(voided, null);

await pgClient.end();
try {
  await payload.destroy();
} catch {
  /* best-effort */
}

console.log("verify-preview-staff-wage-payments-qa: OK");
