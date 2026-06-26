/**
 * /admin/operations/timeline/[clientId]
 * KXD Core Phase 5D — Client relationship timeline
 */

import { notFound } from "next/navigation";
import { ExecutiveTimelineClientScreen } from "@/components/admin/operations/timeline/ExecutiveTimelineClientScreen";
import { getExecutiveTimelineClient } from "@/lib/executive-timeline/data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientId: string }>;
};

export default async function ExecutiveTimelineClientPage({ params }: Props) {
  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);

  if (!clientId || Number.isNaN(clientId)) {
    notFound();
  }

  const data = await getExecutiveTimelineClient(clientId);
  if (!data) {
    notFound();
  }

  return <ExecutiveTimelineClientScreen clientId={clientId} data={data} />;
}
