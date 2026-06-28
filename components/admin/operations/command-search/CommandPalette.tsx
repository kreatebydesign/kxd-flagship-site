"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommandSearchGroup, CommandSearchResult } from "@/lib/search";
import {
  DEFAULT_PINNED,
  commandsToResults,
  loadFrequentMap,
  loadPinnedIds,
  loadRecentItems,
  loadRecentSearches,
  matchCommands,
  rankSearchResults,
  recordFrequentOpen,
  saveRecentItem,
  saveRecentSearch,
} from "@/lib/search";
import { SearchInput } from "./SearchInput";
import { SearchGroup } from "./SearchGroup";
import { QuickCommands } from "./QuickCommands";
import { RecentSearches } from "./RecentSearches";
import { SearchEmptyState } from "./SearchEmptyState";

const DEBOUNCE_MS = 120;
const API_CACHE_TTL = 45_000;

type ApiCacheEntry = {
  at: number;
  groups: CommandSearchGroup[];
  commands: CommandSearchResult[];
};

let apiCache = new Map<string, ApiCacheEntry>();

function flattenGroups(groups: CommandSearchGroup[]): CommandSearchResult[] {
  return groups.flatMap((g) => g.results);
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<CommandSearchGroup[]>([]);
  const [commands, setCommands] = useState<CommandSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<CommandSearchResult[]>([]);
  const [pinned, setPinned] = useState<CommandSearchResult[]>(DEFAULT_PINNED);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setGroups([]);
    setCommands(commandsToResults(matchCommands("", 6)));
    setRecentSearches(loadRecentSearches());
    setRecentItems(loadRecentItems());
    const pinIds = loadPinnedIds();
    setPinned(DEFAULT_PINNED.filter((p) => pinIds.size === 0 || pinIds.has(p.id)));
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveId(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        closePalette();
      }
    }
    function onOpenEvent() {
      openPalette();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("kxd:command-palette-open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("kxd:command-palette-open", onOpenEvent);
    };
  }, [open, openPalette, closePalette]);

  const fetchResults = useCallback(async (q: string) => {
    const key = q.trim().toLowerCase();
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.at < API_CACHE_TTL) {
      setGroups(cached.groups);
      setCommands(cached.commands);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/command-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        apiCache.set(key, {
          at: Date.now(),
          groups: data.groups ?? [],
          commands: data.commands ?? [],
        });
        setGroups(data.groups ?? []);
        setCommands(data.commands ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      void fetchResults("");
    }
  }, [open, fetchResults]);

  const instantCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return rankSearchResults(commandsToResults(matchCommands(query, 10)), {
      query,
      pinnedIds: loadPinnedIds(),
      frequentIds: loadFrequentMap(),
      recentIds: loadRecentItems().map((r) => r.id),
    });
  }, [query, commands]);

  useEffect(() => {
    if (!open) return;

    const localCmds = commandsToResults(matchCommands(query, 10));
    setCommands(localCmds);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchResults(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, fetchResults]);

  const flatResults = useMemo(() => {
    const merged = rankSearchResults(
      [...instantCommands, ...flattenGroups(groups)],
      {
        query,
        pinnedIds: loadPinnedIds(),
        frequentIds: loadFrequentMap(),
        recentIds: recentItems.map((r) => r.id),
      },
    );
    const seen = new Set<string>();
    return merged.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [instantCommands, groups, query, recentItems]);

  useEffect(() => {
    if (flatResults.length > 0 && !flatResults.some((r) => r.id === activeId)) {
      setActiveId(flatResults[0]?.id ?? null);
    }
  }, [flatResults, activeId]);

  const highlight = useCallback((result: CommandSearchResult) => {
    setActiveId(result.id);
  }, []);

  const navigate = useCallback(
    (result: CommandSearchResult) => {
      if (query.trim()) saveRecentSearch(query);
      saveRecentItem(result);
      recordFrequentOpen(result.id);
      closePalette();
      router.push(result.href);
    },
    [query, closePalette, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = flatResults.findIndex((r) => r.id === activeId);
      const next = flatResults[Math.min(idx + 1, flatResults.length - 1)];
      if (next) setActiveId(next.id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = flatResults.findIndex((r) => r.id === activeId);
      const next = flatResults[Math.max(idx - 1, 0)];
      if (next) setActiveId(next.id);
    } else if (e.key === "Enter" && activeId) {
      e.preventDefault();
      const hit = flatResults.find((r) => r.id === activeId);
      if (hit) navigate(hit);
    }
  }

  const showEmpty =
    query.trim().length > 0 && !loading && flatResults.length === 0;
  const showRecents = !query.trim() && !loading;

  if (!open) return null;

  return (
    <div
      className="kxd-cmd-overlay"
      role="presentation"
      onClick={closePalette}
    >
      <div
        className="kxd-cmd-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Universal command search"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          inputRef={inputRef}
        />

        <div className="kxd-cmd-results">
          {showRecents ? (
            <>
              <RecentSearches
                searches={recentSearches}
                recentItems={recentItems}
                pinned={pinned}
                activeId={activeId ?? undefined}
                onSelectSearch={setQuery}
                onSelectItem={navigate}
              />
              <QuickCommands
                commands={instantCommands}
                activeId={activeId ?? undefined}
                onHighlight={highlight}
                onSelect={navigate}
              />
              {groups.map((g) => (
                <SearchGroup
                  key={g.id}
                  group={g}
                  activeId={activeId ?? undefined}
                  onHighlight={highlight}
                  onSelect={navigate}
                />
              ))}
            </>
          ) : null}

          {!showRecents && instantCommands.length > 0 ? (
            <QuickCommands
              commands={instantCommands.filter((c) => c.type === "command")}
              activeId={activeId ?? undefined}
              onHighlight={highlight}
              onSelect={navigate}
            />
          ) : null}

          {!showRecents
            ? groups.map((g) => (
                <SearchGroup
                  key={g.id}
                  group={g}
                  activeId={activeId ?? undefined}
                  onHighlight={highlight}
                  onSelect={navigate}
                />
              ))
            : null}

          {showEmpty ? <SearchEmptyState query={query} /> : null}
          {loading && query.trim() ? (
            <SearchEmptyState query={query} loading />
          ) : null}
        </div>

        <div className="kxd-cmd-foot">
          <span className="kxd-os-meta">
            <kbd className="kxd-cmd-kbd">↑↓</kbd> navigate
          </span>
          <span className="kxd-os-meta">
            <kbd className="kxd-cmd-kbd">↵</kbd> open
          </span>
          <span className="kxd-os-meta">
            <kbd className="kxd-cmd-kbd">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
