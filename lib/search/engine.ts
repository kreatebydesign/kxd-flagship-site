import "server-only";

import { loadIntelligenceContext } from "@/lib/intelligence/context";
import { commandsToResults, matchCommands } from "./commands";
import { dedupeResults, rankSearchResults } from "./ranking";
import { runSearchProviders } from "./providers";
import type {
  CommandSearchGroup,
  CommandSearchResponse,
  CommandSearchResult,
  SearchGroupId,
} from "./types";
import { GROUP_LABELS as LABELS, GROUP_ORDER as ORDER } from "./types";

let ctxCache: { at: number; ctx: Awaited<ReturnType<typeof loadIntelligenceContext>> } | null =
  null;
const CTX_TTL_MS = 60_000;

async function getCachedContext() {
  if (ctxCache && Date.now() - ctxCache.at < CTX_TTL_MS) {
    return ctxCache.ctx;
  }
  const ctx = await loadIntelligenceContext();
  ctxCache = { at: Date.now(), ctx };
  return ctx;
}

export function clearCommandSearchCache(): void {
  ctxCache = null;
}

function groupResults(results: CommandSearchResult[]): CommandSearchGroup[] {
  const buckets = new Map<SearchGroupId, CommandSearchResult[]>();

  for (const r of results) {
    const list = buckets.get(r.group) ?? [];
    list.push(r);
    buckets.set(r.group, list);
  }

  return ORDER.filter((id) => buckets.has(id)).map((id) => ({
    id,
    label: LABELS[id],
    results: buckets.get(id)!.slice(0, 12),
  }));
}

export async function universalCommandSearch(
  query: string,
  limit = 48,
): Promise<CommandSearchResponse> {
  const started = Date.now();
  const q = query.trim();

  const commandMatches = commandsToResults(matchCommands(q, 10));
  const commandsRanked = rankSearchResults(commandMatches, { query: q });

  if (!q) {
    const ctx = await getCachedContext();
    const navResults = await runSearchProviders("", ctx);
    const navOnly = navResults.filter((r) => r.type === "nav").slice(0, 12);
    const groups = groupResults([...commandsRanked, ...navOnly]);
    return {
      success: true,
      query: q,
      commands: commandsRanked,
      groups,
      tookMs: Date.now() - started,
    };
  }

  const ctx = await getCachedContext();
  const entityResults = await runSearchProviders(q, ctx);

  const merged = dedupeResults([
    ...commandsRanked,
    ...rankSearchResults(entityResults, { query: q }),
  ]).slice(0, limit);

  const commands = merged.filter((r) => r.type === "command");
  const rest = merged.filter((r) => r.type !== "command");
  const groups = groupResults([...commands, ...rest]);

  return {
    success: true,
    query: q,
    commands,
    groups,
    tookMs: Date.now() - started,
  };
}

export type { CommandSearchResult, CommandSearchGroup, CommandSearchResponse };
