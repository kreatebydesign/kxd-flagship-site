"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerBookingForm } from "./PartnerBookingForm";

type Slot = { start: string; end: string; timezone: string };
type ReferralOption = { id: number; label: string };

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

function confirmationMessage(mode: string | undefined, slot: Slot): string {
  if (mode === "request") {
    return "Booking request sent. KXD will confirm the time shortly.";
  }
  return `Discovery booked for ${formatSlot(slot)} (${slot.timezone}) on the KXD calendar.`;
}

function TimesTimezone({ timezone }: { timezone: string | null }) {
  if (!timezone) return null;
  return <span className="kxd-partner-slots__tz">{timezone}</span>;
}

export function PartnerSlotBookingForm({
  referralId,
  referralOptions,
}: {
  referralId?: number;
  referralOptions?: ReferralOption[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [calendarTimezone, setCalendarTimezone] = useState<string | null>(null);
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
          timezone?: string | null;
          slots?: Slot[];
        };
        if (cancelled) return;
        const nextSlots = data.slots ?? [];
        setCalendarAvailable(Boolean(data.available));
        setCalendarTimezone(
          data.timezone?.trim() || nextSlots[0]?.timezone || null,
        );
        setSlots(nextSlots);
      } catch {
        if (!cancelled) {
          setCalendarAvailable(false);
          setCalendarTimezone(null);
          setSlots([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const referralSelect =
    !referralId && referralOptions?.length ? (
      <div className="kxd-partner-field kxd-partner-field--priority">
        <label htmlFor={calendarAvailable === false ? "fallback-referral" : "referral"}>
          Referral
        </label>
        <select
          id={calendarAvailable === false ? "fallback-referral" : "referral"}
          required={calendarAvailable !== false}
          value={selectedReferralId}
          onChange={(e) =>
            setSelectedReferralId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">Select a referral</option>
          {referralOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ) : null;

  if (calendarAvailable === false) {
    return (
      <div>
        <p className="kxd-partner-section__text" style={{ marginBottom: "1rem" }}>
          Live calendar slots are unavailable right now. Share the best windows
          and KXD will take it from here.
        </p>
        {referralSelect ? (
          <div style={{ marginBottom: "1rem" }}>{referralSelect}</div>
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

  const orderedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const timezone = calendarTimezone || orderedSlots[0]?.timezone || null;
  const chosenSlot = orderedSlots.find((s) => s.start === selectedSlot);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ok || busy) return;
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
      setOk(confirmationMessage(data.mode, slot));
      router.refresh();
    } catch {
      setError("Could not book this slot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="kxd-partner-form" onSubmit={onSubmit}>
      {referralSelect}

      <div className="kxd-partner-field kxd-partner-field--priority">
        {orderedSlots.length === 0 ? (
          <p className="kxd-partner-message">
            No open slots in the next two weeks
            {timezone ? ` (${timezone})` : ""}. Use a booking request instead.
          </p>
        ) : (
          <fieldset className="kxd-partner-slots">
            <legend>
              Available times
              {timezone ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <TimesTimezone timezone={timezone} />
                </>
              ) : null}
            </legend>
            {orderedSlots.map((slot) => (
              <label key={slot.start} className="kxd-partner-slot">
                <input
                  type="radio"
                  name="slot"
                  required
                  value={slot.start}
                  checked={selectedSlot === slot.start}
                  onChange={() => {
                    setSelectedSlot(slot.start);
                    setOk(null);
                  }}
                />
                <span className="kxd-partner-slot__time">{formatSlot(slot)}</span>
              </label>
            ))}
          </fieldset>
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
      {!ok && chosenSlot ? (
        <p className="kxd-partner-message">Selected: {formatSlot(chosenSlot)}</p>
      ) : null}
      {ok ? <p className="kxd-partner-message kxd-partner-message--ok">{ok}</p> : null}

      {!ok ? (
        <button
          className="kxd-partner-btn"
          type="submit"
          disabled={busy || orderedSlots.length === 0}
        >
          {busy ? "Booking…" : "Confirm discovery"}
        </button>
      ) : null}
    </form>
  );
}
