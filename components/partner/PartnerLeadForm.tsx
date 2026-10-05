"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FieldKey =
  | "businessName"
  | "contactName"
  | "contactRole"
  | "phone"
  | "email"
  | "website"
  | "instagramSocial"
  | "industry"
  | "whatTheyWantMoreOf"
  | "visibleProblemOpportunity"
  | "whyNow"
  | "bestTimeForDiscoveryCall"
  | "partnerNotes";

type FieldDef = {
  key: FieldKey;
  label: string;
  required?: boolean;
  textarea?: boolean;
  help?: string;
  priority?: boolean;
};

const SECTIONS: Array<{
  id: string;
  title: string;
  hint: string;
  fields: FieldDef[];
}> = [
  {
    id: "business",
    title: "The business",
    hint: "Who they are and how to reach them.",
    fields: [
      {
        key: "businessName",
        label: "Business name",
        required: true,
        priority: true,
        help: "The company you would introduce — not a vague category.",
      },
      {
        key: "contactName",
        label: "Contact name",
        required: true,
        priority: true,
      },
      { key: "contactRole", label: "Contact role", priority: true },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email", priority: true },
      { key: "website", label: "Website" },
      { key: "instagramSocial", label: "Instagram / social" },
      { key: "industry", label: "Industry" },
    ],
  },
  {
    id: "opportunity",
    title: "The opportunity",
    hint: "What makes this introduction worth KXD’s time.",
    fields: [
      {
        key: "whatTheyWantMoreOf",
        label: "What they want more of",
        textarea: true,
        priority: true,
        help: "Leads, credibility, bookings, clarity — in their words if you have them.",
      },
      {
        key: "visibleProblemOpportunity",
        label: "Visible problem / opportunity",
        textarea: true,
        priority: true,
        help: "What you can see from the outside that is costing them.",
      },
      {
        key: "whyNow",
        label: "Why now",
        textarea: true,
        priority: true,
        help: "Timing is what separates a real lead from a polite maybe.",
      },
    ],
  },
  {
    id: "handoff",
    title: "The handoff",
    hint: "Give KXD a clean runway into discovery.",
    fields: [
      {
        key: "bestTimeForDiscoveryCall",
        label: "Best time for a KXD discovery call",
        textarea: true,
        priority: true,
      },
      {
        key: "partnerNotes",
        label: "Partner notes",
        textarea: true,
        help: "Anything useful from the conversation. Keep it factual.",
      },
    ],
  },
];

const EMPTY = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""])),
) as Record<FieldKey, string>;

function sectionComplete(
  section: (typeof SECTIONS)[number],
  values: Record<FieldKey, string>,
  decisionMakerConfirmed: boolean,
): boolean {
  const requiredOk = section.fields
    .filter((f) => f.required)
    .every((f) => values[f.key].trim().length > 0);
  if (section.id === "handoff") return requiredOk; // decision maker checked at submit
  if (section.id === "opportunity") {
    return (
      values.whatTheyWantMoreOf.trim().length > 0 ||
      values.visibleProblemOpportunity.trim().length > 0 ||
      values.whyNow.trim().length > 0
    );
  }
  void decisionMakerConfirmed;
  return requiredOk;
}

export function PartnerLeadForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [decisionMakerConfirmed, setDecisionMakerConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const progress = useMemo(
    () =>
      SECTIONS.map((section) => ({
        id: section.id,
        title: section.title,
        done: sectionComplete(section, values, decisionMakerConfirmed),
      })),
    [values, decisionMakerConfirmed],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/portal/partner/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, decisionMakerConfirmed }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not submit this lead.");
        return;
      }
      setOk("Lead submitted. KXD will review it from here.");
      setValues(EMPTY);
      setDecisionMakerConfirmed(false);
      router.refresh();
    } catch {
      setError("Could not submit this lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="kxd-partner-form" onSubmit={onSubmit}>
      <div className="kxd-partner-form-progress" aria-label="Form progress">
        {progress.map((step, index) => (
          <span
            key={step.id}
            className="kxd-partner-form-progress__step"
            data-done={step.done ? "true" : "false"}
            data-active={
              !step.done && progress.slice(0, index).every((s) => s.done)
                ? "true"
                : "false"
            }
          >
            {index + 1}. {step.title}
          </span>
        ))}
      </div>

      {SECTIONS.map((section) => (
        <section key={section.id} className="kxd-partner-form-section">
          <h2 className="kxd-partner-form-section__title">{section.title}</h2>
          <p className="kxd-partner-form-section__hint">{section.hint}</p>
          {section.fields.map((field) => (
            <div
              className={`kxd-partner-field${field.priority ? " kxd-partner-field--priority" : ""}`}
              key={field.key}
            >
              <label htmlFor={field.key}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              {field.help ? (
                <p className="kxd-partner-field__help">{field.help}</p>
              ) : null}
              {field.textarea ? (
                <textarea
                  id={field.key}
                  value={values[field.key]}
                  required={field.required}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              ) : (
                <input
                  id={field.key}
                  value={values[field.key]}
                  required={field.required}
                  type={field.key === "email" ? "email" : "text"}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
          {section.id === "handoff" ? (
            <label className="kxd-partner-check">
              <input
                type="checkbox"
                checked={decisionMakerConfirmed}
                onChange={(e) => setDecisionMakerConfirmed(e.target.checked)}
              />
              <span>Decision maker confirmed</span>
            </label>
          ) : null}
        </section>
      ))}

      <div className="kxd-partner-submit-moment">
        <p>
          When you submit, KXD reviews the introduction, owns the close, and keeps
          internal notes private. You stay attributed to the referral.
        </p>
        {error ? (
          <p className="kxd-partner-message kxd-partner-message--error">{error}</p>
        ) : null}
        {ok ? (
          <p className="kxd-partner-message kxd-partner-message--ok">{ok}</p>
        ) : null}
        <button className="kxd-partner-btn kxd-partner-btn--cta" type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit introduction"}
        </button>
      </div>
    </form>
  );
}
