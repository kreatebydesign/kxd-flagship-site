import { PipelineScreen } from "@/components/admin/sales/PipelineScreen";
import { getPipelineBoard } from "@/lib/sales/pipeline";

export const dynamic = "force-dynamic";

export default async function SalesPipelinePage() {
  const data = await getPipelineBoard();
  return <PipelineScreen data={data} />;
}
