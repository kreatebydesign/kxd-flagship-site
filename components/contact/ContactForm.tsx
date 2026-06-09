"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

type FormState = "idle" | "submitting" | "success" | "error";

const PROJECT_TYPES = [
  { value: "luxury-website-experiences", label: "Luxury Website Experience" },
  { value: "brand-systems-identity",     label: "Brand Systems & Identity" },
  { value: "growth-infrastructure",      label: "Growth Infrastructure" },
  { value: "enterprise-platforms",       label: "Enterprise Platforms" },
  { value: "ongoing-partnership",        label: "Ongoing Partnership" },
  { value: "general",                    label: "Unsure — Let's discuss" },
] as const;

const INVESTMENT_RANGES = [
  { value: "under-5k",  label: "Under $5,000" },
  { value: "5k-10k",    label: "$5,000 – $10,000" },
  { value: "10k-25k",   label: "$10,000 – $25,000" },
  { value: "25k-50k",   label: "$25,000 – $50,000" },
  { value: "50k-plus",  label: "$50,000+" },
] as const;

const TIMELINE_OPTIONS = [
  { value: "immediate",      label: "Immediately" },
  { value: "within-30-days", label: "Within 30 Days" },
  { value: "60-90-days",     label: "Within 60–90 Days" },
  { value: "exploring",      label: "Exploring Options" },
] as const;

const REFERRAL_OPTIONS = [
  { value: "referral",     label: "Referral or word of mouth" },
  { value: "google",       label: "Google Search" },
  { value: "instagram",    label: "Instagram" },
  { value: "linkedin",     label: "LinkedIn" },
  { value: "portfolio",    label: "Saw KXD's portfolio work" },
  { value: "other",        label: "Other" },
] as const;

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
          name:        data.get("name"),
          email:       data.get("email"),
          company:     data.get("company"),
          website:     data.get("website"),
          inquiryType: data.get("projectType"),
          budget:      data.get("investmentRange"),
          timeline:    data.get("timeline"),
          message:     data.get("projectGoals"),
          referral:    data.get("referral"),
          source:      "project-application",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");

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
      <div
        className="kxd-luxury-form p-10 text-center lg:p-14"
        style={{ minHeight: "24rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      >
        <div
          aria-hidden
          className="mx-auto mb-8"
          style={{
            width: "2.5rem",
            height: "1px",
            background: "linear-gradient(to right, transparent, var(--kxd-gold), transparent)",
          }}
        />
        <p className="kxd-eyebrow">Application Received</p>
        <h3 className="mt-5 font-serif text-[1.875rem] font-light text-white">
          We&rsquo;ll review and respond directly.
        </h3>
        <p
          className="mx-auto mt-5 font-sans font-light leading-[1.7]"
          style={{ maxWidth: "26rem", fontSize: "0.9375rem", color: "var(--foreground-muted)" }}
        >
          Every application is reviewed personally. If it&rsquo;s the right fit,
          we&rsquo;ll reach out within 2 business days to map the next step.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-10 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
        >
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="kxd-luxury-form p-8 lg:p-10" noValidate>
      {/* Section label */}
      <p className="kxd-label mb-8">Project Application</p>

      {/* ── Row 1: Identity ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" name="name" required placeholder="Your name" />
        <Field label="Company" name="company" placeholder="Brand or studio name" />
      </div>

      {/* ── Row 2: Contact ── */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" required placeholder="your@email.com" />
        <Field label="Website" name="website" type="url" placeholder="https://yourbrand.com" />
      </div>

      {/* ── Divider ── */}
      <div
        aria-hidden
        className="my-8"
        style={{
          height: "1px",
          background: "linear-gradient(to right, transparent, var(--kxd-border-white-strong) 20%, var(--kxd-border-white-strong) 80%, transparent)",
        }}
      />

      {/* ── Row 3: Project scope ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Project Type" name="projectType" required>
          <option value="">Select type</option>
          {PROJECT_TYPES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </SelectField>
        <SelectField label="Estimated Investment Range" name="investmentRange">
          <option value="">Select range</option>
          {INVESTMENT_RANGES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </SelectField>
      </div>

      <div className="mt-5">
        <SelectField label="Estimated Timeline" name="timeline">
          <option value="">Select timeline</option>
          {TIMELINE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </SelectField>
      </div>

      {/* ── Project Goals ── */}
      <div className="mt-5">
        <label className="kxd-label mb-2 block" htmlFor="projectGoals">
          Project Goals
        </label>
        <textarea
          id="projectGoals"
          name="projectGoals"
          required
          rows={5}
          className="kxd-field resize-none"
          placeholder="What are you building? What does success look like?"
        />
      </div>

      {/* ── Referral ── */}
      <div className="mt-5">
        <SelectField label="How did you hear about KXD?" name="referral">
          <option value="">Select source</option>
          {REFERRAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </SelectField>
      </div>

      {/* ── Error ── */}
      {state === "error" && error ? (
        <p className="mt-5 text-[0.875rem] text-[#d45c5c]" role="alert">{error}</p>
      ) : null}

      {/* ── Submit ── */}
      <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={state === "submitting"}
          className="kxd-btn-primary disabled:opacity-60 sm:w-auto"
        >
          {state === "submitting" ? "Submitting…" : "Submit Application"}
        </button>
        <p
          className="font-sans font-light"
          style={{ fontSize: "0.6875rem", letterSpacing: "0.05em", color: "var(--foreground-subtle)" }}
        >
          Reviewed personally within 2 business days.
        </p>
      </div>

      <p
        className="mt-8"
        style={{ fontSize: "0.5625rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-sans)" }}
      >
        {SITE.location} · {SITE.email}
      </p>
    </form>
  );
}

function Field({
  label, name, type = "text", required, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="kxd-label mb-2 block" htmlFor={name}>
        {label}{required ? <span aria-hidden className="ml-1" style={{ color: "var(--kxd-gold)", opacity: 0.7 }}>*</span> : null}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        placeholder={placeholder}
        className="kxd-field"
      />
    </div>
  );
}

function SelectField({
  label, name, required, children,
}: {
  label: string; name: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="kxd-label mb-2 block" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} required={required} className="kxd-field kxd-field-select">
        {children}
      </select>
    </div>
  );
}
