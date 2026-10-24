import { notFound } from "next/navigation";
import { IntegrationDetailScreen } from "@/components/admin/operations/integrations";
import { getIntegrationDetail } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const data = getIntegrationDetail(provider);
  if (!data) notFound();
  return <IntegrationDetailScreen data={data} />;
}
