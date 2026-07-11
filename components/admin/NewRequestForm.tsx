"use client";

/**
 * NewRequestForm — KXD OS internal client request intake.
 * Matches /admin/operations aesthetic: hardcoded KXD hex tokens, self-contained.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { KxdOsLogo } from "@/components/os";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientOption   = { id: number; name: string };
export type ProjectOption  = { id: number; projectName: string; client: number | null };

interface Props {
  clients:  ClientOption[];
  projects: ProjectOption[];
}

// ── Brand tokens ──────────────────────────────────────────────────────────────

const C = {
  bgPure:     "#1a1b1d",
  bgBase:     "#1f2022",
  bgElevated: "#27282a",
  bgInput:    "#27282a",
  gold:       "#c2aa72",
  goldDim:    "rgba(194,170,114,0.55)",
  goldFaint:  "rgba(255,255,255,0.05)",
  cream:      "#f5f6f8",
  creamMuted: "rgba(245,246,248,0.74)",
  red:        "#e07070",
  green:      "#6fbf8f",
  border:     "rgba(255,255,255,0.06)",
  borderGold: "rgba(194,170,114,0.16)",
  borderFocus:"rgba(245,246,248,0.18)",
  serif:      "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:       "-apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-outfit, 'Helvetica Neue'), Arial, sans-serif",
} as const;

// ── Select options ────────────────────────────────────────────────────────────

const REQUEST_TYPES = [
  { value: "",          label: "Select type…" },
  { value: "update",    label: "Update" },
  { value: "bug",       label: "Bug Fix" },
  { value: "design",    label: "Design" },
  { value: "content",   label: "Content" },
  { value: "seo",       label: "SEO" },
  { value: "strategy",  label: "Strategy" },
  { value: "billing",   label: "Billing" },
  { value: "access",    label: "Access" },
  { value: "other",     label: "Other" },
];

const PRIORITIES = [
  { value: "low",    label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];

// ── Primitive components ──────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: C.sans, fontWeight: 400, fontSize: "0.6875rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem" }}>
      {children}
    </p>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  fontFamily: C.sans,
  fontSize: "0.875rem",
  color: C.cream,
  background: C.bgInput,
  border: `1px solid ${C.border}`,
  padding: "0.75rem 1rem",
  outline: "none",
  borderRadius: 0,
  WebkitAppearance: "none",
  appearance: "none",
};

function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
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

function Textarea({ label, required, rows = 4, ...props }: { label: string; required?: boolean; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel>{label}{required && <span style={{ color: C.gold, marginLeft: "0.25rem" }}>*</span>}</FieldLabel>
      <textarea
        {...props}
        rows={rows}
        style={{ ...inputBase, resize: "vertical" as const, lineHeight: 1.6, border: `1px solid ${focused ? C.borderFocus : C.border}`, transition: "border-color 0.2s" }}
        onFocus={() => setFocused(false)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

function Select({ label, required, children, ...props }: { label: string; required?: boolean; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
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
        {/* chevron */}
        <div style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.goldDim, fontSize: "0.625rem" }}>
          ▾
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function NewRequestForm({ clients, projects }: Props) {
  const [form, setForm] = useState({
    client:           "",
    relatedProject:   "",
    requestTitle:     "",
    requestType:      "",
    priority:         "normal",
    requestedBy:      "",
    requestedByEmail: "",
    requestDetails:   "",
    internalNotes:    "",
    dueDate:          "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState<{ id: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  // Filter projects to selected client
  const filteredProjects = useMemo(() => {
    if (!form.client) return projects;
    const cid = Number(form.client);
    return projects.filter(p => p.client === cid);
  }, [form.client, projects]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      // Reset project when client changes
      if (field === "client") setForm(prev => ({ ...prev, client: e.target.value, relatedProject: "" }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/client-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setSubmitted({ id: data.id });
      }
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({ client: "", relatedProject: "", requestTitle: "", requestType: "", priority: "normal", requestedBy: "", requestedByEmail: "", requestDetails: "", internalNotes: "", dueDate: "" });
    setSubmitted(null);
    setError(null);
  }

  // ── Success state ───────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
        <PageHeader />
        <div className="mx-auto max-w-screen-xl" style={{ padding: "5rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {/* Gold circle icon */}
          <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: C.goldFaint, border: `1px solid ${C.borderGold}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10.5L8.5 15L16 6" stroke="#C9A962" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.18em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
            Request Created
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: C.cream, lineHeight: 1.1, marginBottom: "1rem", letterSpacing: "-0.01em" }}>
            Request logged.
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", maxWidth: "28rem", lineHeight: 1.6, marginBottom: "0.5rem" }}>
            The client request has been created in Payload and is now visible in the Operations Suite.
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginBottom: "2.5rem" }}>
            Record ID #{submitted.id}
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/admin/operations" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.bgBase, background: `linear-gradient(180deg, #d1b06b 0%, #c9a962 48%, #b09040 100%)`, padding: "0.875rem 2rem", textDecoration: "none", display: "inline-block" }}>
              Return to Dashboard
            </Link>
            <button onClick={resetForm} style={{ fontFamily: C.sans, fontWeight: 400, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.goldDim, background: "transparent", border: `1px solid ${C.borderGold}`, padding: "0.875rem 2rem", cursor: "pointer" }}>
              Log Another Request
            </button>
            <Link href="/admin/collections/client-requests" style={{ fontFamily: C.sans, fontWeight: 400, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", background: "transparent", border: `1px solid ${C.border}`, padding: "0.875rem 2rem", textDecoration: "none", display: "inline-block" }}>
              View in Payload →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <PageHeader />

      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* Page title */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>
            KXD OS · New Request
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
            Log a Client Request
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem" }}>
            Creates a new record in the Client Requests collection. All fields except Client and Request Title are optional.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            {/* ── Section 1: Client + Project ─────────────────────────── */}
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.75rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "1.25rem" }}>
                Client & Project
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select label="Client" required value={form.client} onChange={set("client")}>
                  <option value="">Select client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                  {clients.length === 0 && (
                    <option disabled>No clients found — seed clients first</option>
                  )}
                </Select>

                <Select label="Related Project (optional)" value={form.relatedProject} onChange={set("relatedProject")}>
                  <option value="">No project / not applicable</option>
                  {filteredProjects.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.projectName}</option>
                  ))}
                  {form.client && filteredProjects.length === 0 && (
                    <option disabled>No projects for this client yet</option>
                  )}
                </Select>
              </div>
            </div>

            {/* ── Section 2: Request Details ────────────────────────── */}
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.75rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "1.25rem" }}>
                Request Details
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <Input
                  label="Request Title"
                  required
                  type="text"
                  placeholder="Brief description of what's needed…"
                  value={form.requestTitle}
                  onChange={set("requestTitle")}
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Select label="Request Type" value={form.requestType} onChange={set("requestType")}>
                    {REQUEST_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>

                  <Select label="Priority" value={form.priority} onChange={set("priority")}>
                    {PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>

                <Textarea
                  label="Request Details"
                  rows={5}
                  placeholder="Full description of the request, context, relevant links, or anything the team needs to know…"
                  value={form.requestDetails}
                  onChange={set("requestDetails")}
                />
              </div>
            </div>

            {/* ── Section 3: Requester + Timing ─────────────────────── */}
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.75rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "1.25rem" }}>
                Requester & Timing
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Input
                  label="Requested By"
                  type="text"
                  placeholder="Name of requester"
                  value={form.requestedBy}
                  onChange={set("requestedBy")}
                />
                <Input
                  label="Requester Email"
                  type="email"
                  placeholder="email@example.com"
                  value={form.requestedByEmail}
                  onChange={set("requestedByEmail")}
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={form.dueDate}
                  onChange={set("dueDate")}
                />
              </div>
            </div>

            {/* ── Section 4: Internal Notes ─────────────────────────── */}
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.75rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "1.25rem" }}>
                Internal Notes
              </p>
              <Textarea
                label="Internal Notes"
                rows={4}
                placeholder="Triage notes, scope comments, decisions, anything internal — not visible to clients."
                value={form.internalNotes}
                onChange={set("internalNotes")}
              />
            </div>

            {/* ── Error ─────────────────────────────────────────────── */}
            {error && (
              <div style={{ padding: "0.875rem 1.25rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(210,90,90,0.3)" }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "#d25a5a" }}>
                  {error}
                </p>
              </div>
            )}

            {/* ── Submit row ─────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" as const, paddingTop: "0.5rem" }}>
              <Link href="/admin/operations" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
                ← Back to Dashboard
              </Link>

              <button
                type="submit"
                disabled={submitting || !form.client || !form.requestTitle.trim()}
                style={{
                  fontFamily: C.sans,
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: C.bgBase,
                  background: submitting || !form.client || !form.requestTitle.trim()
                    ? "rgba(201,169,98,0.3)"
                    : "linear-gradient(180deg, #d1b06b 0%, #c9a962 48%, #b09040 100%)",
                  border: "none",
                  padding: "0.875rem 2.5rem",
                  cursor: submitting || !form.client || !form.requestTitle.trim() ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s",
                  minWidth: "11rem",
                }}
              >
                {submitting ? "Creating…" : "Create Request"}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared header (matches /admin/operations) ─────────────────────────────────

function PageHeader() {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
      <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KxdOsLogo className="flex items-center" />

            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.6875rem" }}>◆</span>

            <div>
              <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted, lineHeight: 1 }}>
                Operations
              </p>
              <p className="hidden sm:block" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem" }}>
                New Client Request
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/admin/operations" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
              ← Operations
            </Link>
            <Link href="/admin" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.55, textDecoration: "none" }}>
              Payload CMS →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
