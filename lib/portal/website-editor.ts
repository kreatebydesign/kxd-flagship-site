import "server-only";

import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { validatePreviewWebsiteUrl } from "@/lib/infrastructure/preview-domain";

/**
 * Client-scoped website editor doorway — configured on client-infrastructure.
 * Returns null when unset or invalid so portal UI renders nothing.
 */
export const resolvePortalWebsiteEditorUrl = cache(
  async (clientId: number): Promise<string | null> => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const record = result.docs[0] as { websiteEditorUrl?: string | null } | undefined;
    const raw = record?.websiteEditorUrl;
    if (!raw?.trim()) return null;

    const checked = validatePreviewWebsiteUrl(raw);
    if (!checked.ok || !checked.url) return null;
    return checked.url;
  },
);
