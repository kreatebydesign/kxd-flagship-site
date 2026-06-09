import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, absolutePublicUrl } from "@/lib/seo/public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: absolutePublicUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : path.startsWith("/services") ? "monthly" : "monthly",
    priority:
      path === "/"
        ? 1
        : path === "/services/luxury-websites"
          ? 0.95
          : path.startsWith("/services")
            ? 0.85
            : 0.8,
  }));
}
