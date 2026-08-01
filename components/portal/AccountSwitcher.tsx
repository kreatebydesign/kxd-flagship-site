"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const active =
    model.accounts.find((a) => a.clientId === model.activeClientId) ??
    model.accounts[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!active || model.accounts.length < 2) return null;

  function selectedAccountIndex() {
    return Math.max(
      0,
      model.accounts.findIndex((a) => a.clientId === model.activeClientId),
    );
  }

  function openList() {
    const index = selectedAccountIndex();
    setActiveIndex(index);
    setOpen(true);
    window.requestAnimationFrame(() => {
      optionRefs.current[index]?.focus();
    });
  }

  function closeList() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  async function selectAccount(clientId: number) {
    if (clientId === model.activeClientId || pending) {
      closeList();
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
      triggerRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  function moveActive(delta: number) {
    const next =
      (activeIndex + delta + model.accounts.length) % model.accounts.length;
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  }

  return (
    <div className="kxd-ces-account-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="kxd-ces-account-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Account: ${active.clientName}. Switch authorized account.`}
        disabled={pending}
        onClick={() => {
          if (open) {
            closeList();
          } else {
            openList();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeList();
          }
          if (
            (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") &&
            !open
          ) {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span className="kxd-ces-account-switcher__label" aria-hidden="true">
          Account
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
          aria-label="Switch account"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeList();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              moveActive(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveActive(-1);
            } else if (event.key === "Home") {
              event.preventDefault();
              setActiveIndex(0);
              optionRefs.current[0]?.focus();
            } else if (event.key === "End") {
              event.preventDefault();
              const last = model.accounts.length - 1;
              setActiveIndex(last);
              optionRefs.current[last]?.focus();
            }
          }}
        >
          {model.accounts.map((account, index) => {
            const selected = account.clientId === model.activeClientId;
            return (
              <li key={account.clientId} role="presentation">
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`kxd-ces-account-switcher__option${
                    selected ? " kxd-ces-account-switcher__option--active" : ""
                  }`}
                  disabled={pending}
                  onClick={() => void selectAccount(account.clientId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void selectAccount(account.clientId);
                    }
                  }}
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
