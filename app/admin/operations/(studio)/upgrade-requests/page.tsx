import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { UpgradeRequestsInboxScreen } from "@/components/admin/operations/upgrade-requests/UpgradeRequestsInboxScreen";

export const dynamic = "force-dynamic";

export default async function UpgradeRequestsPage() {
  await requirePayloadAdminPage("/admin/operations/upgrade-requests");
  return <UpgradeRequestsInboxScreen />;
}
