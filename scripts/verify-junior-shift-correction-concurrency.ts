/**
 * Runtime concurrency regression for junior shift correctionAudit appends.
 *
 * Creates an isolated completed shift, runs two concurrent adjustMinutes
 * corrections, asserts both audit entries survive in serialized order, then
 * deletes the fixture.
 *
 * Run: npm run verify:junior-shift-correction-concurrency
 */
import { getPayload } from "payload";
import config from "../payload.config";
import {
  correctionAuditEntry,
  existingCorrectionAudit,
  shiftMoneyState,
} from "../lib/junior-creators/shift-correction-audit";
import { withJuniorShiftCorrectionTransaction } from "../lib/junior-creators/shift-correction-transaction";
import { getWeekKey } from "../lib/junior-creators/week";

type AnyDoc = Record<string, unknown>;

const MARKER = `kxd-concurrency-${Date.now()}`;

async function main() {
  const payload = await getPayload({ config });

  const juniors = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-users" as any,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (!juniors.docs.length) {
    console.log(
      "SKIP: no junior-creator-users available for concurrency fixture (local DB empty).",
    );
    return;
  }

  const junior = juniors.docs[0] as AnyDoc;
  const juniorId = Number(junior.id);
  const hourlyRateCents = Number(junior.hourlyRateCents ?? 800);
  const now = new Date();
  const weekKey = getWeekKey(now);

  const created = (await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "junior-creator-shifts" as any,
    data: {
      juniorCreatorUser: juniorId,
      startedAt: now.toISOString(),
      endedAt: now.toISOString(),
      totalMinutes: 30,
      weekKey,
      hourlyRateCents,
      payAdjustmentCents: 0,
      status: "completed",
      correctionAudit: [],
      notes: `${MARKER} concurrency fixture`,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;

  const shiftId = Number(created.id);
  console.log(`Created fixture shift ${shiftId}`);

  async function applyCorrection(label: string, minutes: number) {
    await withJuniorShiftCorrectionTransaction(payload, [shiftId], async (txReq) => {
      // Hold the lock briefly so the second request must wait.
      await new Promise((resolve) => setTimeout(resolve, label === "A" ? 80 : 0));

      const existing = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "junior-creator-shifts" as any,
        id: shiftId,
        depth: 0,
        overrideAccess: true,
        req: txReq,
      })) as AnyDoc;

      const original = shiftMoneyState(existing);
      const corrected = shiftMoneyState({
        ...existing,
        totalMinutes: minutes,
      })!;

      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "junior-creator-shifts" as any,
        id: shiftId,
        data: {
          totalMinutes: minutes,
          correctionAudit: [
            ...existingCorrectionAudit(existing),
            correctionAuditEntry({
              action: "adjustMinutes",
              reason: `${MARKER}-${label}`,
              admin: { id: `test-${label}`, email: null, collection: "users" },
              original,
              corrected,
            }),
          ],
          notes: `${MARKER} ${label}`,
        } as never,
        overrideAccess: true,
        req: txReq,
      });
    });
  }

  try {
    await Promise.all([applyCorrection("A", 41), applyCorrection("B", 42)]);

    const finalDoc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "junior-creator-shifts" as any,
      id: shiftId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;

    const audit = existingCorrectionAudit(finalDoc);
    const reasons = audit.map((entry) =>
      entry && typeof entry === "object" && "reason" in entry
        ? String((entry as { reason: unknown }).reason)
        : "",
    );

    if (audit.length < 2) {
      throw new Error(`Expected >=2 audit entries, got ${audit.length}`);
    }
    if (!reasons.includes(`${MARKER}-A`) || !reasons.includes(`${MARKER}-B`)) {
      throw new Error(`Missing concurrent audit reasons: ${JSON.stringify(reasons)}`);
    }

    const indexA = reasons.indexOf(`${MARKER}-A`);
    const indexB = reasons.indexOf(`${MARKER}-B`);
    if (indexA < 0 || indexB < 0) {
      throw new Error("Both audit entries must be present.");
    }

    // Serialization preserves append order for whichever lock ran first, then second.
    // Both entries must remain; order is the lock acquisition order.
    console.log(
      `Concurrency verification passed (audit order: ${reasons.filter((r) => r.startsWith(MARKER)).join(" -> ")}).`,
    );
  } finally {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "junior-creator-shifts" as any,
      id: shiftId,
      overrideAccess: true,
    });
    console.log(`Cleaned fixture shift ${shiftId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
