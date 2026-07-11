/**
 * /admin/operations/work
 * Phase 14B — retained route; redirects to Phase 20A Work Engine home.
 */

import { redirect } from "next/navigation";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { WORK_ENGINE_HOME } from "@/lib/work/constants";

export const dynamic = "force-dynamic";

export default async function OperationsWorkRedirectPage() {
  await requirePayloadAdminPage(WORK_ENGINE_HOME);
  redirect(WORK_ENGINE_HOME);
}
