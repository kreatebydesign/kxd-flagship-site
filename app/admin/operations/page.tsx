/**
 * /admin/operations — default KXD OS home → Executive Command Center
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OperationsHomePage() {
  redirect("/admin/operations/executive");
}
