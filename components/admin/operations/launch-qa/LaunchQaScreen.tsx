"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsEmpty,
  OpsKpiStrip,
  OpsListRow,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { LaunchQaPortfolioData } from "@/lib/launch-qa/types";
import { recommendationLabel } from "@/lib/launch-qa/scoring";

type Filter = "all" | "open" | "blocked" | "ready" | "approved" | "launched";

export function LaunchQaScreen({ data }: { data: LaunchQaPortfolioData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = data.sessions;
    if (filter === "open") {
      list = list.filter((s) => !["launched", "archived", "approved"].includes(s.status));
    } else if (filter !== "all") {
      list = list.filter((s) => s.status === filter);
    }
    if (q) {
      list = list.filter(
        (s) =>
          s.clientName.toLowerCase().includes(q) ||
          String(s.websiteUrl ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data.sessions, filter, q]);

  return (
    <OperationsShell activeId="launch-qa">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Launch QA"
          title="Launch QA Center"
          lead="Pre-launch checklist and readiness scoring — verify every site before go-live."
        />

        <OpsKpiStrip
          items={[
            { label: "Open", value: String(data.totals.open), alert: data.totals.open > 0 },
            { label: "Blocked", value: String(data.totals.blocked), alert: data.totals.blocked > 0 },
            { label: "Ready", value: String(data.totals.ready) },
            { label: "Approved", value: String(data.totals.approved) },
            { label: "Avg Score", value: `${data.totals.avgScore}%` },
          ]}
        />

        <div className="kxd-os-ops-workflow-actions" style={{ margin: "1.25rem 0" }}>
          {(["all", "open", "blocked", "ready", "approved", "launched"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm${filter === f ? " kxd-os-ops-step-pill--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.replace(/-/g, " ")}
            </button>
          ))}
        </div>

        <input
          type="search"
          className="kxd-os-input"
          placeholder="Search clients or URLs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "1rem", maxWidth: "320px" }}
        />

        <KxdSection label="Launch QA Sessions">
          {filtered.length === 0 ? (
            <OpsEmpty message="No Launch QA sessions match this filter." />
          ) : (
            <div className="kxd-os-list-stack">
              {filtered.map((s) => (
                <OpsListRow key={s.id} href={s.href}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-body">{s.clientName}</p>
                      <p className="kxd-os-meta">
                        {s.readinessScore}% · {recommendationLabel(s.recommendation)} · {s.status.replace(/-/g, " ")}
                      </p>
                      {s.websiteUrl ? <p className="kxd-os-meta">{s.websiteUrl}</p> : null}
                    </div>
                    {s.criticalBlockers > 0 ? (
                      <span className="kxd-os-meta">{s.criticalBlockers} blocker(s)</span>
                    ) : null}
                  </div>
                </OpsListRow>
              ))}
            </div>
          )}
        </KxdSection>

        <p className="kxd-os-meta">
          <Link href="/admin/operations/clients" className="kxd-os-link-quiet">← Client Portfolio</Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
