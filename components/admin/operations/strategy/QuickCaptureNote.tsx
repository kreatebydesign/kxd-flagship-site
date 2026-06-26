"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

/**
 * Global quick capture — available across KXD OS.
 * Keyboard: ⌘ + Shift + N (architecture only — listener registered here).
 */
export function QuickCaptureNote({ defaultClientId }: { defaultClientId?: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ? String(defaultClientId) : "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/executive-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: Number(clientId),
          title: title.trim(),
          summary: summary.trim() || undefined,
          noteType: "strategy",
        }),
      });
      if (res.ok) {
        setDone(true);
        setTitle("");
        setSummary("");
        setTimeout(() => {
          setOpen(false);
          setDone(false);
        }, 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
        onClick={toggle}
        data-kxd-quick-capture
      >
        New Note
      </button>

      {open ? (
        <div
          className="kxd-os-card"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            width: "min(22rem, calc(100vw - 2rem))",
            zIndex: 50,
            padding: "1.25rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          }}
          role="dialog"
          aria-label="Quick capture executive note"
        >
          <p className="kxd-os-section__label">Executive Note</p>
          <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
            ⌘ + Shift + N
          </p>
          {done ? (
            <p className="kxd-os-body">Saved to Strategy Vault.</p>
          ) : (
            <form onSubmit={submit} className="kxd-os-form-stack">
              <input
                className="kxd-os-input"
                placeholder="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
              <input
                className="kxd-os-input"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
              <textarea
                className="kxd-os-input"
                placeholder="Summary (optional)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
              />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="submit" className="kxd-os-btn" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" className="kxd-os-btn kxd-os-btn--ghost" onClick={toggle}>
                  Cancel
                </button>
                <Link href="/admin/operations/strategy" className="kxd-os-link-quiet">
                  Open vault →
                </Link>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </>
  );
}
