import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/site";
import { SITE } from "@/lib/site";

/** Link-preview metadata for KXD OS admin surfaces (Payload `/admin/*`). */
export const KXD_OS_SHARE = {
  title: "KXD OS | Kreate by Design",
  description: "Secure access to the Kreate by Design operating system.",
  imagePath: DEFAULT_OG_IMAGE,
  siteName: SITE.name,
  twitterCard: "summary_large_image",
} as const;

export function kxdOsShareImageAbsoluteUrl(): string {
  return `${SITE.url}${KXD_OS_SHARE.imagePath}`;
}

export function kxdOsAdminLoginCanonicalUrl(): string {
  return `${SITE.url}/admin/login`;
}

/** Official KXD favicon set — must match public marketing site icons. */
export const KXD_OS_FAVICON_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/migrated-assets/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/migrated-assets/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/migrated-assets/favicons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    { url: "/migrated-assets/favicons/favicon.ico", rel: "shortcut icon" },
  ],
  apple: [
    {
      url: "/migrated-assets/favicons/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  ],
};
