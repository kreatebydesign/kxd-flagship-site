/**
 * lib/creative-brand-resolver.ts
 * KXD Creative Engine — Phase 4A
 *
 * Resolves the full brand context for a creative generation request.
 * Given a client ID + optional brand kit ID + optional campaign ID,
 * returns a structured BrandContext object that feeds the prompt engine.
 *
 * Resolution priority:
 *   1. Explicit brandKit on the request (highest authority)
 *   2. brandKit on the related campaign
 *   3. First approved brand kit linked to the client
 *
 * All Payload operations are wrapped in try/catch — always returns a
 * BrandContext, even if it is empty. The prompt engine handles missing data.
 */

import { getPayload } from "payload";
import config from "@payload-config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrandAsset {
  title:        string;
  assetType:    string;
  externalUrl:  string | null;
  usageContext: string | null;
  isApproved:   boolean;
}

export interface BrandContext {
  /** Client */
  clientId:    number | null;
  clientName:  string;
  clientTier:  "flagship" | "growth" | "maintenance" | "internal" | "unknown";
  companyWebsite: string | null;

  /** Brand Kit */
  brandKitId:    number | null;
  brandKitName:  string | null;

  /** Visual identity */
  primaryColor:        string | null;
  secondaryColor:      string | null;
  accentColor:         string | null;
  neutralColor:        string | null;
  typographyDirection: string | null;
  logoNotes:           string | null;
  canvaDirection:      string | null;

  /** Voice & copy */
  voiceTone:            string | null;
  brandKeywords:        string | null;
  doRules:              string | null;
  dontRules:            string | null;
  positioningStatement: string | null;
  taglineOptions:       string | null;
  brandPersonality:     string | null;
  industry:             string | null;
  audience:             string | null;
  primaryCTA:           string | null;
  secondaryCTA:         string | null;
  socialBio:            string | null;

  /** Campaign context (optional) */
  campaignId:      number | null;
  campaignTitle:   string | null;
  campaignMessage: string | null;
  campaignGoal:    string | null;
  campaignAudience: string | null;
  campaignCTA:     string | null;
  campaignType:    string | null;

  /** Approved brand assets */
  approvedAssets: BrandAsset[];
  logoAssets:     BrandAsset[];
  socialAssets:   BrandAsset[];

  /** Metadata */
  resolvedAt:  string;
  warnings:    string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function resolveId(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw) return (raw as AnyDoc).id as number;
  if (typeof raw === "number") return raw;
  return null;
}

function tier(raw: unknown): BrandContext["clientTier"] {
  const v = String(raw ?? "");
  if (["flagship", "growth", "maintenance", "internal"].includes(v)) {
    return v as BrandContext["clientTier"];
  }
  return "unknown";
}

function mapAsset(doc: AnyDoc): BrandAsset {
  return {
    title:        String(doc.title || "Untitled"),
    assetType:    String(doc.assetType || "other"),
    externalUrl:  str(doc.externalUrl),
    usageContext: str(doc.usageContext),
    isApproved:   Boolean(doc.isApproved),
  };
}

// ── Core resolver ─────────────────────────────────────────────────────────────

export interface ResolverInput {
  clientId?:    number | null;
  brandKitId?:  number | null;
  campaignId?:  number | null;
}

