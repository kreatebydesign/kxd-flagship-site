import { ForecastScreen } from "@/components/admin/sales/ForecastScreen";
import { getForecastDashboard } from "@/lib/sales/forecast";

export const dynamic = "force-dynamic";

export default async function SalesForecastPage() {
  const data = await getForecastDashboard();
  return <ForecastScreen data={data} />;
}
