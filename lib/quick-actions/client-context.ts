import type { IntelligenceContext } from "@/lib/intelligence/types";

const CLIENT_SCOPED_PATHS = [
  /^\/admin\/operations\/client-command\/(\d+)/,
  /^\/admin\/operations\/clients\/(\d+)/,
  /^\/admin\/operations\/timeline\/(\d+)/,
  /^\/admin\/operations\/infrastructure\/(\d+)/,
  /^\/admin\/operations\/client-success\/(\d+)/,
] as const;

/** Resolve clientId from an operations route pathname */
export function resolveClientIdFromPathname(pathname: string | null | undefined): number | null {
  if (!pathname) return null;
  for (const pattern of CLIENT_SCOPED_PATHS) {
    const match = pathname.match(pattern);
    if (match?.[1]) {
      const id = Number(match[1]);
      if (Number.isFinite(id)) return id;
    }
  }
  return null;
}

/** Deterministic client match from a search token (name / slug) */
export function matchClientFromQuery(
  token: string,
  ctx: IntelligenceContext,
): { id: number; name: string } | null {
  const q = token.trim().toLowerCase();
  if (q.length < 2) return null;

  let best: { id: number; name: string; score: number } | null = null;

  for (const client of ctx.clients) {
    const id = Number(client.id);
    if (!Number.isFinite(id)) continue;

    const name = String(client.name ?? "").toLowerCase();
    const slug = String(client.slug ?? "").toLowerCase();
    let score = 0;

    if (name === q || slug === q) score = 100;
    else if (name.startsWith(q) || slug.startsWith(q)) score = 80;
    else if (name.includes(q) || slug.includes(q)) score = 60;
    else {
      const words = name.split(/\s+/);
      if (words.some((w) => w.startsWith(q) || q.startsWith(w))) score = 50;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { id, name: String(client.name ?? "Client"), score };
    }
  }

  return best ? { id: best.id, name: best.name } : null;
}
