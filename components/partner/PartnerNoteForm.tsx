"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerNoteForm({ referralId }: { referralId: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal/partner/referrals/${referralId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not add note.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Could not add note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="kxd-partner-form" onSubmit={onSubmit}>
      <div className="kxd-partner-field">
        <label htmlFor="partner-note">Add a follow-up note</label>
        <textarea
          id="partner-note"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened in the conversation, timing, or context for KXD"
        />
      </div>
      {error ? (
        <p className="kxd-partner-message kxd-partner-message--error">{error}</p>
      ) : null}
      <button className="kxd-partner-btn kxd-partner-btn--ghost" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
