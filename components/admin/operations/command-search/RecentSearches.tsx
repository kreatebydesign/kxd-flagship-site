"use client";

import type { CommandSearchResult } from "@/lib/search";
import { SearchResult } from "./SearchResult";

type RecentSearchesProps = {
  searches: string[];
  recentItems: CommandSearchResult[];
  pinned: CommandSearchResult[];
  activeId?: string;
  onSelectSearch: (query: string) => void;
  onSelectItem: (result: CommandSearchResult) => void;
};

export function RecentSearches({
  searches,
  recentItems,
  pinned,
  activeId,
  onSelectSearch,
  onSelectItem,
}: RecentSearchesProps) {
  return (
    <>
      {pinned.length > 0 ? (
        <div className="kxd-cmd-group">
          <p className="kxd-cmd-group__label">Pinned</p>
          <div className="kxd-cmd-group__list">
            {pinned.map((item) => (
              <SearchResult
                key={item.id}
                result={{ ...item, pinned: true }}
                active={item.id === activeId}
                onSelect={onSelectItem}
              />
            ))}
          </div>
        </div>
      ) : null}

      {recentItems.length > 0 ? (
        <div className="kxd-cmd-group">
          <p className="kxd-cmd-group__label">Recent</p>
          <div className="kxd-cmd-group__list">
            {recentItems.slice(0, 6).map((item) => (
              <SearchResult
                key={item.id}
                result={item}
                active={item.id === activeId}
                onSelect={onSelectItem}
              />
            ))}
          </div>
        </div>
      ) : null}

      {searches.length > 0 ? (
        <div className="kxd-cmd-group">
          <p className="kxd-cmd-group__label">Recent Searches</p>
          <div className="kxd-cmd-recent-queries">
            {searches.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                className="kxd-cmd-recent-query"
                onClick={() => onSelectSearch(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
