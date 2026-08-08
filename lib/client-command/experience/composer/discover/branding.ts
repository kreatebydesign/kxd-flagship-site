/**
 * Read-only branding discovery from a KXD-managed client website.
 * Fetches public HTML/SVG only. Does not write.
 */

import "server-only";

import {
  extractColorCandidates,
  extractDisplayName,
  extractLogoCandidates,
  extractMeasurementIds,
  hostnamesMatch,
  isSameManagedOrigin,
  resolveManagedSiteUrl,
  type DiscoveredColorCandidate,
  type DiscoveredLogoCandidate,
} from "./html";

const MAX_HTML_BYTES = 1_500_000;
const MAX_SVG_BYTES = 200_000;

export type BrandingDiscoveryResult = {
  siteUrl: string | null;
  displayName: { name: string; source: string; confidence: string } | null;
  logos: DiscoveredLogoCandidate[];
  colors: DiscoveredColorCandidate[];
  measurementIds: string[];
  message: string;
};

async function fetchText(
  url: string,
  maxBytes: number,
): Promise<{ ok: true; text: string; finalUrl: string } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml,image/svg+xml,*/*;q=0.8",
        "User-Agent": "KXD-OS-ExperienceDiscovery/1.0 (read-only)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      return { ok: false, error: `Response exceeded ${maxBytes} bytes` };
    }
    return { ok: true, text: buffer.toString("utf8"), finalUrl: res.url || url };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err instanceof Error ? err.message : "Fetch failed" };
  }
}

export async function discoverManagedWebsiteBranding(input: {
  websiteUrl: string | null;
  primaryDomain: string | null;
  clientName: string;
}): Promise<BrandingDiscoveryResult> {
  const siteUrl = resolveManagedSiteUrl(input.websiteUrl, input.primaryDomain);
  if (!siteUrl) {
    return {
      siteUrl: null,
      displayName: null,
      logos: [],
      colors: [],
      measurementIds: [],
      message: "No company website or primary domain is on file for this client.",
    };
  }

  const page = await fetchText(siteUrl, MAX_HTML_BYTES);
  if (!page.ok) {
    return {
      siteUrl,
      displayName: null,
      logos: [],
      colors: [],
      measurementIds: [],
      message: `Could not read the managed website (${page.error}).`,
    };
  }

  try {
    const managedHost = new URL(siteUrl).hostname;
    const finalHost = new URL(page.finalUrl).hostname;
    if (!hostnamesMatch(managedHost, finalHost)) {
      return {
        siteUrl,
        displayName: null,
        logos: [],
        colors: [],
        measurementIds: [],
        message: "Managed website redirected off the known client hostname. Discovery stopped.",
      };
    }
  } catch {
    return {
      siteUrl,
      displayName: null,
      logos: [],
      colors: [],
      measurementIds: [],
      message: "Managed website URL could not be verified after fetch.",
    };
  }

  const logos = extractLogoCandidates(page.text, page.finalUrl).filter((logo) =>
    isSameManagedOrigin(siteUrl, logo.url),
  );
  const svgTexts: Array<{ source: string; svg: string }> = [];
  for (const logo of logos.filter((item) => /\.svg(\?|$)/i.test(item.url)).slice(0, 3)) {
    const svg = await fetchText(logo.url, MAX_SVG_BYTES);
    if (svg.ok && /<svg/i.test(svg.text)) {
      svgTexts.push({ source: logo.url, svg: svg.text });
    }
  }

  return {
    siteUrl: page.finalUrl || siteUrl,
    displayName: extractDisplayName(page.text, input.clientName),
    logos,
    colors: extractColorCandidates(page.text, svgTexts),
    measurementIds: extractMeasurementIds(page.text),
    message:
      logos.length || svgTexts.length
        ? "Read-only candidates from the known managed website. Nothing is canonical until you import it."
        : "Managed website was readable, but no same-origin logo candidates were found.",
  };
}
