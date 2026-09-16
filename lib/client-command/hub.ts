import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  mergeClientWithExecutiveProfile,
  resolveClientId,
  type AnyDoc,
} from "@/lib/executive-client-profile";
import { calculateClientHealth, loadHealthContext } from "@/lib/client-health/health-engine";
import type { CommandHubClientRow } from "./workspace-types";
import { commandWorkspaceHref } from "./tabs";

export async function loadClientCommandHub(query?: string): Promise<CommandHubClientRow[]> {
  const payload = await getPayload({ config });

  const [healthCtx, clientsR, profilesR] = await Promise.all([
    loadHealthContext(),
    payload.find({ collection: "clients", limit: 300, depth: 0, sort: "name" }).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason }),
    ),
    payload.find({ collection: "executive-client-profiles", limit: 300, depth: 0 }).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason }),
    ),
  ]);

  const clients = clientsR.status === "fulfilled" ? (clientsR.value.docs as AnyDoc[]) : [];
  const profiles =
    profilesR.status === "fulfilled" ? (profilesR.value.docs as AnyDoc[]) : [];

  const profileByClientId = new Map<number, AnyDoc>();
  for (const profile of profiles) {
    const cid = resolveClientId(profile.client);
    if (cid) profileByClientId.set(cid, profile);
  }

  const q = query?.trim().toLowerCase() ?? "";

  const rows: CommandHubClientRow[] = clients
    .map((client) => {
      const cid = client.id as number;
      const profile = profileByClientId.get(cid);
      const row = mergeClientWithExecutiveProfile(client, profile);
      const health = calculateClientHealth(cid, healthCtx);

      return {
        clientId: cid,
        name: String(client.name ?? "Client"),
        slug: client.slug ? String(client.slug) : null,
        status: String(client.status ?? "active"),
        relationshipStatus: client.relationshipStatus
          ? String(client.relationshipStatus)
          : row.relationshipStatus,
        healthScore: health.overallScore,
        monthlyRevenue: row.monthlyRevenue,
        primaryContact:
          (client.primaryContactName as string) ||
          (profile?.primaryDecisionMaker as string) ||
          null,
        website: (client.companyWebsite as string) || null,
        industry: (profile?.industry as string) || null,
        href: commandWorkspaceHref(cid),
      };
    })
    .filter((row) => {
      if (!q) return true;
      return [
        row.name,
        row.slug,
        row.primaryContact,
        row.website,
        row.industry,
        row.status,
        row.relationshipStatus,
      ].some((f) => String(f ?? "").toLowerCase().includes(q));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return rows;
}
