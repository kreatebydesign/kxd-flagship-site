"use server";

import { revalidatePath } from "next/cache";
import { backfillClientActivity } from "@/lib/client-command/activity/backfill";
import type { ActivityBackfillResult } from "@/lib/client-command/activity/types";

export async function runClientActivityBackfill(
  clientId?: number,
): Promise<ActivityBackfillResult> {
  const result = await backfillClientActivity({
    clientId: clientId && clientId > 0 ? clientId : undefined,
  });

  revalidatePath("/admin/operations/client-command");
  if (clientId) {
    revalidatePath(`/admin/operations/client-command/${clientId}`);
  }

  return result;
}
