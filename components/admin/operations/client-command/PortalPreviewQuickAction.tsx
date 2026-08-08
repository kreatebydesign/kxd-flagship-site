"use client";

import { useState } from "react";

export function PortalPreviewQuickAction({
  clientId,
  label = "Preview Portal",
  draftComposition,
}: {
  clientId: number;
  label?: string;
  draftComposition?: {
    modules: string[];
    branding?: Record<string, string | undefined>;
  };
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
        body: JSON.stringify({
          clientId,
          ...(draftComposition ? { draftComposition } : {}),
        }),
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
    <div className="kxd-os-command-workspace__action-wrap">
      <button
        type="button"
        className="kxd-os-command-workspace__action"
        disabled={loading}
        onClick={() => void startPreview()}
      >
        {loading ? "Opening…" : label}
      </button>
      {error ? (
        <p className="kxd-os-command-workspace__action-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
