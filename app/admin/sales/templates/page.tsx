import { TemplatesScreen } from "@/components/admin/sales/TemplatesScreen";
import { getSectionTemplates } from "@/lib/sales/proposals";

export const dynamic = "force-dynamic";

export default async function SalesTemplatesPage() {
  const templates = await getSectionTemplates();
  return <TemplatesScreen templates={templates} />;
}
