/**
 * Client-safe Brand Kit presentation model for portal Resources.
 * Reusable across CES experiences — no operator fields.
 */

export type PortalBrandKitColorSwatch = {
  role: "Primary" | "Secondary" | "Accent" | "Neutral";
  hex: string;
  /** Accessible text color for overlay on this swatch. */
  textOnSwatch: string;
};

export type PortalBrandKitAsset = {
  id: string;
  title: string;
  description: string | null;
  href: string | null;
  assetType: string | null;
  usageContext: string | null;
  previewable: boolean;
};

export type PortalBrandKitPresentation = {
  brandName: string;
  tagline: string | null;
  identityLine: string | null;
  heroLogo: {
    src: string;
    alt: string;
  } | null;
  colors: PortalBrandKitColorSwatch[];
  typographyDirection: string | null;
  positioningStatement: string | null;
  brandPersonality: string | null;
  voiceTone: string | null;
  keywords: string[];
  doRules: string[];
  dontRules: string[];
  logoNotes: string[];
  assets: PortalBrandKitAsset[];
  socialBio: string | null;
  websiteIntroCopy: string | null;
  primaryCta: string | null;
  secondaryCta: string | null;
};
