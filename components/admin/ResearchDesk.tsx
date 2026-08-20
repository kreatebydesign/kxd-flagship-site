"use client";

/**
 * ResearchDesk — Opportunities surface (Research Desk implementation)
 * Presentation / navigation only. Qualification & promote logic unchanged.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KxdPage } from "@/components/os";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  RESEARCH_COMMERCIAL_BANDS,
  RESEARCH_COMMERCIAL_BAND_LABEL,
  RESEARCH_GRADES,
  RESEARCH_GRADE_COLOR,
  RESEARCH_LEAD_SOURCES,
  RESEARCH_RECOMMENDED_CHANNELS,
  RESEARCH_RECOMMENDED_CHANNEL_LABEL,
  RESEARCH_REJECT_REASONS,
  RESEARCH_REJECT_REASON_LABEL,
  RESEARCH_RESEARCHERS,
  RESEARCH_SERVICES,
  RESEARCH_STATUSES,
  RESEARCH_SERVICE_LABEL,
  RESEARCH_STATUS_COLOR,
  RESEARCH_STATUS_LABEL,
  RESEARCH_TRIGGER_TYPES,
  RESEARCH_TRIGGER_TYPE_LABEL,
  RESEARCH_URGENCIES,
  RESEARCH_URGENCY_LABEL,
  resolveOpportunityPrimaryAction,
} from "@/lib/research-leads";

/** Maps to shared KXD OS tokens — no parallel dark island. */
const C = {
  bgPure: "var(--kxd-os-bg-canvas)",
  bgBase: "var(--kxd-os-bg-page)",
  bgElevated: "var(--kxd-os-bg-surface)",
  bgInput: "var(--kxd-os-bg-elevated)",
  gold: "var(--kxd-os-accent)",
  goldDim: "var(--kxd-os-text-secondary)",
  goldFaint: "var(--kxd-os-accent-subtle)",
  cream: "var(--kxd-os-text-primary)",
  creamMuted: "var(--kxd-os-text-secondary)",
  faint: "var(--kxd-os-text-faint)",
  red: "var(--kxd-os-critical)",
  green: "var(--kxd-os-success)",
  border: "var(--kxd-os-border-divider)",
  borderGold: "var(--kxd-os-gold-border)",
  borderFocus: "var(--kxd-os-border-focus)",
  onAccent: "var(--kxd-os-on-accent)",
  serif: "var(--kxd-os-font-serif)",
  sans: "var(--kxd-os-font-sans)",
  radius: "var(--kxd-os-radius-sm)",
} as const;

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
  notes: string | null;
  triggerType: string | null;
  eventDate: string | null;
  digitalGap: string | null;
  recommendedChannel: string | null;
  urgency: string | null;
  commercialBand: string | null;
  createdAt: string;
  updatedAt: string | null;
  ageLabel: string;
  promotedSalesLeadId: number | null;
  promotedAt: string | null;
};

