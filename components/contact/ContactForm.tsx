"use client";

import { useState } from "react";
import {
  BUDGET_OPTIONS,
  SERVICE_OPTIONS,
  SITE,
  TIMELINE_OPTIONS,
} from "@/lib/site";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          phone: data.get("phone"),
          inquiryType: data.get("inquiryType"),
          budget: data.get("budget"),
          timeline: data.get("timeline"),
          message: data.get("message"),
          source: "contact-page",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Submission failed");
      }

      setState("success");
      form.reset();
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Email matt@kreatebydesign.com directly.",
      );
    }
  }

  if (state === "success") {
    return (
      <div className="kxd-luxury-form p-10 text-center lg:p-14">
        <p className="kxd-eyebrow">Received</p>
        <h3 className="mt-5 font-serif text-[1.875rem] text-white">
          We&rsquo;ll review and respond.
        </h3>
        <p className="mt-5 text-[0.9375rem] leading-[1.7] text-[var(--foreground-muted)]">
          Your inquiry is in. If it&rsquo;s the right fit, we&rsquo;ll map the next move.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="kxd-button-label mt-10 text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="kxd-luxury-form p-8 lg:p-10">
      <p className="kxd-label mb-8">Project Inquiry</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Company" name="company" />
        <Field label="Phone" name="phone" type="tel" />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <SelectField label="Service Interest" name="inquiryType" required>
          {SERVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Budget" name="budget">
          <option value="">Select range</option>
          {BUDGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-5">
        <SelectField label="Timeline" name="timeline">
          <option value="">Select timeline</option>
          {TIMELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-5">
        <label className="kxd-label mb-2 block" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="kxd-field resize-none"
          placeholder="What are you building?"
        />
      </div>

      {state === "error" && error ? (
        <p className="mt-5 text-[0.875rem] text-[#d45c5c]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="kxd-btn-primary kxd-button-label mt-8 w-full gap-2 px-10 py-4 disabled:opacity-60 sm:w-auto"
      >
        {state === "submitting" ? "Sending..." : "Submit Inquiry"}
      </button>

      <p className="mt-8 text-[0.6875rem] tracking-[0.06em] text-white/30">
        {SITE.location} · {SITE.email}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="kxd-label mb-2 block" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="kxd-field"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="kxd-label mb-2 block" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="kxd-field kxd-field-select"
      >
        {children}
      </select>
    </div>
  );
}
