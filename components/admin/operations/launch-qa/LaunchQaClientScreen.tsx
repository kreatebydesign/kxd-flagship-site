"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  KxdButton,
  KxdDateInput,
  KxdInput,
  KxdPage,
  KxdSection,
  KxdTextarea,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsKpiStrip } from "@/components/admin/operations/shared/OpsBriefing";
import { LAUNCH_QA_CATEGORIES } from "@/lib/launch-qa/templates";
import { recommendationLabel } from "@/lib/launch-qa/scoring";
import type {
  LaunchQaChecklistItem,
  LaunchQaDetail,
  LaunchQaItemStatus,
} from "@/lib/launch-qa/types";

const STATUS_OPTIONS: LaunchQaItemStatus[] = ["pending", "pass", "fail", "skip", "na"];

export function LaunchQaClientScreen({
  initialDetail,
  clientId,
}: {
  initialDetail: LaunchQaDetail | null;
  clientId: number;
}) {
  const [detail, setDetail] = useState<LaunchQaDetail | null>(initialDetail);
  const [items, setItems] = useState<LaunchQaChecklistItem[]>(initialDetail?.checklistItems ?? []);
  const [websiteUrl, setWebsiteUrl] = useState(initialDetail?.websiteUrl ?? "");
  const [launchDate, setLaunchDate] = useState(initialDetail?.launchDate?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(initialDetail?.notes ?? "");
  const [autosaveNote, setAutosaveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState(LAUNCH_QA_CATEGORIES[0].id);

  const ensureSession = useCallback(async () => {
    if (detail) return detail;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/launch-qa/client/${clientId}`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.detail) {
        setDetail(data.detail);
        setItems(data.detail.checklistItems);
        return data.detail;
      }
      setError(data.message ?? "Could not start Launch QA.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
    return null;
  }, [detail, clientId]);

  useEffect(() => {
    if (!detail) ensureSession();
  }, [detail, ensureSession]);

  useEffect(() => {
    if (!detail?.id) return;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/launch-qa/${detail.id}/save`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistItems: items,
            websiteUrl,
            launchDate: launchDate || undefined,
            notes,
          }),
        });
        const data = await res.json();
        if (data.success && data.detail) {
          setDetail(data.detail);
          setAutosaveNote("Checklist saved");
          window.setTimeout(() => setAutosaveNote(""), 2000);
        }
      } catch {
        setAutosaveNote("Autosave failed");
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [items, websiteUrl, launchDate, notes, detail?.id]);

  const updateItem = (itemId: string, patch: Partial<LaunchQaChecklistItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  };

  const runAction = async (action: string, itemId?: string, status?: LaunchQaItemStatus) => {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/launch-qa/${detail.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message ?? "Action failed.");
        return;
      }
      if (data.detail) setDetail(data.detail);
      if (data.href) window.open(data.href, "_blank");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const categoryItems = items.filter((i) => i.categoryId === activeCategory);
  const catSummary = detail?.categories.find((c) => c.id === activeCategory);

  return (
    <OperationsShell activeId="launch-qa" clientId={clientId}>
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-os-ops-section-head">
          <OperationsPageHero
            eyebrow="KXD OS · Launch QA"
            title={detail?.clientName ?? "Launch QA"}
            lead="Complete every checklist item before DNS cutover."
          />
          <Link href="/admin/operations/launch-qa" className="kxd-os-link-quiet">← Launch QA Center</Link>
        </div>

        {error ? <div className="kxd-os-ops-alert kxd-os-ops-alert--error">{error}</div> : null}

        {detail ? (
          <>
            <OpsKpiStrip
              items={[
                { label: "Readiness", value: `${detail.readinessScore}%`, alert: detail.readinessScore < 80 },
                { label: "Recommendation", value: recommendationLabel(detail.recommendation) },
                { label: "Blockers", value: String(detail.scores.criticalBlockerCount), alert: detail.scores.criticalBlockerCount > 0 },
                { label: "Warnings", value: String(detail.scores.warningCount) },
                { label: "Required", value: `${detail.scores.completedRequired}/${detail.scores.requiredTotal}` },
              ]}
            />
            {autosaveNote ? <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>{autosaveNote}</p> : null}

            <div className="grid gap-4 sm:grid-cols-3" style={{ margin: "1.25rem 0" }}>
              <KxdInput
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://staging.example.com"
                aria-label="Website URL"
              />
              <KxdDateInput
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                aria-label="Launch date"
              />
              <KxdTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Launch notes"
                rows={1}
              />
            </div>

            <div className="kxd-os-ops-genesis__layout">
              <aside className="kxd-os-ops-genesis__sidebar">
                <p className="kxd-os-section-label">Categories</p>
                <nav className="kxd-os-ops-genesis__phase-list">
                  {LAUNCH_QA_CATEGORIES.map((cat) => {
                    const sum = detail.categories.find((c) => c.id === cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`kxd-os-ops-genesis__phase${activeCategory === cat.id ? " kxd-os-ops-genesis__phase--active" : ""}`}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        <span className="kxd-os-ops-genesis__phase-label">{cat.label}</span>
                        <span className="kxd-os-meta">
                          {sum ? `${sum.completed}/${sum.total}` : "—"}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              <main>
                <KxdSection label={LAUNCH_QA_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Checklist"}>
                  {catSummary ? (
                    <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
                      {catSummary.requiredComplete}/{catSummary.requiredTotal} required complete
                    </p>
                  ) : null}
                  <div className="kxd-os-list-stack">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="kxd-os-ops-review-row" style={{ alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <p className="kxd-os-body">
                            {item.required ? "● " : "○ "}{item.title}
                            {item.severity === "critical" ? " · critical" : ""}
                          </p>
                          <p className="kxd-os-meta">{item.description}</p>
                          <KxdTextarea
                            value={item.notes ?? ""}
                            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                            placeholder="Notes"
                            rows={2}
                            style={{ marginTop: "0.5rem" }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "120px" }}>
                          <select
                            className="kxd-os-input"
                            value={item.status}
                            onChange={(e) =>
                              updateItem(item.id, { status: e.target.value as LaunchQaItemStatus })
                            }
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {item.status === "fail" ? (
                            <KxdButton
                              variant="ghost"
                              onClick={() => runAction("create-task", item.id)}
                              disabled={busy}
                            >
                              Create task
                            </KxdButton>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </KxdSection>

                <div className="kxd-os-ops-workflow-nav" style={{ marginTop: "1.5rem" }}>
                  <Link href={`/admin/operations/client-command/${clientId}`} className="kxd-os-link-quiet">
                    Command Center
                  </Link>
                  <div className="kxd-os-ops-workflow-nav__group">
                    <KxdButton
                      variant="secondary"
                      onClick={() => runAction("approve")}
                      disabled={busy || detail.status === "approved"}
                    >
                      Approve Launch
                    </KxdButton>
                    <KxdButton
                      onClick={() => runAction("launched")}
                      disabled={busy || detail.status === "launched"}
                    >
                      Mark Launched
                    </KxdButton>
                  </div>
                </div>
              </main>
            </div>
          </>
        ) : (
          <p className="kxd-os-body">{busy ? "Preparing Launch QA…" : "Loading…"}</p>
        )}
      </KxdPage>
    </OperationsShell>
  );
}
