/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PATCH /api/admin/junior-creator-shifts
 * Payload admin — void shifts, adjust minutes, update admin notes.
 *
 * Existing-record mutations run inside a Payload/Postgres transaction with
 * deterministic FOR UPDATE locks so concurrent correctionAudit appends cannot
 * overwrite each other.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getWeekKey } from "@/lib/junior-creators/week";
import {
  adminAuditLine,
  appendAdminNote,
  correctionAuditEntry,
  existingCorrectionAudit,
  shiftMoneyState,
} from "@/lib/junior-creators/shift-correction-audit";
import { withJuniorShiftCorrectionTransaction } from "@/lib/junior-creators/shift-correction-transaction";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  const adminUser = auth as unknown as Record<string, unknown>;

  try {
    const body = await req.json();
    const shiftId = Number(body.shiftId);
    const action = String(body.action ?? "");

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action is required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    if (action === "createAdjustment") {
      const juniorCreatorUserId = Number(body.juniorCreatorUserId);
      const totalMinutes = Number(body.totalMinutes ?? 0);
      const payAdjustmentCents = Number(body.payAdjustmentCents ?? 0);
      const hourlyRateCents = Number(body.hourlyRateCents ?? 0);
      const adminNote = String(body.adminNote ?? "").trim();

      if (!juniorCreatorUserId) {
        return NextResponse.json(
          { success: false, error: "juniorCreatorUserId is required." },
          { status: 400 },
        );
      }
      if (!adminNote) {
        return NextResponse.json(
          { success: false, error: "Admin note is required for manual corrections." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
        return NextResponse.json(
          { success: false, error: "totalMinutes must be a non-negative number." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(payAdjustmentCents)) {
        return NextResponse.json(
          { success: false, error: "payAdjustmentCents must be a valid number." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(hourlyRateCents) || hourlyRateCents < 0) {
        return NextResponse.json(
          { success: false, error: "hourlyRateCents must be a non-negative number." },
          { status: 400 },
        );
      }
      if (Math.round(totalMinutes) === 0 && Math.round(payAdjustmentCents) === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Manual correction must include minutes, a pay adjustment, or both.",
          },
          { status: 400 },
        );
      }

      const now = new Date();
      const corrected = shiftMoneyState({
        status: "completed",
        totalMinutes: Math.round(totalMinutes),
        hourlyRateCents: Math.round(hourlyRateCents),
        payAdjustmentCents: Math.round(payAdjustmentCents),
        startedAt: now.toISOString(),
        endedAt: now.toISOString(),
        weekKey: String(body.weekKey ?? getWeekKey(now)),
      })!;
      await payload.create({
        collection: "junior-creator-shifts" as any,
        data: {
          juniorCreatorUser: juniorCreatorUserId,
          startedAt: corrected.startedAt,
          endedAt: corrected.endedAt,
          totalMinutes: corrected.totalMinutes,
          weekKey: corrected.weekKey,
          hourlyRateCents: corrected.hourlyRateCents,
          payAdjustmentCents: corrected.payAdjustmentCents,
          status: "completed",
          correctionAudit: [
            correctionAuditEntry({
              action: "createAdjustment",
              reason: adminNote,
              admin: adminUser,
              original: null,
              corrected,
            }),
          ],
          notes: adminAuditLine("manual correction", adminNote),
        } as any,
        overrideAccess: true,
      });

      return NextResponse.json({ success: true });
    }

    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: "shiftId is required." },
        { status: 400 },
      );
    }

    if (action === "void") {
      const adminNote = String(body.adminNote ?? "").trim();
      if (!adminNote) {
        return NextResponse.json(
          { success: false, error: "Admin note is required to void a shift." },
          { status: 400 },
        );
      }

      await withJuniorShiftCorrectionTransaction(payload, [shiftId], async (txReq) => {
        const existing = (await payload.findByID({
          collection: "junior-creator-shifts" as any,
          id: shiftId,
          depth: 0,
          overrideAccess: true,
          req: txReq,
        })) as Record<string, unknown>;

        const status = String(existing.status ?? "");
        if (status === "voided") {
          throw new Error("Shift is already voided.");
        }

        const now = new Date().toISOString();
        const original = shiftMoneyState(existing);
        const updateData: Record<string, unknown> = {
          status: "voided",
          totalMinutes: 0,
          payAdjustmentCents: 0,
          notes: appendAdminNote(
            existing.notes ? String(existing.notes) : null,
            adminAuditLine("void", adminNote),
          ),
        };
        if (status === "active") {
          updateData.endedAt = now;
        }
        const corrected = shiftMoneyState({ ...existing, ...updateData })!;
        updateData.correctionAudit = [
          ...existingCorrectionAudit(existing),
          correctionAuditEntry({
            action: "void",
            reason: adminNote,
            admin: adminUser,
            original,
            corrected,
          }),
        ];

        await payload.update({
          collection: "junior-creator-shifts" as any,
          id: shiftId,
          data: updateData as any,
          overrideAccess: true,
          req: txReq,
        });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "adjustMinutes") {
      const adminNote = String(body.adminNote ?? "").trim();
      const totalMinutes = Number(body.totalMinutes);

      if (!adminNote) {
        return NextResponse.json(
          { success: false, error: "Admin note is required when adjusting minutes." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
        return NextResponse.json(
          { success: false, error: "totalMinutes must be a non-negative number." },
          { status: 400 },
        );
      }

      const requestedPayAdjustment =
        body.payAdjustmentCents === undefined || body.payAdjustmentCents === null
          ? null
          : Number(body.payAdjustmentCents);
      if (
        requestedPayAdjustment != null &&
        !Number.isFinite(requestedPayAdjustment)
      ) {
        return NextResponse.json(
          { success: false, error: "payAdjustmentCents must be a valid number." },
          { status: 400 },
        );
      }

      await withJuniorShiftCorrectionTransaction(payload, [shiftId], async (txReq) => {
        const existing = (await payload.findByID({
          collection: "junior-creator-shifts" as any,
          id: shiftId,
          depth: 0,
          overrideAccess: true,
          req: txReq,
        })) as Record<string, unknown>;

        const status = String(existing.status ?? "");
        if (status !== "completed") {
          throw new Error("Only completed shifts can have minutes adjusted.");
        }

        const payAdjustmentCents = Math.round(
          requestedPayAdjustment ?? Number(existing.payAdjustmentCents ?? 0),
        );

        const audit = adminAuditLine(
          `adjust ${Math.round(totalMinutes)}m / ${payAdjustmentCents}¢`,
          adminNote,
        );

        const original = shiftMoneyState(existing);
        const corrected = shiftMoneyState({
          ...existing,
          totalMinutes: Math.round(totalMinutes),
          payAdjustmentCents,
        })!;

        await payload.update({
          collection: "junior-creator-shifts" as any,
          id: shiftId,
          data: {
            totalMinutes: corrected.totalMinutes,
            payAdjustmentCents: corrected.payAdjustmentCents,
            correctionAudit: [
              ...existingCorrectionAudit(existing),
              correctionAuditEntry({
                action: "adjustMinutes",
                reason: adminNote,
                admin: adminUser,
                original,
                corrected,
              }),
            ],
            notes: appendAdminNote(
              existing.notes ? String(existing.notes) : null,
              audit,
            ),
          } as any,
          overrideAccess: true,
          req: txReq,
        });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "updateNotes") {
      const notes = String(body.notes ?? "").trim();

      await withJuniorShiftCorrectionTransaction(payload, [shiftId], async (txReq) => {
        await payload.findByID({
          collection: "junior-creator-shifts" as any,
          id: shiftId,
          depth: 0,
          overrideAccess: true,
          req: txReq,
        });

        await payload.update({
          collection: "junior-creator-shifts" as any,
          id: shiftId,
          data: { notes: notes || null } as any,
          overrideAccess: true,
          req: txReq,
        });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action." },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update shift.";
    const knownClientErrors = [
      "Shift is already voided.",
      "Only completed shifts can have minutes adjusted.",
    ];
    if (knownClientErrors.includes(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error("[KXD] Junior creator shift admin update failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update shift." },
      { status: 500 },
    );
  }
}
