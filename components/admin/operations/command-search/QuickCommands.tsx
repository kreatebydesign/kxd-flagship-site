"use client";

import type { CommandSearchResult } from "@/lib/search";
import { SearchResult } from "./SearchResult";

type QuickCommandsProps = {
  commands: CommandSearchResult[];
  activeId?: string;
  onHighlight?: (result: CommandSearchResult) => void;
  onSelect: (result: CommandSearchResult) => void;
};

export function QuickCommands({ commands, activeId, onHighlight, onSelect }: QuickCommandsProps) {
  if (commands.length === 0) return null;

  return (
    <div className="kxd-cmd-group">
      <p className="kxd-cmd-group__label">Quick Commands</p>
      <div className="kxd-cmd-group__list">
        {commands.map((cmd) => (
          <SearchResult
            key={cmd.id}
            result={cmd}
            active={cmd.id === activeId}
            onHighlight={onHighlight}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
