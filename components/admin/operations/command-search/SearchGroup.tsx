"use client";

import type { CommandSearchGroup, CommandSearchResult } from "@/lib/search";
import { SearchResult } from "./SearchResult";

type SearchGroupProps = {
  group: CommandSearchGroup;
  activeId?: string;
  onHighlight?: (result: CommandSearchResult) => void;
  onSelect: (result: CommandSearchResult) => void;
};

export function SearchGroup({ group, activeId, onHighlight, onSelect }: SearchGroupProps) {
  if (group.results.length === 0) return null;

  return (
    <div className="kxd-cmd-group">
      <p className="kxd-cmd-group__label">{group.label}</p>
      <div className="kxd-cmd-group__list">
        {group.results.map((r) => (
          <SearchResult
            key={r.id}
            result={r}
            active={r.id === activeId}
            onHighlight={onHighlight}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
