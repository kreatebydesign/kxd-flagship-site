/** Normalize website URL to hostname for client import matching (no fuzzy name logic). */
export function normalizeWebsiteHostname(
  url: string | undefined | null,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    const withProtocol = raw.includes("://") ? raw : `https://${raw}`;
    const hostname = new URL(withProtocol).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function collectWebsiteHostnames(
  urls: (string | undefined | null)[],
): string[] {
  const hosts = new Set<string>();
  for (const url of urls) {
    const host = normalizeWebsiteHostname(url);
    if (host) hosts.add(host);
  }
  return [...hosts];
}
