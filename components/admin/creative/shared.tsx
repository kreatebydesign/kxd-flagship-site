"use client";

/**
 * components/admin/creative/shared.tsx
 *
 * Shared design tokens, primitive components, and structural elements
 * for all KXD Creative Engine internal forms.
 * Matches /admin/operations black/gold aesthetic.
 */

import { useState } from "react";
import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";

// ── Brand tokens ──────────────────────────────────────────────────────────────

export const C = {
  bgPure:      "#050505",
  bgBase:      "#080808",
  bgElevated:  "#111111",
  bgInput:     "#0B0B0B",
  gold:        "#C9A962",
  goldDim:     "rgba(201,169,98,0.55)",
  goldFaint:   "rgba(201,169,98,0.08)",
  cream:       "#F5F1E8",
  creamMuted:  "rgba(245,241,232,0.72)",
  red:         "#d25a5a",
  positive:    "#C9A962",
  border:      "rgba(255,255,255,0.08)",
  borderGold:  "rgba(201,169,98,0.12)",
  borderFocus: "rgba(201,169,98,0.55)",
  serif:       "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:        "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Shared option lists ───────────────────────────────────────────────────────

export const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];

// ── Primitive components ──────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: C.sans, fontWeight: 400, fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem" }}>
      {children}
    </p>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "1.25rem" }}>
      {children}
    </p>
  );
}

export const inputBase: React.CSSProperties = {
  width: "100%",
  fontFamily: C.sans,
  fontSize: "0.875rem",
  color: C.cream,
  background: C.bgInput,
  border: `1px solid rgba(255,255,255,0.07)`,
  padding: "0.75rem 1rem",
  outline: "none",
  borderRadius: 0,
  WebkitAppearance: "none",
  appearance: "none",
};

export function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel>{label}{required && <span style={{ color: C.gold, marginLeft: "0.25rem" }}>*</span>}</FieldLabel>
      <input
        {...props}
        style={{ ...inputBase, border: `1px solid ${focused ? C.borderFocus : C.border}`, transition: "border-color 0.2s", ...props.style }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export function Textarea({ label, required, rows = 4, ...props }: { label: string; required?: boolean; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel>{label}{required && <span style={{ color: C.gold, marginLeft: "0.25rem" }}>*</span>}</FieldLabel>
      <textarea
        {...props}
        rows={rows}
        style={{ ...inputBase, resize: "vertical" as const, lineHeight: 1.6, border: `1px solid ${focused ? C.borderFocus : C.border}`, transition: "border-color 0.2s" }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export function Select({ label, required, children, ...props }: { label: string; required?: boolean; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel>{label}{required && <span style={{ color: C.gold, marginLeft: "0.25rem" }}>*</span>}</FieldLabel>
      <div style={{ position: "relative" as const }}>
        <select
          {...props}
          style={{ ...inputBase, paddingRight: "2.5rem", cursor: "pointer", border: `1px solid ${focused ? C.borderFocus : C.border}`, transition: "border-color 0.2s" }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {children}
        </select>
        <div style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.goldDim, fontSize: "0.625rem" }}>▾</div>
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.75rem" }}>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {children}
      </div>
    </div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

export function SuccessState({
  eyebrow,
  headline,
  detail,
  recordId,
  backHref = "/admin/operations/creative",
  backLabel = "Return to Creative Engine",
  anotherLabel = "Create Another",
  payloadHref,
  onReset,
}: {
  eyebrow: string;
  headline: string;
  detail: string;
  recordId: number;
  backHref?: string;
  backLabel?: string;
  anotherLabel?: string;
  payloadHref?: string;
  onReset: () => void;
}) {
  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader />
      <div className="mx-auto max-w-screen-xl" style={{ padding: "5rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: C.goldFaint, border: `1px solid ${C.borderGold}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5L8.5 15L16 6" stroke="#C5A65C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: C.cream, lineHeight: 1.1, marginBottom: "1rem", letterSpacing: "-0.01em" }}>
          {headline}
        </h1>
        <p style={{ fontFamily: C.sans, fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", maxWidth: "28rem", lineHeight: 1.6, marginBottom: "0.5rem" }}>
          {detail}
        </p>
        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginBottom: "2.5rem" }}>
          Record ID #{recordId}
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href={backHref} style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.bgBase, background: `linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)`, padding: "0.875rem 2rem", textDecoration: "none", display: "inline-block" }}>
            {backLabel}
          </Link>
          <button onClick={onReset} style={{ fontFamily: C.sans, fontWeight: 400, fontSize: "0.5625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.goldDim, background: "transparent", border: `1px solid ${C.borderGold}`, padding: "0.875rem 2rem", cursor: "pointer" }}>
            {anotherLabel}
          </button>
          {payloadHref && (
            <Link href={payloadHref} style={{ fontFamily: C.sans, fontWeight: 400, fontSize: "0.5625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", background: "transparent", border: `1px solid ${C.border}`, padding: "0.875rem 2rem", textDecoration: "none", display: "inline-block" }}>
              View in Payload →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Error bar ─────────────────────────────────────────────────────────────────

export function ErrorBar({ message }: { message: string }) {
  return (
    <div style={{ padding: "0.875rem 1.25rem", background: "rgba(210,90,90,0.08)", border: "1px solid rgba(210,90,90,0.3)" }}>
      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.red }}>{message}</p>
    </div>
  );
}

// ── Submit row ────────────────────────────────────────────────────────────────

export function SubmitRow({
  disabled,
  submitting,
  label,
  loadingLabel = "Creating…",
  backHref = "/admin/operations/creative",
}: {
  disabled: boolean;
  submitting: boolean;
  label: string;
  loadingLabel?: string;
  backHref?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" as const, paddingTop: "0.5rem" }}>
      <Link href={backHref} style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
        ← Creative Engine
      </Link>
      <button
        type="submit"
        disabled={disabled}
        style={{
          fontFamily: C.sans,
          fontWeight: 500,
          fontSize: "0.5625rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.bgBase,
          background: disabled
            ? "rgba(197,166,92,0.3)"
            : "linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)",
          border: "none",
          padding: "0.875rem 2.5rem",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "opacity 0.2s",
          minWidth: "11rem",
        }}
      >
        {submitting ? loadingLabel : label}
      </button>
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────

export function CreativePageHeader({ subTitle }: { subTitle?: string } = {}) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
      <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KxdLogo />
            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.375rem" }}>◆</span>
            <div>
              <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted, lineHeight: 1 }}>
                Creative Engine
              </p>
              {subTitle && (
                <p className="hidden sm:block" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem" }}>
                  {subTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/admin/operations/creative" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
              ← Creative Engine
            </Link>
            <Link href="/admin/operations" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
              Operations
            </Link>
            <Link href="/admin" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.55, textDecoration: "none" }}>
              Payload →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Client + Project + Campaign dropdowns ─────────────────────────────────────

export type ClientOption   = { id: number; name: string };
export type ProjectOption  = { id: number; projectName: string; client: number | null };
export type CampaignOption = { id: number; campaignTitle: string; client: number | null };
