import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { EventCreateScreen } from "@/components/admin/operations/events/EventDetailScreen";

export const dynamic = "force-dynamic";

/**
 * Optional `clientId` query preselects the owning client in the create form.
 * Submission still validates ownership server-side — the query is never trusted alone.
 */
export default async function NewRelationshipEventPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePayloadAdminPage("/admin/operations/events/new");
  const params = await searchParams;
  const raw = Number(params.clientId);
  const initialClientId =
    Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : undefined;
  return <EventCreateScreen initialClientId={initialClientId} />;
}
