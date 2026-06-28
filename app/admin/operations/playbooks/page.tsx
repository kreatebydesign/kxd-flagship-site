/**
 * /admin/operations/playbooks
 * KXD Core Phase 7E — Playbooks & SOP Engine
 */

import { PlaybooksScreen } from "@/components/admin/operations/playbooks/PlaybooksScreen";
import { getPlaybookDashboard } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<{ playbook?: string; client?: string }>;
}) {
  const params = await searchParams;
  const data = await getPlaybookDashboard();
  const initialClientId = params.client ? Number(params.client) : undefined;

  return (
    <PlaybooksScreen
      data={data}
      initialPlaybookSlug={params.playbook}
      initialClientId={Number.isFinite(initialClientId) ? initialClientId : undefined}
    />
  );
}
