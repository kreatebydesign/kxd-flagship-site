/**
 * /admin/operations/client-command/backfill
 * Manual activity backfill for Client Command Center timelines.
 */

import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientActivityBackfillPanel } from "@/components/admin/operations/client-command/ClientActivityBackfillPanel";

export const dynamic = "force-dynamic";

export default function ClientActivityBackfillPage() {
  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <OperationsShell activeId="clients" dateDisplay={dateDisplay}>
      <ClientActivityBackfillPanel />
    </OperationsShell>
  );
}
