/**
 * PATCH /api/admin/junior-creator-shifts
 * Payload admin — void shifts, adjust minutes, update admin notes.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

function adminAuditLine(action: string, note: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `[Admin ${action} ${date}] ${note.trim()}`;
}

function appendNote(existing: string | null | undefined, line: string): string {
  const base = existing?.trim() ?? "";
  return base ? `${base}\n\n${line}` : line;
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const shiftId = Number(body.shiftId);
    const action = String(body.action ?? "");

    if (!shiftId || !action) {
      return NextResponse.json(
        { success: false, error: "shiftId and action are required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const updateData: Record<string, unknown> = {
        status: "voided",
        totalMinutes: 0,
        notes: appendNote(existingNotes, adminAuditLine("void", adminNote)),
      };
      if (status === "active") {
        updateData.endedAt = now;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const audit = adminAuditLine(
        `adjust ${totalMinutes}m`,
        adminNote,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await payload.update({
        collection: "junior-creator-shifts" as any,
        id: shiftId,
        data: {
          totalMinutes: Math.round(totalMinutes),
          notes: appendNote(existingNotes, audit),
        } as any,
        overrideAccess: true,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "updateNotes") {
      const notes = String(body.notes ?? "").trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
