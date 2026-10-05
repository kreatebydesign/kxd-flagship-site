"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerBookingForm } from "./PartnerBookingForm";

type Slot = { start: string; end: string; timezone: string };

function formatSlot(slot: Slot): string {
  try {
    const start = new Date(slot.start);
    return start.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: slot.timezone,
    });
  } catch {
    return slot.start;
  }
}

export function PartnerSlotBookingForm({
  referralId,
  referralOptions,
}: {
  referralId?: number;
  referralOptions?: Array<{ id: number; businessName: string }>;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [calendarAvailable, setCalendarAvailable] = useState<boolean | null>(null);
  const [selectedReferralId, setSelectedReferralId] = useState<number | "">(
    referralId ?? "",
  );
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/partner/discovery-slots");
        const data = (await res.json()) as {
          ok?: boolean;
          available?: boolean;
          slots?: Slot[];
        };
        if (cancelled) return;
        setCalendarAvailable(Boolean(data.available));
        setSlots(data.slots ?? []);
      } catch {
        if (!cancelled) {
          setCalendarAvailable(false);
          setSlots([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (calendarAvailable === false) {
    return (
      <div>
        <p className="kxd-partner-section__text" style={{ marginBottom: "1rem" }}>
          Live calendar slots are unavailable right now. Share the best windows
          and KXD will take it from here.
        </p>
        {!referralId && referralOptions?.length ? (
          <div className="kxd-partner-field kxd-partner-field--priority" style={{ marginBottom: "1rem" }}>
            <label htmlFor="fallback-referral">Referral</label>
            <select
              id="fallback-referral"
              value={selectedReferralId}
              onChange={(e) =>
                setSelectedReferralId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Select a referral</option>
              {referralOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.businessName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <PartnerBookingForm
          defaultReferralId={
            typeof selectedReferralId === "number" ? selectedReferralId : referralId
          }
        />
      </div>
    );
  }

  if (calendarAvailable === null) {
    return <p className="kxd-partner-message">Checking available times…</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const referral =
      typeof selectedReferralId === "number"
        ? selectedReferralId
        : Number(selectedReferralId);
    const slot = slots.find((s) => s.start === selectedSlot);
    if (!referral || !slot) {
      setError("Choose a referral and a time slot.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/portal/partner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedPartnerReferralId: referral,
          slotStart: slot.start,
          slotEnd: slot.end,
          timezone: slot.timezone,
          notes,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        mode?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not book this slot.");
        return;
      }
      setOk(
        data.mode === "request"
          ? "Received. KXD will confirm the discovery session shortly."
          : "Discovery session confirmed on the KXD calendar.",
      );
      router.refresh();
    } catch {
      setError("Could not book this slot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="kxd-partner-form" onSubmit={onSubmit}>
      {!referralId && referralOptions?.length ? (
        <div className="kxd-partner-field kxd-partner-field--priority">
          <label htmlFor="referral">Referral *</label>
          <p className="kxd-partner-field__help">
            Associate this session with a specific introduction.
          </p>
          <select
            id="referral"
            required
            value={selectedReferralId}
            onChange={(e) =>
              setSelectedReferralId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Select a referral</option>
            {referralOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.businessName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="kxd-partner-field kxd-partner-field--priority">
        <label htmlFor="slot">Available 30-minute slots *</label>
        {slots.length === 0 ? (
          <p className="kxd-partner-message">
            No open slots in the next two weeks. Use a booking request instead.
          </p>
        ) : (
          <select
            id="slot"
            required
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
          >
            <option value="">Select a time</option>
            {slots.map((slot) => (
              <option key={slot.start} value={slot.start}>
                {formatSlot(slot)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="kxd-partner-field">
        <label htmlFor="slot-notes">Notes</label>
        <textarea
          id="slot-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything KXD should know before the call"
        />
      </div>

      {error ? (
        <p className="kxd-partner-message kxd-partner-message--error">{error}</p>
      ) : null}
      {ok ? <p className="kxd-partner-message kxd-partner-message--ok">{ok}</p> : null}

      <button
        className="kxd-partner-btn kxd-partner-btn--cta"
        type="submit"
        disabled={busy || slots.length === 0}
      >
        {busy ? "Booking…" : "Confirm discovery session"}
      </button>
    </form>
  );
}
