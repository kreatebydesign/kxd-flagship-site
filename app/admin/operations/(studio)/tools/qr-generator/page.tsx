/**
 * /admin/operations/tools/qr-generator
 * Native KXD OS QR Generator V1 — operator-only.
 */

import { QrGeneratorScreen } from "@/components/admin/operations/tools/QrGeneratorScreen";
import { listOperatorClientOptions } from "@/lib/executive-client-workspace/events-data";
import { requireStaffAwarePage } from "@/lib/staff/guard";
import { listRecentQrRecords } from "@/lib/qr";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function QrGeneratorPage() {
  await requireStaffAwarePage("/admin/operations/tools/qr-generator");

  const [clients, initialRecords] = await Promise.all([
    listOperatorClientOptions(),
    (async () => {
      try {
        const payload = await getPayload({ config });
        return await listRecentQrRecords(payload, { limit: 20 });
      } catch {
        // Collection may not be migrated yet locally — page still works for generate/download.
        return [];
      }
    })(),
  ]);

  return (
    <QrGeneratorScreen clients={clients} initialRecords={initialRecords} />
  );
}
