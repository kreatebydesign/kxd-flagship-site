/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reset specific Harlow and Sasha shift timers after accidental long/open shifts,
 * then leave each Junior Creator with a single 1-hour admin credit for their
 * explicitly supplied incident week.
 *
 * Safety requirements:
 * - --harlow-incident-week / --sasha-incident-week (or shared --incident-week) are explicit Mondays
 * - --harlow-snapshot / --sasha-snapshot must identify exact shift IDs + expected values
 * - both records are preflighted before any write
 * - --apply mutates both voids + credits atomically in one transaction (safe across weeks:
 *   locks are by exact shift id, credits write distinct weekKey values)
 * - idempotent: if both targets are already script-voided and matching credits exist, no-op
 *
 * Safe by default: omit --apply for a non-mutating dry run.
 *
 * Example (cross-week):
 *   npm run repair:junior-shift-credit -- \
 *     --harlow-incident-week=2026-08-03 \
 *     --sasha-incident-week=2026-06-22 \
 *     --harlow-snapshot='{"shiftId":7,...}' \
 *     --sasha-snapshot='{"shiftId":4,...}'
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  appendAdminNote,
  correctionAuditEntry,
  existingCorrectionAudit,
  getRelatedId,
  shiftMoneyState,
} from "../lib/junior-creators/shift-correction-audit.ts";
import {
  numbersEqual,
  parseRepairArgs,
  timestampsEqual,
  type RepairExpectedSnapshot,
} from "../lib/junior-creators/repair-shift-credit-args.ts";
import { withJuniorShiftCorrectionTransaction } from "../lib/junior-creators/shift-correction-transaction.ts";

type AnyDoc = Record<string, any>;

const CREDIT_MINUTES = 60;
const SCRIPT_ADMIN = { id: "script", email: null, collection: "system" };

function mismatch(label: string, field: string, expected: unknown, actual: unknown): never {
  throw new Error(
    `${label} snapshot mismatch on ${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`,
  );
}

function assertSnapshotMatches(
  label: string,
  snapshot: RepairExpectedSnapshot,
  shift: AnyDoc,
  incidentWeek: string,
): void {
  if (Number(shift.id) !== snapshot.shiftId) {
    mismatch(label, "shiftId", snapshot.shiftId, shift.id);
  }

  const juniorId = getRelatedId(shift.juniorCreatorUser);
  if (juniorId !== snapshot.juniorId) {
    mismatch(label, "juniorId", snapshot.juniorId, juniorId);
  }

  if (String(shift.weekKey ?? "") !== incidentWeek) {
    mismatch(label, "weekKey", incidentWeek, shift.weekKey);
  }

  if (String(shift.status ?? "") !== snapshot.status) {
    mismatch(label, "status", snapshot.status, shift.status);
  }

  if (!timestampsEqual(snapshot.startedAt, shift.startedAt)) {
    mismatch(label, "startedAt", snapshot.startedAt, shift.startedAt);
  }

  if (!timestampsEqual(snapshot.endedAt, shift.endedAt ?? null)) {
    mismatch(label, "endedAt", snapshot.endedAt, shift.endedAt ?? null);
  }

  if (!numbersEqual(snapshot.totalMinutes, shift.totalMinutes ?? 0)) {
    mismatch(label, "totalMinutes", snapshot.totalMinutes, shift.totalMinutes);
  }

  if (!numbersEqual(snapshot.hourlyRateCents, shift.hourlyRateCents)) {
    mismatch(label, "hourlyRateCents", snapshot.hourlyRateCents, shift.hourlyRateCents);
  }

  if (!numbersEqual(snapshot.payAdjustmentCents, shift.payAdjustmentCents ?? 0)) {
    mismatch(
      label,
      "payAdjustmentCents",
      snapshot.payAdjustmentCents,
      shift.payAdjustmentCents,
    );
  }
}

function auditHasAction(shift: AnyDoc, action: string): boolean {
  const audit = existingCorrectionAudit(shift);
  return audit.some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      "action" in entry &&
      String((entry as { action: unknown }).action) === action,
  );
}

function earningsCents(minutes: number, hourlyRateCents: number, payAdjustmentCents = 0): number {
  return Math.round((minutes * hourlyRateCents) / 60) + payAdjustmentCents;
}

