"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KxdBadge } from "@/components/os";
import { fmtMoney, type SalesUiDoc } from "./shared";

const NEXT_STATUS: Record<string, string[]> = {
  new: ["discovery", "lost", "nurturing"],
  discovery: ["proposal", "lost", "nurturing"],
  proposal: ["negotiation", "lost", "nurturing"],
  negotiation: ["won", "lost", "nurturing"],
};

function LeadCard({ lead, onMoved }: { lead: SalesUiDoc; onMoved: () => void }) {
  const [busy, setBusy] = useState(false);
  const status = String(lead.status ?? "new");
  const moves = NEXT_STATUS[status] ?? [];

  async function moveTo(next: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sales/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: next }),
      });
      if (res.ok) onMoved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="kxd-os-card kxd-os-sales-card"
      data-lead-id={lead.id}
      data-status={status}
      draggable="true"
      style={{ marginBottom: "0.65rem" }}
    >
      <p className="kxd-os-card__title">{String(lead.companyName ?? "Lead")}</p>
      <p className="kxd-os-meta" style={{ marginTop: "0.25rem" }}>
        {String(lead.contactName ?? "—")}
      </p>
      <p className="kxd-os-body" style={{ marginTop: "0.45rem" }}>
        {fmtMoney(lead.estimatedValue as number)} · {Number(lead.probability ?? 25)}%
      </p>
      {moves.length > 0 ? (
        <div className="kxd-os-sales-card__actions" style={{ marginTop: "0.65rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {moves.map((next) => (
            <button
              key={next}
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={busy}
              onClick={() => moveTo(next)}
            >
              → {next}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function PipelineBoard({
  columns,
}: {
  columns: { status: string; label: string; leads: SalesUiDoc[]; totalValue: number }[];
}) {
  const router = useRouter();

  return (
    <div className="kxd-os-sales-pipeline" data-pipeline-ready="true">
      {columns.map((col) => (
        <section
          key={col.status}
          className="kxd-os-sales-pipeline__column"
          data-column={col.status}
          aria-label={col.label}
        >
          <header className="kxd-os-sales-pipeline__head">
            <h2 className="kxd-os-section__label">{col.label}</h2>
            <KxdBadge variant="default">{col.leads.length}</KxdBadge>
          </header>
          <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
            {fmtMoney(col.totalValue)}
          </p>
          <div className="kxd-os-sales-pipeline__cards">
            {col.leads.map((lead) => (
              <LeadCard key={lead.id as number} lead={lead} onMoved={() => router.refresh()} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
