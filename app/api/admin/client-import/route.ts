import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { importClientWorkflow } from "@/lib/client-launch/import-client-workflow";
import { normalizeImportDraft, validateImportDraft } from "@/lib/client-launch/validate-import-draft";

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { draft?: unknown; rawNotes?: string };
    if (!body.draft) {
      return NextResponse.json(
        { success: false, message: "Missing import draft JSON." },
        { status: 400 },
      );
    }

    const draft = normalizeImportDraft(body.draft);
    const validationErrors = validateImportDraft(draft);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: validationErrors },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const createdBy =
      (auth as { email?: string; name?: string }).email ||
      (auth as { name?: string }).name ||
      "KXD Admin";

    const result = await importClientWorkflow(payload, draft, createdBy, {
      rawNotes: typeof body.rawNotes === "string" ? body.rawNotes : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Client import failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
