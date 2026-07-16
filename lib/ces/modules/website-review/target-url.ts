/**
 * Canonical Website Review / Website Workspace / Visual Review target URL.
 *
 * Precedence (Shared Core, client-scoped):
 *   1. client-infrastructure.stagingUrl  — Preview Website (UI label)
 *   2. clients.companyWebsite            — Production fallback
 *
 * Consumers (must not hardcode per-client deployment URLs):
 *   - Client Website Review landing / open-site links
 *   - Operator Review Inbox “Open website”
 *   - Website Workspace open-site links
 *   - Visual Review iframe bootstraps
 *   - Partnership Workspace website actions (via Website Review data)
 *
 * Setting Preview Website once in Client Infrastructure updates every consumer.
 * Field key remains `stagingUrl` for backward compatibility.
 * Pattern: https://{client}.preview.kreatebydesign.com — data-driven, no per-client code.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { validatePreviewWebsiteUrl } from "@/lib/infrastructure/preview-domain";

function normalizeFallbackUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

export async function resolveWebsiteReviewTargetUrl(
  clientId: number,
): Promise<string | null> {
  const payload = await getPayload({ config });

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
    const preview = validatePreviewWebsiteUrl(doc?.stagingUrl ?? null);
    if (preview.ok && preview.url) return preview.url;
  } catch {
    /* fall through to production website */
  }

  try {
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    return normalizeFallbackUrl(
      (client as { companyWebsite?: string | null }).companyWebsite ?? null,
    );
  } catch {
    return null;
  }
}
