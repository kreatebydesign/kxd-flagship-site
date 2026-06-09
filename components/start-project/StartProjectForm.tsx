"use client";

import { useState, type ChangeEvent } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { number: "01", title: "Company Information", subtitle: "Tell us about your brand." },
  { number: "02", title: "Primary Contact", subtitle: "Who should we reach out to?" },
  { number: "03", title: "Services Needed", subtitle: "What are you looking to build?" },
  { number: "04", title: "Business Goals", subtitle: "What does success look like?" },
  { number: "05", title: "Investment Range", subtitle: "What range are you working within?" },
  { number: "06", title: "Desired Timeline", subtitle: "When are you looking to start?" },
  { number: "07", title: "Existing Assets", subtitle: "What do you already have?" },
  { number: "08", title: "Additional Notes", subtitle: "Anything else we should know?" },
] as const;

const TOTAL = STEPS.length;

const SERVICE_OPTIONS = [
  "Luxury Website Experience",
  "Brand Systems & Identity",
  "Growth Infrastructure",
  "Enterprise Platform / Operations System",
  "CRM & Email Infrastructure",
  "Ongoing Partnership",
];

const INVESTMENT_OPTIONS = [
  { value: "under-10k", label: "Under $10,000" },
  { value: "10k-25k", label: "$10,000 – $25,000" },
  { value: "25k-50k", label: "$25,000 – $50,000" },
  { value: "50k-100k", label: "$50,000 – $100,000" },
  { value: "100k-plus", label: "$100,000+" },
  { value: "not-determined", label: "Not yet determined" },
];

const TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediately" },
  { value: "within-30-days", label: "Within 30 Days" },
  { value: "60-90-days", label: "Within 60–90 Days" },
  { value: "3-6-months", label: "3–6 Months" },
  { value: "exploring", label: "Exploring Options" },
];

