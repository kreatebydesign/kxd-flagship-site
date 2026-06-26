import { BrainScreen } from "@/components/admin/operations/brain/BrainScreen";
import { getBrainSnapshot } from "@/lib/brain";

export const dynamic = "force-dynamic";

export default async function BrainPage() {
  const data = await getBrainSnapshot();
  return <BrainScreen data={data} />;
}
