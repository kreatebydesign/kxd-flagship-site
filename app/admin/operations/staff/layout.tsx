import { StaffNavProvider } from "@/components/admin/operations/staff/StaffNavContext";
import { staffActorFromUser } from "@/lib/staff/actor";
import { actorHasStaffCapability, requireStaffAwarePage } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffAwarePage("/admin/operations/staff");
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
