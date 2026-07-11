"use client";

import Link from "next/link";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import { SATISFACTION_LABELS } from "@/lib/client-success/types";
import type { ClientSuccessDetailData } from "@/lib/client-success/types";
import { ClientWorkSection } from "./ClientWorkSection";

function TextBlock({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) {
    return (
      <div>
        <p className="kxd-os-section__label">{label}</p>
        <p className="kxd-os-meta">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="kxd-os-section__label">{label}</p>
      <p className="kxd-os-body" style={{ whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );
}

export function ClientSuccessDetailScreen({ data }: { data: ClientSuccessDetailData }) {
  return (
    <OperationsShell activeId="client-success" clientId={data.clientId}>
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Client Success"
          title={data.clientName}
          lead="Executive success view — goals, risks, check-ins, and recommended next action."
        />

        <div style={{ marginBottom: "1rem" }}>
          <Link href="/admin/operations/client-success" className="kxd-os-link-quiet">
            ← All client success
          </Link>
          {" · "}
          <Link href={`/admin/operations/client-command/${data.clientId}`} className="kxd-os-link-quiet">
            Command Center
          </Link>
        </div>

        <OpsKpiStrip
          items={[
            {
              label: "Health",
              value: String(data.healthScore),
              alert: data.healthScore < 55,
            },
            {
              label: "Success Score",
              value: data.successScore != null ? String(data.successScore) : "—",
            },
            {
              label: "Next Review",
              value:
                data.daysUntilReview != null
                  ? `${data.daysUntilReview}d`
                  : data.nextReview ?? "—",
              alert: data.daysUntilReview != null && data.daysUntilReview <= 14,
            },
            {
              label: "Renewal",
              value:
                data.daysUntilRenewal != null
                  ? `${data.daysUntilRenewal}d`
                  : data.renewalDate ?? "—",
              alert: data.daysUntilRenewal != null && data.daysUntilRenewal <= 30,
            },
          ]}
        />

        <KxdSection label="Recommended Next Action" className="kxd-os-operations-section">
          <p className="kxd-os-body">{data.recommendedAction}</p>
          {data.accountManager ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
              Account manager: {data.accountManager}
            </p>
          ) : null}
        </KxdSection>

        <KxdSection label="Executive Summary" className="kxd-os-operations-section">
          <div className="kxd-os-list-stack">
            {data.executiveSummary.map((line) => (
              <p key={line} className="kxd-os-body">{line}</p>
            ))}
          </div>
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Quarterly Goals">
            <TextBlock label="Quarterly" value={data.quarterlyGoals} />
          </KxdSection>
          <KxdSection label="Yearly Goals">
            <TextBlock label="Yearly" value={data.yearlyGoals} />
          </KxdSection>
        </div>

        <KxdSection label="Current Focus & Care Plan" className="kxd-os-operations-section">
          <div className="kxd-os-operations-split">
            <TextBlock label="Current Focus" value={data.currentFocus} />
            <TextBlock label="Care Plan" value={data.carePlan} />
          </div>
        </KxdSection>

        <div className="kxd-os-operations-columns">
          <KxdSection label="Open Risks">
            <TextBlock label="Risks" value={data.risks} />
          </KxdSection>
          <KxdSection label="Expansion Ideas">
            <TextBlock label="Opportunities" value={data.opportunities} />
          </KxdSection>
        </div>

        <KxdSection label="Recent Wins" className="kxd-os-operations-section">
          {data.recentWins.length === 0 ? (
            <p className="kxd-os-meta">No wins logged yet.</p>
          ) : (
            <div className="kxd-os-list-stack">
              {data.recentWins.map((win) => (
                <OpsListRow key={win.id}>
                  <p className="kxd-os-body">{win.wins ?? win.summary}</p>
                  <p className="kxd-os-meta">{win.meetingDate}</p>
                </OpsListRow>
              ))}
            </div>
          )}
        </KxdSection>

        <ClientWorkSection clientId={data.clientId} initialWork={data.work} />

        <KxdSection label="Check-In History" className="kxd-os-operations-section">
          <OpsSectionHead
            label="Success meetings"
            count={data.checkInHistory.length}
            href="/admin/collections/success-check-ins"
          />
          {data.checkInHistory.length === 0 ? (
            <p className="kxd-os-meta">No check-ins recorded.</p>
          ) : (
            <div className="kxd-os-list-stack">
              {data.checkInHistory.map((checkIn) => (
                <OpsListRow key={checkIn.id}>
                  <p className="kxd-os-body">{checkIn.summary}</p>
                  <p className="kxd-os-meta">
                    {checkIn.meetingDate}
                    {checkIn.satisfaction
                      ? ` · ${SATISFACTION_LABELS[checkIn.satisfaction] ?? checkIn.satisfaction}`
                      : ""}
                    {checkIn.completed ? " · Completed" : ""}
                  </p>
                </OpsListRow>
              ))}
            </div>
          )}
        </KxdSection>

        <KxdSection label="Success Timeline" className="kxd-os-operations-section">
          <OpsSectionHead
            label="Executive timeline highlights"
            href={`/admin/operations/timeline/${data.clientId}`}
          />
          {data.timelineHighlights.length === 0 ? (
            <p className="kxd-os-meta">No timeline highlights.</p>
          ) : (
            <div className="kxd-os-list-stack">
              {data.timelineHighlights.map((event, i) => (
                <OpsListRow key={`${event.title}-${i}`}>
                  <p className="kxd-os-body">{event.title}</p>
                  <p className="kxd-os-meta">{event.summary}</p>
                </OpsListRow>
              ))}
            </div>
          )}
        </KxdSection>

        {data.notes ? (
          <KxdSection label="Notes" className="kxd-os-operations-section">
            <TextBlock label="Internal notes" value={data.notes} />
          </KxdSection>
        ) : null}
      </KxdPage>
    </OperationsShell>
  );
}
