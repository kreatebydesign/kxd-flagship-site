/**
 * /admin/operations — default KXD OS home → Executive Today
 */
import { redirect } from "next/navigation";
import { EXECUTIVE_TODAY_HOME } from "@/lib/executive-today";

export const dynamic = "force-dynamic";

export default function OperationsHomePage() {
  redirect(EXECUTIVE_TODAY_HOME);
}
