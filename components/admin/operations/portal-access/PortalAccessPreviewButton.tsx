"use client";

import { useState } from "react";

/**
 * Portal Access — start membership-scoped operator portal preview for a user.
 * Does not activate the user or claim invitations.
 */
export function PortalAccessPreviewButton({
  portalUserId,
  label = "Preview Client Portal",
  disabled = false,
}: {
  portalUserId: number;
  label?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/portal/preview/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portalUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not start portal preview.");
      }
      window.location.href = data.redirectTo || "/portal";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start portal preview.");
      setLoading(false);
    }
  }

  return (
    <span className="kxd-os-portal-access__preview-wrap">
      <button
        type="button"
        className="kxd-os-btn kxd-os-btn--secondary kxd-os-portal-access__toggle"
        disabled={disabled || loading}
        onClick={() => void startPreview()}
      >
        {loading ? "Opening…" : label}
      </button>
      {error ? (
        <span className="kxd-os-portal-access__preview-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