export async function resolveBrandContext(input: ResolverInput): Promise<BrandContext> {
  const payload  = await getPayload({ config });
  const warnings: string[] = [];
  const now      = new Date().toISOString();

  const empty: BrandContext = {
    clientId: null, clientName: "Unknown Client", clientTier: "unknown", companyWebsite: null,
    brandKitId: null, brandKitName: null,
    primaryColor: null, secondaryColor: null, accentColor: null, neutralColor: null,
    typographyDirection: null, logoNotes: null, canvaDirection: null,
    voiceTone: null, brandKeywords: null, doRules: null, dontRules: null,
    positioningStatement: null, taglineOptions: null, brandPersonality: null,
    industry: null, audience: null, primaryCTA: null, secondaryCTA: null, socialBio: null,
    campaignId: null, campaignTitle: null, campaignMessage: null, campaignGoal: null,
    campaignAudience: null, campaignCTA: null, campaignType: null,
    approvedAssets: [], logoAssets: [], socialAssets: [],
    resolvedAt: now, warnings,
  };

  // ── 1. Fetch client ───────────────────────────────────────────────────────

  let client: AnyDoc | null = null;
  if (input.clientId) {
    try {
      client = await payload.findByID({ collection: "clients", id: input.clientId, depth: 0 }) as AnyDoc;
    } catch (e) {
      warnings.push(`Client ${input.clientId} not found: ${String(e)}`);
    }
  }

  if (!client) {
    warnings.push("No client resolved — brand context will be minimal.");
    return { ...empty, warnings, resolvedAt: now };
  }

  const ctx: BrandContext = {
    ...empty,
    clientId:      client.id as number,
    clientName:    String(client.name || "Unknown Client"),
    clientTier:    tier(client.brandTier),
    companyWebsite: str(client.companyWebsite),
  };

  // ── 2. Resolve brand kit (request → campaign → client fallback) ───────────

  let brandKit: AnyDoc | null = null;

  // 2a. Explicit brand kit on the request
  if (input.brandKitId) {
    try {
      brandKit = await payload.findByID({ collection: "brand-kits" as "clients", id: input.brandKitId, depth: 0 }) as AnyDoc;
    } catch {
      warnings.push(`BrandKit ${input.brandKitId} not found — falling back.`);
    }
  }

  // 2b. Campaign's brand kit
  let campaign: AnyDoc | null = null;
  if (!brandKit && input.campaignId) {
    try {
      campaign = await payload.findByID({ collection: "creative-campaigns" as "clients", id: input.campaignId, depth: 1 }) as AnyDoc;
      const campKitId = resolveId(campaign?.brandKit);
      if (campKitId) {
        try {
          brandKit = await payload.findByID({ collection: "brand-kits" as "clients", id: campKitId, depth: 0 }) as AnyDoc;
        } catch {
          warnings.push(`Campaign brand kit ${campKitId} not found.`);
        }
      }
    } catch {
      warnings.push(`Campaign ${input.campaignId} not found.`);
    }
  }

  // 2c. First approved brand kit linked to client
  if (!brandKit) {
    try {
      const kits = await payload.find({
        collection: "brand-kits" as "clients",
        where: { and: [{ client: { equals: ctx.clientId } }, { status: { in: ["approved", "delivered"] } }] },
        limit: 1, depth: 0, sort: "-createdAt",
      });
      if ((kits.docs as AnyDoc[]).length > 0) {
        brandKit = (kits.docs as AnyDoc[])[0];
      }
    } catch {
      warnings.push("Brand kit fallback query failed.");
    }
  }

  // 2d. Any brand kit linked to client
  if (!brandKit) {
    try {
      const kits = await payload.find({
        collection: "brand-kits" as "clients",
        where: { client: { equals: ctx.clientId } },
        limit: 1, depth: 0, sort: "-createdAt",
      });
      if ((kits.docs as AnyDoc[]).length > 0) {
        brandKit = (kits.docs as AnyDoc[])[0];
        warnings.push("Using un-approved brand kit as fallback.");
      }
    } catch {
      warnings.push("Brand kit client fallback query failed.");
    }
  }

  if (!brandKit) {
    warnings.push("No brand kit found — generation will use generic KXD standards.");
  }

  // ── 3. Apply brand kit fields ─────────────────────────────────────────────

  if (brandKit) {
    ctx.brandKitId    = brandKit.id as number;
    ctx.brandKitName  = str(brandKit.brandName);
    ctx.primaryColor        = str(brandKit.primaryColor);
    ctx.secondaryColor      = str(brandKit.secondaryColor);
    ctx.accentColor         = str(brandKit.accentColor);
    ctx.neutralColor        = str(brandKit.neutralColor);
    ctx.typographyDirection = str(brandKit.typographyDirection);
    ctx.logoNotes           = str(brandKit.logoNotes);
    ctx.canvaDirection      = str(brandKit.canvaDirection);
    ctx.voiceTone           = str(brandKit.voiceTone);
    ctx.brandKeywords       = str(brandKit.brandKeywords);
    ctx.doRules             = str(brandKit.doRules);
    ctx.dontRules           = str(brandKit.dontRules);
    ctx.positioningStatement = str(brandKit.positioningStatement);
    ctx.taglineOptions      = str(brandKit.taglineOptions);
    ctx.brandPersonality    = str(brandKit.brandPersonality);
    ctx.industry            = str(brandKit.industry);
    ctx.audience            = str(brandKit.audience);
    ctx.primaryCTA          = str(brandKit.primaryCTA);
    ctx.secondaryCTA        = str(brandKit.secondaryCTA);
    ctx.socialBio           = str(brandKit.socialBio);
  }

  // ── 4. Campaign context ───────────────────────────────────────────────────

  if (!campaign && input.campaignId) {
    try {
      campaign = await payload.findByID({ collection: "creative-campaigns" as "clients", id: input.campaignId, depth: 0 }) as AnyDoc;
    } catch {
      warnings.push(`Campaign ${input.campaignId} not loaded.`);
    }
  }

  if (campaign) {
    ctx.campaignId      = campaign.id as number;
    ctx.campaignTitle   = str(campaign.campaignTitle);
    ctx.campaignMessage = str(campaign.campaignMessage);
    ctx.campaignGoal    = str(campaign.goal);
    ctx.campaignAudience = str(campaign.audience);
    ctx.campaignCTA     = str(campaign.primaryCTA);
    ctx.campaignType    = str(campaign.campaignType);

    // Override audience from campaign if brand kit has none
    if (!ctx.audience && ctx.campaignAudience) ctx.audience = ctx.campaignAudience;
    if (!ctx.primaryCTA && ctx.campaignCTA)     ctx.primaryCTA = ctx.campaignCTA;
  }

  // ── 5. Approved brand kit assets ──────────────────────────────────────────

  if (brandKit) {
    try {
      const assetsRes = await payload.find({
        collection: "brand-kit-assets" as "clients",
        where: { brandKit: { equals: brandKit.id } },
        limit: 50, depth: 0,
      });
      const rawDocs      = assetsRes.docs as AnyDoc[];
      const allAssets    = rawDocs.map(mapAsset);
      ctx.approvedAssets = allAssets.filter((a, i) => a.isApproved || rawDocs[i]?.status === "approved");
      ctx.logoAssets     = allAssets.filter(a => a.assetType === "logo");
      ctx.socialAssets   = allAssets.filter(a => a.assetType === "social-template" || a.usageContext === "social");
    } catch {
      warnings.push("Brand kit assets query failed — no assets resolved.");
    }
  }

  return { ...ctx, warnings, resolvedAt: now };
}

// ── Tier tone mapping ─────────────────────────────────────────────────────────

export function tierToneGuidance(tier: BrandContext["clientTier"]): string {
  switch (tier) {
    case "flagship":
      return "Premium editorial. Every word earns its place. Luxury restraint — confident, never flashy. No hype or filler. Concise, precise, strategic.";
    case "growth":
      return "Energetic and aspirational. Bold but grounded. Forward-moving language. Clear value prop. Growth-minded, direct.";
    case "maintenance":
      return "Reliable and clear. Professional. Clean, functional, honest. No noise. Trustworthy.";
    case "internal":
      return "KXD internal voice. Strategic, sharp, direct. Studio standards. No external marketing language.";
    default:
      return "Professional, clear, and brand-aware. Premium standards. No generic or AI-sounding copy.";
  }
}
