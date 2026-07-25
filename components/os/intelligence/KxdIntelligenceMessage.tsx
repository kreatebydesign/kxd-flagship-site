"use client";

import { KxdIntelligenceBadge } from "../KxdIntelligence";
import { kxdOsCn } from "../utils";
import type { KxdIntelligenceTimelineItem } from "./types";

function badgeFor(kind: KxdIntelligenceTimelineItem["kind"]) {
  switch (kind) {
    case "employee":
      return { source: "none" as const, label: "You", role: "user" as const };
    case "deterministic":
    case "guidance":
      return {
        source: "deterministic" as const,
        label: "KXD Intelligence",
        role: "intelligence" as const,
      };
    case "ai-assisted":
      return {
        source: "ai-assisted" as const,
        label: "AI-assisted",
        role: "intelligence" as const,
      };
    case "requires-matt":
      return {
        source: "escalation" as const,
        label: "Requires Matt",
        requiresMatt: true,
        role: "escalation" as const,
      };
    case "matt":
      return { source: "matt" as const, label: "Matt", role: "matt" as const };
    case "system":
      return { source: "none" as const, label: "Notice", role: "system" as const };
    default:
      return {
        source: "none" as const,
        label: "KXD Intelligence",
        role: "intelligence" as const,
      };
  }
}

export function KxdIntelligenceMessage({
  item,
  className,
}: {
  item: KxdIntelligenceTimelineItem;
  className?: string;
}) {
  const badge = badgeFor(item.kind);

  return (
    <article
      className={kxdOsCn(
        "kxd-os-intel-message",
        `kxd-os-intel-message--${item.kind}`,
        `kxd-os-intel-message--role-${badge.role}`,
        className,
      )}
    >
      <div className="kxd-os-intel-message__meta">
        <KxdIntelligenceBadge
          source={badge.source}
          requiresMatt={badge.requiresMatt}
          className={badge.role === "user" ? "kxd-os-intel-badge--user" : undefined}
        >
          {badge.label}
        </KxdIntelligenceBadge>
        {item.createdAt ? (
          <time className="kxd-os-intel-message__time" dateTime={item.createdAt}>
            {new Date(item.createdAt).toLocaleString()}
          </time>
        ) : null}
      </div>
      <div className="kxd-os-intel-message__body">
        {item.body.split("\n").map((line, index) =>
          line.trim().length === 0 ? (
            <br key={`${item.id}-${index}`} />
          ) : (
            <p key={`${item.id}-${index}`}>{line}</p>
          ),
        )}
      </div>
      {item.meta ? <p className="kxd-os-intel-message__note">{item.meta}</p> : null}
    </article>
  );
}
