/**
 * /admin/operations/clients
 * KXD OS — Client Portfolio (Design System 1.0 Phase 2)
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { ClientPortfolioScreen } from "@/components/admin/operations/client-portfolio/ClientPortfolioScreen";
import {
  mergeClientWithExecutiveProfile,
  resolveClientId,
  type AnyDoc,
} from "@/lib/executive-client-profile";
import { buildClientDuplicateWarnings } from "@/lib/executive-client-profile-dashboard";

export const dynamic = "force-dynamic";

export default async function ExecutiveClientsPage() {
  const payload = await getPayload({ config });
  const now = new Date();
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [clientsR, profilesR] = await Promise.allSettled([
    payload.find({ collection: "clients", limit: 200, depth: 0 }),
    payload.find({ collection: "executive-client-profiles", limit: 200, depth: 1 }),
  ]);

  const clients = clientsR.status === "fulfilled" ? (clientsR.value.docs as AnyDoc[]) : [];
  const profiles =
    profilesR.status === "fulfilled" ? (profilesR.value.docs as AnyDoc[]) : [];

  const profileByClientId = new Map<number, AnyDoc>();
  for (const profile of profiles) {
    const cid = resolveClientId(profile.client);
    if (cid) profileByClientId.set(cid, profile);
  }

  const rows = clients
    .map((client) =>
      mergeClientWithExecutiveProfile(client, profileByClientId.get(client.id as number)),
    )
    .sort((a, b) => {
      const priorityRank = (p: string | null) =>
        p === "critical" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : p === "low" ? 3 : 4;
      const pr = priorityRank(a.internalPriority) - priorityRank(b.internalPriority);
      if (pr !== 0) return pr;
      return (b.monthlyRevenue ?? 0) - (a.monthlyRevenue ?? 0);
    });

  const totalMRR = rows.reduce((s, r) => s + (r.monthlyRevenue ?? 0), 0);
  const totalPotential = rows.reduce((s, r) => s + (r.potentialMonthlyRevenue ?? 0), 0);
  const activeRows = rows.filter((r) => r.clientStatus === "active");
  const activeCount = activeRows.length;
  const withProfiles = activeRows.filter((r) => r.hasExecutiveProfile).length;
  const criticalCount = rows.filter((r) => r.internalPriority === "critical").length;

  const duplicateWarnings = buildClientDuplicateWarnings(
    clients.map((client) => ({
      id: client.id as number,
      name: (client.name as string) || "Unknown",
      status: (client.status as string) || null,
      website: (client.companyWebsite as string) || null,
    })),
  );
  const duplicateCount = duplicateWarnings.size;

  return (
    <ClientPortfolioScreen
      dateDisplay={dateDisplay}
      rows={rows}
      withProfiles={withProfiles}
      activeCount={activeCount}
      totalMRR={totalMRR}
      totalPotential={totalPotential}
      criticalCount={criticalCount}
      duplicateCount={duplicateCount}
      duplicateWarnings={duplicateWarnings}
    />
  );
}
