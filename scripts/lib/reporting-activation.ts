/**
 * Shared Core helpers for reporting activation / verify CLIs.
 * No clientSlug defaults. No fabricated entitlements.
 */

import { getPayload } from "payload";
import config from "../../payload.config";

export type ResolvedActivationClient = {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
};

export type ActivationCliTarget = {
  clientId: number | null;
  clientSlug: string | null;
};

export function parseActivationTarget(argv: string[]): ActivationCliTarget {
  const target: ActivationCliTarget = { clientId: null, clientSlug: null };
  for (const raw of argv) {
    if (raw.startsWith("--client-id=")) {
      const n = Number(raw.slice("--client-id=".length));
      target.clientId = Number.isFinite(n) && n > 0 ? n : null;
      continue;
    }
    if (raw.startsWith("--client-slug=")) {
      target.clientSlug = raw.slice("--client-slug=".length).trim() || null;
    }
  }
  return target;
}

export function requireActivationTarget(target: ActivationCliTarget): void {
  if (target.clientId == null && !target.clientSlug) {
    console.error("Required: --client-id=<id> OR --client-slug=<slug>");
    process.exit(1);
  }
}

export function asModules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function resolveActivationClient(
  target: ActivationCliTarget,
): Promise<ResolvedActivationClient> {
  requireActivationTarget(target);
  const payload = await getPayload({ config });

  if (target.clientId != null) {
    try {
      const doc = await payload.findByID({
        collection: "clients",
        id: target.clientId,
        depth: 0,
        overrideAccess: true,
      });
      return {
        clientId: doc.id as number,
        clientSlug: (doc as { slug?: string | null }).slug ?? null,
        clientName: String((doc as { name?: string }).name ?? "Client"),
      };
    } catch {
      console.error(`Client not found: id=${target.clientId}`);
      process.exit(1);
    }
  }

  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: target.clientSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (clients.docs.length === 0) {
    console.error(`Client not found: slug=${target.clientSlug}`);
    process.exit(1);
  }
  const doc = clients.docs[0] as { id: number; name?: string; slug?: string | null };
  return {
    clientId: doc.id,
    clientSlug: doc.slug ?? target.clientSlug ?? null,
    clientName: String(doc.name ?? "Client"),
  };
}

export async function loadActiveExperienceProfile(clientId: number): Promise<{
  id: number;
  enabledModules: string[];
} | null> {
  const payload = await getPayload({ config });
  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const profile = profiles.docs[0] as { id: number; enabledModules?: unknown } | undefined;
  if (!profile) return null;
  return { id: profile.id, enabledModules: asModules(profile.enabledModules) };
}

export async function enableCapabilityModule(
  profileId: number,
  currentModules: string[],
  capability: string,
): Promise<string[]> {
  const next = currentModules.includes(capability)
    ? currentModules
    : [...currentModules, capability];
  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    id: profileId,
    data: { enabledModules: next },
    overrideAccess: true,
  });
  return next;
}
