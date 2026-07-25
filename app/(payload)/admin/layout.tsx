import "server-only";

import { redirectRestrictedStaffFromPayloadAdmin } from "@/lib/staff/payload-admin-redirect";

/**
 * Defense-in-depth: nested Payload Admin routes also redirect restricted staff.
 * Primary redirect runs in `(payload)/layout.tsx` before RootLayout.
 */
export default async function PayloadAdminIsolationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectRestrictedStaffFromPayloadAdmin();
  return children;
}
