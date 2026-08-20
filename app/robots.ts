import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Private / non-marketing surfaces — shared by all robot rules. */
const DISALLOW_PATHS = [
  "/admin/",
  "/api/",
  "/portal/",
  "/dashboard/",
  "/ops/",
  "/junior-creators/",
  "/os/",
  "/website-audit/results/",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      /**
       * OpenAI search/discovery crawler — explicit allow of public marketing content.
       * Same private-path exclusions as the wildcard rule (specific UA rules replace `*`).
       * GPTBot (training) is intentionally unchanged and continues to inherit `*`.
       */
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: [...DISALLOW_PATHS],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [...DISALLOW_PATHS],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
