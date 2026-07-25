"use client";

import Link from "next/link";
import { useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsFocusPill,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import type {
  StaffPlanItem,
  StaffPlanState,
  StaffTodayData,
} from "@/lib/staff/types";
import { StaffGuidancePanel } from "./StaffGuidancePanel";
import { StaffAskHelpControl } from "./StaffAskHelpControl";

function planStateBadge(state: StaffPlanState): {
  label: string;
  variant: "default" | "pending" | "warning" | "success" | "status" | "critical";
} {
  switch (state) {
    case "ready-to-begin":
      return { label: "Ready to begin", variant: "warning" };
    case "continue":
      return { label: "Continue", variant: "status" };
    case "needs-information":
      return { label: "Needs information", variant: "critical" };
    case "prepare-for-matt":
      return { label: "Prepare for Matt", variant: "pending" };
    case "waiting-on-matt":
      return { label: "Waiting on Matt", variant: "pending" };
    case "training-required":
      return { label: "Training required", variant: "status" };
    case "scheduled-later":
      return { label: "Scheduled later", variant: "default" };
    case "complete":
      return { label: "Complete", variant: "success" };
    default:
      return { label: state, variant: "default" };
  }
}

function PlanRow({ item, showOrder }: { item: StaffPlanItem; showOrder?: boolean }) {
  const badge = planStateBadge(item.planState);
  return (
    <OpsListRow href={item.canAct ? item.href ?? undefined : undefined}>
      <div className="kxd-os-ops-list-row__main">
        <div className="kxd-os-ops-list-row__head">
          <p className="kxd-os-ops-list-row__title">
            {showOrder ? (
              <span className="kxd-os-meta" style={{ marginRight: "0.5rem" }}>
                {item.order}.
              </span>
            ) : null}
            {item.title}
          </p>
          <OpsStatusBadge label={badge.label} variant={badge.variant} />
        </div>
        <p className="kxd-os-meta">
          {item.clientOrCategory} · {item.dueState}
          {item.estimatedMinutes ? ` · ~${item.estimatedMinutes} min` : ""}
        </p>
        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
          {item.whyItMatters}
        </p>
        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
          Next: {item.safestNextAction}
          {item.requiresMattApproval ? " · Matt must approve sensitive outcomes." : ""}
        </p>
      </div>
    </OpsListRow>
  );
}

export interface StaffHomeScreenProps {
  data: StaffTodayData;
  onGuidance?: (promptId: string) => void | Promise<void>;
  guidanceResponse?: StaffGuidanceResponse | null;
  guidanceLoading?: boolean;
}

export function StaffHomeScreen({
  data,
  onGuidance,
  guidanceResponse = null,
  guidanceLoading = false,
}: StaffHomeScreenProps) {
  const [localGuidanceLoading, setLocalGuidanceLoading] = useState(false);
  const [localGuidanceResponse, setLocalGuidanceResponse] =
    useState<StaffGuidanceResponse | null>(guidanceResponse);
  const loading = guidanceLoading || localGuidanceLoading;
  const activeGuidanceResponse = guidanceResponse ?? localGuidanceResponse;

  const sequence = data.plan.filter(
    (item) =>
      item.bucket === "start-here" ||
      item.bucket === "then" ||
      item.bucket === "training",
  );
  const thenItems = sequence.filter((item) => item.bucket !== "start-here");

  async function handleGuidance(promptId: string) {
    if (onGuidance) {
      setLocalGuidanceLoading(true);
      try {
        await onGuidance(promptId);
      } finally {
        setLocalGuidanceLoading(false);
      }
      return;
    }

    setLocalGuidanceLoading(true);
    try {
      const res = await fetch("/api/admin/staff/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId,
          pagePath: "/admin/operations/staff",
        }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        guidance?: StaffGuidanceResponse;
        error?: string;
      };
      if (!res.ok || payload.success === false || !payload.guidance) {
        throw new Error(payload.error ?? "Could not load guidance.");
      }
      setLocalGuidanceResponse(payload.guidance);
    } catch {
      setLocalGuidanceResponse({
        conciseAnswer:
          "Guidance is temporarily unavailable. Use your Start here action from the plan.",
        recommendedNextStep: data.primaryAction.label,
        reason: "Deterministic fallback while guidance API is unavailable.",
        involveMatt: false,
        mattReason: null,
        mode: "deterministic",
        aiGenerated: false,
        evidence: [],
        warning: null,
      });
    } finally {
      setLocalGuidanceLoading(false);
    }
  }

  return (
    <OperationsShell activeId="staff" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        {data.permissions.previewBanner ? (
          <div
            className="kxd-os-card kxd-os-ops-card-padding kxd-os-reporting-ops__banner"
            role="status"
          >
            <p className="kxd-os-card__title">{data.permissions.previewBanner}</p>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={async () => {
                await fetch("/api/admin/staff/preview/exit", { method: "POST" });
                window.location.href = "/admin/operations/staff/oversight";
              }}
            >
              Exit preview
            </button>
          </div>
        ) : null}

        <OperationsPageHero
          eyebrow="Daily staff plan"
          title={data.morning.greeting || data.greeting}
          lead={`${data.morning.dateLabel}. ${data.morning.summary}`}
        />

        <div
          className="kxd-os-ops-briefing-grid"
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 22rem)",
          }}
        >
          <div>
            <OpsCard>
              <OpsKpiStrip
                items={[
                  {
                    label: "Actionable",
                    value: String(data.morning.actionableCount),
                    sub: "Ready for you today",
                  },
                  {
                    label: "Waiting on Matt",
                    value: String(data.morning.waitingOnMattCount),
                    sub: "Do not reopen repeatedly",
                  },
                  {
                    label: "Workload",
                    value:
                      data.morning.estimatedWorkloadMinutes != null
                        ? `~${data.morning.estimatedWorkloadMinutes}m`
                        : "—",
                    sub:
                      data.morning.estimatedWorkloadMinutes != null
                        ? "Estimated from assigned effort"
                        : "No reliable estimate yet",
                  },
                  {
                    label: "Training",
                    value: `${data.morning.trainingPercent}%`,
                    sub: data.morning.trainingLevelLabel,
                  },
                ]}
              />
            </OpsCard>

            <section style={{ marginTop: "1.5rem" }} aria-label="Start here">
              <OpsSectionHead label="Start here" />
              <OpsCard className="kxd-os-ops-card-padding">
                <OpsFocusPill
                  label={data.primaryAction.title ?? data.primaryAction.label}
                  description={data.primaryAction.reason}
                  tone={data.hasUrgentWork ? "warning" : "default"}
                />
                <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                  {[
                    data.primaryAction.clientOrCategory,
                    data.primaryAction.estimatedMinutes
                      ? `~${data.primaryAction.estimatedMinutes} min`
                      : null,
                    data.primaryAction.permissionStatus,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {data.primaryAction.expectedOutcome ? (
                  <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
                    Expected: {data.primaryAction.expectedOutcome}
                  </p>
                ) : null}
                <div style={{ marginTop: "1.25rem" }}>
                  <Link href={data.primaryAction.href} className="kxd-os-btn kxd-os-btn--primary">
                    {data.primaryAction.label === "You are caught up"
                      ? "Open wrap-up"
                      : data.primaryAction.label === "Begin"
                        ? "Begin"
                        : data.primaryAction.label}
                  </Link>
                </div>
              </OpsCard>
            </section>

            {data.emptyState && data.morning.caughtUp ? (
              <section style={{ marginTop: "1.5rem" }}>
                <OpsCard>
                  <OpsEmpty message={data.emptyState.title} />
                  <p style={{ marginTop: "0.75rem" }}>{data.emptyState.body}</p>
                  <Link
                    href={data.emptyState.actionHref}
                    className="kxd-os-btn kxd-os-btn--secondary"
                    style={{ marginTop: "1rem", display: "inline-flex" }}
                  >
                    {data.emptyState.actionLabel}
                  </Link>
                </OpsCard>
              </section>
            ) : null}

            {thenItems.length > 0 ? (
              <section style={{ marginTop: "1.5rem" }} aria-label="Today's plan">
                <OpsSectionHead label="Today's plan" count={thenItems.length} />
                <OpsCard>
                  {thenItems.map((item) => (
                    <PlanRow key={item.id} item={item} showOrder />
                  ))}
                </OpsCard>
              </section>
            ) : null}

            <section style={{ marginTop: "1.5rem" }} aria-label="Waiting on Matt">
              <OpsSectionHead
                label="Waiting on Matt"
                count={data.waitingOnMatt.length}
              />
              <OpsCard>
                {data.waitingOnMatt.length === 0 ? (
                  <p className="kxd-os-meta">Nothing is waiting on Matt right now.</p>
                ) : (
                  data.waitingOnMatt.map((item) => (
                    <div key={item.id} className="kxd-os-ops-list-row">
                      <div className="kxd-os-ops-list-row__main">
                        <p className="kxd-os-ops-list-row__title">{item.title}</p>
                        <p className="kxd-os-meta">{item.preparedSummary}</p>
                        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                          Decision needed: {item.decisionNeeded}
                        </p>
                        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                          {item.submittedAt
                            ? `Submitted ${new Date(item.submittedAt).toLocaleString()}`
                            : "Submitted for review"}
                          {item.followUpAppropriate
                            ? " · A calm follow-up may be appropriate."
                            : " · Leave this waiting for now."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </OpsCard>
            </section>

            {data.comingNext.length > 0 ? (
              <section style={{ marginTop: "1.5rem" }} aria-label="Coming next">
                <OpsSectionHead label="Coming next" count={data.comingNext.length} />
                <OpsCard>
                  {data.comingNext.map((item) => (
                    <PlanRow key={item.id} item={item} />
                  ))}
                </OpsCard>
              </section>
            ) : null}

            <section style={{ marginTop: "1.5rem" }} aria-label="End of day">
              <OpsSectionHead label="End of day" />
              <OpsCard className="kxd-os-ops-card-padding">
                <p className="kxd-os-meta">
                  When you are ready, wrap up today. This reflects real activity — it will not
                  auto-complete unfinished work or change dates.
                </p>
                <Link
                  href={data.wrapUpHref}
                  className="kxd-os-btn kxd-os-btn--secondary"
                  style={{ marginTop: "1rem", display: "inline-flex" }}
                >
                  Wrap up today
                </Link>
              </OpsCard>
            </section>
          </div>

          <StaffGuidancePanel
            prompts={data.guidancePrompts}
            lastResponse={activeGuidanceResponse}
            onSelectPrompt={handleGuidance}
            loading={loading}
            askHelp={
              <StaffAskHelpControl
                pagePath="/admin/operations/staff"
                workId={
                  data.plan.find((item) => item.bucket === "start-here")?.workId ?? null
                }
                canAct={data.permissions.canAct}
                isPreview={data.permissions.isPreview}
                existing={data.helpRequests}
                defaultOpen={
                  Boolean(activeGuidanceResponse?.involveMatt) ||
                  data.plan.some(
                    (item) =>
                      item.planState === "needs-information" ||
                      item.currentStatus === "blocked",
                  )
                }
              />
            }
          />
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
