/**
 * /admin/operations/audits
 * KXD OS — Website Auditor lead dashboard (Phase 6A)
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { AuditsScreen } from "@/components/admin/operations/audits/AuditsScreen";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export default async function AuditsDashboardPage() {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audits" as any,
    limit: 250,
    depth: 0,
    sort: "-createdAt",
  });

  const audits = result.docs as AnyDoc[];
  const total = audits.length;
  const newLeads = audits.filter((a) => a.status === "new-lead").length;
  const qualified = audits.filter((a) => a.status === "qualified").length;
  const closedWon = audits.filter((a) => a.status === "closed-won").length;

  return (
    <AuditsScreen
      audits={audits}
      total={total}
      newLeads={newLeads}
      qualified={qualified}
      closedWon={closedWon}
    />
  );
}
