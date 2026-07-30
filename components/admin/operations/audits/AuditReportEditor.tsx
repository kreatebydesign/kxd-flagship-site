"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ACTION_PLAN_GROUP_LABEL,
  ACTION_PLAN_GROUPS,
  AUDIT_FINDING_CATEGORIES,
  CATEGORY_LABEL,
  FINDING_SEVERITIES,
  REPORT_STATUS_LABEL,
  type ActionPlanGroup,
  type ActionPlanItem,
  type AuditFindingCategory,
  type AuditReportSource,
  type CanonicalAuditReport,
  type FindingOverride,
  type FindingSeverity,
  type ManualFinding,
  type ReportStatus,
  type SectionKey,
  type SectionVisibility,
} from "@/lib/website-audit-report/types";
import { deriveAutomatedFindings } from "@/lib/website-audit-report/findings";

type ClientOption = { id: number; name: string; companyWebsite?: string | null };

type Props = {
  auditId: number;
  initialSource: AuditReportSource;
  initialCanonical: CanonicalAuditReport | null;
  clients: ClientOption[];
};

const SECTION_LABELS: Record<SectionKey, string> = {
  executiveSummary: "Executive summary",
  overallScore: "Overall score",
  findings: "Findings",
  priorityActionPlan: "Priority action plan",
  professionalAssessment: "KXD professional assessment",
  appendix: "Appendix & methodology",
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AuditReportEditor({
  auditId,
  initialSource,
  initialCanonical,
  clients,
}: Props) {
  const [source, setSource] = useState(initialSource);
  const [canonical, setCanonical] = useState(initialCanonical);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [reportTitle, setReportTitle] = useState(initialSource.reportTitle ?? "");
  const [executiveSummary, setExecutiveSummary] = useState(
    initialSource.executiveSummary ?? "",
  );
  const [workingWell, setWorkingWell] = useState(initialSource.workingWell ?? "");
  const [losingOpportunity, setLosingOpportunity] = useState(
    initialSource.losingOpportunity ?? "",
  );
  const [recommendedNextSteps, setRecommendedNextSteps] = useState(
    initialSource.recommendedNextSteps ?? "",
  );
  const [closingNote, setClosingNote] = useState(initialSource.closingNote ?? "");
  const [internalNotes, setInternalNotes] = useState(initialSource.internalNotes ?? "");
  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(
    initialSource.sectionVisibility ?? {
      executiveSummary: true,
      overallScore: true,
      findings: true,
      priorityActionPlan: true,
      professionalAssessment: true,
      appendix: true,
    },
  );
  const [findingOverrides, setFindingOverrides] = useState<FindingOverride[]>(
    Array.isArray(initialSource.findingOverrides) ? initialSource.findingOverrides : [],
  );
  const [manualFindings, setManualFindings] = useState<ManualFinding[]>(
    Array.isArray(initialSource.manualFindings) ? initialSource.manualFindings : [],
  );
  const [recommendationPlan, setRecommendationPlan] = useState<ActionPlanItem[]>(
    Array.isArray(initialSource.recommendationPlan) ? initialSource.recommendationPlan : [],
  );
  const [clientId, setClientId] = useState<string>(
    initialSource.clientId != null
      ? String(initialSource.clientId)
      : typeof initialSource.client === "number"
        ? String(initialSource.client)
        : initialSource.client && typeof initialSource.client === "object"
          ? String(initialSource.client.id)
          : "",
  );

  const reportStatus = (source.reportStatus || "none") as ReportStatus;
  const locked = reportStatus === "approved" || reportStatus === "archived";

  const automatedFindings = useMemo(
    () => deriveAutomatedFindings(source),
    [source],
  );

  function applyResult(payload: {
    reportStatus?: ReportStatus;
    canonical?: CanonicalAuditReport;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sourcePatch?: Record<string, any>;
  }) {
    if (payload.canonical) setCanonical(payload.canonical);
    if (payload.reportStatus || payload.sourcePatch) {
      setSource((prev) => ({
        ...prev,
        ...(payload.sourcePatch ?? {}),
        reportStatus: payload.reportStatus ?? prev.reportStatus,
      }));
    }
    if (payload.canonical) {
      setReportTitle(payload.canonical.reportTitle);
      setExecutiveSummary(payload.canonical.executiveSummary);
      setWorkingWell(payload.canonical.workingWell);
      setLosingOpportunity(payload.canonical.losingOpportunity);
      setRecommendedNextSteps(payload.canonical.recommendedNextSteps);
      setClosingNote(payload.canonical.closingNote);
      setSectionVisibility(payload.canonical.sectionVisibility);
      if (Array.isArray(payload.canonical.actionPlan)) {
        setRecommendationPlan(
          payload.canonical.actionPlan.map((item) => {
            const { included: _included, ...rest } = item;
            void _included;
            return rest;
          }),
        );
      }
    }
  }

  async function api(
    path: string,
    init?: RequestInit,
  ): Promise<{ success: boolean; error?: string; [k: string]: unknown }> {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const data = await res.json().catch(() => ({ success: false, error: "Invalid response." }));
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function run(label: string, fn: () => Promise<void>) {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await fn();
          setMessage(label);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      })();
    });
  }

  function overrideFor(id: string): FindingOverride {
    return findingOverrides.find((o) => o.id === id) ?? { id };
  }

  function patchOverride(id: string, patch: Partial<FindingOverride>) {
    setFindingOverrides((prev) => {
      const existing = prev.find((o) => o.id === id);
      if (!existing) return [...prev, { id, ...patch }];
      return prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
    });
  }

  function movePlanItem(id: string, direction: -1 | 1) {
    setRecommendationPlan((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((i) => i.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return prev;
      const next = [...sorted];
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next.map((item, order) => ({ ...item, order }));
    });
  }

  function setPlanGroup(id: string, group: ActionPlanGroup) {
    setRecommendationPlan((prev) =>
      prev.map((item) => (item.id === id ? { ...item, group } : item)),
    );
  }

  function togglePlanHidden(id: string) {
    setRecommendationPlan((prev) =>
      prev.map((item) => (item.id === id ? { ...item, hidden: !item.hidden } : item)),
    );
  }

  function addManualFinding() {
    const finding: ManualFinding = {
      id: newId("manual"),
      title: "New professional finding",
      category: "general",
      severity: "attention",
      observed: "",
      whyItMatters: "",
      recommendation: "",
      hidden: false,
      createdAt: new Date().toISOString(),
    };
    setManualFindings((prev) => [...prev, finding]);
  }

  const saveBody = {
    reportTitle,
    executiveSummary,
    workingWell,
    losingOpportunity,
    recommendedNextSteps,
    closingNote,
    internalNotes,
    sectionVisibility,
    findingOverrides,
    manualFindings,
    recommendationPlan,
    clientId: clientId ? Number(clientId) : null,
  };

  return (
    <div className="kxd-audit-report-editor">
      <header className="kxd-audit-report-editor__hero">
        <p className="kxd-os-eyebrow">Website Audit · Report</p>
        <h1 className="kxd-os-title">{source.company || source.name || "Audit report"}</h1>
        <p className="kxd-os-lead">
          Curate a client-ready deliverable from stored auditor results. Raw scores and evidence
          stay unchanged.
        </p>
        <div className="kxd-audit-report-editor__meta">
          <span>
            Report status: <strong>{REPORT_STATUS_LABEL[reportStatus]}</strong>
          </span>
          <span>Audited URL: {source.website}</span>
          {source.canonicalWebsiteUrl ? (
            <span>Canonical client URL: {source.canonicalWebsiteUrl}</span>
          ) : null}
          {source.reportApprovedAt ? (
            <span>
              Approved {new Date(source.reportApprovedAt).toLocaleString()} by{" "}
              {source.reportApprovedBy || "operator"}
            </span>
          ) : null}
        </div>
        <div className="kxd-audit-report-editor__actions">
          <Link href="/admin/operations/audits" className="kxd-os-link-quiet">
            ← Audits
          </Link>
          <Link
            href={`/admin/collections/website-audits/${auditId}`}
            className="kxd-os-link-quiet"
          >
            Payload record
          </Link>
          {reportStatus !== "none" ? (
            <Link
              href={`/admin/operations/audits/${auditId}/report/preview`}
              className="kxd-os-btn kxd-os-btn--ghost"
              target="_blank"
            >
              Preview
            </Link>
          ) : null}
          {reportStatus !== "none" ? (
            <a
              href={`/api/admin/website-audits/${auditId}/report/pdf`}
              className="kxd-os-btn kxd-os-btn--ghost"
            >
              Download PDF
            </a>
          ) : null}
        </div>
      </header>

      {(message || error) && (
        <p
          className={
            error
              ? "kxd-audit-report-editor__banner kxd-audit-report-editor__banner--error"
              : "kxd-audit-report-editor__banner"
          }
        >
          {error || message}
        </p>
      )}

      <section className="kxd-audit-report-editor__panel">
        <h2>Identity</h2>
        <p className="kxd-os-meta">
          Contact: {source.name || "—"} · {source.email || "—"}
        </p>
        <label className="kxd-audit-report-editor__label">
          Linked client
          <select
            value={clientId}
            disabled={locked || pending}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Prospect / no client link</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="kxd-audit-report-editor__row-actions">
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost"
            disabled={locked || pending}
            onClick={() =>
              run("Client association saved.", async () => {
                const data = await api(
                  `/api/admin/website-audits/${auditId}/report/associate-client`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      clientId: clientId ? Number(clientId) : null,
                    }),
                  },
                );
                setSource((prev) => ({
                  ...prev,
                  clientId: (data.clientId as number | null) ?? null,
                  canonicalWebsiteUrl: (data.canonicalWebsiteUrl as string | null) ?? null,
                }));
              })
            }
          >
            Save client link
          </button>
        </div>
      </section>

      <section className="kxd-audit-report-editor__panel">
        <h2>Generate narrative</h2>
        <p className="kxd-os-meta">
          Deterministic draft from stored scores and insights. Does not rerun the auditor.
        </p>
        <div className="kxd-audit-report-editor__row-actions">
          <button
            type="button"
            className="kxd-os-btn"
            disabled={locked || pending}
            onClick={() =>
              run("Narrative generated.", async () => {
                const data = await api(
                  `/api/admin/website-audits/${auditId}/report/generate`,
                  {
                    method: "POST",
                    body: JSON.stringify({ force: reportStatus !== "none" }),
                  },
                );
                applyResult({
                  reportStatus: data.reportStatus as ReportStatus,
                  canonical: data.canonical as CanonicalAuditReport,
                });
                if (data.canonical) {
                  const c = data.canonical as CanonicalAuditReport;
                  setRecommendationPlan(
                    c.actionPlan.map((item) => {
                      const { included: _included, ...rest } = item;
                      void _included;
                      return rest;
                    }),
                  );
                }
              })
            }
          >
            {reportStatus === "none" ? "Generate report" : "Regenerate narrative"}
          </button>
          {reportStatus === "approved" || reportStatus === "ready-for-review" ? (
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={pending}
              onClick={() =>
                run("Returned to draft.", async () => {
                  const data = await api(
                    `/api/admin/website-audits/${auditId}/report/reopen`,
                    { method: "POST", body: "{}" },
                  );
                  applyResult({
                    reportStatus: data.reportStatus as ReportStatus,
                    canonical: data.canonical as CanonicalAuditReport,
                  });
                })
              }
            >
              Return to draft
            </button>
          ) : null}
        </div>
      </section>

      {reportStatus !== "none" ? (
        <>
          <section className="kxd-audit-report-editor__panel">
            <h2>Narrative</h2>
            <label className="kxd-audit-report-editor__label">
              Report title
              <input
                value={reportTitle}
                disabled={locked || pending}
                onChange={(e) => setReportTitle(e.target.value)}
              />
            </label>
            <label className="kxd-audit-report-editor__label">
              Executive summary
              <textarea
                rows={8}
                value={executiveSummary}
                disabled={locked || pending}
                onChange={(e) => setExecutiveSummary(e.target.value)}
              />
            </label>
            <label className="kxd-audit-report-editor__label">
              What is working well
              <textarea
                rows={5}
                value={workingWell}
                disabled={locked || pending}
                onChange={(e) => setWorkingWell(e.target.value)}
              />
            </label>
            <label className="kxd-audit-report-editor__label">
              Where the website is losing opportunity
              <textarea
                rows={5}
                value={losingOpportunity}
                disabled={locked || pending}
                onChange={(e) => setLosingOpportunity(e.target.value)}
              />
            </label>
            <label className="kxd-audit-report-editor__label">
              Recommended next steps
              <textarea
                rows={5}
                value={recommendedNextSteps}
                disabled={locked || pending}
                onChange={(e) => setRecommendedNextSteps(e.target.value)}
              />
            </label>
            <label className="kxd-audit-report-editor__label">
              Closing note
              <textarea
                rows={3}
                value={closingNote}
                disabled={locked || pending}
                onChange={(e) => setClosingNote(e.target.value)}
              />
            </label>
            <label className="kxd-audit-report-editor__label">
              Internal notes (never in preview/PDF)
              <textarea
                rows={3}
                value={internalNotes}
                disabled={locked || pending}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </label>
          </section>

          <section className="kxd-audit-report-editor__panel">
            <h2>Section visibility</h2>
            <div className="kxd-audit-report-editor__checks">
              {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
                <label key={key} className="kxd-audit-report-editor__check">
                  <input
                    type="checkbox"
                    checked={sectionVisibility[key] !== false}
                    disabled={locked || pending}
                    onChange={(e) =>
                      setSectionVisibility((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                  />
                  {SECTION_LABELS[key]}
                </label>
              ))}
            </div>
          </section>

          <section className="kxd-audit-report-editor__panel">
            <h2>Findings</h2>
            <p className="kxd-os-meta">
              Hide or refine client-facing language. Raw auditor text on the Scores / Recommendations
              tabs is preserved.
            </p>
            {automatedFindings.map((finding) => {
              const o = overrideFor(finding.id);
              return (
                <div key={finding.id} className="kxd-audit-report-editor__finding">
                  <div className="kxd-audit-report-editor__finding-head">
                    <strong>{o.title || finding.title}</strong>
                    <span className="kxd-os-meta">
                      {CATEGORY_LABEL[finding.category]} · automated
                    </span>
                  </div>
                  <p className="kxd-os-meta">{finding.detected}</p>
                  <label className="kxd-audit-report-editor__check">
                    <input
                      type="checkbox"
                      checked={Boolean(o.hidden)}
                      disabled={locked || pending}
                      onChange={(e) => patchOverride(finding.id, { hidden: e.target.checked })}
                    />
                    Hide from report
                  </label>
                  <label className="kxd-audit-report-editor__label">
                    Client-facing explanation
                    <textarea
                      rows={2}
                      disabled={locked || pending}
                      value={o.explanation ?? ""}
                      placeholder={finding.detected}
                      onChange={(e) =>
                        patchOverride(finding.id, { explanation: e.target.value })
                      }
                    />
                  </label>
                </div>
              );
            })}

            <h3>Manual findings</h3>
            {manualFindings.map((m, index) => (
              <div key={m.id} className="kxd-audit-report-editor__finding">
                <label className="kxd-audit-report-editor__label">
                  Title
                  <input
                    value={m.title}
                    disabled={locked || pending}
                    onChange={(e) =>
                      setManualFindings((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <div className="kxd-audit-report-editor__inline">
                  <label className="kxd-audit-report-editor__label">
                    Category
                    <select
                      value={m.category}
                      disabled={locked || pending}
                      onChange={(e) =>
                        setManualFindings((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  category: e.target.value as AuditFindingCategory,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {AUDIT_FINDING_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="kxd-audit-report-editor__label">
                    Severity
                    <select
                      value={m.severity}
                      disabled={locked || pending}
                      onChange={(e) =>
                        setManualFindings((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, severity: e.target.value as FindingSeverity }
                              : item,
                          ),
                        )
                      }
                    >
                      {FINDING_SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="kxd-audit-report-editor__label">
                  Observed
                  <textarea
                    rows={2}
                    value={m.observed}
                    disabled={locked || pending}
                    onChange={(e) =>
                      setManualFindings((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, observed: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="kxd-audit-report-editor__label">
                  Why it matters
                  <textarea
                    rows={2}
                    value={m.whyItMatters}
                    disabled={locked || pending}
                    onChange={(e) =>
                      setManualFindings((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, whyItMatters: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="kxd-audit-report-editor__label">
                  Recommendation
                  <textarea
                    rows={2}
                    value={m.recommendation}
                    disabled={locked || pending}
                    onChange={(e) =>
                      setManualFindings((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, recommendation: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="kxd-audit-report-editor__check">
                  <input
                    type="checkbox"
                    checked={Boolean(m.hidden)}
                    disabled={locked || pending}
                    onChange={(e) =>
                      setManualFindings((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, hidden: e.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Hide from report
                </label>
              </div>
            ))}
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost"
              disabled={locked || pending}
              onClick={addManualFinding}
            >
              Add manual finding
            </button>
          </section>

          <section className="kxd-audit-report-editor__panel">
            <h2>Priority action plan</h2>
            {[...recommendationPlan]
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <div key={item.id} className="kxd-audit-report-editor__plan-item">
                  <p>{item.text}</p>
                  <div className="kxd-audit-report-editor__inline">
                    <select
                      value={item.group}
                      disabled={locked || pending}
                      onChange={(e) =>
                        setPlanGroup(item.id, e.target.value as ActionPlanGroup)
                      }
                    >
                      {ACTION_PLAN_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {ACTION_PLAN_GROUP_LABEL[g]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={locked || pending}
                      onClick={() => movePlanItem(item.id, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={locked || pending}
                      onClick={() => movePlanItem(item.id, 1)}
                    >
                      Down
                    </button>
                    <label className="kxd-audit-report-editor__check">
                      <input
                        type="checkbox"
                        checked={Boolean(item.hidden)}
                        disabled={locked || pending}
                        onChange={() => togglePlanHidden(item.id)}
                      />
                      Hide
                    </label>
                  </div>
                </div>
              ))}
          </section>

          <section className="kxd-audit-report-editor__panel">
            <h2>Save & approve</h2>
            <div className="kxd-audit-report-editor__row-actions">
              <button
                type="button"
                className="kxd-os-btn"
                disabled={locked || pending}
                onClick={() =>
                  run("Draft saved.", async () => {
                    const data = await api(`/api/admin/website-audits/${auditId}/report`, {
                      method: "PATCH",
                      body: JSON.stringify(saveBody),
                    });
                    applyResult({
                      reportStatus: data.reportStatus as ReportStatus,
                      canonical: data.canonical as CanonicalAuditReport,
                    });
                  })
                }
              >
                Save draft
              </button>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost"
                disabled={locked || pending}
                onClick={() =>
                  run("Marked ready for review.", async () => {
                    const data = await api(`/api/admin/website-audits/${auditId}/report`, {
                      method: "PATCH",
                      body: JSON.stringify({ ...saveBody, markReadyForReview: true }),
                    });
                    applyResult({
                      reportStatus: data.reportStatus as ReportStatus,
                      canonical: data.canonical as CanonicalAuditReport,
                    });
                  })
                }
              >
                Mark ready for review
              </button>
              <button
                type="button"
                className="kxd-os-btn"
                disabled={reportStatus === "archived" || pending}
                onClick={() =>
                  run("Report approved.", async () => {
                    if (reportStatus !== "approved") {
                      await api(`/api/admin/website-audits/${auditId}/report`, {
                        method: "PATCH",
                        body: JSON.stringify({ ...saveBody, markReadyForReview: true }),
                      });
                    }
                    const data = await api(
                      `/api/admin/website-audits/${auditId}/report/approve`,
                      { method: "POST", body: "{}" },
                    );
                    applyResult({
                      reportStatus: data.reportStatus as ReportStatus,
                      canonical: data.canonical as CanonicalAuditReport,
                      sourcePatch: {
                        reportApprovedAt: data.approvedAt,
                        reportApprovedBy: data.approvedBy,
                      },
                    });
                  })
                }
              >
                Approve report
              </button>
            </div>
            {canonical ? (
              <p className="kxd-os-meta">
                Live draft includes {canonical.findings.filter((f) => f.included).length} findings
                and {canonical.actionPlan.filter((a) => a.included).length} action items.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