export type ResearchMetrics = {
  total: number;
  new: number;
  reviewing: number;
  qualified: number;
  aPlus: number;
  a: number;
  b: number;
  closedWon: number;
  promoted: number;
  rejected: number;
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
      fontFamily: C.sans,
      fontSize: "0.6875rem",
      fontWeight: 500,
      letterSpacing: "-0.008em",
      textTransform: "none",
      color: C.faint,
      marginBottom: "0.5rem",
      ...style,
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
  borderRadius: C.radius,
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

function activityLabel(lead: ResearchLeadRow): string | null {
  if (lead.promotedAt) {
    try {
      return `Promoted ${new Date(lead.promotedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } catch {
      return "Promoted";
    }
  }
  if (lead.updatedAt && lead.updatedAt !== lead.createdAt) {
    try {
      return `Updated ${new Date(lead.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } catch {
      return null;
    }
  }
  return lead.ageLabel ? `Added ${lead.ageLabel.replace(/ old$/, "")}` : null;
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
        fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 500,
        letterSpacing: "-0.006em", textTransform: "none",
        color: RESEARCH_STATUS_COLOR[status] ?? C.creamMuted,
        background: C.bgInput, border: `1px solid ${C.border}`,
        borderRadius: C.radius,
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
        fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 500,
        letterSpacing: "-0.006em",
        color: current ? (RESEARCH_GRADE_COLOR[current] ?? C.cream) : C.creamMuted,
        background: C.bgInput, border: `1px solid ${C.border}`,
        borderRadius: C.radius,
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

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatEventDateShort(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 500,
        letterSpacing: "-0.006em",
        color: C.creamMuted,
        background: "var(--kxd-os-bg-muted)",
        borderRadius: C.radius,
        padding: "0.2rem 0.5rem",
      }}
    >
      {children}
    </span>
  );
}

function OpportunityIntelligenceEditor({ lead }: { lead: ResearchLeadRow }) {
  const router = useRouter();
  const [triggerType, setTriggerType] = useState(lead.triggerType ?? "");
  const [eventDate, setEventDate] = useState(toDateInputValue(lead.eventDate));
  const [digitalGap, setDigitalGap] = useState(lead.digitalGap ?? "");
  const [recommendedChannel, setRecommendedChannel] = useState(lead.recommendedChannel ?? "");
  const [urgency, setUrgency] = useState(lead.urgency ?? "");
  const [commercialBand, setCommercialBand] = useState(lead.commercialBand ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    triggerType !== (lead.triggerType ?? "") ||
    eventDate !== toDateInputValue(lead.eventDate) ||
    digitalGap !== (lead.digitalGap ?? "") ||
    recommendedChannel !== (lead.recommendedChannel ?? "") ||
    urgency !== (lead.urgency ?? "") ||
    commercialBand !== (lead.commercialBand ?? "");

  async function save() {
    if (!dirty || pending) return;
    setPending(true);
    setError("");
    try {
      const result = await patchResearchLead(lead.id, {
        triggerType: triggerType || null,
        eventDate: eventDate || null,
        digitalGap,
        recommendedChannel: recommendedChannel || null,
        urgency: urgency || null,
        commercialBand: commercialBand || null,
      });
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
    <div style={{ marginTop: "0.85rem" }}>
      <FieldLabel>Opportunity Intelligence</FieldLabel>
      <div className="grid gap-3 sm:grid-cols-2" style={{ marginTop: "0.35rem" }}>
        <div>
          <FieldLabel style={{ marginBottom: "0.35rem" }}>What changed</FieldLabel>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            style={{ ...inputStyle, fontSize: "0.75rem" }}
          >
            <option value="">Not set…</option>
            {RESEARCH_TRIGGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel style={{ marginBottom: "0.35rem" }}>Event date</FieldLabel>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={{ ...inputStyle, fontSize: "0.75rem" }}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel style={{ marginBottom: "0.35rem" }}>Digital gap</FieldLabel>
          <textarea
            value={digitalGap}
            onChange={(e) => setDigitalGap(e.target.value)}
            rows={2}
            placeholder="Specific evidence — e.g. second location not on site…"
            style={{ ...inputStyle, resize: "vertical", fontSize: "0.75rem" }}
          />
        </div>
        <div>
          <FieldLabel style={{ marginBottom: "0.35rem" }}>Urgency</FieldLabel>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            style={{ ...inputStyle, fontSize: "0.75rem" }}
          >
            <option value="">Not set…</option>
            {RESEARCH_URGENCIES.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel style={{ marginBottom: "0.35rem" }}>Commercial band</FieldLabel>
          <select
            value={commercialBand}
            onChange={(e) => setCommercialBand(e.target.value)}
            style={{ ...inputStyle, fontSize: "0.75rem" }}
          >
            <option value="">Not set…</option>
            {RESEARCH_COMMERCIAL_BANDS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel style={{ marginBottom: "0.35rem" }}>Recommended first contact</FieldLabel>
          <select
            value={recommendedChannel}
            onChange={(e) => setRecommendedChannel(e.target.value)}
            style={{ ...inputStyle, fontSize: "0.75rem" }}
          >
            <option value="">Not set…</option>
            {RESEARCH_RECOMMENDED_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "0.55rem" }}>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => void save()}
          style={{
            fontFamily: C.sans, fontSize: "0.75rem", letterSpacing: "-0.006em",
            textTransform: "none", fontWeight: 500,
            color: dirty ? C.cream : C.faint,
            background: "transparent", border: `1px solid ${dirty ? C.borderGold : C.border}`,
            borderRadius: C.radius,
            padding: "0.4rem 0.65rem", cursor: dirty && !pending ? "pointer" : "default",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Save intelligence"}
        </button>
        {error ? (
          <span style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.red }}>{error}</span>
        ) : null}
      </div>
    </div>
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
    <div style={{ marginTop: "0.85rem" }}>
      <FieldLabel>Evidence</FieldLabel>
      {evidence ? (
        <p style={{
          fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted,
          lineHeight: 1.5, marginBottom: "0.55rem", whiteSpace: "pre-wrap",
        }}>
          {evidence}
        </p>
      ) : (
        <p style={{
          fontFamily: C.sans, fontSize: "0.75rem", color: C.faint,
          marginBottom: "0.55rem",
        }}>
          No qualification evidence yet.
        </p>
      )}
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
            fontFamily: C.sans, fontSize: "0.75rem", letterSpacing: "-0.006em",
            textTransform: "none", fontWeight: 500,
            color: dirty ? C.cream : C.faint,
            background: "transparent", border: `1px solid ${dirty ? C.borderGold : C.border}`,
            borderRadius: C.radius,
            padding: "0.4rem 0.65rem", cursor: dirty && !pending ? "pointer" : "default",
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
            fontFamily: C.sans, fontSize: "0.75rem", letterSpacing: "-0.01em", fontWeight: 500,
            textTransform: "none", color: "#fff", background: C.red, borderRadius: C.radius,
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
            fontFamily: C.sans, fontSize: "0.75rem", letterSpacing: "-0.01em", fontWeight: 500,
            textTransform: "none", color: C.creamMuted, background: "transparent",
            border: `1px solid ${C.border}`, borderRadius: C.radius, padding: "0.45rem 0.7rem", cursor: "pointer",
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
  const [expandedId, setExpandedId] = useState<number | null>(leads[0]?.id ?? null);

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
  const [triggerType, setTriggerType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [digitalGap, setDigitalGap] = useState("");
  const [recommendedChannel, setRecommendedChannel] = useState("");
  const [urgency, setUrgency] = useState("");
  const [commercialBand, setCommercialBand] = useState("");
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [actionPendingId, setActionPendingId] = useState<number | null>(null);
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
          triggerType: triggerType || undefined,
          eventDate: eventDate || undefined,
          digitalGap: digitalGap || undefined,
          recommendedChannel: recommendedChannel || undefined,
          urgency: urgency || undefined,
          commercialBand: commercialBand || undefined,
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
      setTriggerType("");
      setEventDate("");
      setDigitalGap("");
      setRecommendedChannel("");
      setUrgency("");
      setCommercialBand("");
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
    const lead = leads.find((l) => l.id === id);
    if (lead?.status === "rejected") {
      setFormError("Rejected opportunities cannot be promoted. Change status first if this was a mistake.");
      return;
    }
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

  async function qualifyLead(id: number) {
    if (actionPendingId) return;
    setActionPendingId(id);
    try {
      const result = await patchResearchLead(id, { status: "reviewing" });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setExpandedId(id);
      router.refresh();
    } finally {
      setActionPendingId(null);
    }
  }

  const KPI = [
    { label: "Qualified", value: metrics.qualified, accent: C.gold },
    { label: "A+", value: metrics.aPlus, accent: C.cream },
    { label: "A", value: metrics.a, accent: C.cream },
    { label: "B", value: metrics.b, accent: C.cream },
    { label: "New / reviewing", value: metrics.new + metrics.reviewing, accent: C.cream },
    { label: "In Sales", value: metrics.promoted, accent: C.cream },
  ];

  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <OperationsShell activeId="opportunities" dateDisplay={dateDisplay} showQuickActions={false}>
      <KxdPage className="kxd-os-page--ops">
        <div style={{ background: "transparent", color: C.cream, fontFamily: C.sans, margin: "0 -0.25rem" }}>
          <div className="mx-auto max-w-screen-xl" style={{ padding: "1.75rem 0.5rem 4rem" }}>
            <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.75rem", letterSpacing: "-0.008em", textTransform: "none", color: C.creamMuted, marginBottom: "0.75rem", fontWeight: 500 }}>
                Revenue
              </p>
              <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 2.75rem)", color: C.cream, lineHeight: 1.05 }}>
                Opportunities
              </h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "36rem" }}>
                Strongest qualified first. Capture what changed, the digital gap, urgency, and commercial band — then grade and promote what is worth pursuing into Sales.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/sales"
                  style={{
                    fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "-0.01em", fontWeight: 500,
                    textTransform: "none", color: C.onAccent, textDecoration: "none",
                    border: "none", borderRadius: C.radius, padding: "0.55rem 0.95rem", background: C.gold,
                  }}
                >
                  Open Sales
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAddForm((v) => !v)}
                  style={{
                    fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "-0.01em", fontWeight: 500,
                    textTransform: "none", color: C.creamMuted, background: C.bgElevated,
                    border: `1px solid ${C.border}`, borderRadius: C.radius, padding: "0.55rem 0.95rem", cursor: "pointer",
                  }}
                >
                  {showAddForm ? "Cancel" : "Add research lead"}
                </button>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: "0.75rem" }}>
              {KPI.map((k) => (
                <div key={k.label} style={{ background: C.bgElevated, borderRadius: C.radius, padding: "1rem 1.1rem" }}>
                  <FieldLabel>{k.label}</FieldLabel>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.35rem", color: k.accent, marginTop: "0.4rem", lineHeight: 1 }}>
                    {k.value}
                  </p>
                </div>
              ))}
            </div>

            {showAddForm ? (
              <section className="mb-8">
                <FieldLabel style={{ color: C.creamMuted, marginBottom: "1rem" }}>Add research lead</FieldLabel>
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
                      <FieldLabel>Why Now / Research Notes</FieldLabel>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional free-form notes…" style={{ ...inputStyle, resize: "vertical" }} />
                    </div>
                    <div>
                      <FieldLabel>What Changed</FieldLabel>
                      <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} style={inputStyle}>
                        <option value="">Optional…</option>
                        {RESEARCH_TRIGGER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Event Date</FieldLabel>
                      <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <FieldLabel>Urgency</FieldLabel>
                      <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={inputStyle}>
                        <option value="">Optional…</option>
                        {RESEARCH_URGENCIES.map((u) => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Commercial Band</FieldLabel>
                      <select value={commercialBand} onChange={(e) => setCommercialBand(e.target.value)} style={inputStyle}>
                        <option value="">Optional…</option>
                        {RESEARCH_COMMERCIAL_BANDS.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Recommended First Contact</FieldLabel>
                      <select value={recommendedChannel} onChange={(e) => setRecommendedChannel(e.target.value)} style={inputStyle}>
                        <option value="">Optional…</option>
                        {RESEARCH_RECOMMENDED_CHANNELS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <FieldLabel>Digital Gap</FieldLabel>
                      <textarea
                        value={digitalGap}
                        onChange={(e) => setDigitalGap(e.target.value)}
                        rows={2}
                        placeholder="Specific evidence of the digital gap (optional)…"
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    </div>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.faint, marginTop: "0.85rem" }}>
                    Require at least one: Opportunity Link, Contact Email, or Phone. Opportunity Intelligence fields are optional.
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
                      fontSize: "0.8125rem", letterSpacing: "-0.01em", textTransform: "none",
                      color: C.onAccent, background: C.gold, border: "none", borderRadius: C.radius,
                      padding: "0.7rem 1.25rem", cursor: submitting ? "wait" : "pointer",
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

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <FieldLabel style={{ color: C.creamMuted }}>Opportunity queue</FieldLabel>
                  <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.faint, marginTop: "0.35rem" }}>
                    A+ / A / B first. Rejected stays in history until you ask for it.
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
                      <option value="">Active opportunities</option>
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
                  {!filterStatus ? (
                    <Link href={buildFilterHref("rejected", filterResearcher)} style={{
                      fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "-0.01em",
                      textTransform: "none", color: C.creamMuted, textDecoration: "none",
                      alignSelf: "flex-end", padding: "0.625rem 0",
                    }}>
                      Review rejected ({metrics.rejected})
                    </Link>
                  ) : (
                    <Link href="/admin/operations/research" style={{
                      fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "-0.01em",
                      textTransform: "none", color: C.creamMuted, textDecoration: "none",
                      alignSelf: "flex-end", padding: "0.625rem 0",
                    }}>
                      Clear filters
                    </Link>
                  )}
                </div>
              </div>

              {metrics.total === 0 ? (
                <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem" }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.faint }}>
                    No opportunities submitted yet.
                  </p>
                </div>
              ) : leads.length === 0 ? (
                <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem" }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.faint }}>
                    No opportunities match the current filters.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {leads.map((lead) => {
                    const location = [lead.city, lead.state].filter(Boolean).join(", ") || null;
                    const service = lead.estimatedService
                      ? RESEARCH_SERVICE_LABEL[lead.estimatedService] ?? lead.estimatedService
                      : null;
                    const company = lead.businessName?.trim() || service || location || `Opportunity #${lead.id}`;
                    const whatChanged = lead.triggerType
                      ? [
                          RESEARCH_TRIGGER_TYPE_LABEL[lead.triggerType] ?? lead.triggerType,
                          formatEventDateShort(lead.eventDate),
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : formatEventDateShort(lead.eventDate);
                    const digitalGap = lead.digitalGap?.trim() || null;
                    const contact = [lead.contactEmail, lead.contactPhone].filter(Boolean).join(" · ") || null;
                    const activity = activityLabel(lead);
                    const primary = resolveOpportunityPrimaryAction(lead);
                    const expanded = expandedId === lead.id;
                    const secondaryBtn: React.CSSProperties = {
                      fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "-0.01em", fontWeight: 500,
                      textTransform: "none", color: C.creamMuted, textDecoration: "none",
                      background: "transparent", border: "none", cursor: "pointer", padding: "0.45rem 0.35rem",
                    };
                    const primaryBtn: React.CSSProperties = {
                      fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "-0.01em", fontWeight: 500,
                      textTransform: "none", color: C.onAccent, textDecoration: "none",
                      border: "none", borderRadius: C.radius, padding: "0.55rem 0.95rem",
                      background: C.gold, cursor: "pointer",
                    };

                    return (
                      <div
                        key={lead.id}
                        id={`opportunity-${lead.id}`}
                        style={{
                          background: C.bgElevated, borderRadius: C.radius, padding: "1.15rem 1.25rem",
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                          <div style={{ minWidth: "14rem", flex: 1 }}>
                            <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: "0.45rem" }}>
                              {lead.grade ? (
                                <span style={{
                                  fontFamily: C.sans, fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "-0.006em",
                                  textTransform: "none",
                                  color: RESEARCH_GRADE_COLOR[lead.grade] ?? C.cream,
                                  background: "var(--kxd-os-bg-muted)", borderRadius: C.radius, padding: "0.2rem 0.5rem",
                                }}>
                                  {lead.grade}
                                </span>
                              ) : (
                                <span style={{
                                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "-0.006em",
                                  textTransform: "none", color: C.faint,
                                }}>
                                  Ungraded
                                </span>
                              )}
                              {lead.promotedSalesLeadId ? (
                                <span style={{
                                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "-0.006em", fontWeight: 500,
                                  textTransform: "none", color: C.cream,
                                  background: C.goldFaint, borderRadius: C.radius, padding: "0.2rem 0.5rem",
                                }}>
                                  In Sales
                                </span>
                              ) : (
                                <span style={{
                                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "-0.006em",
                                  textTransform: "none", color: RESEARCH_STATUS_COLOR[lead.status] ?? C.creamMuted,
                                }}>
                                  {RESEARCH_STATUS_LABEL[lead.status] ?? lead.status}
                                </span>
                              )}
                            </div>

                            <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.3rem", color: C.cream, lineHeight: 1.2 }}>
                              {company}
                            </p>

                            {whatChanged ? (
                              <div style={{ marginTop: "0.7rem" }}>
                                <FieldLabel style={{ marginBottom: "0.3rem" }}>What changed</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.45 }}>
                                  {whatChanged}
                                </p>
                              </div>
                            ) : null}

                            {digitalGap ? (
                              <div style={{ marginTop: "0.65rem" }}>
                                <FieldLabel style={{ marginBottom: "0.3rem" }}>Digital gap</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, lineHeight: 1.45, maxWidth: "38rem" }}>
                                  {digitalGap}
                                </p>
                              </div>
                            ) : lead.notes?.trim() || lead.qualificationEvidence?.trim() ? (
                              <div style={{ marginTop: "0.65rem" }}>
                                <FieldLabel style={{ marginBottom: "0.3rem" }}>Why now</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, lineHeight: 1.45, maxWidth: "38rem" }}>
                                  {lead.notes?.trim() || lead.qualificationEvidence?.trim()}
                                </p>
                              </div>
                            ) : null}

                            {(lead.urgency || lead.commercialBand || lead.recommendedChannel) ? (
                              <div className="flex flex-wrap gap-2" style={{ marginTop: "0.7rem" }}>
                                {lead.urgency ? (
                                  <MetaChip>
                                    Urgency · {RESEARCH_URGENCY_LABEL[lead.urgency] ?? lead.urgency}
                                  </MetaChip>
                                ) : null}
                                {lead.commercialBand ? (
                                  <MetaChip>
                                    {RESEARCH_COMMERCIAL_BAND_LABEL[lead.commercialBand] ?? lead.commercialBand}
                                  </MetaChip>
                                ) : null}
                                {lead.recommendedChannel ? (
                                  <MetaChip>
                                    Contact · {RESEARCH_RECOMMENDED_CHANNEL_LABEL[lead.recommendedChannel] ?? lead.recommendedChannel}
                                  </MetaChip>
                                ) : null}
                              </div>
                            ) : null}

                            <div style={{ marginTop: "0.7rem" }} className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <FieldLabel style={{ marginBottom: "0.25rem" }}>Contact</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: contact ? C.cream : C.faint }}>
                                  {contact ?? "No contact yet"}
                                </p>
                              </div>
                              <div>
                                <FieldLabel style={{ marginBottom: "0.25rem" }}>Recommended service</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: service ? C.cream : C.faint }}>
                                  {service ?? "Not set"}
                                </p>
                              </div>
                            </div>

                            {lead.status === "rejected" && lead.rejectReason ? (
                              <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.red, marginTop: "0.55rem" }}>
                                Rejected · {RESEARCH_REJECT_REASON_LABEL[lead.rejectReason] ?? lead.rejectReason}
                              </p>
                            ) : null}

                            <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.faint, marginTop: "0.55rem" }}>
                              {[
                                location,
                                `Sourced by ${lead.researcherName}`,
                                activity,
                                primary.label ? `Next · ${primary.label}` : null,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          </div>

                          <div className="flex flex-col items-stretch sm:items-end gap-2" style={{ minWidth: "10rem" }}>
                            {primary.kind === "open-sales" ? (
                              <Link href={`/admin/sales?focus=${primary.salesLeadId}`} style={primaryBtn}>
                                {primary.label}
                              </Link>
                            ) : null}
                            {primary.kind === "promote" ? (
                              <button
                                type="button"
                                disabled={promotingId === lead.id}
                                onClick={() => promoteLead(lead.id)}
                                style={{ ...primaryBtn, opacity: promotingId === lead.id ? 0.7 : 1 }}
                              >
                                {promotingId === lead.id ? "Promoting…" : primary.label}
                              </button>
                            ) : null}
                            {primary.kind === "qualify" ? (
                              <button
                                type="button"
                                disabled={actionPendingId === lead.id}
                                onClick={() => void qualifyLead(lead.id)}
                                style={{ ...primaryBtn, opacity: actionPendingId === lead.id ? 0.7 : 1 }}
                              >
                                {actionPendingId === lead.id ? "Opening…" : primary.label}
                              </button>
                            ) : null}
                            {primary.kind === "review" || primary.kind === "continue" ? (
                              <button
                                type="button"
                                onClick={() => setExpandedId(expanded ? null : lead.id)}
                                style={primaryBtn}
                              >
                                {primary.label}
                              </button>
                            ) : null}

                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {!expanded ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(lead.id)}
                                  style={secondaryBtn}
                                >
                                  Open
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(null)}
                                  style={secondaryBtn}
                                >
                                  Close
                                </button>
                              )}
                              {lead.opportunityUrl ? (
                                <a
                                  href={lead.opportunityUrl.startsWith("http") ? lead.opportunityUrl : `https://${lead.opportunityUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={secondaryBtn}
                                >
                                  Source
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
                                    setExpandedId(lead.id);
                                  }}
                                  style={secondaryBtn}
                                >
                                  Skip
                                </button>
                              ) : null}
                              {primary.kind !== "promote" && lead.status === "qualified" && !lead.promotedSalesLeadId ? (
                                <button
                                  type="button"
                                  disabled={promotingId === lead.id}
                                  onClick={() => promoteLead(lead.id)}
                                  style={secondaryBtn}
                                >
                                  Promote to Sales
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {expanded ? (
                          <div style={{
                            marginTop: "1rem",
                            paddingTop: "1rem",
                            borderTop: `1px solid ${C.border}`,
                          }}>
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                              <div>
                                <FieldLabel>KXD opportunity</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, lineHeight: 1.5, marginBottom: "0.85rem" }}>
                                  {[service, location, lead.source].filter(Boolean).join(" · ") || "Review fit and contact path."}
                                </p>
                                <EvidenceEditor
                                  key={`evidence-${lead.id}-${lead.qualificationEvidence ?? ""}`}
                                  id={lead.id}
                                  evidence={lead.qualificationEvidence}
                                />
                                <OpportunityIntelligenceEditor
                                  key={`oi-${lead.id}-${lead.triggerType ?? ""}-${lead.eventDate ?? ""}-${lead.digitalGap ?? ""}-${lead.recommendedChannel ?? ""}-${lead.urgency ?? ""}-${lead.commercialBand ?? ""}`}
                                  lead={lead}
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
                              <div>
                                <FieldLabel>Next action</FieldLabel>
                                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, marginBottom: "0.85rem" }}>
                                  {primary.label ?? "No action"}
                                </p>
                                <FieldLabel>Grade & status</FieldLabel>
                                <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: "0.85rem" }}>
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
                                <FieldLabel>Administration</FieldLabel>
                                <p style={{
                                  fontFamily: C.sans, fontSize: "0.75rem", color: C.faint,
                                  lineHeight: 1.55, whiteSpace: "pre-wrap",
                                }}>
                                  {[
                                    `Researcher · ${lead.researcherName}`,
                                    `Source · ${lead.source}`,
                                    activity,
                                    lead.promotedAt ? `Promoted · ${lead.promotedAt.slice(0, 10)}` : null,
                                  ].filter(Boolean).join("\n")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
