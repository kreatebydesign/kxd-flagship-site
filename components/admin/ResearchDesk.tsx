"use client";

/**
 * ResearchDesk — KXD OS Lead Research Desk intake + queue
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KxdOsLogo } from "@/components/os";
import {
  RESEARCH_GRADES,
  RESEARCH_GRADE_COLOR,
  RESEARCH_LEAD_SOURCES,
  RESEARCH_REJECT_REASONS,
  RESEARCH_REJECT_REASON_LABEL,
  RESEARCH_RESEARCHERS,
  RESEARCH_SERVICES,
  RESEARCH_STATUSES,
  RESEARCH_SERVICE_LABEL,
  RESEARCH_STATUS_COLOR,
  RESEARCH_STATUS_LABEL,
} from "@/lib/research-leads";

const C = {
  bgPure: "#1a1b1d",
  bgBase: "#1f2022",
  bgElevated: "#27282a",
  bgInput: "#27282a",
  gold: "#c2aa72",
  goldDim: "rgba(194,170,114,0.55)",
  goldFaint: "rgba(255,255,255,0.05)",
  cream: "#f5f6f8",
  creamMuted: "rgba(245,246,248,0.74)",
  red: "#e07070",
  green: "#6fbf8f",
  border: "rgba(255,255,255,0.06)",
  borderGold: "rgba(194,170,114,0.16)",
  borderFocus: "rgba(245,246,248,0.18)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-outfit, 'Helvetica Neue'), Arial, sans-serif",
} as const;

const NAV_LINKS = [
  ["/admin/operations/today", "Today"],
  ["/admin/sales", "Sales"],
  ["/admin/operations/research", "Research"],
  ["/admin/operations/audits", "Audits"],
  ["/admin/operations/onboarding", "Onboarding"],
] as const;


export type ResearchLeadRow = {
  id: number;
  researcherName: string;
  source: string;
  state: string | null;
  city: string | null;
  businessName: string | null;
  opportunityUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  leadUrl: string | null;
  estimatedService: string | null;
  status: string;
  grade: string | null;
  rejectReason: string | null;
  qualificationEvidence: string | null;
  createdAt: string;
  ageLabel: string;
  promotedSalesLeadId: number | null;
  promotedAt: string | null;
};

export type ResearchMetrics = {
  total: number;
  new: number;
  qualified: number;
  closedWon: number;
  promoted: number;
};

type Props = {
  leads: ResearchLeadRow[];
  metrics: ResearchMetrics;
  researchers: string[];
  filterStatus: string;
  filterResearcher: string;
};

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
      letterSpacing: "0.14em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem", ...style,
    }}>
      {children}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: C.sans,
  fontSize: "0.8125rem",
  color: C.cream,
  background: C.bgInput,
  border: `1px solid ${C.border}`,
  padding: "0.625rem 0.75rem",
  outline: "none",
};

function buildFilterHref(status: string, researcher: string): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (researcher) params.set("researcher", researcher);
  const q = params.toString();
  return q ? `/admin/operations/research?${q}` : "/admin/operations/research";
}

async function patchResearchLead(
  id: number,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/admin/research-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { ok: false, error: String(data.error || "Update failed.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — try again." };
  }
}

function StatusSelect({
  id,
  status,
  onRequestReject,
}: {
  id: number;
  status: string;
  onRequestReject: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(next: string) {
    if (next === status || pending) return;
    if (next === "rejected") {
      onRequestReject();
      return;
    }
    setPending(true);
    try {
      const result = await patchResearchLead(id, { status: next });
      if (result.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: RESEARCH_STATUS_COLOR[status] ?? C.creamMuted,
        background: C.bgInput, border: `1px solid ${C.border}`,
        padding: "0.35rem 0.5rem", cursor: pending ? "wait" : "pointer",
      }}
    >
      {RESEARCH_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

function GradeSelect({ id, grade }: { id: number; grade: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const current = grade ?? "";

  async function onChange(next: string) {
    if (next === current || pending) return;
    setPending(true);
    try {
      const result = await patchResearchLead(id, { grade: next || null });
      if (result.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Opportunity grade"
      style={{
        fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600,
        letterSpacing: "0.08em",
        color: current ? (RESEARCH_GRADE_COLOR[current] ?? C.cream) : C.creamMuted,
        background: C.bgInput, border: `1px solid ${C.border}`,
        padding: "0.35rem 0.5rem", cursor: pending ? "wait" : "pointer",
        minWidth: "4.5rem",
      }}
    >
      <option value="">Grade…</option>
      {RESEARCH_GRADES.map((g) => (
        <option key={g.value} value={g.value}>{g.label}</option>
      ))}
    </select>
  );
}

function EvidenceEditor({
  id,
  evidence,
}: {
  id: number;
  evidence: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(evidence ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dirty = value !== (evidence ?? "");

  async function save() {
    if (!dirty || pending) return;
    setPending(true);
    setError("");
    try {
      const result = await patchResearchLead(id, { qualificationEvidence: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ marginTop: "0.65rem" }}>
      <FieldLabel>Qualification evidence</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="Why pursue or skip — e.g. clear website ask, direct contact…"
        style={{ ...inputStyle, resize: "vertical", fontSize: "0.75rem" }}
      />
      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "0.4rem" }}>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => void save()}
          style={{
            fontFamily: C.sans, fontSize: "0.625rem", letterSpacing: "0.12em",
            textTransform: "uppercase", color: dirty ? C.gold : "rgba(255,255,255,0.28)",
            background: "transparent", border: `1px solid ${dirty ? C.borderGold : C.border}`,
            padding: "0.35rem 0.55rem", cursor: dirty && !pending ? "pointer" : "default",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Save evidence"}
        </button>
        {error ? (
          <span style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.red }}>{error}</span>
        ) : null}
      </div>
    </div>
  );
}

function RejectPanel({
  id,
  onCancel,
  onError,
  onSuccess,
}: {
  id: number;
  onCancel: () => void;
  onError: (message: string) => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!reason || pending) return;
    if (reason === "other" && !evidence.trim()) {
      onError("Add a short note when reject reason is Other.");
      return;
    }
    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        status: "rejected",
        rejectReason: reason,
      };
      if (evidence.trim()) payload.qualificationEvidence = evidence.trim();
      const result = await patchResearchLead(id, payload);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onSuccess();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "0.75rem",
        padding: "0.75rem",
        border: `1px solid ${C.border}`,
        background: C.bgInput,
      }}
    >
      <FieldLabel style={{ color: C.red }}>Reject reason</FieldLabel>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ ...inputStyle, fontSize: "0.75rem", marginBottom: "0.55rem" }}
      >
        <option value="">Select reason…</option>
        {RESEARCH_REJECT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <FieldLabel>
        {reason === "other" ? "Evidence (recommended for Other)" : "Evidence (optional)"}
      </FieldLabel>
      <textarea
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        rows={2}
        placeholder="Brief note — why this is not a KXD opportunity…"
        style={{ ...inputStyle, resize: "vertical", fontSize: "0.75rem" }}
      />
      <div className="flex flex-wrap gap-2" style={{ marginTop: "0.55rem" }}>
        <button
          type="button"
          disabled={!reason || pending}
          onClick={() => void confirm()}
          style={{
            fontFamily: C.sans, fontSize: "0.625rem", letterSpacing: "0.12em",
            textTransform: "uppercase", color: C.bgBase, background: C.red,
            border: "none", padding: "0.45rem 0.7rem",
            cursor: !reason || pending ? "default" : "pointer",
            opacity: !reason || pending ? 0.6 : 1,
          }}
        >
          {pending ? "Rejecting…" : "Confirm reject"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          style={{
            fontFamily: C.sans, fontSize: "0.625rem", letterSpacing: "0.12em",
            textTransform: "uppercase", color: C.creamMuted, background: "transparent",
            border: `1px solid ${C.border}`, padding: "0.45rem 0.7rem", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ResearchDesk({ leads, metrics, researchers, filterStatus, filterResearcher }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const [researcherName, setResearcherName] = useState("");
  const [source, setSource] = useState("Craigslist");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [opportunityUrl, setOpportunityUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [estimatedService, setEstimatedService] = useState("");
  const [notes, setNotes] = useState("");
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);
    if (!researcherName) {
      setFormError("Select a researcher.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/research-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researcherName,
          source,
          state,
          city,
          businessName,
          opportunityUrl,
          contactEmail,
          contactPhone,
          estimatedService: estimatedService || undefined,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Submission failed.");
        return;
      }
      setResearcherName("");
      setSource("Craigslist");
      setState("");
      setCity("");
      setBusinessName("");
      setOpportunityUrl("");
      setContactEmail("");
      setContactPhone("");
      setEstimatedService("");
      setNotes("");
      setFormSuccess(true);
      setShowAddForm(false);
      router.refresh();
    } catch {
      setFormError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function promoteLead(id: number) {
    if (promotingId) return;
    setPromotingId(id);
    try {
      const res = await fetch("/api/admin/research-leads/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchLeadId: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Promote failed.");
        return;
      }
      router.refresh();
    } catch {
      setFormError("Network error — promote failed.");
    } finally {
      setPromotingId(null);
    }
  }

  const KPI = [
    { label: "Total Leads", value: metrics.total, accent: C.cream },
    { label: "New Leads", value: metrics.new, accent: "#A8B4C8" },
    { label: "Qualified", value: metrics.qualified, accent: "#A8B4C8" },
    { label: "Promoted", value: metrics.promoted, accent: C.gold },
  ];

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdOsLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                  Lead Research Desk
                </p>
              </div>
              <span style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "0.2rem 0.6rem" }}>
                Phase 1B
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {NAV_LINKS.map(([href, label]) => (
                <Link key={href} href={href} style={{
                  fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: href === "/admin/operations/research" ? C.gold : "rgba(255,255,255,0.3)",
                  textDecoration: "none",
                }}>
                  {label}
                </Link>
              ))}
              <Link href="/admin/collections/research-leads" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.gold, opacity: 0.8, textDecoration: "none",
              }}>
                Payload →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Lead Research
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3rem)", color: C.cream, lineHeight: 1.05 }}>
            Research Desk
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "36rem" }}>
            Review incoming research, then promote what is worth pursuing into Sales.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/sales"
              style={{
                fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.gold, textDecoration: "none",
                border: `1px solid ${C.borderGold}`, padding: "0.55rem 0.9rem", background: C.goldFaint,
              }}
            >
              Open Sales Pipeline
            </Link>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              style={{
                fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.creamMuted, background: "transparent",
                border: `1px solid ${C.border}`, padding: "0.55rem 0.9rem", cursor: "pointer",
              }}
            >
              {showAddForm ? "Cancel" : "+ Add Research Lead"}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ background: C.bgElevated, padding: "1.1rem 1.25rem" }}>
              <FieldLabel>{k.label}</FieldLabel>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: k.accent, marginTop: "0.5rem", lineHeight: 1 }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {showAddForm ? (
          <section className="mb-8">
            <FieldLabel style={{ color: C.goldDim, marginBottom: "1rem" }}>Add Research Lead</FieldLabel>
            <form
              onSubmit={handleSubmit}
              style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.5rem 1.625rem" }}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <FieldLabel>Researcher</FieldLabel>
                  <select required value={researcherName} onChange={(e) => setResearcherName(e.target.value)} style={inputStyle}>
                    <option value="">Select researcher…</option>
                    {RESEARCH_RESEARCHERS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Lead Source</FieldLabel>
                  <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
                    {RESEARCH_LEAD_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="OR" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Portland" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Business / Person</FieldLabel>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Optional" style={inputStyle} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Opportunity Link</FieldLabel>
                  <input value={opportunityUrl} onChange={(e) => setOpportunityUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Contact Email</FieldLabel>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="name@example.com" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Optional" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Recommended Service</FieldLabel>
                  <select value={estimatedService} onChange={(e) => setEstimatedService(e.target.value)} style={inputStyle}>
                    <option value="">Select service…</option>
                    {RESEARCH_SERVICES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FieldLabel>Research Notes</FieldLabel>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Opportunity context, fit signals, follow-up notes…" style={{ ...inputStyle, resize: "vertical" }} />
                </div>
              </div>
              <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.28)", marginTop: "0.85rem" }}>
                Require at least one: Opportunity Link, Contact Email, or Phone.
              </p>
              {formError && (
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.red, marginTop: "1rem" }}>{formError}</p>
              )}
              {formSuccess && (
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.gold, marginTop: "1rem" }}>Lead submitted successfully.</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: "1.25rem", fontFamily: C.sans, fontWeight: 500,
                  fontSize: "0.6875rem", letterSpacing: "0.14em", textTransform: "uppercase",
                  color: C.bgBase, background: C.gold, border: "none",
                  padding: "0.75rem 1.5rem", cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Submitting…" : "Submit Research Lead"}
              </button>
            </form>
          </section>
        ) : null}

        {!showAddForm && formError ? (
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.red, marginBottom: "1rem" }}>{formError}</p>
        ) : null}

        {/* Queue — primary purpose */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <FieldLabel style={{ color: C.goldDim }}>Incoming research</FieldLabel>
              <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.32)", marginTop: "0.35rem" }}>
                Decide what is worth pursuing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={filterStatus}
                  onChange={(e) => router.push(buildFilterHref(e.target.value, filterResearcher))}
                  style={{ ...inputStyle, width: "auto", minWidth: "8rem" }}
                >
                  <option value="">All statuses</option>
                  {RESEARCH_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Researcher</FieldLabel>
                <select
                  value={filterResearcher}
                  onChange={(e) => router.push(buildFilterHref(filterStatus, e.target.value))}
                  style={{ ...inputStyle, width: "auto", minWidth: "8rem" }}
                >
                  <option value="">All researchers</option>
                  {RESEARCH_RESEARCHERS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                  {researchers
                    .filter((r) => !RESEARCH_RESEARCHERS.some((x) => x.value === r))
                    .map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                </select>
              </div>
              {(filterStatus || filterResearcher) && (
                <Link href="/admin/operations/research" style={{
                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.12em",
                  textTransform: "uppercase", color: C.goldDim, textDecoration: "none",
                  alignSelf: "flex-end", padding: "0.625rem 0",
                }}>
                  Clear filters
                </Link>
              )}
            </div>
          </div>

          {metrics.total === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>
                No research leads submitted yet.
              </p>
            </div>
          ) : leads.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>
                No leads match the current filters.
              </p>
            </div>
          ) : (
            <div style={{ border: `1px solid ${C.border}` }}>
              {leads.map((lead, i) => {
                const location = [lead.city, lead.state].filter(Boolean).join(", ") || null;
                const service = lead.estimatedService
                  ? RESEARCH_SERVICE_LABEL[lead.estimatedService] ?? lead.estimatedService
                  : null;
                const title = lead.businessName?.trim() || service || location || `Research #${lead.id}`;
                const context = [
                  service && lead.businessName ? service : null,
                  location,
                  `Sourced by ${lead.researcherName}`,
                  lead.ageLabel,
                ].filter(Boolean).join(" · ");
                const contactHint = lead.contactEmail || lead.contactPhone || null;
                const secondaryBtn: React.CSSProperties = {
                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.12em",
                  textTransform: "uppercase", color: C.goldDim, textDecoration: "none",
                  background: "transparent", border: "none", cursor: "pointer", padding: "0.45rem 0.35rem",
                };
                const primaryBtn: React.CSSProperties = {
                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.14em",
                  textTransform: "uppercase", color: C.bgBase, textDecoration: "none",
                  border: "none", padding: "0.55rem 0.9rem",
                  background: C.gold, cursor: "pointer",
                };

                return (
                  <div
                    key={lead.id}
                    style={{
                      background: C.bgElevated, padding: "1.15rem 1.25rem",
                      borderBottom: i < leads.length - 1 ? `1px solid ${C.border}` : "none",
                      display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
                    }}
                  >
                    <div style={{ minWidth: "14rem", flex: 1 }}>
                      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: "0.45rem" }}>
                        {lead.promotedSalesLeadId ? (
                          <span style={{
                            fontFamily: C.sans, fontSize: "0.625rem", letterSpacing: "0.12em",
                            textTransform: "uppercase", color: C.gold,
                            border: `1px solid ${C.borderGold}`, padding: "0.15rem 0.45rem",
                          }}>
                            Promoted
                          </span>
                        ) : (
                          <span style={{
                            fontFamily: C.sans, fontSize: "0.625rem", letterSpacing: "0.12em",
                            textTransform: "uppercase", color: RESEARCH_STATUS_COLOR[lead.status] ?? C.creamMuted,
                          }}>
                            {RESEARCH_STATUS_LABEL[lead.status] ?? lead.status}
                          </span>
                        )}
                        {lead.grade ? (
                          <span style={{
                            fontFamily: C.sans, fontSize: "0.625rem", letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: RESEARCH_GRADE_COLOR[lead.grade] ?? C.cream,
                            border: `1px solid ${C.border}`, padding: "0.15rem 0.45rem",
                          }}>
                            Grade {lead.grade}
                          </span>
                        ) : null}
                      </div>
                      <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.25rem", color: C.cream, lineHeight: 1.2 }}>
                        {title}
                      </p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.4rem", lineHeight: 1.45 }}>
                        {context}
                      </p>
                      {contactHint ? (
                        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.32)", marginTop: "0.35rem" }}>
                          {lead.contactEmail ? lead.contactEmail : null}
                          {lead.contactEmail && lead.contactPhone ? " · " : ""}
                          {lead.contactPhone ? lead.contactPhone : null}
                        </p>
                      ) : lead.opportunityUrl ? (
                        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.32)", marginTop: "0.35rem" }}>
                          Opportunity link available
                        </p>
                      ) : null}
                      {lead.status === "rejected" && lead.rejectReason ? (
                        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.red, marginTop: "0.4rem" }}>
                          Rejected · {RESEARCH_REJECT_REASON_LABEL[lead.rejectReason] ?? lead.rejectReason}
                        </p>
                      ) : null}
                      {lead.qualificationEvidence ? (
                        <p style={{
                          fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)",
                          marginTop: "0.45rem", lineHeight: 1.45, maxWidth: "36rem",
                        }}>
                          {lead.qualificationEvidence}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "0.65rem" }}>
                        <GradeSelect id={lead.id} grade={lead.grade} />
                        <StatusSelect
                          id={lead.id}
                          status={lead.status}
                          onRequestReject={() => {
                            setFormError("");
                            setRejectingId(lead.id);
                          }}
                        />
                      </div>
                      <EvidenceEditor
                        key={`evidence-${lead.id}-${lead.qualificationEvidence ?? ""}`}
                        id={lead.id}
                        evidence={lead.qualificationEvidence}
                      />
                      {rejectingId === lead.id ? (
                        <RejectPanel
                          id={lead.id}
                          onCancel={() => setRejectingId(null)}
                          onError={(message) => setFormError(message)}
                          onSuccess={() => setRejectingId(null)}
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2" style={{ minWidth: "9rem" }}>
                      {lead.promotedSalesLeadId ? (
                        <Link href={`/admin/sales?focus=${lead.promotedSalesLeadId}`} style={primaryBtn}>
                          Open in Sales
                        </Link>
                      ) : lead.status !== "rejected" && lead.status !== "closed-lost" ? (
                        <button
                          type="button"
                          disabled={promotingId === lead.id}
                          onClick={() => promoteLead(lead.id)}
                          style={{ ...primaryBtn, opacity: promotingId === lead.id ? 0.7 : 1 }}
                        >
                          {promotingId === lead.id ? "Promoting…" : "Promote to Sales"}
                        </button>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {lead.opportunityUrl ? (
                          <a
                            href={lead.opportunityUrl.startsWith("http") ? lead.opportunityUrl : `https://${lead.opportunityUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={secondaryBtn}
                          >
                            View
                          </a>
                        ) : null}
                        {lead.contactEmail ? (
                          <a href={`mailto:${lead.contactEmail}`} style={secondaryBtn}>Email</a>
                        ) : null}
                        {lead.contactPhone ? (
                          <a href={`tel:${lead.contactPhone.replace(/[^\d+]/g, "")}`} style={secondaryBtn}>Call</a>
                        ) : null}
                        {lead.status !== "rejected" && !lead.promotedSalesLeadId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormError("");
                              setRejectingId(lead.id);
                            }}
                            style={secondaryBtn}
                          >
                            Skip
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
