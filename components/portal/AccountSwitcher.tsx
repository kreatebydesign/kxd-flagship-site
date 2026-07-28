"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { PortalAccountSwitcherModel } from "@/lib/portal/account-context-types";

type Props = {
  model: PortalAccountSwitcherModel;
};

/**
 * Premium account switcher — renders only when the server provides a multi-account model.
 * Selection posts to the authenticated switch route; never authorizes from the browser.
 */
export function AccountSwitcher({ model }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active =
    model.accounts.find((a) => a.clientId === model.activeClientId) ??
    model.accounts[0];

  if (!active || model.accounts.length < 2) return null;

  async function selectAccount(clientId: number) {
    if (clientId === model.activeClientId || pending) {
      setOpen(false);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/account/switch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          returnTo: pathname?.startsWith("/portal") ? pathname : "/portal",
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        unavailable?: boolean;
        redirectTo?: string;
      };
      if (res.status === 503 || json.unavailable) {
        throw new Error(
          json.error ?? "Account switching is temporarily unavailable.",
        );
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Unable to switch accounts.");
      }
      setOpen(false);
      const destination =
        typeof json.redirectTo === "string" && json.redirectTo.startsWith("/portal")
          ? json.redirectTo
          : "/portal";
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch accounts.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kxd-ces-account-switcher" ref={rootRef}>
      <button
        type="button"
        className="kxd-ces-account-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="kxd-ces-account-switcher__label">Account</span>
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
          aria-label="Switch account"
        >
          {model.accounts.map((account) => {
            const selected = account.clientId === model.activeClientId;
            return (
              <li key={account.clientId} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`kxd-ces-account-switcher__option${
                    selected ? " kxd-ces-account-switcher__option--active" : ""
                  }`}
                  disabled={pending}
                  onClick={() => void selectAccount(account.clientId)}
                >
                  <span className="kxd-ces-account-switcher__option-name">
                    {account.clientName}
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
        <p className="kxd-ces-account-switcher__error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="kxd-ces-account-switcher__status" aria-live="polite">
          Switching account…
        </p>
      ) : null}
    </div>
  );
}
