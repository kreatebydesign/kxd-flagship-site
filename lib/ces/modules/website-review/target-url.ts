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
 *   - Client Launch / Portal Access / Client Experience readiness diagnostics
 *
 * Setting Preview Website once in Client Infrastructure updates every consumer.
 * Field key remains `stagingUrl` for backward compatibility.
 * Pattern: https://{client}.preview.kreatebydesign.com — data-driven, no per-client code.
 *
 * `pickWebsiteReviewTargetUrl` is pure / Payload-safe (CLI + diagnostics).
 * `resolveWebsiteReviewTargetUrl` loads Shared Core and is server-runtime only.
 */

import { validatePreviewWebsiteUrl } from "@/lib/infrastructure/preview-domain";

function normalizeFallbackUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

/**
 * Pure Shared Core picker — single precedence for runtime and diagnostics.
 * Does not mutate or copy stagingUrl into companyWebsite.
 */
export function pickWebsiteReviewTargetUrl(input: {
  stagingUrl?: string | null;
  companyWebsite?: string | null;
}): string | null {
  const preview = validatePreviewWebsiteUrl(input.stagingUrl ?? null);
  if (preview.ok && preview.url) return preview.url;
  return normalizeFallbackUrl(input.companyWebsite);
}

export async function resolveWebsiteReviewTargetUrl(
  clientId: number,
): Promise<string | null> {
  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
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
    stagingUrl = doc?.stagingUrl ?? null;
  } catch {
    /* fall through — companyWebsite may still resolve */
  }

  let companyWebsite: string | null = null;
  try {
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    companyWebsite =
      (client as { companyWebsite?: string | null }).companyWebsite ?? null;
  } catch {
    companyWebsite = null;
  }

  return pickWebsiteReviewTargetUrl({ stagingUrl, companyWebsite });
}
