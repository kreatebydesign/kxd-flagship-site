import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { EventCreateScreen } from "@/components/admin/operations/events/EventDetailScreen";

export const dynamic = "force-dynamic";

export default async function NewRelationshipEventPage() {
  await requirePayloadAdminPage("/admin/operations/events/new");
  return <EventCreateScreen />;
}
