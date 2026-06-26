"use client";

import { useState, type ChangeEvent } from "react";

const STEPS = [
  { number: "01", title: "Tell us about your business", subtitle: "The brand, company, or idea we may be building around." },
  { number: "02", title: "Who is leading the project?", subtitle: "The person we should work with directly." },
  { number: "03", title: "What are you hoping to build?", subtitle: "Select the areas where KXD can create the most value." },
  { number: "04", title: "Where do you want to be?", subtitle: "Help us understand the bigger business outcome." },
  { number: "05", title: "What level of investment are you considering?", subtitle: "This helps us recommend the right path forward." },
  { number: "06", title: "When would you like to begin?", subtitle: "Timing helps us understand urgency and fit." },
  { number: "07", title: "What do you already have?", subtitle: "Existing assets help us understand the starting point." },
  { number: "08", title: "How did you find KXD?", subtitle: "A little context helps us understand the connection." },
  { number: "09", title: "Anything else we should know?", subtitle: "Final context, references, or details that matter." },
] as const;

const TOTAL = STEPS.length;

const SERVICE_OPTIONS = [
  "Premium Website Experience",
  "Brand Systems & Identity",
  "Growth Infrastructure",
  "Operating System / Client Portal",
  "CRM & Email Infrastructure",
  "Ongoing Strategic Partnership",
];

const DECISION_MAKER_OPTIONS = [
  { value: "yes", label: "Yes, I am the primary decision maker" },
  { value: "team", label: "I am part of the decision-making team" },
  { value: "no", label: "No, I am gathering information" },
];

const INVESTMENT_OPTIONS = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-10k", label: "$5,000 – $10,000" },
  { value: "10k-25k", label: "$10,000 – $25,000" },
  { value: "25k-50k", label: "$25,000 – $50,000" },
  { value: "50k-100k", label: "$50,000 – $100,000" },
  { value: "100k-plus", label: "$100,000+" },
  { value: "not-determined", label: "Not yet determined" },
];

const TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediately" },
  { value: "within-30-days", label: "Within 30 days" },
  { value: "60-90-days", label: "Within 60–90 days" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "exploring", label: "Exploring options" },
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

const REFERRAL_OPTIONS = [
  { value: "google-search", label: "Google Search" },
  { value: "referral", label: "Referral" },
  { value: "social-media", label: "Social Media" },
  { value: "existing-client", label: "Existing Client" },
  { value: "networking-event", label: "Networking Event" },
  { value: "portfolio", label: "Previous Work / Portfolio" },
  { value: "other", label: "Other" },
];

