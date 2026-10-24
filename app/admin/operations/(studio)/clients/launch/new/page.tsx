import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { createLaunchDraft } from "@/lib/client-launch-wizard/server";

export const dynamic = "force-dynamic";

export default async function ClientLaunchPipelineNewDraftPage() {
  const user = await requirePayloadAdminPage("/admin/operations/clients/launch/new");
  const payload = await getPayload({ config });
  const createdBy =
    (user as { email?: string; name?: string } | null)?.email ||
    (user as { name?: string } | null)?.name ||
    "KXD Admin";
  const draft = await createLaunchDraft(payload, createdBy);
  redirect(`/admin/operations/clients/launch/${draft.id}`);
}
