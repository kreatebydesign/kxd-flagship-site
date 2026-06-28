import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

export async function searchLaunchQaSessions(query: string, limit = 12) {
  const q = query.trim().toLowerCase();
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-qa-checks" as any,
    limit: 50,
    sort: "-updatedAt",
    depth: 1,
    overrideAccess: true,
  });

  const docs = result.docs as Array<Record<string, unknown>>;

  const filtered = q
    ? docs.filter((doc) => {
        const client = doc.client as Record<string, unknown> | number;
        const clientName = typeof client === "object" ? String(client.name ?? "").toLowerCase() : "";
        const url = String(doc.websiteUrl ?? "").toLowerCase();
        return (
          clientName.includes(q) ||
          url.includes(q) ||
          q.includes("launch qa") ||
          q.includes("website qa") ||
          q.includes("qa checklist") ||
          q.includes("launch readiness")
        );
      })
    : docs;

  return filtered.slice(0, limit).map((doc) => {
    const id = doc.id as number;
    const client = doc.client as Record<string, unknown> | undefined;
    const clientId = client?.id as number;
    return {
      id,
      clientId,
      clientName: String(client?.name ?? "Client"),
      status: String(doc.status ?? "draft"),
      readinessScore: Number(doc.readinessScore ?? 0),
      websiteUrl: doc.websiteUrl ? String(doc.websiteUrl) : null,
      href: `/admin/operations/launch-qa/${clientId}`,
      updatedAt: doc.updatedAt ? String(doc.updatedAt) : null,
    };
  });
}
