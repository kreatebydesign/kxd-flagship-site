"use client";

import { kxdOsCn } from "../utils";
import { useKxdIntelligenceOptional } from "./KxdIntelligenceProvider";
import { KxdIntelligenceSymbol } from "./KxdIntelligenceSymbol";

export function KxdIntelligenceTrigger({
  className,
  showLabel = true,
  compact = false,
}: {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const intel = useKxdIntelligenceOptional();
  if (!intel) return null;

  const label = showLabel
    ? compact
      ? "Intelligence"
      : "KXD Intelligence"
    : "Open KXD Intelligence";

  return (
    <button
      type="button"
      className={kxdOsCn(
        "kxd-os-intel-trigger",
        intel.open && "kxd-os-intel-trigger--active",
        intel.hasAttention && "kxd-os-intel-trigger--attention",
        className,
      )}
      aria-expanded={intel.open}
      aria-controls="kxd-intelligence-workspace"
      aria-label={
        intel.hasAttention
          ? `${label} — ${intel.requiresMattCount} require Matt`
          : label
      }
      title="KXD Intelligence (⌘⇧I)"
      onClick={() => intel.toggle()}
    >
      <KxdIntelligenceSymbol className="kxd-os-intel-trigger__symbol" />
      {showLabel ? (
        <span className="kxd-os-intel-trigger__label">
          {compact ? "Intelligence" : "KXD Intelligence"}
        </span>
      ) : (
        <span className="kxd-os-intel-trigger__sr-only">KXD Intelligence</span>
      )}
      {intel.hasAttention ? (
        <span className="kxd-os-intel-trigger__dot" aria-hidden="true" />
      ) : null}
    </button>
  );
}
