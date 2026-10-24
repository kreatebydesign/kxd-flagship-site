"use client";

import { useState, type CSSProperties, type FocusEvent } from "react";
import {
  centsToEditableDollars,
  dollarsToCents,
  formatCents,
} from "@/lib/proposal-builder/money";

const defaultStyle: CSSProperties = {
  width: "100%",
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
  className,
  "aria-label": ariaLabel,
}: {
  cents: number;
  onCentsChange: (cents: number) => void;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
  className?: string;
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
      className={["kxd-os-input", className].filter(Boolean).join(" ")}
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
