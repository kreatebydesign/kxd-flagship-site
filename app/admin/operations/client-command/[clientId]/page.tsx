import { notFound } from "next/navigation";
import { ClientCommandScreen } from "@/components/admin/operations/client-command/ClientCommandScreen";
import { loadClientCommandCenter } from "@/lib/client-command";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ clientId: string }> };

export default async function ClientCommandPage({ params }: Props) {
  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!Number.isFinite(clientId)) notFound();

  const data = await loadClientCommandCenter(clientId);
  if (!data) notFound();

  return <ClientCommandScreen data={data} />;
}
