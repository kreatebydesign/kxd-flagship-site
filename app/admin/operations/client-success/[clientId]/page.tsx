/**
 * /admin/operations/client-success/[clientId]
 */

import { notFound } from "next/navigation";
import { ClientSuccessDetailScreen } from "@/components/admin/operations/client-success/ClientSuccessDetailScreen";
import { getClientSuccessDetail } from "@/lib/client-success";

export const dynamic = "force-dynamic";

export default async function ClientSuccessDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const id = Number(clientId);
  if (!Number.isFinite(id)) notFound();

  const data = await getClientSuccessDetail(id);
  if (!data) notFound();

  return <ClientSuccessDetailScreen data={data} />;
}
