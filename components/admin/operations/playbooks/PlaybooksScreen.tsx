"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  KxdBadge,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  AUTOMATION_TRIGGER_LABELS,
  PLAYBOOK_CATEGORY_LABELS,
  PLAYBOOK_RUN_STATUS_LABELS,
} from "@/lib/playbooks/labels";
import { QUICK_LAUNCH_SLUGS } from "@/lib/playbooks/templates";
import type { PlaybookDashboardData, PlaybookListItem } from "@/lib/playbooks/types";

type ViewFilter = "all" | "templates" | "active" | "completed";

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "blocked":
      return "critical";
    case "in-progress":
      return "status";
    default:
      return "default";
  }
}

function LaunchForm({
  playbooks,
  defaultSlug,
  defaultClientId,
}: {
  playbooks: PlaybookListItem[];
  defaultSlug?: string;
  defaultClientId?: number;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [clientId, setClientId] = useState(defaultClientId ? String(defaultClientId) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function launch() {
    if (!slug || !clientId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/playbooks/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookSlug: slug, clientId: Number(clientId) }),
      });
      const json = await res.json();
      if (json.success && json.href) {
        router.push(json.href);
      } else {
        setError(json.error ?? "Launch failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-card" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
      <p className="kxd-os-section__label">Launch Playbook</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <select className="kxd-notif-select" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Playbook">
          <option value="">Select playbook</option>
          {playbooks.filter((p) => p.active).map((p) => (
            <option key={p.id} value={p.slug}>{p.name}</option>
          ))}
        </select>
        <input
          className="kxd-notif-select"
          type="number"
          placeholder="Client ID"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-label="Client ID"
        />
        <button type="button" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm" disabled={busy} onClick={launch}>
          Launch run
        </button>
      </div>
      {error ? <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)", marginTop: "0.5rem" }}>{error}</p> : null}
    </div>
  );
}

export function PlaybooksScreen({
  data,
  initialPlaybookSlug,
  initialClientId,
}: {
  data: PlaybookDashboardData;
  initialPlaybookSlug?: string;
  initialClientId?: number;
}) {
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filteredPlaybooks = data.playbooks.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.slug.includes(q)) return false;
    return true;
  });

  const quickLinks = [
    { label: "Website Launch", slug: QUICK_LAUNCH_SLUGS.websiteLaunch },
    { label: "Monthly Report", slug: QUICK_LAUNCH_SLUGS.monthlyReport },
    { label: "Client Onboarding", slug: QUICK_LAUNCH_SLUGS.onboarding },
    { label: "Quarterly Review", slug: QUICK_LAUNCH_SLUGS.quarterlyReview },
    { label: "SEO Checklist", slug: QUICK_LAUNCH_SLUGS.seoChecklist },
    { label: "Website Audit", slug: QUICK_LAUNCH_SLUGS.websiteAudit },
  ];

  return (
    <OperationsShell activeId="playbooks">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Execution Layer"
          title="Playbooks & SOPs"
          lead="Repeatable operational workflows — launch, onboard, report, and run the agency with precision."
        />

        <OpsKpiStrip
          items={[
            { label: "Templates", value: String(data.stats.templateCount) },
            { label: "Active Runs", value: String(data.stats.activeRunCount), alert: data.stats.activeRunCount > 0 },
            { label: "Completed", value: String(data.stats.completedRunCount) },
            { label: "Blocked", value: String(data.stats.blockedRunCount), alert: data.stats.blockedRunCount > 0 },
          ]}
        />

        <LaunchForm
          playbooks={data.playbooks}
          defaultSlug={initialPlaybookSlug}
          defaultClientId={initialClientId}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {(["all", "templates", "active", "completed"] as ViewFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm${filter === f ? " kxd-os-btn--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <input
            className="kxd-notif-select"
            style={{ maxWidth: "14rem" }}
            placeholder="Search playbooks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search playbooks"
          />
        </div>

        <KxdSection label="Quick Launch" className="kxd-os-operations-section">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {quickLinks.map((link) => (
              <Link
                key={link.slug}
                href={`/admin/operations/playbooks?playbook=${link.slug}`}
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </KxdSection>

        {(filter === "all" || filter === "active") && data.activeRuns.length > 0 ? (
          <KxdSection label="Active Runs" className="kxd-os-operations-section">
            <div className="kxd-os-list-stack">
              {data.activeRuns.map((run) => (
                <OpsListRow key={run.id} href={run.href}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-body">{run.playbookName}</p>
                      <p className="kxd-os-meta">{run.clientName} · {run.percentComplete}%</p>
                    </div>
                    <KxdBadge variant={statusVariant(run.status)}>
                      {PLAYBOOK_RUN_STATUS_LABELS[run.status]}
                    </KxdBadge>
                  </div>
                </OpsListRow>
              ))}
            </div>
          </KxdSection>
        ) : null}

        {(filter === "all" || filter === "completed") && data.completedRuns.length > 0 ? (
          <KxdSection label="Completed Runs" className="kxd-os-operations-section">
            <div className="kxd-os-list-stack">
              {data.completedRuns.slice(0, 12).map((run) => (
                <OpsListRow key={run.id} href={run.href}>
                  <p className="kxd-os-body">{run.playbookName}</p>
                  <p className="kxd-os-meta">{run.clientName}</p>
                </OpsListRow>
              ))}
            </div>
          </KxdSection>
        ) : null}

        {(filter === "all" || filter === "templates") ? (
          <KxdSection label="Playbook Templates" className="kxd-os-operations-section">
            <div className="kxd-os-ops-playbook-grid">
              {filteredPlaybooks.map((playbook) => (
                <div key={playbook.id} className="kxd-os-card kxd-os-ops-playbook-card">
                  <div className="kxd-os-ops-playbook-card__head">
                    <span className="kxd-integ-card__logo" aria-hidden>{playbook.icon}</span>
                    <h2 className="kxd-os-ops-playbook-card__title">{playbook.name}</h2>
                    <KxdBadge variant="tier">
                      {PLAYBOOK_CATEGORY_LABELS[playbook.category]}
                    </KxdBadge>
                  </div>
                  <p className="kxd-os-ops-playbook-card__description">{playbook.description}</p>
                  <p className="kxd-os-meta">{playbook.stepCount} steps · {playbook.estimatedDuration}</p>
                  <Link href={`?playbook=${playbook.slug}`} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
                    Launch
                  </Link>
                </div>
              ))}
            </div>
          </KxdSection>
        ) : null}

        <p className="kxd-os-ops-footnote">
          Edit templates in Payload ·{" "}
          <Link href="/admin/collections/playbooks" className="kxd-os-link-quiet">Playbooks</Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
