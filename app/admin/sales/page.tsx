import { PipelineScreen } from "@/components/admin/sales/PipelineScreen";
import { getSalesWorkspace } from "@/lib/sales/workspace";

export const dynamic = "force-dynamic";

export default async function SalesPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const params = await searchParams;
  const focusRaw = params.focus?.trim();
  const focusId = focusRaw && /^\d+$/.test(focusRaw) ? Number(focusRaw) : null;
  const data = await getSalesWorkspace();
  return <PipelineScreen data={data} focusId={focusId} />;
}
