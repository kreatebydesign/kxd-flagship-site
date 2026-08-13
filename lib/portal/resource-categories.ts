import type { PortalResourceCategory } from "./types";

export type PortalBrandKitResourceInput = {
  brandName: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  neutralColor?: string | null;
  assets?: Array<{
    title: string;
    description?: string | null;
    href?: string | null;
  }>;
};

/**
 * Classic Client HQ Resources placeholders — unchanged generic behavior.
 * Used when the client has no Brand Kit surface to present.
 */
export function getGenericPortalResourceCategories(): PortalResourceCategory[] {
  return [
    {
      id: "guides",
      title: "Guides",
      description: "Step-by-step documentation for your engagement.",
      items: [],
    },
    {
      id: "training",
      title: "Training",
      description: "Onboarding and platform training materials.",
      items: [],
    },
    {
      id: "videos",
      title: "Videos",
      description: "Walkthroughs, tutorials, and recorded sessions.",
      items: [],
    },
    {
      id: "support",
      title: "Support",
      description: "How to reach your KXD team and get help quickly.",
      items: [
        {
          title: "Submit a request",
          description: "Open a new request from your headquarters.",
          href: "/portal/requests",
        },
      ],
    },
    {
      id: "brand-standards",
      title: "Brand standards",
      description: "Logo usage, voice, and visual identity references.",
      items: [
        {
          title: "View brand assets",
          description: "Logos, guidelines, and marketing files.",
          href: "/portal/assets",
        },
      ],
    },
  ];
}

/**
 * Brand Kit–aware Resources categories for clients that have an approved kit.
 * Support destination is capability-driven (caller supplies href).
 */
export function getBrandKitPortalResourceCategories(
  kit: PortalBrandKitResourceInput,
  options?: {
    supportHref?: string;
    supportTitle?: string;
    supportDescription?: string;
  },
): PortalResourceCategory[] {
  const colorLines = [
    kit.primaryColor ? `Primary: ${kit.primaryColor}` : null,
    kit.secondaryColor ? `Secondary: ${kit.secondaryColor}` : null,
    kit.accentColor ? `Accent: ${kit.accentColor}` : null,
    kit.neutralColor ? `Neutral: ${kit.neutralColor}` : null,
  ].filter(Boolean);

  const items: PortalResourceCategory["items"] = [
    ...((kit.assets ?? [])
      .filter((asset) => asset.title.trim())
      .map((asset) => ({
        title: asset.title.trim(),
        description: asset.description?.trim() || undefined,
        href: asset.href?.trim() || undefined,
      })) ?? []),
  ];

  if (colorLines.length > 0) {
    items.unshift({
      title: "Approved color palette",
      description: colorLines.join(" · "),
    });
  }

  const supportHref = options?.supportHref?.trim() || "/portal/requests";

  return [
    {
      id: "brand-kit",
      title: "Brand Kit",
      description: `Approved identity materials for ${kit.brandName}.`,
      items,
    },
    {
      id: "support",
      title: "Support",
      description: "How to reach your KXD team and get help quickly.",
      items: [
        {
          title: options?.supportTitle?.trim() || "Submit a request",
          description:
            options?.supportDescription?.trim() ||
            "Open a new request from your headquarters.",
          href: supportHref,
        },
      ],
    },
  ];
}

/**
 * Backward-compatible entry point.
 * Without a Brand Kit input, returns classic generic categories.
 */
export function getPortalResourceCategories(options?: {
  brandKit?: PortalBrandKitResourceInput | null;
  includeGenericPlaceholders?: boolean;
  supportHref?: string;
}): PortalResourceCategory[] {
  const kit = options?.brandKit ?? null;
  if (kit) {
    return getBrandKitPortalResourceCategories(kit, {
      supportHref: options?.supportHref,
    });
  }
  return getGenericPortalResourceCategories();
}
