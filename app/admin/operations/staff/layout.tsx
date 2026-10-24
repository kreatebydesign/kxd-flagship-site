import { trustedLayoutReturnPath } from "@/lib/admin/trusted-layout-return-path";
import { StaffNavProvider } from "@/components/admin/operations/staff/StaffNavContext";
import { staffActorFromUser } from "@/lib/staff/actor";
import { actorHasStaffCapability, requireStaffAwarePage } from "@/lib/staff";

export const dynamic = "force-dynamic";

const STAFF_LAYOUT_FALLBACK = "/admin/operations/staff";

export default async function StaffOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { headers } = await import("next/headers");
  const pathname = (await headers()).get("x-kxd-pathname")?.trim() || "";
  const returnPath = trustedLayoutReturnPath(
    pathname,
    STAFF_LAYOUT_FALLBACK,
    STAFF_LAYOUT_FALLBACK,
  );
  const user = await requireStaffAwarePage(returnPath);
  const actor = staffActorFromUser(user);
  const showSalesDevelopmentNav = Boolean(
    actor && actorHasStaffCapability(actor, "staff.sales.read"),
  );

  return (
    <StaffNavProvider showSalesDevelopmentNav={showSalesDevelopmentNav}>
      {children}
    </StaffNavProvider>
  );
}
