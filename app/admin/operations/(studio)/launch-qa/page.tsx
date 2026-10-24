import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { LaunchQaScreen } from "@/components/admin/operations/launch-qa/LaunchQaScreen";
import { getLaunchQaPortfolio } from "@/lib/launch-qa";

export const dynamic = "force-dynamic";

export default async function LaunchQaPage() {
  await requirePayloadAdminPage("/admin/operations/launch-qa");
  const data = await getLaunchQaPortfolio();
  return <LaunchQaScreen data={data} />;
}
