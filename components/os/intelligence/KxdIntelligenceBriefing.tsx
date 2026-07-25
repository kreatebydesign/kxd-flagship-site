"use client";

import { KxdButton } from "../KxdButton";
import { KxdIntelligenceBadge } from "../KxdIntelligence";
import { kxdOsCn } from "../utils";
import { KxdIntelligenceSymbol } from "./KxdIntelligenceSymbol";

export function KxdIntelligenceBriefing({
  observation,
  recommendedAction,
  requiresMattCount = 0,
  onOpen,
  className,
}: {
  observation: string;
  recommendedAction: string;
  requiresMattCount?: number;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <section
      className={kxdOsCn("kxd-os-intel-briefing", className)}
      aria-label="KXD Intelligence briefing"
    >
      <div className="kxd-os-intel-briefing__row">
        <div className="kxd-os-intel-briefing__identity">
          <KxdIntelligenceSymbol />
          <p className="kxd-os-intel-mark">KXD Intelligence</p>
          {requiresMattCount > 0 ? (
            <KxdIntelligenceBadge source="escalation" requiresMatt>
              {requiresMattCount === 1
                ? "1 requires Matt"
                : `${requiresMattCount} require Matt`}
            </KxdIntelligenceBadge>
          ) : null}
        </div>
        <KxdButton
          type="button"
          variant="intelligence"
          size="sm"
          className="kxd-os-intel-briefing__cta-btn"
          onClick={onOpen}
        >
          Open Intelligence
        </KxdButton>
      </div>

      <p className="kxd-os-intel-briefing__observation">{observation}</p>

      <p className="kxd-os-intel-briefing__action">
        <span className="kxd-os-intel-briefing__eyebrow">Recommended</span>
        {recommendedAction}
      </p>
    </section>
  );
}
