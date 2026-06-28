import { notFound } from "next/navigation";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { LaunchQaClientScreen } from "@/components/admin/operations/launch-qa/LaunchQaClientScreen";
import { getLatestLaunchQaForClient } from "@/lib/launch-qa";
import { loadIntelligenceContext } from "@/lib/intelligence/context";

export const dynamic = "force-dynamic";

export default async function LaunchQaClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requirePayloadAdminPage("/admin/operations/launch-qa");
  const { clientId } = await params;
  const cid = Number(clientId);
  if (!cid) notFound();

  const ctx = await loadIntelligenceContext();
  if (!ctx.clientsById.has(cid)) notFound();

  const detail = await getLatestLaunchQaForClient(cid);

  return <LaunchQaClientScreen initialDetail={detail} clientId={cid} />;
}
