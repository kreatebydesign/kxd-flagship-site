/**
 * Load a client-safe Brand Kit presentation for portal Resources.
 * Reusable — ownership-scoped to session clientId. No operator fields.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { composePortalBrandKitPresentation } from "./compose";
import type { PortalBrandKitPresentation } from "./types";

type AnyDoc = Record<string, unknown> & { id: number };

function clientIdFromDoc(doc: AnyDoc): number | null {
  const raw = doc.client;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && "id" in raw) {
    const id = Number((raw as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function loadApprovedAssets(brandKitId: number): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kit-assets" as any,
      where: {
        and: [
          { brandKit: { equals: brandKitId } },
          { status: { in: ["approved", "delivered"] } },
        ],
      },
      limit: 24,
      sort: "title",
      depth: 0,
      overrideAccess: true,
    });
    return result.docs as AnyDoc[];
  } catch {
    return [];
  }
}

/**
 * Resolve the client-facing Brand Kit guide for a portal client.
 * Prefers approved/delivered kits. Returns null when nothing client-safe exists.
 */
export async function loadPortalBrandKitPresentation(
  clientId: number,
  options?: {
    brandKitId?: number | null;
  },
): Promise<PortalBrandKitPresentation | null> {
  if (!clientId || !Number.isFinite(clientId)) return null;

  const payload = await getPayload({ config });
  let kitDoc: AnyDoc | null = null;

  try {
    if (options?.brandKitId) {
      const doc = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kits" as any,
        id: options.brandKitId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
      const owner = clientIdFromDoc(doc);
      if (owner === clientId) {
        kitDoc = doc;
      }
    }

    if (!kitDoc) {
      const approved = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kits" as any,
        where: {
          and: [
            { client: { equals: clientId } },
            { status: { in: ["approved", "delivered"] } },
          ],
        },
        limit: 1,
        sort: "-updatedAt",
        depth: 0,
        overrideAccess: true,
      });
      if (approved.docs.length > 0) {
        kitDoc = approved.docs[0] as AnyDoc;
      }
    }
  } catch {
    return null;
  }

  if (!kitDoc) return null;

  const assets = await loadApprovedAssets(Number(kitDoc.id));

  return composePortalBrandKitPresentation({
    kit: {
      brandName: kitDoc.brandName ? String(kitDoc.brandName) : null,
      industry: kitDoc.industry ? String(kitDoc.industry) : null,
      taglineOptions: kitDoc.taglineOptions ? String(kitDoc.taglineOptions) : null,
      primaryColor: kitDoc.primaryColor ? String(kitDoc.primaryColor) : null,
      secondaryColor: kitDoc.secondaryColor ? String(kitDoc.secondaryColor) : null,
      accentColor: kitDoc.accentColor ? String(kitDoc.accentColor) : null,
      neutralColor: kitDoc.neutralColor ? String(kitDoc.neutralColor) : null,
      typographyDirection: kitDoc.typographyDirection
        ? String(kitDoc.typographyDirection)
        : null,
      brandPersonality: kitDoc.brandPersonality
        ? String(kitDoc.brandPersonality)
        : null,
      positioningStatement: kitDoc.positioningStatement
        ? String(kitDoc.positioningStatement)
        : null,
      voiceTone: kitDoc.voiceTone ? String(kitDoc.voiceTone) : null,
      brandKeywords: kitDoc.brandKeywords ? String(kitDoc.brandKeywords) : null,
      doRules: kitDoc.doRules ? String(kitDoc.doRules) : null,
      dontRules: kitDoc.dontRules ? String(kitDoc.dontRules) : null,
      logoNotes: kitDoc.logoNotes ? String(kitDoc.logoNotes) : null,
      socialBio: kitDoc.socialBio ? String(kitDoc.socialBio) : null,
      websiteIntroCopy: kitDoc.websiteIntroCopy
        ? String(kitDoc.websiteIntroCopy)
        : null,
      primaryCTA: kitDoc.primaryCTA ? String(kitDoc.primaryCTA) : null,
      secondaryCTA: kitDoc.secondaryCTA ? String(kitDoc.secondaryCTA) : null,
    },
    assets: assets.map((doc) => ({
      id: doc.id,
      title: doc.title ? String(doc.title) : null,
      notes: doc.notes ? String(doc.notes) : null,
      assetType: doc.assetType ? String(doc.assetType) : null,
      usageContext: doc.usageContext ? String(doc.usageContext) : null,
      externalUrl: doc.externalUrl ? String(doc.externalUrl) : null,
    })),
  });
}
