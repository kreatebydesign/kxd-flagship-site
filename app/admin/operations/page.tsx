/**
 * /admin/operations — default KXD OS home → Executive Overview
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OperationsHomePage() {
  redirect("/admin/operations/executive");
}
