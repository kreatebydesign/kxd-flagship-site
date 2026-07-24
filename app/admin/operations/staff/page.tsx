/**
 * /admin/operations/staff — restricted staff home (Edition 1)
 */

import { StaffHomeScreen } from "@/components/admin/operations/staff";
import { loadStaffToday, requireStaffAwarePage } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  const user = await requireStaffAwarePage("/admin/operations/staff");
  const data = await loadStaffToday(user);

  return <StaffHomeScreen data={data} />;
}
