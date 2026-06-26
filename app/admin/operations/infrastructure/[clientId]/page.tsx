/**
 * /admin/operations/infrastructure/[clientId]
 * KXD Core Phase 5B — Client infrastructure detail
 */

import { notFound } from "next/navigation";
import { InfrastructureClientScreen } from "@/components/admin/operations/infrastructure/InfrastructureClientScreen";
import { getClientInfrastructure } from "@/lib/infrastructure/data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientId: string }>;
};

export default async function InfrastructureClientPage({ params }: Props) {
  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!Number.isFinite(clientId)) notFound();

  const detail = await getClientInfrastructure(clientId);
  if (!detail) notFound();

  return <InfrastructureClientScreen clientId={clientId} detail={detail} />;
}
