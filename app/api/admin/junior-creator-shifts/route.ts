/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PATCH /api/admin/junior-creator-shifts
 * Payload admin — void shifts, adjust minutes, update admin notes.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getWeekKey } from "@/lib/junior-creators/week";

export const dynamic = "force-dynamic";

function adminAuditLine(action: string, note: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `[Admin ${action} ${date}] ${note.trim()}`;
}

function appendNote(existing: string | null | undefined, line: string): string {
  const base = existing?.trim() ?? "";
  return base ? `${base}\n\n${line}` : line;
}

type ShiftMoneyState = {
  status: string | null;
  totalMinutes: number | null;
  hourlyRateCents: number | null;
  payAdjustmentCents: number | null;
  startedAt: string | null;
  endedAt: string | null;
  weekKey: string | null;
};

function shiftMoneyState(source: Record<string, unknown> | null): ShiftMoneyState | null {
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

function adminIdentity(user: Record<string, unknown>) {
  return {
    id: user.id ?? null,
    email: user.email ? String(user.email) : null,
    collection: user.collection ? String(user.collection) : "users",
  };
}

function existingAudit(existing: Record<string, unknown>): unknown[] {
  return Array.isArray(existing.correctionAudit) ? existing.correctionAudit : [];
}

function correctionAuditEntry(args: {
  action: string;
  reason: string;
  admin: Record<string, unknown>;
  original: ShiftMoneyState | null;
  corrected: ShiftMoneyState;
}) {
  return {
    action: args.action,
    reason: args.reason,
    at: new Date().toISOString(),
    admin: adminIdentity(args.admin),
    original: args.original,
    corrected: args.corrected,
  };
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  const adminUser = auth as Record<string, unknown>;

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
          { success: false, error: "Manual correction must include minutes, a pay adjustment, or both." },
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

    const existing = await payload.findByID({
      collection: "junior-creator-shifts" as any,
      id: shiftId,
      depth: 0,
      overrideAccess: true,
    }) as Record<string, unknown>;

    const status = String(existing.status ?? "");
    const existingNotes = existing.notes ? String(existing.notes) : null;

    if (action === "void") {
      const adminNote = String(body.adminNote ?? "").trim();
      if (!adminNote) {
        return NextResponse.json(
          { success: false, error: "Admin note is required to void a shift." },
          { status: 400 },
        );
      }
      if (status === "voided") {
        return NextResponse.json(
          { success: false, error: "Shift is already voided." },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();
      const original = shiftMoneyState(existing);
      const updateData: Record<string, unknown> = {
        status: "voided",
        totalMinutes: 0,
        payAdjustmentCents: 0,
        notes: appendNote(existingNotes, adminAuditLine("void", adminNote)),
      };
      if (status === "active") {
        updateData.endedAt = now;
      }
      const corrected = shiftMoneyState({ ...existing, ...updateData })!;
      updateData.correctionAudit = [
        ...existingAudit(existing),
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
      });

      return NextResponse.json({ success: true });
    }

    if (action === "adjustMinutes") {
      const adminNote = String(body.adminNote ?? "").trim();
      const totalMinutes = Number(body.totalMinutes);
      const payAdjustmentCents = Number(body.payAdjustmentCents ?? existing.payAdjustmentCents ?? 0);

      if (!adminNote) {
        return NextResponse.json(
          { success: false, error: "Admin note is required when adjusting minutes." },
          { status: 400 },
        );
      }
      if (status !== "completed") {
        return NextResponse.json(
          { success: false, error: "Only completed shifts can have minutes adjusted." },
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

      const audit = adminAuditLine(
        `adjust ${totalMinutes}m / ${payAdjustmentCents}¢`,
        adminNote,
      );

      const original = shiftMoneyState(existing);
      const corrected = shiftMoneyState({
        ...existing,
        totalMinutes: Math.round(totalMinutes),
        payAdjustmentCents: Math.round(payAdjustmentCents),
      })!;

      await payload.update({
        collection: "junior-creator-shifts" as any,
        id: shiftId,
        data: {
          totalMinutes: corrected.totalMinutes,
          payAdjustmentCents: corrected.payAdjustmentCents,
          correctionAudit: [
            ...existingAudit(existing),
            correctionAuditEntry({
              action: "adjustMinutes",
              reason: adminNote,
              admin: adminUser,
              original,
              corrected,
            }),
          ],
          notes: appendNote(existingNotes, audit),
        } as any,
        overrideAccess: true,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "updateNotes") {
      const notes = String(body.notes ?? "").trim();
      await payload.update({
        collection: "junior-creator-shifts" as any,
        id: shiftId,
        data: { notes: notes || null } as any,
        overrideAccess: true,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[KXD] Junior creator shift admin update failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update shift." },
      { status: 500 },
    );
  }
}
