import "server-only";

/**
 * Dev / staging seed helper — creates manual work only when explicitly invoked.
 * Does not run automatically. Safe for empty production (no-op when client missing).
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "./constants";
import { createWork } from "./runner";

export interface SeedWorkOptions {
  clientId: number;
  createdBy?: string;
  count?: number;
}

export async function seedManualWorkForClient(
  options: SeedWorkOptions,
): Promise<{ ok: true; created: number }> {
  const payload = await getPayload({ config });
  const client = await payload.findByID({
    collection: "clients",
    id: options.clientId,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null);

  if (!client) {
    return { ok: true, created: 0 };
  }

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: { client: { equals: options.clientId } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    return { ok: true, created: 0 };
  }

  const templates = [
    {
      title: "Review client workspace readiness",
      summary: "Confirm portal access, CES profile, and Website Review configuration.",
      category: "operations" as const,
      status: "planned" as const,
    },
    {
      title: "Prepare Website Review launch notes",
      summary: "Document how the client should submit their first revision.",
      category: "website" as const,
      status: "new" as const,
    },
  ];

  const count = Math.min(options.count ?? templates.length, templates.length);
  let created = 0;

  for (let i = 0; i < count; i += 1) {
    const template = templates[i];
    if (!template) continue;
    await createWork({
      clientId: options.clientId,
      title: template.title,
      summary: template.summary,
      category: template.category,
      status: template.status,
      source: "manual",
      clientVisible: false,
      timelineEnabled: false,
      createdBy: options.createdBy,
    });
    created += 1;
  }

  return { ok: true, created };
}
