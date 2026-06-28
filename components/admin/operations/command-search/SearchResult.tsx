"use client";

import type { CommandSearchResult } from "@/lib/search";

type SearchResultProps = {
  result: CommandSearchResult;
  active?: boolean;
  onHighlight?: (result: CommandSearchResult) => void;
  onSelect: (result: CommandSearchResult) => void;
};

function formatUpdated(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SearchResult({ result, active, onHighlight, onSelect }: SearchResultProps) {
  const updated = formatUpdated(result.updatedAt);

  return (
    <button
      type="button"
      className={`kxd-cmd-result${active ? " kxd-cmd-result--active" : ""}`}
      onClick={() => onSelect(result)}
      onMouseEnter={() => onHighlight?.(result)}
    >
      <span className="kxd-cmd-result__icon" aria-hidden>
        {result.icon ?? "·"}
      </span>
      <span className="kxd-cmd-result__body">
        <span className="kxd-cmd-result__title">{result.title}</span>
        <span className="kxd-cmd-result__meta">
          {[result.clientName, result.subtitle].filter(Boolean).join(" · ")}
          {updated ? ` · ${updated}` : ""}
        </span>
      </span>
      <span className="kxd-cmd-result__action">{result.actionLabel ?? "Open"}</span>
    </button>
  );
}
