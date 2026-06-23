import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { JuniorDashboard, type JuniorLeadRow } from "@/components/junior-creators/JuniorDashboard";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { getJuniorCreatorStats } from "@/lib/junior-creators/stats";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export default async function JuniorCreatorsDashboardPage() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    redirect("/junior-creators/login");
  }

  const stats = await getJuniorCreatorStats(session.juniorCreatorUserId);

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "research-leads" as any,
    where: { juniorCreatorUser: { equals: session.juniorCreatorUserId } },
    limit: 50,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });

  const recentLeads: JuniorLeadRow[] = (result.docs as AnyDoc[]).map((l) => ({
    id: l.id as number,
    source: String(l.source ?? "Craigslist"),
    city: l.city ? String(l.city) : null,
    state: l.state ? String(l.state) : null,
    leadUrl: l.leadUrl ? String(l.leadUrl) : null,
    estimatedService: l.estimatedService ? String(l.estimatedService) : null,
    status: String(l.status ?? "new"),
    createdAt: String(l.createdAt ?? ""),
  }));

  return (
    <JuniorDashboard
      displayName={session.displayName}
      stats={stats}
      recentLeads={recentLeads}
    />
  );
}
