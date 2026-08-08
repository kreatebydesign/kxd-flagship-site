/**
 * Pure HTML / SVG parsers for managed-website branding discovery.
 * No network. No client slug branching.
 */

import { isKxdGoldHex, isTrustedClientAccent } from "../readiness";

export type DiscoveryConfidence = "high" | "medium" | "low";

export type DiscoveredLogoCandidate = {
  url: string;
  source: string;
  confidence: DiscoveryConfidence;
};

export type DiscoveredColorCandidate = {
  hex: string;
  role: "primary" | "secondary" | "accent" | "unknown";
  source: string;
  confidence: DiscoveryConfidence;
};

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

export function normalizeHostname(host: string): string {
  return host.trim().replace(/^www\./i, "").toLowerCase();
}

export function hostnamesMatch(a: string, b: string): boolean {
  return normalizeHostname(a) === normalizeHostname(b);
}

export function resolveManagedSiteUrl(
  websiteUrl: string | null | undefined,
  primaryDomain: string | null | undefined,
): string | null {
  const raw = websiteUrl?.trim();
  if (raw) {
    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(withProtocol).origin;
    } catch {
      /* fall through */
    }
  }
  const domain = primaryDomain?.trim().replace(/^https?:\/\//i, "").split("/")[0];
  if (!domain) return null;
  return `https://${domain}`;
}

export function absUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function extractMeasurementIds(html: string): string[] {
  const matches = html.match(/G-[A-Z0-9]{6,12}/g) ?? [];
  return [...new Set(matches)];
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const named = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const namedFlip = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      "i",
    );
    const match = html.match(named) || html.match(namedFlip);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1] ?? ""));
    } catch {
      /* ignore invalid json-ld */
    }
  }
  return blocks;
}

