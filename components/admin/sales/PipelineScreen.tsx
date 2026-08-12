"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KxdMetric, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { NEXT_ACTIONS } from "@/lib/sales/next-action";
import { WORKSPACE_MOVES } from "@/lib/sales/workspace-stages";
import type { SalesOpportunityCard, SalesWorkspaceData } from "@/lib/sales/workspace";
import { fmtMoney } from "./shared";

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

function attentionHeadline(card: SalesOpportunityCard): string {
  if (card.nextAction !== "none") return card.nextActionLabel;
  return card.sectionLabel;
}

function OpportunityRow({
  card,
  focused,
}: {
  card: SalesOpportunityCard;
  focused?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const moves = WORKSPACE_MOVES[card.status] ?? [];
  const first = contactFirstName(card.contactName);
  const needsOutreach =
    card.nextAction === "respond-today" ||
    card.sectionId === "needs-response" ||
    card.sectionId === "new-leads";

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sales/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, ...body }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
              fontFamily: "var(--font-outfit, inherit)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--kxd-os-accent, #c2aa72)",
            }}
          >
            {attentionHeadline(card)}
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
              <span style={{ opacity: 0.55, fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Next
              </span>
              <select
                disabled={busy}
                value={card.nextAction}
                onChange={(e) => patch({ nextAction: e.target.value })}
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
                {NEXT_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            {card.nextActionNote ? (
              <span className="kxd-os-meta">{card.nextActionNote}</span>
            ) : null}
          </div>

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

          {moves.length > 0 ? (
            <select
              disabled={busy}
              defaultValue=""
              aria-label="Move opportunity"
              onChange={(e) => {
                const next = e.target.value;
                e.target.value = "";
                if (next) void patch({ status: next });
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
    </article>
  );
}

export function PipelineScreen({
  data,
  focusId,
}: {
  data: SalesWorkspaceData;
  focusId?: number | null;
}) {
  const needsResponse =
    data.sections.find((s) => s.id === "needs-response")?.count ?? 0;
  const newLeads = data.sections.find((s) => s.id === "new-leads")?.count ?? 0;
  const proposal =
    data.sections.find((s) => s.id === "proposal-decision")?.count ?? 0;

  const kpis = [
    { label: "Needs you", value: String(needsResponse + newLeads) },
    { label: "Open opportunities", value: String(data.totalOpen) },
    { label: "Proposal / decision", value: String(proposal) },
    { label: "Potential value", value: fmtMoney(data.totalValueOpen) },
  ];

  const primarySections = data.sections.filter(
    (s) => s.id !== "won" && s.id !== "not-moving",
  );
  const archiveSections = data.sections.filter(
    (s) => s.id === "won" || s.id === "not-moving",
  );

  return (
    <OperationsShell activeId="sales-pipeline" showQuickActions={false}>
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Pipeline"
          lead="Who needs you, what to do next, and where the money is."
        />

        <KxdSection className="kxd-os-operations-section">
          <p className="kxd-os-section__label" style={{ marginBottom: "0.85rem" }}>
            Revenue snapshot
          </p>
          <div className="kxd-os-ops-kpi-grid">
            {kpis.map((kpi) => (
              <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
            ))}
          </div>
        </KxdSection>

        <KxdSection>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <p className="kxd-os-section__label">Needs attention</p>
              <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                Prioritized by next action — start here.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/admin/operations/research" className="kxd-os-btn kxd-os-btn--ghost">
                Research Desk
              </Link>
              <Link href="/admin/sales/leads" className="kxd-os-btn kxd-os-btn--ghost">
                All leads
              </Link>
            </div>
          </div>

          {data.attention.length === 0 ? (
            <p className="kxd-os-body">
              No open opportunities yet. Promote a research lead to begin.
            </p>
          ) : (
            data.attention.map((card) => (
              <OpportunityRow
                key={`attn-${card.id}`}
                card={card}
                focused={focusId === card.id}
              />
            ))
          )}
        </KxdSection>

        {primarySections.map((section) => (
          <KxdSection key={section.id}>
            <div style={{ marginBottom: "0.85rem" }}>
              <p className="kxd-os-section__label">
                {section.label}
                <span className="kxd-os-meta" style={{ marginLeft: "0.65rem" }}>
                  {section.count}
                </span>
              </p>
              <p className="kxd-os-meta" style={{ marginTop: "0.25rem" }}>
                {section.description}
              </p>
            </div>
            {section.opportunities.length === 0 ? (
              <p className="kxd-os-meta">None right now.</p>
            ) : (
              section.opportunities.map((card) => (
                <OpportunityRow
                  key={card.id}
                  card={card}
                  focused={focusId === card.id}
                />
              ))
            )}
          </KxdSection>
        ))}

        {archiveSections.some((s) => s.count > 0) ? (
          <KxdSection>
            <p className="kxd-os-section__label" style={{ marginBottom: "1rem" }}>
              Settled
            </p>
            {archiveSections.map((section) =>
              section.count === 0 ? null : (
                <div key={section.id} style={{ marginBottom: "1.25rem" }}>
                  <p className="kxd-os-meta" style={{ marginBottom: "0.65rem" }}>
                    {section.label} · {section.count}
                  </p>
                  {section.opportunities.map((card) => (
                    <OpportunityRow
                      key={card.id}
                      card={card}
                      focused={focusId === card.id}
                    />
                  ))}
                </div>
              ),
            )}
          </KxdSection>
        ) : null}
      </KxdPage>
    </OperationsShell>
  );
}
