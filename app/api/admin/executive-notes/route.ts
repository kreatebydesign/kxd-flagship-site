import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createExecutiveNote } from "@/lib/executive-notes/engine";
import { searchExecutiveNotes } from "@/lib/executive-notes/search";
import type { CreateExecutiveNoteInput } from "@/lib/executive-notes/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const clientId = searchParams.get("clientId");
  const notes = await searchExecutiveNotes({
    q,
    clientId: clientId ? Number(clientId) : undefined,
    limit: 50,
  });
  return NextResponse.json({ success: true, notes });
}

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as CreateExecutiveNoteInput;
    if (!body.clientId || !body.title?.trim()) {
      return NextResponse.json({ success: false, error: "Client and title required." }, { status: 400 });
    }
    const note = await createExecutiveNote(body);
    return NextResponse.json({ success: true, noteId: note.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create note.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
