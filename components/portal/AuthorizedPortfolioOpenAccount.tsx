"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  clientId: number;
  clientName: string;
  isActive: boolean;
};

/**
 * Opens an authorized account workspace via the server switch route.
 * Never treats the clientId as authorization — the API revalidates membership.
 */
export function AuthorizedPortfolioOpenAccount({
  clientId,
  clientName,
  isActive,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openWorkspace() {
    if (pending) return;
    if (isActive) {
      router.push("/portal");
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
          returnTo: "/portal",
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
        throw new Error(json.error ?? "Unable to open that account.");
      }
      const destination =
        typeof json.redirectTo === "string" && json.redirectTo.startsWith("/portal")
          ? json.redirectTo
          : "/portal";
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open that account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kxd-portal-portfolio__action">
      <button
        type="button"
        className="kxd-os-link-quiet"
        disabled={pending}
        onClick={() => void openWorkspace()}
        aria-label={
          isActive
            ? `Open ${clientName} workspace`
            : `Switch to ${clientName} and open workspace`
        }
      >
        {pending ? "Opening…" : isActive ? "Open workspace" : "Switch & open"}
      </button>
      {error ? (
        <p className="kxd-portal-portfolio__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
