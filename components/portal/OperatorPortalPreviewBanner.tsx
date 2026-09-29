"use client";

import { useState } from "react";

export function OperatorPortalPreviewBanner({
  clientId,
  clientName,
  mode = "preview",
  asPortalUserDisplayName = null,
}: {
  clientId: number;
  clientName: string;
  mode?: "preview" | "staff-test";
  asPortalUserDisplayName?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isStaffTest = mode === "staff-test";
  const subjectName = asPortalUserDisplayName?.trim() || null;

  async function exitPreview() {
    const res = await fetch("/api/portal/preview/exit", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      redirectTo?: string;
    };
    window.location.href =
      data.redirectTo ||
      (subjectName
        ? "/admin/operations/portal-access"
        : "/admin/operations/client-command");
  }

  async function toggleStaffTest(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/portal/preview/staff-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Couldn't update Staff Test Mode.");
        setBusy(false);
        return;
      }
      window.location.href = data.redirectTo || "/portal";
    } catch {
      setError("Couldn't update Staff Test Mode.");
      setBusy(false);
    }
  }

  const title = isStaffTest
    ? subjectName
      ? `Staff Test Mode — Viewing portal as ${subjectName}`
      : `Staff Test Mode · ${clientName}`
    : subjectName
      ? `Operator Preview — Viewing portal as ${subjectName}`
      : `Operator Preview · ${clientName}`;

  return (
    <div
      className={`kxd-operator-portal-preview${isStaffTest ? " kxd-operator-portal-preview--staff-test" : ""}`}
      role="status"
      data-client-id={clientId}
    >
      <div className="kxd-operator-portal-preview__copy">
        <p className="kxd-operator-portal-preview__eyebrow">KXD OS</p>
        <p className="kxd-operator-portal-preview__title">{title}</p>
        <p className="kxd-operator-portal-preview__note">
          {isStaffTest
            ? "Writable Website Review testing. Submissions are attributed to KXD staff — not a client login."
            : subjectName
              ? `Read-only studio preview of ${subjectName}'s authorized portal. Not a client login.`
              : "Read-only studio preview. Not a client login."}
          {subjectName ? ` Active account: ${clientName}.` : ""}
        </p>
        {error ? (
          <p className="kxd-operator-portal-preview__switch-error">{error}</p>
        ) : null}
      </div>
      <div className="kxd-operator-portal-preview__actions">
        {isStaffTest ? (
          <button
            type="button"
            className="kxd-operator-portal-preview__exit"
            disabled={busy}
            onClick={() => void toggleStaffTest(false)}
          >
            Return to read-only
          </button>
        ) : (
          <button
            type="button"
            className="kxd-operator-portal-preview__exit"
            disabled={busy}
            onClick={() => void toggleStaffTest(true)}
          >
            Enable Staff Test Mode
          </button>
        )}
        <button
          type="button"
          className="kxd-operator-portal-preview__exit"
          disabled={busy}
          onClick={() => void exitPreview()}
        >
          Exit Preview
        </button>
      </div>
    </div>
  );
}
