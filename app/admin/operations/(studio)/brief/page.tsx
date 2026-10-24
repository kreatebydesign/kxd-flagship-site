/**
 * /admin/operations/brief
 * Morning Brief merges into Today — not a competing home.
 * Phase 7 Batch B/C home policy.
 */

import { redirect } from "next/navigation";
import { FOUNDER_HOME_PATH } from "@/lib/admin/home-policy";

export const dynamic = "force-dynamic";

export default function MorningBriefRedirectPage() {
  redirect(FOUNDER_HOME_PATH);
}
