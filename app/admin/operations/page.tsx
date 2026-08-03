/**
 * /admin/operations — default KXD OS home → Today
 * Phase 7 Batch C — sole founder landing.
 */
import { redirect } from "next/navigation";
import { FOUNDER_HOME_PATH } from "@/lib/admin/home-policy";

export const dynamic = "force-dynamic";

export default function OperationsHomePage() {
  redirect(FOUNDER_HOME_PATH);
}
