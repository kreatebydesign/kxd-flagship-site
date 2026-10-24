import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { CommercialAgreementsScreen } from "@/components/admin/operations/commercial-agreements/CommercialAgreementsScreen";

export const dynamic = "force-dynamic";

export default async function CommercialAgreementsPage() {
  await requirePayloadAdminPage("/admin/operations/commercial-agreements");
  return <CommercialAgreementsScreen />;
}
