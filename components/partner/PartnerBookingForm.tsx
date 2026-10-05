"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerBookingForm({
  defaultReferralId,
}: {
  defaultReferralId?: number;
}) {
  const router = useRouter();
  const [preferredTimes, setPreferredTimes] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ok || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/portal/partner/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredTimes,
          notes,
          relatedPartnerReferralId: defaultReferralId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not submit this request.");
        return;
      }
      setOk("Booking request sent. KXD will confirm the time shortly.");
      setPreferredTimes("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Could not submit this request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="kxd-partner-form" onSubmit={onSubmit}>
      <p className="kxd-partner-section__text" style={{ marginBottom: "0.35rem" }}>
        Share the best windows and KXD will take it from here.
      </p>
      <div className="kxd-partner-field kxd-partner-field--priority">
        <label htmlFor="preferredTimes">Preferred times *</label>
        <p className="kxd-partner-field__help">
          Days, time windows, and timezone that work for the prospect.
        </p>
        <textarea
          id="preferredTimes"
          required
          value={preferredTimes}
          onChange={(e) => setPreferredTimes(e.target.value)}
          placeholder="Tue / Thu mornings PT, or next Wednesday afternoon"
        />
      </div>
      <div className="kxd-partner-field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything KXD should know before the call"
        />
      </div>
      {error ? <p className="kxd-partner-message kxd-partner-message--error">{error}</p> : null}
      {ok ? <p className="kxd-partner-message kxd-partner-message--ok">{ok}</p> : null}
      {!ok ? (
        <button className="kxd-partner-btn" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Request discovery session"}
        </button>
      ) : null}
    </form>
  );
}
