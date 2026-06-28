/**
 * /admin/operations/work
 * KXD Core Phase 7H — Client Work Manager (portfolio)
 */

import { WorkScreen } from "@/components/admin/operations/work/WorkScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getWorkPortfolio } from "@/lib/client-tasks";

export const dynamic = "force-dynamic";

export default async function WorkPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requirePayloadAdminPage("/admin/operations/work");
  const params = await searchParams;
  const data = await getWorkPortfolio();

  return (
    <WorkScreen
      data={data}
      initialView={params.view}
      adminEmail={typeof user.email === "string" ? user.email : null}
    />
  );
}
