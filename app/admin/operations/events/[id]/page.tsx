import { notFound } from "next/navigation";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { EventDetailScreen } from "@/components/admin/operations/events/EventDetailScreen";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RelationshipEventDetailPage({ params }: Props) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId) || eventId <= 0) notFound();

  await requirePayloadAdminPage(`/admin/operations/events/${eventId}`);
  return <EventDetailScreen eventId={eventId} />;
}
