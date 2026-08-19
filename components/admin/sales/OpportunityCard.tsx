"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NEXT_ACTIONS } from "@/lib/sales/next-action";
import { LOST_REASONS, type OutreachKind } from "@/lib/sales/follow-up-policy";
import { WORKSPACE_MOVES } from "@/lib/sales/workspace-stages";
import type { SalesOpportunityCard } from "@/lib/sales/workspace";
import { fmtMoney } from "./shared";

type StoryItem = {
  id: number;
  activityType: string;
  title: string;
  summary: string | null;
  occurredAt: string;
};

function contactFirstName(name: string | null | undefined): string | null {
  const raw = String(name ?? "").trim();
  if (!raw || raw === "—" || raw === "Contact TBD") return null;
  return raw.split(/\s+/)[0] ?? null;
}

function contextLine(card: SalesOpportunityCard): string {
  const parts: string[] = [];
  const first = contactFirstName(card.contactName);
  const fullOk =
    card.contactName &&
    card.contactName !== "—" &&
    card.contactName !== "Contact TBD" &&
    card.contactName !== card.companyName;
  if (fullOk) parts.push(card.contactName);
  else if (first && first !== card.companyName) parts.push(first);
  if (card.service) parts.push(card.service);
  if (card.location) parts.push(card.location);
  if (card.sourcedBy) parts.push(`Sourced by ${card.sourcedBy}`);
  return parts.join(" · ");
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDue(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

const OUTREACH_ACTIONS: Array<{ kind: OutreachKind; label: string }> = [
  { kind: "email", label: "Email sent" },
  { kind: "call", label: "Called" },
  { kind: "meeting", label: "Meeting" },
  { kind: "note", label: "Note" },
  { kind: "follow-up", label: "Follow-up" },
];

export function OpportunityCard({
  card,
  focused,
}: {
  card: SalesOpportunityCard;
  focused?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState(false);
  const [pendingWaiting, setPendingWaiting] = useState(false);
  const [waitingDate, setWaitingDate] = useState("");
  const [storyOpen, setStoryOpen] = useState(Boolean(focused));
  const [story, setStory] = useState<StoryItem[] | null>(null);
  const moves = WORKSPACE_MOVES[card.status] ?? [];
  const first = contactFirstName(card.contactName);
  const open = card.status !== "won" && card.status !== "lost";
  const needsOutreach =
    card.nextAction === "respond-today" ||
    card.sectionId === "needs-response" ||
    card.sectionId === "new-leads";

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sales/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, ...body }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Update failed.");
        return;
      }
      setPendingLost(false);
      setPendingWaiting(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logOutreach(kind: OutreachKind) {
    const summary =
      kind === "note" ? window.prompt("Note") ?? "" : undefined;
    if (kind === "note" && !summary?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/leads/${card.id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, summary: summary?.trim() || undefined }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Could not log outreach.");
        return;
      }
      setStory(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!storyOpen || story) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/admin/sales/leads/${card.id}/activities`);
      const data = (await res.json()) as { success?: boolean; activities?: StoryItem[] };
      if (!cancelled && data.success) setStory(data.activities ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [storyOpen, story, card.id]);

  type Action = {
    key: string;
    label: string;
    href: string;
    external?: boolean;
    primary?: boolean;
  };

  const actions: Action[] = [];
  if (card.email) {
    actions.push({
      key: "email",
      label: first ? `Email ${first}` : "Email",
      href: `mailto:${card.email}`,
      primary: needsOutreach,
    });
  }
  if (card.phone) {
    actions.push({
      key: "call",
      label: first && !card.email ? `Call ${first}` : "Call",
      href: `tel:${card.phone.replace(/[^\d+]/g, "")}`,
      primary: needsOutreach && !card.email,
    });
  }
  if (card.opportunityUrl) {
    actions.push({
      key: "opportunity",
      label: "View Opportunity",
      href: card.opportunityUrl.startsWith("http")
        ? card.opportunityUrl
        : `https://${card.opportunityUrl}`,
      external: true,
      primary: needsOutreach && !card.email && !card.phone,
    });
  }

  const primary = actions.find((a) => a.primary) ?? null;
  const secondary = actions.filter((a) => a !== primary);
  const context = contextLine(card);
  const valueBit =
    card.estimatedValue != null && !Number.isNaN(card.estimatedValue)
      ? fmtMoney(card.estimatedValue)
      : null;
  const dueLabel = fmtDue(card.nextFollowUp);
  const nextOptions = open
    ? NEXT_ACTIONS.filter((a) => a.value !== "none")
    : NEXT_ACTIONS;
  const headline = card.attentionLabel || card.nextActionLabel || card.sectionLabel;

  return (
    <article
      id={`opportunity-${card.id}`}
      className="kxd-os-card"
      data-opportunity-id={card.id}
      style={{
        marginBottom: "0.85rem",
        outline: focused ? "1px solid rgba(194,170,114,0.45)" : undefined,
        padding: "1.15rem 1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: "16rem", flex: "1 1 18rem" }}>
          <p
            className="kxd-os-card__title"
            style={{ fontSize: "1.125rem", letterSpacing: "-0.01em" }}
          >
            {card.companyName}
          </p>
          {context ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.35rem", lineHeight: 1.45 }}>
              {context}
            </p>
          ) : null}

          <p
            style={{
              marginTop: "0.85rem",
              fontFamily: "var(--kxd-os-font-sans, inherit)",
              fontSize: "0.875rem",
              fontWeight: 500,
              letterSpacing: "-0.014em",
              textTransform: "none",
              color: "var(--kxd-os-text-primary)",
            }}
          >
            {headline}
            {dueLabel ? (
              <span className="kxd-os-meta" style={{ marginLeft: "0.5rem", fontWeight: 400 }}>
                · {dueLabel}
              </span>
            ) : null}
          </p>

          <div
            style={{
              marginTop: "0.65rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.5rem 0.75rem",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: "var(--font-outfit, inherit)",
                fontSize: "0.875rem",
                color: "var(--kxd-os-text, inherit)",
              }}
            >
              <span style={{ opacity: 0.55, fontSize: "0.75rem" }}>Next</span>
              <select
                disabled={busy}
                value={
                  pendingWaiting
                    ? "waiting-on-prospect"
                    : card.nextAction === "none" && open
                      ? "respond-today"
                      : card.nextAction
                }
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === "waiting-on-prospect") {
                    setPendingWaiting(true);
                    setWaitingDate(toLocalInput(card.nextFollowUp));
                    return;
                  }
                  setPendingWaiting(false);
                  void patch({ nextAction: next });
                }}
                aria-label="Next action"
                style={{
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "inherit",
                  background: "transparent",
                  border: "1px solid var(--kxd-os-border-divider, rgba(255,255,255,0.12))",
                  padding: "0.35rem 0.55rem",
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                {nextOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="kxd-os-meta" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Due
              <input
                type="datetime-local"
                disabled={busy}
                defaultValue={toLocalInput(card.nextFollowUp)}
                key={card.nextFollowUp ?? "empty"}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const iso = new Date(value).toISOString();
                  if (iso === card.nextFollowUp) return;
                  const action =
                    card.nextAction === "none" && open ? "respond-today" : card.nextAction;
                  void patch({ nextAction: action, nextFollowUp: iso });
                }}
                aria-label="Follow-up due"
                style={{
                  fontFamily: "inherit",
                  fontSize: "0.75rem",
                  color: "inherit",
                  background: "transparent",
                  border: "1px solid var(--kxd-os-border-divider, rgba(255,255,255,0.12))",
                  padding: "0.25rem 0.4rem",
                }}
              />
            </label>
            {card.nextActionNote ? (
              <span className="kxd-os-meta">{card.nextActionNote}</span>
            ) : null}
          </div>

          {pendingWaiting ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
              Set a future reopen date to wait.
              <input
                type="datetime-local"
                value={waitingDate}
                onChange={(e) => setWaitingDate(e.target.value)}
                aria-label="Waiting reopen date"
                style={{
                  fontFamily: "inherit",
                  fontSize: "0.75rem",
                  color: "inherit",
                  background: "transparent",
                  border: "1px solid var(--kxd-os-border-divider, rgba(255,255,255,0.12))",
                  padding: "0.25rem 0.4rem",
                }}
              />
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost"
                disabled={busy || !waitingDate}
                onClick={() => {
                  if (!waitingDate) return;
                  void patch({
                    nextAction: "waiting-on-prospect",
                    nextFollowUp: new Date(waitingDate).toISOString(),
                  });
                }}
              >
                Save waiting date
              </button>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost"
                onClick={() => setPendingWaiting(false)}
              >
                Cancel
              </button>
            </p>
          ) : null}

          <p className="kxd-os-meta" style={{ marginTop: "0.65rem" }}>
            {card.ageLabel}
            {valueBit ? ` · ${valueBit}` : ""}
            {card.sourceResearchLeadId ? (
              <>
                {" · "}
                <Link href="/admin/operations/research" className="kxd-os-meta">
                  From research
                </Link>
              </>
            ) : card.sourceInquiryId ? (
              <>
                {" · "}
                <Link
                  href={`/admin/collections/inquiries/${card.sourceInquiryId}`}
                  className="kxd-os-meta"
                >
                  From contact inquiry
                </Link>
              </>
            ) : card.sourceProjectInquiryId ? (
              <>
                {" · "}
                <Link
                  href={`/admin/collections/project-inquiries/${card.sourceProjectInquiryId}`}
                  className="kxd-os-meta"
                >
                  From start project
                </Link>
              </>
            ) : card.sourceWebsiteAuditId ? (
              <>
                {" · "}
                <Link href="/admin/operations/audits" className="kxd-os-meta">
                  From website audit
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.65rem",
            minWidth: "10rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "flex-end" }}>
            {primary ? (
              <a
                href={primary.href}
                className="kxd-os-btn kxd-os-btn--primary"
                style={{ textDecoration: "none" }}
                {...(primary.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {primary.label}
              </a>
            ) : null}
            {secondary.map((a) => (
              <a
                key={a.key}
                href={a.href}
                className="kxd-os-btn kxd-os-btn--ghost"
                style={{ textDecoration: "none" }}
                {...(a.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {a.label}
              </a>
            ))}
            <Link
              href={`/admin/collections/sales-leads/${card.id}`}
              className="kxd-os-btn kxd-os-btn--ghost"
            >
              Details
            </Link>
          </div>

          {open ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "flex-end" }}>
              {OUTREACH_ACTIONS.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  disabled={busy}
                  className="kxd-os-btn kxd-os-btn--ghost"
                  onClick={() => void logOutreach(item.kind)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {moves.length > 0 ? (
            <select
              disabled={busy}
              defaultValue=""
              aria-label="Move opportunity"
              onChange={(e) => {
                const next = e.target.value;
                e.target.value = "";
                if (!next) return;
                if (next === "lost") {
                  setPendingLost(true);
                  return;
                }
                void patch({ status: next });
              }}
              style={{
                fontFamily: "var(--font-outfit, inherit)",
                fontSize: "0.6875rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--kxd-os-text-muted, rgba(255,255,255,0.55))",
                background: "transparent",
                border: "1px solid var(--kxd-os-border-divider, rgba(255,255,255,0.1))",
                padding: "0.4rem 0.55rem",
                cursor: busy ? "wait" : "pointer",
                maxWidth: "14rem",
              }}
            >
              <option value="">Move to…</option>
              {moves.map((m) => (
                <option key={m.status} value={m.status}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {pendingLost ? (
        <div style={{ marginTop: "0.85rem" }}>
          <p className="kxd-os-meta">Why is this not moving?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem" }}>
            {LOST_REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                disabled={busy}
                className="kxd-os-btn kxd-os-btn--ghost"
                onClick={() => void patch({ status: "lost", lostReason: reason.value })}
              >
                {reason.label}
              </button>
            ))}
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              onClick={() => setPendingLost(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: "0.85rem" }}>
        <button
          type="button"
          className="kxd-os-btn kxd-os-btn--ghost"
          onClick={() => setStoryOpen((openStory) => !openStory)}
        >
          {storyOpen ? "Hide history" : "History"}
        </button>
        {storyOpen ? (
          <ol style={{ margin: "0.65rem 0 0", paddingLeft: "1.1rem" }}>
            {!story ? (
              <li className="kxd-os-meta">Loading…</li>
            ) : story.length === 0 ? (
              <li className="kxd-os-meta">No commercial history yet.</li>
            ) : (
              story.map((item) => (
                <li key={item.id} style={{ marginBottom: "0.45rem" }}>
                  <span className="kxd-os-meta">
                    {fmtDue(item.occurredAt) ?? "—"} · {item.activityType}
                  </span>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.875rem" }}>{item.title}</p>
                  {item.summary ? <p className="kxd-os-meta">{item.summary}</p> : null}
                </li>
              ))
            )}
          </ol>
        ) : null}
      </div>

      {error ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.5rem", color: "var(--kxd-os-danger, #c45c5c)" }}>
          {error}
        </p>
      ) : null}
    </article>
  );
}