interface FormData {
  companyName: string;
  websiteUrl: string;
  contactName: string;
  email: string;
  phone: string;
  decisionMaker: string;
  servicesInterested: string[];
  businessGoals: string;
  investmentRange: string;
  timeline: string;
  assetsAvailable: string[];
  referralSource: string;
  notes: string;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

const EMPTY: FormData = {
  companyName: "",
  websiteUrl: "",
  contactName: "",
  email: "",
  phone: "",
  decisionMaker: "",
  servicesInterested: [],
  businessGoals: "",
  investmentRange: "",
  timeline: "",
  assetsAvailable: [],
  referralSource: "",
  notes: "",
};

const inputCls = "kxd-field w-full";
const labelCls = "kxd-label mb-2 block";

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
          <span aria-hidden className="ml-1 text-[var(--kxd-gold)]">
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
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center gap-4 rounded-[10px] px-4 py-3 text-left transition"
      style={{
        background: checked
          ? "rgba(255,255,255,0.065)"
          : "rgba(255,255,255,0.025)",
        boxShadow: checked
          ? "inset 0 0 0 1px rgba(255,255,255,0.11)"
          : "inset 0 0 0 1px rgba(255,255,255,0.055)",
      }}
    >
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px]"
        style={{
          background: checked ? "var(--kxd-gold)" : "rgba(255,255,255,0.055)",
          color: checked ? "#111" : "transparent",
        }}
      >
        ✓
      </span>
      <span
        className="font-sans font-normal"
        style={{
          fontSize: "0.95rem",
          color: checked ? "var(--kxd-cream)" : "var(--kxd-cream-muted)",
        }}
      >
        {label}
      </span>
    </button>
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
      className="group flex w-full items-center gap-4 rounded-[12px] px-5 py-4 text-left transition"
      style={{
        background: selected
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.025)",
        boxShadow: selected
          ? "inset 0 0 0 1px rgba(255,255,255,0.13)"
          : "inset 0 0 0 1px rgba(255,255,255,0.055)",
      }}
    >
      <span
        aria-hidden
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{
          boxShadow: selected
            ? "inset 0 0 0 5px var(--kxd-gold)"
            : "inset 0 0 0 1px rgba(255,255,255,0.22)",
        }}
      />
      <span
        className="font-sans font-normal"
        style={{
          fontSize: "0.95rem",
          color: selected ? "var(--kxd-cream)" : "var(--kxd-cream-muted)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function ProgressBar({ step }: { step: number }) {
  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-6">
        <p className="font-sans text-sm font-medium text-[var(--kxd-cream)]">
          Partnership Application
        </p>
        <p className="font-sans text-sm text-[var(--kxd-cream-muted)]">
          Step {step + 1} of {TOTAL}
        </p>
      </div>

      <div
        className="h-[3px] overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.78), var(--kxd-gold))",
          }}
        />
      </div>
    </div>
  );
}

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

  function toggleMulti(key: "servicesInterested" | "assetsAvailable", value: string) {
    setData((prev) => {
      const arr = prev[key];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];

      return { ...prev, [key]: next };
    });
    setValidationError("");
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

      if (!res.ok) {
        throw new Error(json.error ?? "Submission failed");
      }

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

  if (submitState === "success") {
    return (
      <div
        className="flex min-h-[32rem] flex-col items-center justify-center rounded-[18px] p-10 text-center lg:p-16"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 70px rgba(0,0,0,0.28)",
        }}
      >
        <p className="kxd-eyebrow">Application received</p>
        <h3
          className="mx-auto mt-5 font-sans font-medium"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.15rem)",
            color: "var(--kxd-cream)",
            maxWidth: "28rem",
            letterSpacing: "-0.03em",
          }}
        >
          We&rsquo;ll review your application and reach out directly.
        </h3>
        <p
          className="mx-auto mt-5 font-sans font-normal"
          style={{
            fontSize: "0.95rem",
            lineHeight: 1.75,
            color: "var(--kxd-cream-muted)",
            maxWidth: "28rem",
          }}
        >
          Every application is reviewed personally. If it&rsquo;s the right fit,
          you&rsquo;ll hear from us within 2 business days.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitState("idle");
            setStep(0);
            setData(EMPTY);
          }}
          className="mt-10 font-sans text-sm font-medium text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
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
      className="overflow-hidden rounded-[20px]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.032))",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), 0 26px 80px rgba(0,0,0,0.30)",
      }}
    >
      <div
        style={{
          padding: "clamp(2rem,4vw,3rem) clamp(1.75rem,4vw,3rem)",
        }}
      >
        <ProgressBar step={step} />

        <p className="mb-3 font-sans text-sm font-medium text-[var(--kxd-cream-muted)]">
          {current.number}
        </p>

        <h2
          className="font-sans font-medium"
          style={{
            fontSize: "clamp(1.55rem, 2.75vw, 2.15rem)",
            lineHeight: 1.12,
            color: "var(--kxd-cream)",
            letterSpacing: "-0.035em",
          }}
        >
          {current.title}
        </h2>

        <p
          className="mt-3 font-sans font-normal"
          style={{
            fontSize: "0.98rem",
            color: "var(--kxd-cream-muted)",
            lineHeight: 1.65,
            maxWidth: "34rem",
          }}
        >
          {current.subtitle}
        </p>
      </div>

      <div
        style={{
          padding: "0 clamp(1.75rem,4vw,3rem) clamp(2rem,4vw,3rem)",
        }}
      >
        {step === 0 && (
          <div className="space-y-5">
            <TextField
              label="Company name"
              name="companyName"
              value={data.companyName}
              onChange={(v) => patch({ companyName: v })}
              placeholder="Your brand or company name"
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

        {step === 1 && (
          <div className="space-y-5">
            <TextField
              label="Full name"
              name="contactName"
              value={data.contactName}
              onChange={(v) => patch({ contactName: v })}
              placeholder="Your full name"
              required
              autoComplete="name"
            />
            <TextField
              label="Email address"
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

            <div className="pt-2">
              <p className={labelCls}>Are you the primary decision maker?</p>
              <div className="space-y-2">
                {DECISION_MAKER_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    label={opt.label}
                    value={opt.value}
                    selected={data.decisionMaker === opt.value}
                    onSelect={(v) => patch({ decisionMaker: v })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-4 font-sans text-sm text-[var(--kxd-cream-muted)]">
              Select all that apply.
            </p>
            <div className="space-y-2">
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

        {step === 3 && (
          <div>
            <label className={labelCls} htmlFor="businessGoals">
              Business goals
            </label>
            <textarea
              id="businessGoals"
              value={data.businessGoals}
              onChange={(e) => patch({ businessGoals: e.target.value })}
              rows={7}
              className="kxd-field w-full resize-none"
              placeholder="What are you building? What should success look like 12 months from now?"
            />
          </div>
        )}

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

        {step === 6 && (
          <div>
            <p className="mb-4 font-sans text-sm text-[var(--kxd-cream-muted)]">
              Select all that apply.
            </p>
            <div className="space-y-2">
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

        {step === 7 && (
          <div className="space-y-2">
            {REFERRAL_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={data.referralSource === opt.value}
                onSelect={(v) => patch({ referralSource: v })}
              />
            ))}
          </div>
        )}

        {step === 8 && (
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
              placeholder="References you admire, constraints we should know about, context that did not fit elsewhere..."
            />
          </div>
        )}

        {validationError && (
          <p className="mt-6 text-sm text-red-300" role="alert">
            {validationError}
          </p>
        )}

        {submitState === "error" && submitError && (
          <p className="mt-6 text-sm text-red-300" role="alert">
            {submitError}
          </p>
        )}

        <div
          className="mt-10 flex items-center justify-between gap-5 pt-8"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || submitState === "submitting"}
            className="font-sans text-sm font-medium text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)] disabled:pointer-events-none disabled:opacity-30"
          >
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitState === "submitting"}
              className="kxd-btn-primary"
            >
              {submitState === "submitting" ? "Submitting..." : "Request Partnership"}
            </button>
          ) : (
            <button type="button" onClick={handleNext} className="kxd-btn-primary">
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}