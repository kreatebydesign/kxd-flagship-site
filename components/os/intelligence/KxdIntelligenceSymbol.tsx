import { kxdOsCn } from "../utils";

/**
 * Proprietary KXD Intelligence mark — signal axis + focal node.
 * Not a chat bubble; used on trigger, briefing, and workspace chrome.
 */
export function KxdIntelligenceSymbol({
  className,
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={kxdOsCn("kxd-os-intel-symbol", className)}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        {/* Outer lens */}
        <circle
          cx="7"
          cy="7"
          r="5.35"
          stroke="currentColor"
          strokeWidth="1.15"
          opacity="0.55"
        />
        {/* Vertical signal axis */}
        <path
          d="M7 2.1v9.8"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Focal intelligence node */}
        <circle cx="7" cy="7" r="1.55" fill="currentColor" />
        {/* Lateral pulse ticks */}
        <path
          d="M3.15 7h1.55M9.3 7h1.55"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}
