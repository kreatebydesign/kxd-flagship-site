import { NETWORK_HOST } from "./constants";

export { NETWORK_HOST };

/** Partner login return-to used by the network apex redirect. */
export const NETWORK_ROOT_LOGIN_PATH = "/portal/login?redirect=/portal/partner";

export const NETWORK_SHARE = {
  title: "KXD Network — Private Access",
  description:
    "A private KXD partner room for trusted introductions and real opportunity.",
  imagePath: "/migrated-assets/brand/kxd-network-private-access-og-1200x630.png",
  canonicalUrl: `https://${NETWORK_HOST}/`,
  twitterCard: "summary_large_image",
} as const;

const LINK_PREVIEW_CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "pinterest",
  "redditbot",
  "embedly",
  "quora link preview",
  "vkshare",
  "skypeuripreview",
  "applebot",
  "google-ncf",
  "iframely",
] as const;

/**
 * Exact `/` on the Partner Network host only.
 * Does not affect kreatebydesign.com, portal.kreatebydesign.com, or any other path.
 */
export function networkRootRedirectPath(
  pathname: string,
  hostHeader: string | null | undefined,
): string | null {
  if (pathname !== "/") return null;
  const host = hostHeader?.split(":")[0]?.toLowerCase();
  if (host !== NETWORK_HOST) return null;
  return NETWORK_ROOT_LOGIN_PATH;
}

export function isLinkPreviewCrawler(
  userAgent: string | null | undefined,
): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return LINK_PREVIEW_CRAWLER_PATTERNS.some((token) => ua.includes(token));
}

export function networkRootResponseKind(
  pathname: string,
  hostHeader: string | null | undefined,
  userAgent: string | null | undefined,
): "share" | "redirect" | null {
  if (!networkRootRedirectPath(pathname, hostHeader)) return null;
  return isLinkPreviewCrawler(userAgent) ? "share" : "redirect";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function networkShareImageAbsoluteUrl(): string {
  return `https://${NETWORK_HOST}${NETWORK_SHARE.imagePath}`;
}

/** Static HTML for link-preview crawlers. No JavaScript. */
export function networkShareCrawlerHtml(): string {
  const title = escapeHtml(NETWORK_SHARE.title);
  const description = escapeHtml(NETWORK_SHARE.description);
  const url = escapeHtml(NETWORK_SHARE.canonicalUrl);
  const image = escapeHtml(networkShareImageAbsoluteUrl());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="${NETWORK_SHARE.twitterCard}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body></body>
</html>
`;
}
