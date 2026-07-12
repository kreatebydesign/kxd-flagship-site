/**
 * /admin/operations/brief
 * Morning Brief is now composed into Executive Today.
 */

import { redirect } from "next/navigation";
import { EXECUTIVE_TODAY_HOME } from "@/lib/executive-today";

export const dynamic = "force-dynamic";

export default function MorningBriefRedirectPage() {
  redirect(EXECUTIVE_TODAY_HOME);
}
