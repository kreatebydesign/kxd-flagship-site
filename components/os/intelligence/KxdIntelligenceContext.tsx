"use client";

import { KxdButton } from "../KxdButton";
import { kxdOsCn } from "../utils";
import type { KxdIntelligenceSessionState } from "./types";

function pill(label: string | null | undefined): string | null {
  const value = label?.trim();
  return value ? value : null;
}

export function KxdIntelligenceContext({
  session,
  onClearWork,
  className,
}: {
  session: KxdIntelligenceSessionState;
  onClearWork?: () => void;
  className?: string;
}) {
  const pills = [
    pill(session.contextLabel),
    pill(session.workTitle),
    pill(session.clientLabel),
  ].filter((label, index, all): label is string => {
    if (!label) return false;
    return all.findIndex((entry) => entry === label) === index;
  });

  if (pills.length === 0) return null;

  return (
    <div
      className={kxdOsCn("kxd-os-intel-workspace__context", className)}
      aria-label="Current Intelligence context"
    >
      <ul className="kxd-os-intel-workspace__pills">
        {pills.map((label, index) => (
          <li key={`${index}-${label}`} className="kxd-os-intel-workspace__pill">
            {label}
          </li>
        ))}
      </ul>
      {session.workId && onClearWork ? (
        <KxdButton
          type="button"
          variant="ghost"
          size="sm"
          className="kxd-os-intel-workspace__clear-context"
          onClick={onClearWork}
        >
          Clear work context
        </KxdButton>
      ) : null}
    </div>
  );
}
