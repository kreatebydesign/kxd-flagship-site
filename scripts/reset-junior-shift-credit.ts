/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reset Harlow and Sasha shift timers after an accidental open shift, then
 * leave each Junior Creator with a single 1-hour admin credit for the week.
 *
 * Safe by default: run without --apply to preview. Run with --apply to update.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { getWeekKey } from "../lib/junior-creators/week.ts";

type AnyDoc = Record<string, any>;

const TARGET_DISPLAY_NAMES = ["Harlow", "Sasha"] as const;
const CREDIT_MINUTES = 60;
const APPLY = process.argv.includes("--apply") || process.env.APPLY === "1";
const now = new Date();
const weekKey = getWeekKey(now);
const timestamp = now.toISOString();

function getRelatedId(value: unknown): number {
  if (typeof value === "object" && value && "id" in value) return Number((value as { id: unknown }).id);
  return Number(value);
}

function appendNote(existing: unknown, line: string): string {
  const base = typeof existing === "string" ? existing.trim() : "";
  return base ? `${base}\n\n${line}` : line;
}

function shiftState(source: AnyDoc | null): Record<string, unknown> | null {
  if (!source) return null;
  return {
    status: source.status ? String(source.status) : null,
    totalMinutes: source.totalMinutes == null ? null : Number(source.totalMinutes),
    hourlyRateCents: source.hourlyRateCents == null ? null : Number(source.hourlyRateCents),
    payAdjustmentCents: source.payAdjustmentCents == null ? null : Number(source.payAdjustmentCents),
    startedAt: source.startedAt ? String(source.startedAt) : null,
    endedAt: source.endedAt ? String(source.endedAt) : null,
    weekKey: source.weekKey ? String(source.weekKey) : null,
  };
}

function existingAudit(source: AnyDoc): unknown[] {
  return Array.isArray(source.correctionAudit) ? source.correctionAudit : [];
}

function auditEntry(
  action: string,
  reason: string,
  original: AnyDoc | null,
  corrected: AnyDoc,
): Record<string, unknown> {
  return {
    action,
    reason,
    at: timestamp,
    admin: { id: "script", email: null, collection: "system" },
    original: shiftState(original),
    corrected: shiftState(corrected),
  };
}

async function findJuniorByDisplayName(displayName: string): Promise<AnyDoc> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "junior-creator-users" as any,
    where: { displayName: { equals: displayName } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  });

  if (result.docs.length !== 1) {
    throw new Error(`Expected exactly one Junior Creator named ${displayName}, found ${result.docs.length}.`);
  }
  return result.docs[0] as AnyDoc;
}

async function resetJunior(displayName: string): Promise<void> {
  const payload = await getPayload({ config });
  const junior = await findJuniorByDisplayName(displayName);
  const juniorId = Number(junior.id);
  const hourlyRateCents = Number(junior.hourlyRateCents ?? 800);

  const shifts = await payload.find({
    collection: "junior-creator-shifts" as any,
    where: {
      and: [
        { juniorCreatorUser: { equals: juniorId } },
        { weekKey: { equals: weekKey } },
        { status: { in: ["active", "completed"] } },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  const targetShifts = (shifts.docs as AnyDoc[]).filter(
    (shift) => getRelatedId(shift.juniorCreatorUser) === juniorId,
  );

  console.log(`${APPLY ? "Resetting" : "Would reset"} ${displayName} (id=${juniorId})`);
  console.log(`- ${targetShifts.length} active/completed shift(s) in week ${weekKey} will be voided.`);

  if (!APPLY) return;

  for (const shift of targetShifts) {
    const corrected = {
      ...shift,
      status: "voided",
      endedAt: shift.endedAt ?? timestamp,
      totalMinutes: 0,
      payAdjustmentCents: 0,
    };
    await payload.update({
      collection: "junior-creator-shifts" as any,
      id: shift.id,
      data: {
        status: corrected.status,
        endedAt: corrected.endedAt,
        totalMinutes: corrected.totalMinutes,
        payAdjustmentCents: corrected.payAdjustmentCents,
        correctionAudit: [
          ...existingAudit(shift),
          auditEntry(
            "scriptResetVoid",
            "Accidental open shift reset; replaced by 60-minute founder credit.",
            shift,
            corrected,
          ),
        ],
        notes: appendNote(
          shift.notes,
          `[Admin reset ${timestamp.slice(0, 10)}] Accidental open shift reset; replaced by 60-minute founder credit.`,
        ),
      } as any,
      overrideAccess: true,
    });
  }

  const credit = {
    juniorCreatorUser: juniorId,
    startedAt: timestamp,
    endedAt: timestamp,
    totalMinutes: CREDIT_MINUTES,
    weekKey,
    hourlyRateCents,
    payAdjustmentCents: 0,
    status: "completed",
  };
  await payload.create({
    collection: "junior-creator-shifts" as any,
    data: {
      ...credit,
      correctionAudit: [
        auditEntry(
          "scriptCreditCreate",
          "Founder-approved 1-hour credit after accidental shift reset.",
          null,
          credit,
        ),
      ],
      notes: `[Admin credit ${timestamp.slice(0, 10)}] Founder-approved 1-hour credit after accidental shift reset.`,
    } as any,
    overrideAccess: true,
  });

  console.log(`- Credited ${displayName} with ${CREDIT_MINUTES} minutes at ${hourlyRateCents} cents/hour.`);
}

async function main(): Promise<void> {
  await getPayload({ config });
  for (const displayName of TARGET_DISPLAY_NAMES) {
    await resetJunior(displayName);
  }
  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply or APPLY=1 to update Payload.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
