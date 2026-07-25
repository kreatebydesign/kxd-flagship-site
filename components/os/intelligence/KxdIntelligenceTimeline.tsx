"use client";

import { useMemo } from "react";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import type { StaffHelpRequestView } from "@/lib/staff/types";
import { kxdOsCn } from "../utils";
import { KxdIntelligenceMessage } from "./KxdIntelligenceMessage";
import type { KxdIntelligenceTimelineItem } from "./types";

function helpToTimeline(rows: StaffHelpRequestView[]): KxdIntelligenceTimelineItem[] {
  const items: KxdIntelligenceTimelineItem[] = [];
  // Chronological — oldest first. Keep the timeline restrained; History holds the rest.
  const ordered = [...rows]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-6);

  for (const row of ordered) {
    items.push({
      id: `help-q-${row.id}`,
      kind: "employee",
      body: row.question,
      createdAt: row.createdAt,
      helpId: row.id,
      meta: row.workTitle
        ? `Work: ${row.workTitle}${row.clientLabel ? ` · ${row.clientLabel}` : ""}`
        : row.clientLabel
          ? `Client: ${row.clientLabel}`
          : null,
    });

    if (row.intelligenceResponse) {
      items.push({
        id: `help-a-${row.id}`,
        kind: row.responseSource === "ai-assisted" ? "ai-assisted" : "deterministic",
        body: row.intelligenceResponse,
        createdAt: row.answeredAt ?? row.createdAt,
        helpId: row.id,
      });
    }

    if (row.requiresMatt && !row.mattResponse) {
      items.push({
        id: `help-esc-${row.id}`,
        kind: "requires-matt",
        body: "This needs Matt’s judgment. It is in his review queue — keep working on safe next steps while you wait.",
        createdAt: row.answeredAt ?? row.createdAt,
        helpId: row.id,
      });
    }

    if (row.mattResponse) {
      items.push({
        id: `help-matt-${row.id}`,
        kind: "matt",
        body: row.mattResponse,
        createdAt: row.answeredAt ?? row.createdAt,
        helpId: row.id,
        meta: row.status === "resolved" ? "Resolved by Matt" : "Matt responded",
      });
    }
  }

  return items;
}

function guidanceToTimeline(
  guidance: StaffGuidanceResponse | null,
): KxdIntelligenceTimelineItem[] {
  if (!guidance) return [];

  const metaParts = [
    guidance.involveMatt
      ? `Matt involvement: ${guidance.mattReason ?? "Approval or judgment required."}`
      : guidance.warning,
    guidance.evidence.length > 0 ? `Evidence: ${guidance.evidence.join(" · ")}` : null,
  ].filter(Boolean);

  return [
    {
      id: `guidance-${guidance.conciseAnswer.slice(0, 24)}`,
      kind: guidance.involveMatt ? "requires-matt" : "guidance",
      body: [
        guidance.conciseAnswer,
        "",
        `Recommended next step: ${guidance.recommendedNextStep}`,
        guidance.reason ? `\n${guidance.reason}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim(),
      meta: metaParts.length > 0 ? metaParts.join(" · ") : null,
    },
  ];
}

export function KxdIntelligenceTimeline({
  helpRequests,
  sessionMessages,
  lastGuidance,
  className,
}: {
  helpRequests: StaffHelpRequestView[];
  sessionMessages: KxdIntelligenceTimelineItem[];
  lastGuidance: StaffGuidanceResponse | null;
  className?: string;
}) {
  const items = useMemo(() => {
    const fromHelp = helpToTimeline(helpRequests);
    const fromGuidance = guidanceToTimeline(lastGuidance);
    return [...fromHelp, ...sessionMessages, ...fromGuidance];
  }, [helpRequests, sessionMessages, lastGuidance]);

  if (items.length === 0) {
    return (
      <div className={kxdOsCn("kxd-os-intel-workspace__timeline", className)}>
        <p className="kxd-os-intel-workspace__empty">
          Ask a clear question, or choose a guidance prompt below.
        </p>
      </div>
    );
  }

  return (
    <div
      className={kxdOsCn("kxd-os-intel-workspace__timeline", className)}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <KxdIntelligenceMessage key={item.id} item={item} />
      ))}
    </div>
  );
}
