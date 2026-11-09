import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import { getConnectPostgresExecutor } from "@/lib/connect/db";

export async function staffWagePaymentsTableReady(): Promise<boolean> {
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return false;
  const result = await db.execute(
    sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'staff_wage_payments'
      ) AS ready
    `,
  );
  return Boolean((result as { rows?: { ready: boolean }[] }).rows?.[0]?.ready);
}
