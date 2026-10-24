import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { EventsListScreen } from "@/components/admin/operations/events/EventsListScreen";

export const dynamic = "force-dynamic";

export default async function RelationshipEventsPage() {
  await requirePayloadAdminPage("/admin/operations/events");
  return <EventsListScreen />;
}
