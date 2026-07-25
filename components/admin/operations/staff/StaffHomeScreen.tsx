"use client";

import Link from "next/link";
import { useEffect } from "react";
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
import {
  KxdIntelligenceBriefing,
  KxdPage,
  useKxdIntelligenceOptional,
} from "@/components/os";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import type {
  StaffPlanItem,
  StaffPlanState,
  StaffTodayData,
} from "@/lib/staff/types";

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
      return { label: "Prepare for Review", variant: "pending" };
    case "waiting-on-matt":
      return { label: "Awaiting Approval", variant: "pending" };
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
          {item.requiresMattApproval ? " · Sensitive outcomes require approval." : ""}
        </p>
      </div>
    </OpsListRow>
  );
}

function briefingObservation(data: StaffTodayData): string {
  if (data.morning.caughtUp || data.primaryAction.label === "You are caught up") {
    return "You’re caught up for now. Wrap the day when ready, or open Intelligence for a calm review.";
  }
  const title = data.primaryAction.title?.trim() || data.primaryAction.label;
  const client = data.primaryAction.clientOrCategory?.trim();
  if (client) {
    return `Today’s clearest move is ${title} for ${client}.`;
  }
  return `Today’s clearest move is ${title}.`;
}

function briefingRecommended(data: StaffTodayData): string {
  if (data.primaryAction.label === "You are caught up") {
    return "Wrap up today when you’re ready.";
  }
  return data.primaryAction.title?.trim() || data.primaryAction.label;
}

export interface StaffHomeScreenProps {
  data: StaffTodayData;
  onGuidance?: (promptId: string) => void | Promise<void>;
  guidanceResponse?: StaffGuidanceResponse | null;
  guidanceLoading?: boolean;
}

export function StaffHomeScreen(props: StaffHomeScreenProps) {
  return (
    <OperationsShell activeId="staff" variant="staff">
      <StaffHomeBody {...props} />
    </OperationsShell>
  );
}

function StaffHomeBody({
  data,
  guidanceResponse = null,
}: StaffHomeScreenProps) {
  const intel = useKxdIntelligenceOptional();

  const sequence = data.plan.filter(
    (item) =>
      item.bucket === "start-here" ||
      item.bucket === "then" ||
      item.bucket === "training",
  );
  const thenItems = sequence.filter((item) => item.bucket !== "start-here");
  const startItem = data.plan.find((item) => item.bucket === "start-here");
  const requiresMattCount =
    data.helpRequests.filter(
      (row) => row.requiresMatt && !row.mattResponse && row.status !== "resolved",
    ).length || data.morning.waitingOnMattCount;

  const configure = intel?.configure;
  const setLastGuidance = intel?.setLastGuidance;
  const openWith = intel?.openWith;

  useEffect(() => {
    if (!configure) return;
    configure({
      pagePath: "/admin/operations/staff",
      contextLabel: "Daily staff plan",
      contextKind: "staff-home",
      workId: startItem?.workId ?? data.primaryAction.workId ?? null,
      workTitle: data.primaryAction.title ?? data.primaryAction.label,
      clientLabel: data.primaryAction.clientOrCategory ?? null,
      helpRequests: data.helpRequests,
      guidancePrompts: data.guidancePrompts,
      primaryAction: data.primaryAction,
      planState: startItem?.planState ?? data.primaryAction.planState ?? null,
      canAct: data.permissions.canAct,
      isPreview: data.permissions.isPreview,
      observation: briefingObservation(data),
      recommendedActionLabel: briefingRecommended(data),
      recommendedActionHref: data.primaryAction.href,
    });
    if (guidanceResponse) {
      setLastGuidance?.(guidanceResponse);
    }
  }, [
    configure,
    setLastGuidance,
    data,
    guidanceResponse,
    startItem?.workId,
    startItem?.planState,
  ]);

  return (
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

        <div className="kxd-os-staff-plan-grid">
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
                    label: "Awaiting Approval",
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

            <section
              className="kxd-os-staff-intel-briefing"
              aria-label="KXD Intelligence"
            >
              <KxdIntelligenceBriefing
                observation={briefingObservation(data)}
                recommendedAction={briefingRecommended(data)}
                requiresMattCount={requiresMattCount}
                onOpen={() =>
                  openWith?.({
                    pagePath: "/admin/operations/staff",
                    contextLabel: "Daily staff plan",
                    contextKind: "staff-home",
                    workId: startItem?.workId ?? data.primaryAction.workId ?? null,
                    helpRequests: data.helpRequests,
                    guidancePrompts: data.guidancePrompts,
                    primaryAction: data.primaryAction,
                    planState: startItem?.planState ?? data.primaryAction.planState ?? null,
                    canAct: data.permissions.canAct,
                    isPreview: data.permissions.isPreview,
                  })
                }
              />
            </section>

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

            <section style={{ marginTop: "1.5rem" }} aria-label="Awaiting Approval">
              <OpsSectionHead
                label="Awaiting Approval"
                count={data.waitingOnMatt.length}
              />
              <OpsCard>
                {data.waitingOnMatt.length === 0 ? (
                  <p className="kxd-os-meta">Nothing is awaiting approval right now.</p>
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
        </div>
      </KxdPage>
  );
}