async function loadShiftExact(
  payload: Awaited<ReturnType<typeof getPayload>>,
  shiftId: number,
  req?: any,
): Promise<AnyDoc> {
  try {
    return (await payload.findByID({
      collection: "junior-creator-shifts" as any,
      id: shiftId,
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })) as AnyDoc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Exact shift id ${shiftId} was not found. (${detail.split("\n")[0]})`);
  }
}

async function findScriptCredit(
  payload: Awaited<ReturnType<typeof getPayload>>,
  juniorId: number,
  incidentWeek: string,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    collection: "junior-creator-shifts" as any,
    where: {
      and: [
        { juniorCreatorUser: { equals: juniorId } },
        { weekKey: { equals: incidentWeek } },
        { status: { equals: "completed" } },
        { totalMinutes: { equals: CREDIT_MINUTES } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of result.docs as AnyDoc[]) {
    if (auditHasAction(doc, "scriptCreditCreate")) return doc;
  }
  return null;
}

async function assessAlreadyRepaired(
  payload: Awaited<ReturnType<typeof getPayload>>,
  harlow: RepairExpectedSnapshot,
  sasha: RepairExpectedSnapshot,
  harlowShift: AnyDoc,
  sashaShift: AnyDoc,
  harlowIncidentWeek: string,
  sashaIncidentWeek: string,
): Promise<{ already: boolean; harlowCreditId: number | null; sashaCreditId: number | null }> {
  const harlowVoided =
    String(harlowShift.status) === "voided" && auditHasAction(harlowShift, "scriptResetVoid");
  const sashaVoided =
    String(sashaShift.status) === "voided" && auditHasAction(sashaShift, "scriptResetVoid");

  if (!harlowVoided && !sashaVoided) {
    return { already: false, harlowCreditId: null, sashaCreditId: null };
  }

  if (harlowVoided !== sashaVoided) {
    throw new Error(
      "Partial prior repair detected (only one of Harlow/Sasha is script-voided). Manual review required.",
    );
  }

  const harlowCredit = await findScriptCredit(payload, harlow.juniorId, harlowIncidentWeek);
  const sashaCredit = await findScriptCredit(payload, sasha.juniorId, sashaIncidentWeek);

  if (!harlowCredit || !sashaCredit) {
    throw new Error(
      "Shifts are script-voided but matching 60-minute script credits were not found. Manual review required.",
    );
  }

  return {
    already: true,
    harlowCreditId: Number(harlowCredit.id),
    sashaCreditId: Number(sashaCredit.id),
  };
}

async function voidShiftInTxn(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: any,
  shift: AnyDoc,
  timestamp: string,
): Promise<void> {
  const original = shiftMoneyState(shift);
  const updateData: Record<string, unknown> = {
    status: "voided",
    endedAt: shift.endedAt ?? timestamp,
    totalMinutes: 0,
    payAdjustmentCents: 0,
    stopReason: "admin_correction",
    notes: appendAdminNote(
      typeof shift.notes === "string" ? shift.notes : null,
      `[Admin reset ${timestamp.slice(0, 10)}] Accidental open shift reset; replaced by 60-minute founder credit.`,
    ),
  };
  const corrected = shiftMoneyState({ ...shift, ...updateData })!;
  updateData.correctionAudit = [
    ...existingCorrectionAudit(shift),
    correctionAuditEntry({
      action: "scriptResetVoid",
      reason: "Accidental open shift reset; replaced by 60-minute founder credit.",
      admin: SCRIPT_ADMIN,
      original,
      corrected,
      at: timestamp,
    }),
  ];

  await payload.update({
    collection: "junior-creator-shifts" as any,
    id: shift.id,
    data: updateData as any,
    overrideAccess: true,
    req,
  });
}

async function createCreditInTxn(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: any,
  juniorId: number,
  hourlyRateCents: number,
  incidentWeek: string,
  timestamp: string,
): Promise<void> {
  const credit = {
    juniorCreatorUser: juniorId,
    startedAt: timestamp,
    endedAt: timestamp,
    totalMinutes: CREDIT_MINUTES,
    weekKey: incidentWeek,
    hourlyRateCents,
    payAdjustmentCents: 0,
    status: "completed",
    stopReason: "admin_correction",
  };

  await payload.create({
    collection: "junior-creator-shifts" as any,
    data: {
      ...credit,
      correctionAudit: [
        correctionAuditEntry({
          action: "scriptCreditCreate",
          reason: "Founder-approved 1-hour credit after accidental shift reset.",
          admin: SCRIPT_ADMIN,
          original: null,
          corrected: shiftMoneyState(credit)!,
          at: timestamp,
        }),
      ],
      notes: `[Admin credit ${timestamp.slice(0, 10)}] Founder-approved 1-hour credit after accidental shift reset.`,
    } as any,
    overrideAccess: true,
    req,
  });
}

function printPlan(
  label: string,
  snapshot: RepairExpectedSnapshot,
  incidentWeek: string,
): void {
  const beforePay = earningsCents(
    snapshot.totalMinutes,
    snapshot.hourlyRateCents,
    snapshot.payAdjustmentCents,
  );
  const afterPay = earningsCents(CREDIT_MINUTES, snapshot.hourlyRateCents, 0);
  console.log(`- ${label}: void shift ${snapshot.shiftId} (week ${incidentWeek})`);
  console.log(
    `  before: ${snapshot.totalMinutes} min / ${beforePay}¢  →  after credit: ${CREDIT_MINUTES} min / ${afterPay}¢`,
  );
}

async function main(): Promise<void> {
  // Reject invalid/incomplete args before Payload init or any write path.
  const args = parseRepairArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString();

  console.log(
    `${args.apply ? "APPLY" : "DRY-RUN"} junior shift credit repair`,
  );
  console.log(
    `- Harlow exact shift ${args.harlow.shiftId} (junior ${args.harlow.juniorId}) week ${args.harlowIncidentWeek}`,
  );
  console.log(
    `- Sasha exact shift ${args.sasha.shiftId} (junior ${args.sasha.juniorId}) week ${args.sashaIncidentWeek}`,
  );
  if (args.harlowIncidentWeek !== args.sashaIncidentWeek) {
    console.log("- Cross-week repair: both mutations remain atomic in one DB transaction (row locks by shift id).");
  }

  const payload = await getPayload({ config });

  // Preflight both exact records before mutating either one.
  const harlowShift = await loadShiftExact(payload, args.harlow.shiftId);
  const sashaShift = await loadShiftExact(payload, args.sasha.shiftId);

  const prior = await assessAlreadyRepaired(
    payload,
    args.harlow,
    args.sasha,
    harlowShift,
    sashaShift,
    args.harlowIncidentWeek,
    args.sashaIncidentWeek,
  );

  if (prior.already) {
    console.log("- Idempotent no-op: both shifts already script-voided with matching credits.");
    console.log(`  Harlow credit id: ${prior.harlowCreditId}`);
    console.log(`  Sasha credit id: ${prior.sashaCreditId}`);
    console.log(args.apply ? "APPLY skipped (already repaired)." : "Dry run only. Already repaired — no mutation needed.");
    return;
  }

  assertSnapshotMatches("Harlow", args.harlow, harlowShift, args.harlowIncidentWeek);
  assertSnapshotMatches("Sasha", args.sasha, sashaShift, args.sashaIncidentWeek);
  console.log("- Preflight snapshots matched for Harlow and Sasha.");

  // Guard against duplicate credits if somehow voids exist without script markers.
  const existingHarlowCredit = await findScriptCredit(
    payload,
    args.harlow.juniorId,
    args.harlowIncidentWeek,
  );
  const existingSashaCredit = await findScriptCredit(
    payload,
    args.sasha.juniorId,
    args.sashaIncidentWeek,
  );
  if (existingHarlowCredit || existingSashaCredit) {
    throw new Error(
      "Script credit(s) already exist for a target incident week while target shifts are not both script-voided. Refusing to duplicate credits.",
    );
  }

  printPlan("Harlow", args.harlow, args.harlowIncidentWeek);
  printPlan("Sasha", args.sasha, args.sashaIncidentWeek);

  if (!args.apply) {
    console.log("Dry run only. Re-run with --apply to mutate both records atomically.");
    console.log(
      `- Would void shifts ${args.harlow.shiftId}/${args.sasha.shiftId} and create ${CREDIT_MINUTES}-minute credits (Harlow week ${args.harlowIncidentWeek}, Sasha week ${args.sashaIncidentWeek}).`,
    );
    return;
  }

  await withJuniorShiftCorrectionTransaction(
    payload,
    [args.harlow.shiftId, args.sasha.shiftId],
    async (txReq) => {
      const lockedHarlow = await loadShiftExact(payload, args.harlow.shiftId, txReq);
      const lockedSasha = await loadShiftExact(payload, args.sasha.shiftId, txReq);

      const lockedPrior = await assessAlreadyRepaired(
        payload,
        args.harlow,
        args.sasha,
        lockedHarlow,
        lockedSasha,
        args.harlowIncidentWeek,
        args.sashaIncidentWeek,
      );
      if (lockedPrior.already) {
        console.log("- Concurrent repair already completed; skipping mutation.");
        return;
      }

      assertSnapshotMatches("Harlow", args.harlow, lockedHarlow, args.harlowIncidentWeek);
      assertSnapshotMatches("Sasha", args.sasha, lockedSasha, args.sashaIncidentWeek);

      await voidShiftInTxn(payload, txReq, lockedHarlow, timestamp);
      await voidShiftInTxn(payload, txReq, lockedSasha, timestamp);

      await createCreditInTxn(
        payload,
        txReq,
        args.harlow.juniorId,
        args.harlow.hourlyRateCents,
        args.harlowIncidentWeek,
        timestamp,
      );
      await createCreditInTxn(
        payload,
        txReq,
        args.sasha.juniorId,
        args.sasha.hourlyRateCents,
        args.sashaIncidentWeek,
        timestamp,
      );
    },
  );

  console.log(
    `- Atomically voided shifts ${args.harlow.shiftId}/${args.sasha.shiftId} and credited ${CREDIT_MINUTES} minutes each.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
