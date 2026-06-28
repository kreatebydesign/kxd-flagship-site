import type { CommandSearchResult, SearchRankingContext } from "./types";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function exactBoost(title: string, query: string): number {
  const t = normalize(title);
  const q = normalize(query);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 60;
  if (t.includes(q)) return 30;
  return 0;
}

export function rankSearchResults(
  results: CommandSearchResult[],
  ctx: SearchRankingContext,
): CommandSearchResult[] {
  const q = normalize(ctx.query);

  const scored = results.map((r) => {
    let score = r.score ?? 0;

    score += exactBoost(r.title, q);
    if (r.clientName) score += exactBoost(r.clientName, q) * 0.8;
    if (r.subtitle) score += exactBoost(r.subtitle, q) * 0.4;

    if (ctx.pinnedIds?.has(r.id)) score += 80;
    if (ctx.recentIds?.includes(r.id)) {
      const idx = ctx.recentIds.indexOf(r.id);
      score += Math.max(0, 40 - idx * 2);
    }
    const freq = ctx.frequentIds?.get(r.id) ?? 0;
    score += Math.min(freq * 5, 35);

    if (r.type === "command") score += 25;
    if (r.type === "client") score += 15;
    if (r.type === "proposal") score += 12;
    if (r.type === "project") score += 10;

    return { ...r, score };
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function dedupeResults(results: CommandSearchResult[]): CommandSearchResult[] {
  const seen = new Set<string>();
  const out: CommandSearchResult[] = [];
  for (const r of results) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}
