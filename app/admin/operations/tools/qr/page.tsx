/**
 * /admin/operations/tools/qr
 * Internal QR Generator — exact URL encoding, client-side only.
 */

import { QrGeneratorScreen } from "@/components/admin/operations/tools/QrGeneratorScreen";

export const dynamic = "force-dynamic";

export default function QrGeneratorPage() {
  return <QrGeneratorScreen />;
}
