import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  createLaunchDraft,
  listOpenLaunchDrafts,
} from "@/lib/client-launch-wizard/server";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const payload = await getPayload({ config });
  const drafts = await listOpenLaunchDrafts(payload);
  return NextResponse.json({ success: true, drafts });
}

export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const createdBy =
    (auth as { email?: string; name?: string }).email ||
    (auth as { name?: string }).name ||
    "KXD Admin";

  const payload = await getPayload({ config });
  const draft = await createLaunchDraft(payload, createdBy);
  return NextResponse.json({ success: true, draft });
}
