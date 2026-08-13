/**
 * Pure client-safe Brand Kit presentation composer.
 * Omits empty sections. Never surfaces operator/admin fields.
 */

import { contrastRatio } from "@/lib/ces/profile/accent";
import type {
  PortalBrandKitAsset,
  PortalBrandKitColorSwatch,
  PortalBrandKitPresentation,
} from "./types";

export type BrandKitComposeInput = {
  brandName?: string | null;
  industry?: string | null;
  taglineOptions?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  neutralColor?: string | null;
  typographyDirection?: string | null;
  brandPersonality?: string | null;
  positioningStatement?: string | null;
  voiceTone?: string | null;
  brandKeywords?: string | null;
  doRules?: string | null;
  dontRules?: string | null;
  logoNotes?: string | null;
  socialBio?: string | null;
  websiteIntroCopy?: string | null;
  primaryCTA?: string | null;
  secondaryCTA?: string | null;
};

export type BrandKitComposeAssetInput = {
  id: string | number;
  title?: string | null;
  notes?: string | null;
  assetType?: string | null;
  usageContext?: string | null;
  externalUrl?: string | null;
};

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|ico)(\?|#|$)/i;

function trimText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

/** Split textarea content into clean lines (newlines, bullets, or commas for keywords). */
export function splitBrandKitLines(
  value: string | null | undefined,
  mode: "lines" | "keywords" = "lines",
): string[] {
  const text = String(value ?? "").trim();
  if (!text) return [];

  if (mode === "keywords") {
    return text
      .split(/[\n,;•·]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);
}

function normalizeHex(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) return null;
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }
  return hex.toUpperCase();
}

function textOnSwatch(hex: string): string {
  const againstWhite = contrastRatio(hex, "#ffffff");
  const againstInk = contrastRatio(hex, "#1c1917");
  if (againstWhite != null && againstInk != null) {
    return againstWhite >= againstInk ? "#ffffff" : "#1c1917";
  }
  return "#ffffff";
}

export function isPreviewableBrandAssetUrl(href: string | null | undefined): boolean {
  const url = String(href ?? "").trim();
  if (!url) return false;
  if (url.startsWith("/migrated-assets/") || url.startsWith("/media/")) return true;
  return IMAGE_EXT_RE.test(url);
}

function composeColors(input: BrandKitComposeInput): PortalBrandKitColorSwatch[] {
  const entries: Array<[PortalBrandKitColorSwatch["role"], string | null | undefined]> = [
    ["Primary", input.primaryColor],
    ["Secondary", input.secondaryColor],
    ["Accent", input.accentColor],
    ["Neutral", input.neutralColor],
  ];
  const out: PortalBrandKitColorSwatch[] = [];
  for (const [role, value] of entries) {
    const hex = normalizeHex(value);
    if (!hex) continue;
    out.push({ role, hex, textOnSwatch: textOnSwatch(hex) });
  }
  return out;
}

function assetScore(asset: BrandKitComposeAssetInput): number {
  const title = String(asset.title ?? "").toLowerCase();
  const type = String(asset.assetType ?? "").toLowerCase();
  const href = String(asset.externalUrl ?? "").toLowerCase();
  let score = 0;
  if (type === "logo") score += 20;
  if (/\blogo\b/.test(title) && !/\b(icon|favicon|apple)\b/.test(title)) score += 40;
  if (href.includes("/logo.png") || href.endsWith("logo.png")) score += 50;
  if (/\b(mark|icon)\b/.test(title)) score += 10;
  if (/\bfavicon\b/.test(title) || href.includes("favicon")) score -= 20;
  if (/\bapple\b/.test(title)) score -= 15;
  if (isPreviewableBrandAssetUrl(asset.externalUrl)) score += 5;
  return score;
}

function composeAssets(
  assets: BrandKitComposeAssetInput[],
): PortalBrandKitAsset[] {
  return assets
    .map((asset) => {
      const title = trimText(asset.title);
      if (!title) return null;
      const href = trimText(asset.externalUrl);
      return {
        id: String(asset.id),
        title,
        description: trimText(asset.notes),
        href,
        assetType: trimText(asset.assetType),
        usageContext: trimText(asset.usageContext),
        previewable: isPreviewableBrandAssetUrl(href),
      } satisfies PortalBrandKitAsset;
    })
    .filter((asset): asset is PortalBrandKitAsset => Boolean(asset));
}

function pickHeroLogo(
  brandName: string,
  assets: PortalBrandKitAsset[],
): PortalBrandKitPresentation["heroLogo"] {
  const ranked = [...assets]
    .filter((asset) => asset.href && asset.previewable)
    .sort((a, b) => {
      const left = assetScore({
        id: a.id,
        title: a.title,
        assetType: a.assetType,
        externalUrl: a.href,
      });
      const right = assetScore({
        id: b.id,
        title: b.title,
        assetType: b.assetType,
        externalUrl: b.href,
      });
      return right - left;
    });
  const hero = ranked[0];
  if (!hero?.href) return null;
  return { src: hero.href, alt: `${brandName} logo` };
}

function firstTagline(value: string | null | undefined): string | null {
  const lines = splitBrandKitLines(value, "lines");
  return lines[0] ?? null;
}

/**
 * Compose a portal Brand Kit presentation from stored kit + assets.
 * Returns null when there is nothing meaningful to show.
 */
export function composePortalBrandKitPresentation(input: {
  kit: BrandKitComposeInput;
  assets?: BrandKitComposeAssetInput[];
}): PortalBrandKitPresentation | null {
  const brandName = trimText(input.kit.brandName);
  if (!brandName) return null;

  const assets = composeAssets(input.assets ?? []);
  const colors = composeColors(input.kit);
  const doRules = splitBrandKitLines(input.kit.doRules);
  const dontRules = splitBrandKitLines(input.kit.dontRules);
  const logoNotes = splitBrandKitLines(input.kit.logoNotes);
  const keywords = splitBrandKitLines(input.kit.brandKeywords, "keywords");

  const presentation: PortalBrandKitPresentation = {
    brandName,
    tagline: firstTagline(input.kit.taglineOptions),
    identityLine: trimText(input.kit.industry),
    heroLogo: pickHeroLogo(brandName, assets),
    colors,
    typographyDirection: trimText(input.kit.typographyDirection),
    positioningStatement: trimText(input.kit.positioningStatement),
    brandPersonality: trimText(input.kit.brandPersonality),
    voiceTone: trimText(input.kit.voiceTone),
    keywords,
    doRules,
    dontRules,
    logoNotes,
    assets,
    socialBio: trimText(input.kit.socialBio),
    websiteIntroCopy: trimText(input.kit.websiteIntroCopy),
    primaryCta: trimText(input.kit.primaryCTA),
    secondaryCta: trimText(input.kit.secondaryCTA),
  };

  const hasBody =
    Boolean(presentation.heroLogo) ||
    presentation.colors.length > 0 ||
    Boolean(presentation.typographyDirection) ||
    Boolean(presentation.positioningStatement) ||
    Boolean(presentation.brandPersonality) ||
    Boolean(presentation.voiceTone) ||
    presentation.keywords.length > 0 ||
    presentation.doRules.length > 0 ||
    presentation.dontRules.length > 0 ||
    presentation.logoNotes.length > 0 ||
    presentation.assets.length > 0 ||
    Boolean(presentation.socialBio) ||
    Boolean(presentation.websiteIntroCopy) ||
    Boolean(presentation.tagline);

  return hasBody ? presentation : null;
}
