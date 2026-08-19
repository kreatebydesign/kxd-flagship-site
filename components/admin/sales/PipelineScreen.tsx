"use client";

import Link from "next/link";
import { KxdMetric, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { SalesWorkspaceData } from "@/lib/sales/workspace";
import { OpportunityCard } from "./OpportunityCard";
import { fmtMoney } from "./shared";

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
          lead="Who needs you, what happened, what happens next, and when to act."
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
                Overdue, respond today, proposal idle, then stale — start here.
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
              Nothing needs you in Sales right now.
            </p>
          ) : (
            data.attention.map((card) => (
              <OpportunityCard
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
                <OpportunityCard
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
                    <OpportunityCard
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
