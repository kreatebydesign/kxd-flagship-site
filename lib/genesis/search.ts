import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

const COLLECTION = "genesis-sessions";

export async function searchGenesisSessions(query: string, limit = 12) {
  const q = query.trim().toLowerCase();
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit: 50,
    sort: "-updatedAt",
    depth: 1,
    overrideAccess: true,
  });

  const docs = result.docs as Array<Record<string, unknown>>;

  const filtered = q
    ? docs.filter((doc) => {
        const label = String(doc.sessionLabel ?? "").toLowerCase();
        const template = String(doc.templateId ?? "").toLowerCase();
        const clientName =
          typeof doc.client === "object" && doc.client !== null && "name" in doc.client
            ? String((doc.client as { name: string }).name).toLowerCase()
            : "";
        return label.includes(q) || template.includes(q) || clientName.includes(q) || q.includes("genesis") || q.includes("blueprint") || q.includes("discovery");
      })
    : docs;

  return filtered.slice(0, limit).map((doc) => {
    const id = doc.id as number;
    const clientName =
      typeof doc.client === "object" && doc.client !== null && "name" in doc.client
        ? String((doc.client as { name: string }).name)
        : null;
    return {
      id,
      sessionLabel: String(doc.sessionLabel ?? "Genesis Session"),
      status: String(doc.status ?? "draft"),
      templateId: String(doc.templateId ?? ""),
      clientName,
      progressPercent: Number(doc.progressPercent ?? 0),
      href: `/admin/operations/genesis/${id}`,
      updatedAt: doc.updatedAt ? String(doc.updatedAt) : null,
    };
  });
}