const ASSET_OPTIONS = [
  "Brand guidelines",
  "Existing logo",
  "Website copy / content",
  "Photography or video",
  "Domain registered",
  "Existing website",
  "None of the above",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  companyName: string;
  websiteUrl: string;
  contactName: string;
  email: string;
  phone: string;
  servicesInterested: string[];
  businessGoals: string;
  investmentRange: string;
  timeline: string;
  assetsAvailable: string[];
  notes: string;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

const EMPTY: FormData = {
  companyName: "",
  websiteUrl: "",
  contactName: "",
  email: "",
  phone: "",
  servicesInterested: [],
  businessGoals: "",
  investmentRange: "",
  timeline: "",
  assetsAvailable: [],
  notes: "",
};

// ── Shared style helpers ──────────────────────────────────────────────────────

const inputCls =
  "kxd-field w-full";

const labelCls =
  "kxd-label mb-2 block";

// ── Sub-components ────────────────────────────────────────────────────────────

function TextField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={name}>
        {label}
        {required && (
          <span aria-hidden className="ml-1" style={{ color: "var(--kxd-gold)", opacity: 0.7 }}>
            *
          </span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={inputCls}
      />
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-4 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex h-5 w-5 shrink-0 items-center justify-center border transition-colors"
        style={{
          borderColor: checked ? "var(--kxd-gold)" : "rgba(255,255,255,0.12)",
          background: checked ? "rgba(197,166,92,0.08)" : "rgba(255,255,255,0.02)",
        }}
      >
        {checked && (
          <span aria-hidden style={{ fontSize: "0.375rem", color: "var(--kxd-gold)" }}>
            ◆
          </span>
        )}
      </button>
      <span
        className="font-sans font-light transition-colors"
        style={{
          fontSize: "clamp(0.9375rem, 1.2vw, 1rem)",
          color: checked ? "var(--kxd-cream)" : "var(--kxd-cream-muted)",
          letterSpacing: "0.005em",
        }}
      >
        {label}
      </span>
    </label>
  );
}

function RadioOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="group flex w-full items-center gap-4 border px-5 py-4 text-left transition-colors"
      style={{
        borderColor: selected ? "var(--kxd-border-gold-strong)" : "var(--kxd-border-white)",
        background: selected ? "rgba(197,166,92,0.05)" : "rgba(255,255,255,0.015)",
      }}
    >
      <div
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors"
        style={{
          borderColor: selected ? "var(--kxd-gold)" : "rgba(255,255,255,0.18)",
        }}
      >
        {selected && (
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--kxd-gold)" }}
          />
        )}
      </div>
      <span
        className="font-sans font-light"
        style={{
          fontSize: "clamp(0.875rem, 1.15vw, 1rem)",
          color: selected ? "var(--kxd-cream)" : "var(--kxd-cream-muted)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-10">
      {/* Dots */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              style={{
                width: i === step ? "20px" : "6px",
                height: "2px",
                background:
                  i < step
                    ? "rgba(197,166,92,0.45)"
                    : i === step
                      ? "var(--kxd-gold)"
                      : "rgba(255,255,255,0.1)",
                transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                borderRadius: "1px",
              }}
            />
          </div>
        ))}
      </div>
      {/* Step label */}
      <p
        className="mt-4 font-sans uppercase"
        style={{
          fontSize: "0.5rem",
          letterSpacing: "var(--tracking-label)",
          color: "var(--kxd-cream-muted)",
          opacity: 0.55,
        }}
      >
        Step {step + 1} of {TOTAL}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StartProjectForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [validationError, setValidationError] = useState("");

  function patch(updates: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...updates }));
    setValidationError("");
  }

  function toggleMulti(
    key: "servicesInterested" | "assetsAvailable",
    value: string,
  ) {
    setData((prev) => {
      const arr = prev[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }

  function validate(): boolean {
    if (step === 0 && !data.companyName.trim()) {
      setValidationError("Company name is required.");
      return false;
    }
    if (step === 1) {
      if (!data.contactName.trim()) {
        setValidationError("Contact name is required.");
        return false;
      }
      if (!data.email.trim() || !data.email.includes("@")) {
        setValidationError("A valid email address is required.");
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, TOTAL - 1));
    setValidationError("");
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
    setValidationError("");
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitState("submitting");
    setSubmitError("");
    try {
      const res = await fetch("/api/project-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setSubmitState("success");
    } catch (err) {
      setSubmitState("error");
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Email matt@kreatebydesign.com directly.",
      );
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitState === "success") {
    return (
      <div
        className="flex min-h-[32rem] flex-col items-center justify-center p-10 text-center lg:p-16"
        style={{
          background: "var(--kxd-black-elevated)",
          border: "1px solid var(--kxd-border-white)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: "2.5rem",
            height: "1px",
            background: "linear-gradient(to right, transparent, var(--kxd-gold), transparent)",
            marginBottom: "2rem",
          }}
        />
        <p className="kxd-eyebrow">Application Received</p>
        <h3
          className="mx-auto mt-5 font-serif font-light"
          style={{ fontSize: "clamp(1.625rem, 3vw, 2rem)", color: "var(--kxd-cream)", maxWidth: "26rem" }}
        >
          We&rsquo;ll review your application and reach out directly.
        </h3>
        <p
          className="mx-auto mt-5 font-sans font-light"
          style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: "var(--kxd-cream-muted)", maxWidth: "28rem" }}
        >
          Every application is reviewed personally. If it&rsquo;s the right fit,
          you&rsquo;ll hear from us within 2 business days.
        </p>
        <button
          type="button"
          onClick={() => { setSubmitState("idle"); setStep(0); setData(EMPTY); }}
          className="mt-10 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
        >
          Submit another application
        </button>
      </div>
    );
  }

  const current = STEPS[step];
  const isLastStep = step === TOTAL - 1;

  return (
    <div
      style={{
        background: "var(--kxd-black-elevated)",
        border: "1px solid var(--kxd-border-white)",
      }}
    >
      {/* ── Progress + header ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "clamp(2rem,4vw,2.75rem) clamp(1.75rem,4vw,2.75rem)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <ProgressBar step={step} />
        <p
          className="font-serif font-light"
          style={{
            fontSize: "clamp(0.6875rem, 1vw, 0.75rem)",
            letterSpacing: "0.06em",
            color: "var(--kxd-gold)",
            opacity: 0.65,
            marginBottom: "0.75rem",
          }}
        >
          {current.number}
        </p>
        <h2
          className="font-serif font-light"
          style={{
            fontSize: "clamp(1.5rem, 2.75vw, 2rem)",
            lineHeight: 1.15,
            color: "var(--kxd-cream)",
          }}
        >
          {current.title}
        </h2>
        <p
          className="mt-2 font-serif font-light italic"
          style={{
            fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
            color: "var(--kxd-cream-muted)",
          }}
        >
          {current.subtitle}
        </p>
      </div>

      {/* ── Step content ──────────────────────────────────────────────────── */}
      <div style={{ padding: "clamp(1.75rem,4vw,2.75rem)" }}>

        {/* Step 1 — Company Information */}
        {step === 0 && (
          <div className="space-y-5">
            <TextField
              label="Company Name"
              name="companyName"
              value={data.companyName}
              onChange={(v) => patch({ companyName: v })}
              placeholder="Your brand or studio name"
              required
              autoComplete="organization"
            />
            <TextField
              label="Website URL"
              name="websiteUrl"
              type="url"
              value={data.websiteUrl}
              onChange={(v) => patch({ websiteUrl: v })}
              placeholder="https://yourbrand.com"
              autoComplete="url"
            />
          </div>
        )}

        {/* Step 2 — Primary Contact */}
        {step === 1 && (
          <div className="space-y-5">
            <TextField
              label="Full Name"
              name="contactName"
              value={data.contactName}
              onChange={(v) => patch({ contactName: v })}
              placeholder="Your full name"
              required
              autoComplete="name"
            />
            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={data.email}
              onChange={(v) => patch({ email: v })}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
            <TextField
              label="Phone"
              name="phone"
              type="tel"
              value={data.phone}
              onChange={(v) => patch({ phone: v })}
              placeholder="+1 (555) 000-0000"
              autoComplete="tel"
            />
          </div>
        )}

        {/* Step 3 — Services Needed */}
        {step === 2 && (
          <div>
            <p
              className="mb-1 font-sans uppercase"
              style={{ fontSize: "0.5rem", letterSpacing: "var(--tracking-label)", color: "var(--kxd-cream-muted)", opacity: 0.5 }}
            >
              Select all that apply
            </p>
            <div
              className="mt-1 divide-y"
              style={{ borderColor: "var(--kxd-border-white)" }}
            >
              {SERVICE_OPTIONS.map((svc) => (
                <CheckOption
                  key={svc}
                  label={svc}
                  checked={data.servicesInterested.includes(svc)}
                  onChange={() => toggleMulti("servicesInterested", svc)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Business Goals */}
        {step === 3 && (
          <div>
            <label className={labelCls} htmlFor="businessGoals">
              Business Goals
            </label>
            <textarea
              id="businessGoals"
              value={data.businessGoals}
              onChange={(e) => patch({ businessGoals: e.target.value })}
              rows={7}
              className="kxd-field w-full resize-none"
              placeholder="What are you building? What does success look like 12 months from now?"
            />
          </div>
        )}

        {/* Step 5 — Investment Range */}
        {step === 4 && (
          <div className="space-y-2">
            {INVESTMENT_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={data.investmentRange === opt.value}
                onSelect={(v) => patch({ investmentRange: v })}
              />
            ))}
          </div>
        )}

        {/* Step 6 — Desired Timeline */}
        {step === 5 && (
          <div className="space-y-2">
            {TIMELINE_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={data.timeline === opt.value}
                onSelect={(v) => patch({ timeline: v })}
              />
            ))}
          </div>
        )}

        {/* Step 7 — Existing Assets */}
        {step === 6 && (
          <div>
            <p
              className="mb-1 font-sans uppercase"
              style={{ fontSize: "0.5rem", letterSpacing: "var(--tracking-label)", color: "var(--kxd-cream-muted)", opacity: 0.5 }}
            >
              Select all that apply
            </p>
            <div
              className="mt-1 divide-y"
              style={{ borderColor: "var(--kxd-border-white)" }}
            >
              {ASSET_OPTIONS.map((asset) => (
                <CheckOption
                  key={asset}
                  label={asset}
                  checked={data.assetsAvailable.includes(asset)}
                  onChange={() => toggleMulti("assetsAvailable", asset)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 8 — Additional Notes */}
        {step === 7 && (
          <div>
            <label className={labelCls} htmlFor="notes">
              Anything else we should know?
            </label>
            <textarea
              id="notes"
              value={data.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={7}
              className="kxd-field w-full resize-none"
              placeholder="References you admire, constraints we should know about, context that didn't fit elsewhere..."
            />
          </div>
        )}

        {/* ── Validation error ──────────────────────────────────────────────── */}
        {validationError && (
          <p
            className="mt-4 font-sans text-sm"
            role="alert"
            style={{ color: "#d45c5c" }}
          >
            {validationError}
          </p>
        )}
        {submitState === "error" && submitError && (
          <p
            className="mt-4 font-sans text-sm"
            role="alert"
            style={{ color: "#d45c5c" }}
          >
            {submitError}
          </p>
        )}

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="font-sans uppercase transition-colors"
              style={{
                fontSize: "0.625rem",
                letterSpacing: "var(--tracking-button)",
                color: "var(--kxd-cream-muted)",
              }}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitState === "submitting"}
              className="kxd-btn-primary disabled:opacity-60"
            >
              {submitState === "submitting" ? "Submitting…" : "Submit Application"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="kxd-btn-primary"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