function walkJsonLd(value: unknown, visit: (obj: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walkJsonLd(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  visit(obj);
  if (obj["@graph"]) walkJsonLd(obj["@graph"], visit);
}

export function extractDisplayName(html: string, fallback: string): {
  name: string;
  source: string;
  confidence: DiscoveryConfidence;
} {
  const siteName = metaContent(html, ["og:site_name"]);
  if (siteName) return { name: siteName, source: "og:site_name", confidence: "high" };

  for (const block of jsonLdBlocks(html)) {
    let found: string | null = null;
    walkJsonLd(block, (obj) => {
      if (found) return;
      const type = String(obj["@type"] ?? "");
      if (/organization|localbusiness|autodealer/i.test(type) && typeof obj.name === "string") {
        found = obj.name.trim();
      }
    });
    if (found) return { name: found, source: "jsonld.name", confidence: "high" };
  }

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  if (title) {
    const cleaned = title.split("|")[0]?.trim() || title;
    return { name: cleaned, source: "title", confidence: "medium" };
  }
  return { name: fallback, source: "client-record", confidence: "low" };
}

export function extractLogoCandidates(html: string, pageUrl: string): DiscoveredLogoCandidate[] {
  const candidates: DiscoveredLogoCandidate[] = [];
  const origin = (() => {
    try {
      return new URL(pageUrl).origin;
    } catch {
      return pageUrl;
    }
  })();

  for (const block of jsonLdBlocks(html)) {
    walkJsonLd(block, (obj) => {
      const logo = obj.logo;
      const url =
        typeof logo === "string"
          ? logo
          : logo && typeof logo === "object" && typeof (logo as { url?: string }).url === "string"
            ? (logo as { url: string }).url
            : null;
      if (!url) return;
      const abs = absUrl(origin, url);
      if (abs) {
        candidates.push({ url: abs, source: "jsonld.logo", confidence: "high" });
      }
    });
  }

  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let img: RegExpExecArray | null;
  while ((img = imgRe.exec(html))) {
    const src = img[1] ?? "";
    const abs = absUrl(origin, src);
    if (!abs) continue;
    const lower = src.toLowerCase();
    if (/\/brand\/|\/logo|logo[-_.]/.test(lower)) {
      candidates.push({
        url: abs,
        source: "img[src*=logo|brand]",
        confidence: /\/brand\//.test(lower) ? "high" : "medium",
      });
    }
  }

  const linkRe = /<link[^>]+>/gi;
  let link: RegExpExecArray | null;
  while ((link = linkRe.exec(html))) {
    const tag = link[0];
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const abs = absUrl(origin, href);
    if (!abs) continue;
    if (rel.includes("apple-touch-icon")) {
      candidates.push({ url: abs, source: "link[rel=apple-touch-icon]", confidence: "medium" });
    } else if (rel.includes("icon")) {
      candidates.push({ url: abs, source: "link[rel=icon]", confidence: "low" });
    }
  }

  const ogImage = metaContent(html, ["og:image"]);
  if (ogImage) {
    const abs = absUrl(origin, ogImage);
    if (abs) candidates.push({ url: abs, source: "og:image", confidence: "medium" });
  }

  return unique(candidates, (c) => c.url).slice(0, 8);
}

export function extractColorCandidates(
  html: string,
  svgTexts: Array<{ source: string; svg: string }>,
): DiscoveredColorCandidate[] {
  const colors: DiscoveredColorCandidate[] = [];
  const theme = metaContent(html, ["theme-color"]);
  if (theme && isTrustedClientAccent(theme)) {
    colors.push({
      hex: theme.trim().toUpperCase(),
      role: "primary",
      source: "meta[theme-color]",
      confidence: "medium",
    });
  }

  const hexRe = /#([0-9a-fA-F]{6})\b/g;
  const chunks: Array<{ source: string; text: string; confidence: DiscoveryConfidence }> = [
    ...Array.from(html.matchAll(/style=["']([^"']+)["']/gi)).map((m) => ({
      source: "inline-style",
      text: m[1] ?? "",
      confidence: "low" as const,
    })),
    ...Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)).map((m) => ({
      source: "style-block",
      text: m[1] ?? "",
      confidence: "low" as const,
    })),
    ...svgTexts.map((item) => ({
      source: item.source,
      text: item.svg,
      confidence: "medium" as const,
    })),
  ];
  for (const chunk of chunks) {
    const local = new RegExp(hexRe.source, "g");
    let match: RegExpExecArray | null;
    while ((match = local.exec(chunk.text))) {
      const hex = `#${match[1]!.toUpperCase()}`;
      if (isKxdGoldHex(hex)) continue;
      if (!isTrustedClientAccent(hex)) continue;
      colors.push({
        hex,
        role:
          hex === "#FFFFFF" || hex === "#F5F5F3"
            ? "secondary"
            : hex === "#000000" || hex === "#0B0B0B" || hex === "#111111"
              ? "primary"
              : "accent",
        source: chunk.source,
        confidence: chunk.confidence,
      });
    }
  }

  return unique(
    colors.filter((c) => !isKxdGoldHex(c.hex)),
    (c) => `${c.hex}:${c.role}`,
  ).slice(0, 10);
}

export function isSameManagedOrigin(managedOrigin: string, candidateUrl: string): boolean {
  try {
    const managed = new URL(managedOrigin);
    const candidate = new URL(candidateUrl);
    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") return false;
    return hostnamesMatch(managed.hostname, candidate.hostname);
  } catch {
    return false;
  }
}

/** Origin + pathname identity — ignores www, trailing slash, and cache-busting query strings. */
export function assetIdentityKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${normalizeHostname(parsed.hostname)}${pathname}`;
  } catch {
    return null;
  }
}

export function logoUrlsMatch(a: string, b: string): boolean {
  const left = assetIdentityKey(a);
  const right = assetIdentityKey(b);
  return Boolean(left && right && left === right);
}

export function isManagedSiteAsset(
  candidateUrl: string,
  websiteUrl: string | null | undefined,
  primaryDomain: string | null | undefined,
): boolean {
  const managed = resolveManagedSiteUrl(websiteUrl, primaryDomain);
  if (!managed) return false;
  return isSameManagedOrigin(managed, candidateUrl);
}

export function gscSiteMatchesHost(siteUrl: string, host: string): boolean {
  const normalized = normalizeHostname(host);
  const trimmed = siteUrl.trim();
  if (trimmed.toLowerCase() === `sc-domain:${normalized}`) return true;
  try {
    const url = new URL(trimmed);
    return hostnamesMatch(url.hostname, normalized);
  } catch {
    return false;
  }
}
