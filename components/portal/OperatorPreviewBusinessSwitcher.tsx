"use client";

import { useId, useRef, useState } from "react";
import type { OperatorPreviewPortfolioOption } from "@/lib/portal/operator-preview/portfolio-options";

type Props = {
  activeClientId: number;
  options: OperatorPreviewPortfolioOption[];
  mode?: "preview" | "staff-test";
};

/**
 * Founder-only Operator Preview switcher. Never shown to real portal users.
 * Posts to the studio operator preview switch route — not portal account switch.
 */
export function OperatorPreviewBusinessSwitcher({
  activeClientId,
  options,
  mode = "preview",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length < 2) return null;

  const active =
    options.find((o) => o.clientId === activeClientId) ?? options[0];

  async function selectClient(clientId: number) {
    if (clientId === activeClientId || pending) {
      setOpen(false);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/portal/preview/switch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Unable to switch preview client.");
      }
      setOpen(false);
      const destination =
        typeof data.redirectTo === "string" && data.redirectTo.startsWith("/portal")
          ? data.redirectTo
          : "/portal";
      window.location.href = destination;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch preview client.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="kxd-ces-account-switcher kxd-ces-account-switcher--preview"
      ref={rootRef}
      data-preview-mode={mode}
    >
      <p className="kxd-operator-portal-preview__switch-label">Preview business</p>
      <button
        type="button"
        className="kxd-ces-account-switcher__trigger kxd-operator-portal-preview__switch-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Preview business: ${active.clientName}. Operator Preview only.`}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="kxd-ces-account-switcher__label" aria-hidden="true">
          Viewing
        </span>
        <span className="kxd-ces-account-switcher__active">{active.clientName}</span>
        <span className="kxd-ces-account-switcher__chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          className="kxd-ces-account-switcher__list"
          role="listbox"
          aria-label="Switch preview business"
        >
          {options.map((option) => {
            const selected = option.clientId === activeClientId;
            return (
              <li key={option.clientId} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`kxd-ces-account-switcher__option${
                    selected ? " kxd-ces-account-switcher__option--active" : ""
                  }`}
                  disabled={pending}
                  onClick={() => void selectClient(option.clientId)}
                >
                  <span className="kxd-ces-account-switcher__option-name">
                    {option.clientName}
                  </span>
                  {selected ? (
                    <span className="kxd-ces-account-switcher__option-meta">Current</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p className="kxd-operator-portal-preview__switch-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="kxd-ces-account-switcher__status" aria-live="polite">
          Switching preview…
        </p>
      ) : null}
    </div>
  );
}
