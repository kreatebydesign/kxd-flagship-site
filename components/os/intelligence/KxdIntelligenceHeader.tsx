"use client";

import { KxdButton } from "../KxdButton";
import { kxdOsCn } from "../utils";
import { KxdIntelligenceSymbol } from "./KxdIntelligenceSymbol";

export function KxdIntelligenceHeader({
  contextLabel,
  assistantNameSlot,
  historyOpen,
  onToggleHistory,
  onClose,
  className,
}: {
  contextLabel: string;
  /** Extension point — e.g. future "Nova · Powered by KXD Intelligence". */
  assistantNameSlot?: string | null;
  historyOpen?: boolean;
  onToggleHistory?: () => void;
  onClose: () => void;
  className?: string;
}) {
  return (
    <header className={kxdOsCn("kxd-os-intel-workspace__header", className)}>
      <div className="kxd-os-intel-workspace__identity">
        <div className="kxd-os-intel-workspace__mark-row">
          <KxdIntelligenceSymbol />
          <p className="kxd-os-intel-mark">KXD Intelligence</p>
        </div>
        {assistantNameSlot ? (
          <p className="kxd-os-intel-workspace__assistant">{assistantNameSlot}</p>
        ) : null}
        <p className="kxd-os-intel-workspace__context-label">{contextLabel}</p>
      </div>
      <div className="kxd-os-intel-workspace__header-actions">
        {onToggleHistory ? (
          <KxdButton
            type="button"
            variant="ghost"
            size="sm"
            className="kxd-os-intel-workspace__history-btn"
            aria-expanded={historyOpen}
            onClick={onToggleHistory}
          >
            {historyOpen ? "Hide history" : "History"}
          </KxdButton>
        ) : null}
        <KxdButton
          type="button"
          variant="ghost"
          size="sm"
          className="kxd-os-intel-workspace__close"
          aria-label="Close KXD Intelligence"
          onClick={onClose}
        >
          Close
        </KxdButton>
      </div>
    </header>
  );
}
