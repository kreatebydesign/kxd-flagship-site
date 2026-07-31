"use client";

import { useState, type CSSProperties, type FocusEvent } from "react";
import {
  centsToEditableDollars,
  dollarsToCents,
  formatCents,
} from "@/lib/proposal-builder/money";

const defaultStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--kxd-os-line, #e2d8c8)",
  background: "var(--kxd-os-paper, #fffdf8)",
  borderRadius: 2,
  padding: "0.65rem 0.75rem",
  font: "inherit",
};

/**
 * Professional currency field for Proposal Builder.
 * Displays formatted USD when idle; free typing while focused.
 * Commits via integer cents — never divides whole dollars by 100 twice.
 */
export function ProposalCurrencyInput({
  cents,
  onCentsChange,
  disabled,
  id,
  style,
  "aria-label": ariaLabel,
}: {
  cents: number;
  onCentsChange: (cents: number) => void;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const next = dollarsToCents(raw);
    onCentsChange(next);
    setDraft(centsToEditableDollars(next));
  }

  function onBlur(e: FocusEvent<HTMLInputElement>) {
    setFocused(false);
    commit(e.target.value);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ ...defaultStyle, ...style }}
      value={focused ? draft : formatCents(cents)}
      onFocus={() => {
        setFocused(true);
        setDraft(centsToEditableDollars(cents));
      }}
      onBlur={onBlur}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
