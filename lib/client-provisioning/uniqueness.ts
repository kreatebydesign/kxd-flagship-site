import "server-only";

import type { Payload } from "payload";
import { normalizeClientSlug } from "@/lib/client-launch-wizard/validation/identity";
import {
  findDuplicatePreviewWebsite,
  validatePreviewWebsiteUrl,
} from "@/lib/infrastructure/preview-domain";

export async function checkProvisioningUniqueness(
  payload: Payload,
  input: {
    companyName: string;
    companySlug: string;
    previewWebsite?: string;
  },
): Promise<{
  slugTaken: boolean;
  nameTaken: boolean;
  previewTaken: boolean;
  slug: string;
}> {
  const slug = normalizeClientSlug(input.companySlug || input.companyName);
  const name = input.companyName.trim();

  const [slugResult, nameResult] = await Promise.all([
    payload.find({
      collection: "clients",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    name
      ? payload.find({
          collection: "clients",
          where: { name: { equals: name } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      : Promise.resolve({ docs: [] as unknown[] }),
  ]);

  let previewTaken = false;
  const previewRaw = input.previewWebsite?.trim();
  if (previewRaw) {
    const checked = validatePreviewWebsiteUrl(previewRaw);
    if (checked.ok && checked.url) {
      const dup = await findDuplicatePreviewWebsite(payload, checked.url, null);
      previewTaken = Boolean(dup);
    }
  }

  return {
    slug,
    slugTaken: slugResult.docs.length > 0,
    nameTaken: nameResult.docs.length > 0,
    previewTaken,
  };
}
