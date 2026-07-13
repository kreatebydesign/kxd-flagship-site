/**
 * Canonical Website Review target URL for a client.
 *
 * Precedence (Shared Core, client-scoped):
 *   1. client-infrastructure.stagingUrl  — active review / staging deployment
 *   2. clients.companyWebsite            — fallback when no staging URL is set
 *
 * Do not hardcode per-client URLs in CES components.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

function normalizeUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

export async function resolveWebsiteReviewTargetUrl(
  clientId: number,
): Promise<string | null> {
  const payload = await getPayload({ config });

  let stagingUrl: string | null = null;
  try {
    const infra = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = infra.docs[0] as { stagingUrl?: string | null } | undefined;
    stagingUrl = normalizeUrl(doc?.stagingUrl ?? null);
  } catch {
    stagingUrl = null;
  }

  if (stagingUrl) return stagingUrl;

  try {
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    return normalizeUrl(
      (client as { companyWebsite?: string | null }).companyWebsite ?? null,
    );
  } catch {
    return null;
  }
}
