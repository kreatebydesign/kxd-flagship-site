import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientLaunchWizardShell } from "@/components/admin/operations/client-launch-wizard/ClientLaunchWizardShell";
import {
  getLaunchDraft,
  listOpenLaunchDrafts,
} from "@/lib/client-launch-wizard/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function ClientLaunchWizardDraftPage({ params }: PageProps) {
  await requirePayloadAdminPage("/admin/operations/clients/launch");
  const { draftId } = await params;
  const payload = await getPayload({ config });
  const [draft, openDrafts] = await Promise.all([
    getLaunchDraft(payload, draftId),
    listOpenLaunchDrafts(payload),
  ]);

  if (!draft) notFound();

  return (
    <OperationsShell activeId="client-launch-wizard">
      <ClientLaunchWizardShell initialDraft={draft} openDrafts={openDrafts} />
    </OperationsShell>
  );
}
