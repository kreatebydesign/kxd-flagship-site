/**
 * /admin/connect — Phase 6 Batch C2 staff messaging UI.
 *
 * Server-side Connect access evaluation before any conversation data renders.
 * Direct URL only — not added to global production navigation.
 * Portal identities and unauthorized staff fail closed with a safe unavailable view.
 */
import { unstable_noStore as noStore } from "next/cache";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { resolveConnectStaffSession } from "@/lib/connect/messaging/session";
import { listConversationsForUi } from "@/lib/connect/messaging/ui-service";
import { ConnectMessagingScreen } from "@/components/admin/connect/ConnectMessagingScreen";
import { ConnectUnavailable } from "@/components/admin/connect/ConnectUnavailable";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  noStore();
  const user = await requirePayloadAdminPage("/admin/connect");

  const staffUserId = Number(user.id);
  const staffEmail = typeof user.email === "string" ? user.email : null;

  const resolved = await resolveConnectStaffSession({
    staffUserId,
    staffEmail,
  });

  if (!resolved.ok) {
    return <ConnectUnavailable />;
  }

  const listed = await listConversationsForUi({ session: resolved.session });
  const initialConversations = listed.ok ? listed.conversations : [];

  return (
    <ConnectMessagingScreen
      organizationName={resolved.session.organization.name}
      staffDisplayName={
        typeof user.displayName === "string" && user.displayName.trim()
          ? user.displayName.trim()
          : staffEmail ?? "Staff"
      }
      staffEmail={staffEmail ?? ""}
      initialConversations={initialConversations}
      listLoadFailed={!listed.ok}
    />
  );
}
