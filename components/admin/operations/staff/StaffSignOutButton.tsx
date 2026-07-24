"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KxdButton } from "@/components/os";

/**
 * Permanent staff Sign out — destroys Payload session, then login.
 * Distinct from Exit preview.
 */
export function StaffSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Sign out failed. Try again.");
      }
      // Hard navigation so Back cannot restore authenticated RSC payload.
      window.location.replace(payload.redirectTo ?? "/admin/login");
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed. Try again.");
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="kxd-os-sidebar__sign-out">
      <KxdButton
        type="button"
        variant="ghost"
        size="sm"
        loading={busy}
        onClick={signOut}
        aria-label="Sign out"
        className="kxd-os-sidebar__sign-out-btn"
      >
        Sign out
      </KxdButton>
      {error ? (
        <p
          className="kxd-os-meta"
          role="alert"
          style={{ marginTop: "0.35rem", color: "var(--kxd-os-critical)" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
