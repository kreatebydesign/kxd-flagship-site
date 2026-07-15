/**
 * Canonical Website Review / Website Workspace / Visual Review target URL.
 *
 * Precedence (Shared Core, client-scoped):
 *   1. client-infrastructure.stagingUrl  — active review / staging deployment
 *   2. clients.companyWebsite            — fallback when no staging URL is set
 *
 * Consumers (must not hardcode per-client deployment URLs):
 *   - Client Website Review landing / open-site links
 *   - Operator Review Inbox “Open website”
 *   - Website Workspace open-site links
 *   - Visual Review iframe bootstraps
 *   - Partnership Workspace website actions (via Website Review data)
 *
 * Changing stagingUrl once (via Infrastructure admin or
 * scripts/set-primal-review-staging-url.ts) updates every consumer above.
 * Permanent Primal preview: https://primal.preview.kreatebydesign.com
 * (stored in stagingUrl — field name migration is separate).
 * Do not poll Vercel or hardcode unique preview deployments in CES modules.
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
