/**
 * /admin/operations/money-moves
 * Mission 003B — focused commercial Money Moves + Sales Memory surface.
 * Restrained UI; Mission 004 owns product experience redesign.
 */

import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { loadMoneyMovesSnapshot, loadSalesMemory } from "@/lib/commercial";
import type { MoneyMoveState } from "@/lib/commercial";

export const dynamic = "force-dynamic";

function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function stateVariant(state: MoneyMoveState): KxdBadgeVariant {
  switch (state) {
    case "COLLECTIBLE":
      return "critical";
    case "VARIABLE_NEEDS_CONFIRMATION":
    case "REVIEW_REQUIRED":
      return "warning";
    case "RENEWAL":
    case "PENDING_TRIGGER":
    case "PLANNED":
      return "pending";
    case "UPCOMING":
      return "default";
    default:
      return "default";
  }
}

export default async function MoneyMovesPage() {
  const [moves, memory] = await Promise.all([
    loadMoneyMovesSnapshot(),
    loadSalesMemory(),
  ]);

  const byState = (state: MoneyMoveState) =>
    moves.items.filter((i) => i.state === state);

  return (
    <OperationsShell activeId="money-moves">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Business"
          title="Money Moves"
          lead="What money exists now, what is coming, what is blocked by action, and what needs confirmation — from canonical commercial truth only."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <KxdMetric
            label="Verified MRR"
            value={money(moves.totals.currentVerifiedMrrCents)}
          />
          <KxdMetric
            label="Pending / future MRR"
            value={money(moves.totals.pendingFutureMrrCents)}
          />
          <KxdMetric
            label="Annual / renewal"
            value={money(moves.totals.annualRecurringCents)}
          />
          <KxdMetric
            label="Project receivables"
            value={money(moves.totals.projectReceivablesCents)}
          />
          <KxdMetric
            label="Variable due"
            value={money(moves.totals.variablePerformanceCents)}
          />
        </div>

        <KxdSection label="Action queue">
          {moves.items.length === 0 ? (
            <KxdEmptyState title="No money moves" description="No collectible, pending, or review items." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
              {moves.items.slice(0, 40).map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: "grid",
                    gap: "0.35rem",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid var(--kxd-os-border, rgba(0,0,0,0.08))",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                    <KxdBadge variant={stateVariant(item.state)}>{item.state.replace(/_/g, " ")}</KxdBadge>
                    <Link href={item.href} className="kxd-os-body" style={{ fontWeight: 600 }}>
                      {item.clientName}
                    </Link>
                    <span className="kxd-os-meta">{money(item.amountCents)}</span>
                  </div>
                  <div className="kxd-os-body">{item.title}</div>
                  <div className="kxd-os-meta">{item.detail}</div>
                </li>
              ))}
            </ul>
          )}
        </KxdSection>

        <KxdSection label="Sales Memory">
          {memory.items.length === 0 ? (
            <KxdEmptyState title="No sales memory" description="No derived or operator commercial memory yet." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.65rem" }}>
              {memory.items.slice(0, 25).map((item) => (
                <li key={item.id} style={{ padding: "0.5rem 0" }}>
                  <div className="kxd-os-meta">
                    {item.source} · {item.kind.replace(/_/g, " ")}
                    {item.clientName ? ` · ${item.clientName}` : ""}
                  </div>
                  <div className="kxd-os-body" style={{ fontWeight: 600 }}>
                    {item.href ? <Link href={item.href}>{item.title}</Link> : item.title}
                  </div>
                  {item.summary ? <div className="kxd-os-meta">{item.summary}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </KxdSection>

        <KxdSection label="Universe (categories)">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.4rem" }}>
            {moves.categoriesByClient
              .filter((c) => c.categories.length > 0 || c.activeMrrCents > 0)
              .slice(0, 30)
              .map((c) => (
                <li key={c.clientId} className="kxd-os-meta">
                  <Link href={`/admin/operations/client-command/${c.clientId}?tab=financial`}>
                    {c.clientName}
                  </Link>
                  {" — "}
                  {c.categories.join(", ") || "uncategorized"}
                  {c.pricingClassification ? ` · ${c.pricingClassification}` : ""}
                  {c.activeMrrCents > 0 ? ` · MRR ${money(c.activeMrrCents)}` : ""}
                </li>
              ))}
          </ul>
        </KxdSection>

        <p className="kxd-os-meta" style={{ marginTop: "1.5rem" }}>
          Generated {moves.generatedAt}. Collectible {byState("COLLECTIBLE").length} ·
          Pending {byState("PENDING_TRIGGER").length} · Planned {byState("PLANNED").length} ·
          Review {byState("REVIEW_REQUIRED").length}. Missing hosting authority:{" "}
          {moves.totals.missingAuthorityCount}.
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
