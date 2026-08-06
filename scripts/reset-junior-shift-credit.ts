/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reset specific Harlow and Sasha shift timers after an accidental open shift,
 * then leave each Junior Creator with a single 1-hour admin credit for the
 * explicitly supplied incident week.
 *
 * Safety requirements:
 * - --incident-week must be an explicit Monday (never derived from today)
 * - --harlow-snapshot / --sasha-snapshot must identify exact shift IDs + expected values
 * - both records are preflighted before any write
 * - --apply mutates both voids + credits atomically in one transaction
 *
 * Safe by default: omit --apply for a non-mutating dry run.
 *
 * Example:
 *   npm run repair:junior-shift-credit -- \
 *     --incident-week=2026-07-28 \
 *     --harlow-snapshot='{"shiftId":12,"juniorId":3,"status":"active","startedAt":"...","endedAt":null,"totalMinutes":0,"hourlyRateCents":800,"payAdjustmentCents":0}' \
 *     --sasha-snapshot='{"shiftId":13,...}'
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
  } catch {
    throw new Error(`Exact shift id ${shiftId} was not found.`);
  }
}

async function voidShiftInTxn(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: any,
  shift: AnyDoc,
  incidentWeek: string,
  timestamp: string,
): Promise<void> {
  const original = shiftMoneyState(shift);
  const updateData: Record<string, unknown> = {
    status: "voided",
    endedAt: shift.endedAt ?? timestamp,
    totalMinutes: 0,
    payAdjustmentCents: 0,
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

  void incidentWeek;
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

async function main(): Promise<void> {
  // Reject invalid/incomplete args before Payload init or any write path.
  const args = parseRepairArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString();

  console.log(
    `${args.apply ? "APPLY" : "DRY-RUN"} junior shift credit repair for incident week ${args.incidentWeek}`,
  );
  console.log(
    `- Harlow exact shift ${args.harlow.shiftId} (junior ${args.harlow.juniorId})`,
  );
  console.log(
    `- Sasha exact shift ${args.sasha.shiftId} (junior ${args.sasha.juniorId})`,
  );

  const payload = await getPayload({ config });

  // Preflight both exact records before mutating either one.
  const harlowShift = await loadShiftExact(payload, args.harlow.shiftId);
  const sashaShift = await loadShiftExact(payload, args.sasha.shiftId);
  assertSnapshotMatches("Harlow", args.harlow, harlowShift, args.incidentWeek);
  assertSnapshotMatches("Sasha", args.sasha, sashaShift, args.incidentWeek);
  console.log("- Preflight snapshots matched for Harlow and Sasha.");

  if (!args.apply) {
    console.log("Dry run only. Re-run with --apply to mutate both records atomically.");
    return;
  }

  await withJuniorShiftCorrectionTransaction(
    payload,
    [args.harlow.shiftId, args.sasha.shiftId],
    async (txReq) => {
      const lockedHarlow = await loadShiftExact(payload, args.harlow.shiftId, txReq);
      const lockedSasha = await loadShiftExact(payload, args.sasha.shiftId, txReq);
      assertSnapshotMatches("Harlow", args.harlow, lockedHarlow, args.incidentWeek);
      assertSnapshotMatches("Sasha", args.sasha, lockedSasha, args.incidentWeek);

      await voidShiftInTxn(payload, txReq, lockedHarlow, args.incidentWeek, timestamp);
      await voidShiftInTxn(payload, txReq, lockedSasha, args.incidentWeek, timestamp);

      await createCreditInTxn(
        payload,
        txReq,
        args.harlow.juniorId,
        args.harlow.hourlyRateCents,
        args.incidentWeek,
        timestamp,
      );
      await createCreditInTxn(
        payload,
        txReq,
        args.sasha.juniorId,
        args.sasha.hourlyRateCents,
        args.incidentWeek,
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
