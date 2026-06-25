import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, absolutePublicUrl } from "@/lib/seo/public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: absolutePublicUrl(path),
    lastModified,
    changeFrequency: (
      path === "/" ? "weekly"
      : path.startsWith("/work/") ? "monthly"
      : "monthly"
    ) as "weekly" | "monthly",
    priority:
      path === "/"
        ? 1.0
        : path === "/work"
          ? 0.9
          : path === "/services/luxury-website-experiences"
            ? 0.95
            : path.startsWith("/services")
              ? 0.85
              : path === "/website-audit"
                ? 0.85
                : path === "/investment"
                  ? 0.85
                  : path.startsWith("/work/")
                    ? 0.8
                    : 0.75,
  }));
}
