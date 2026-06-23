"use client";

/**
 * ResearchDesk — KXD OS Lead Research Desk intake + queue
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
  RESEARCH_SERVICES,
  RESEARCH_STATUSES,
  RESEARCH_SERVICE_LABEL,
  RESEARCH_STATUS_COLOR,
  RESEARCH_STATUS_LABEL,
} from "@/lib/research-leads";

const C = {
  bgPure: "#000000",
  bgBase: "#080808",
  bgElevated: "#111111",
  bgInput: "#0d0d0d",
  gold: "#C5A65C",
  goldDim: "rgba(197,166,92,0.55)",
  goldFaint: "rgba(197,166,92,0.08)",
  cream: "#f8f3ea",
  creamMuted: "#bfb7aa",
  red: "#d25a5a",
  green: "#5ec68c",
  border: "rgba(255,255,255,0.07)",
  borderGold: "rgba(197,166,92,0.22)",
  borderFocus: "rgba(197,166,92,0.55)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

const NAV_LINKS = [
  ["/admin/operations/executive", "Executive"],
  ["/admin/operations/command", "Operations"],
  ["/admin/operations/research", "Research"],
  ["/admin/operations/audits", "Audits"],
  ["/admin/operations/onboarding", "Onboarding"],
  ["/admin/operations/playbooks", "Playbooks"],
] as const;

export type ResearchLeadRow = {
  id: number;
  researcherName: string;
  source: string;
  state: string | null;
  city: string | null;
  leadUrl: string | null;
  category: string | null;
  estimatedService: string | null;
  status: string;
  createdAt: string;
};

export type ResearchMetrics = {
  total: number;
  new: number;
  qualified: number;
  closedWon: number;
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
      fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
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

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

function buildFilterHref(status: string, researcher: string): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (researcher) params.set("researcher", researcher);
  const q = params.toString();
  return q ? `/admin/operations/research?${q}` : "/admin/operations/research";
}

function StatusSelect({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(next: string) {
    if (next === status || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/research-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (res.ok) router.refresh();
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
        fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
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

export function ResearchDesk({ leads, metrics, researchers, filterStatus, filterResearcher }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const [researcherName, setResearcherName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [leadUrl, setLeadUrl] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedService, setEstimatedService] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);
    if (!researcherName.trim()) {
      setFormError("Researcher name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/research-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researcherName,
          state,
          city,
          leadUrl,
          category,
          estimatedService: estimatedService || undefined,
          notes,
          source: "Craigslist",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Submission failed.");
        return;
      }
      setResearcherName("");
      setState("");
      setCity("");
      setLeadUrl("");
      setCategory("");
      setEstimatedService("");
      setNotes("");
      setFormSuccess(true);
      router.refresh();
    } catch {
      setFormError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const KPI = [
    { label: "Total Leads", value: metrics.total, accent: C.cream },
    { label: "New Leads", value: metrics.new, accent: "#8a9bd2" },
    { label: "Qualified Leads", value: metrics.qualified, accent: "#96d2c8" },
    { label: "Closed Won", value: metrics.closedWon, accent: C.green },
  ];

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                  Lead Research Desk
                </p>
              </div>
              <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "0.2rem 0.6rem" }}>
                Phase 1
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {NAV_LINKS.map(([href, label]) => (
                <Link key={href} href={href} style={{
                  fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: href === "/admin/operations/research" ? C.gold : "rgba(255,255,255,0.3)",
                  textDecoration: "none",
                }}>
                  {label}
                </Link>
              ))}
              <Link href="/admin/collections/research-leads" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem", letterSpacing: "0.14em",
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
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Lead Research
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3rem)", color: C.cream, lineHeight: 1.05 }}>
            Research Desk
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "36rem" }}>
            Internal Craigslist and manual lead intake for Harlow and Sasha — submit, review, qualify, and track opportunities.
          </p>
        </div>

        {/* Metrics */}
        <div className="mb-10 grid grid-cols-2 sm:grid-cols-4" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
              <FieldLabel>{k.label}</FieldLabel>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: k.accent, marginTop: "0.5rem", lineHeight: 1 }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {metrics.total > 0 && metrics.qualified === 0 && (
          <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1rem 1.25rem", marginBottom: "2rem" }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}>
              No qualified opportunities yet.
            </p>
          </div>
        )}

        {/* Submission form */}
        <section className="mb-10">
          <FieldLabel style={{ color: C.goldDim, marginBottom: "1rem" }}>Submit Lead</FieldLabel>
          <form
            onSubmit={handleSubmit}
            style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.5rem 1.625rem" }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel>Researcher</FieldLabel>
                <input required value={researcherName} onChange={(e) => setResearcherName(e.target.value)} placeholder="Harlow / Sasha" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="OR" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Portland" style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>URL</FieldLabel>
                <input value={leadUrl} onChange={(e) => setLeadUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Services / Gigs" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Service</FieldLabel>
                <select value={estimatedService} onChange={(e) => setEstimatedService(e.target.value)} style={inputStyle}>
                  <option value="">Select service…</option>
                  {RESEARCH_SERVICES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel>Notes</FieldLabel>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Opportunity notes, context, red flags…" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            {formError && (
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.red, marginTop: "1rem" }}>{formError}</p>
            )}
            {formSuccess && (
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.green, marginTop: "1rem" }}>Lead submitted successfully.</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: "1.25rem", fontFamily: C.sans, fontWeight: 500,
                fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.bgBase, background: C.gold, border: "none",
                padding: "0.75rem 1.5rem", cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting…" : "Submit Lead"}
            </button>
          </form>
        </section>

        {/* Filters + queue */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <FieldLabel style={{ color: C.goldDim }}>Lead Queue</FieldLabel>
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
                  {researchers.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {(filterStatus || filterResearcher) && (
                <Link href="/admin/operations/research" style={{
                  fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em",
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
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}>
                No research leads submitted yet.
              </p>
            </div>
          ) : leads.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)" }}>
                No leads match the current filters.
              </p>
            </div>
          ) : (
            <div style={{ border: `1px solid ${C.border}` }}>
              {leads.map((lead, i) => {
                const location = [lead.city, lead.state].filter(Boolean).join(", ") || "—";
                const service = lead.estimatedService
                  ? RESEARCH_SERVICE_LABEL[lead.estimatedService] ?? lead.estimatedService
                  : "—";
                const url = lead.leadUrl?.trim();

                return (
                  <div
                    key={lead.id}
                    style={{
                      background: C.bgElevated, padding: "1rem 1.25rem",
                      borderBottom: i < leads.length - 1 ? `1px solid ${C.border}` : "none",
                      display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem",
                    }}
                  >
                    <div style={{ minWidth: "12rem", flex: 1 }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusSelect id={lead.id} status={lead.status} />
                        <span style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted }}>
                          {RESEARCH_STATUS_LABEL[lead.status]}
                        </span>
                      </div>
                      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream, marginTop: "0.5rem" }}>
                        {lead.researcherName} · {location}
                      </p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.28)", marginTop: "0.25rem" }}>
                        {fmtDate(lead.createdAt)} · {service}
                        {lead.category ? ` · ${lead.category}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {url ? (
                        <a
                          href={url.startsWith("http") ? url : `https://${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em",
                            textTransform: "uppercase", color: C.gold, textDecoration: "none",
                            border: `1px solid ${C.borderGold}`, padding: "0.5rem 0.875rem",
                            background: C.goldFaint,
                          }}
                        >
                          Open URL
                        </a>
                      ) : (
                        <span style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.2)" }}>
                          No URL
                        </span>
                      )}
                      <Link
                        href={`/admin/collections/research-leads/${lead.id}`}
                        style={{
                          fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em",
                          textTransform: "uppercase", color: C.goldDim, textDecoration: "none",
                        }}
                      >
                        Edit →
                      </Link>
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
