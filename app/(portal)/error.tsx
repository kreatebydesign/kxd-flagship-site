"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KXD Portal] Unhandled error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="kxd-ces-app" style={{ minHeight: "100dvh", padding: "2.5rem 1.25rem" }}>
      <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
        <p className="kxd-ces-eyebrow" style={{ marginBottom: "0.75rem" }}>
          {PORTAL_CLIENT_LANGUAGE.workspaceLabel}
        </p>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Something went wrong
        </h1>
        <p style={{ opacity: 0.78, marginBottom: "1.5rem", lineHeight: 1.55 }}>
          We couldn&apos;t load this page just now. Your work is safe — try again,
          or return to your workspace home.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <button type="button" className="kxd-ces-btn kxd-ces-btn--primary" onClick={reset}>
            Try again
          </button>
          <Link href="/portal" className="kxd-ces-btn kxd-ces-btn--ghost">
            Back to workspace
          </Link>
        </div>
        {error.digest ? (
          <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", opacity: 0.45 }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
