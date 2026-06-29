"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { intelQuickButtonsForAction } from "@/lib/client-command/actions/quick-buttons";
import type { ClientMemoryAction } from "@/lib/client-command/memory/types";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceMetaLine,
  WorkspaceProse,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="kxd-os-intel-score">
      <span className="kxd-os-intel-score__value">{value}</span>
      <span className="kxd-os-intel-score__label">{label}</span>
    </div>
  );
}

function InsightList({
  items,
  empty,
}: {
  items: ClientWorkspaceBundle["memory"]["wins"];
  empty: string;
}) {
  if (items.length === 0) {
    return <WorkspaceEmpty message={empty} />;
  }
  return (
    <ul className="kxd-os-workspace-list">
      {items.map((item) => (
        <li key={item.id} className="kxd-os-workspace-list__item">
          <WorkspaceProse>
            <strong>{item.title}</strong>
            {item.detail ? ` — ${item.detail}` : ""}
          </WorkspaceProse>
          {item.source ? (
            <Link href={item.source.href} className="kxd-os-link-quiet kxd-os-workspace-inline-link">
              {item.source.label} →
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function IntelActionRow({
  action,
  clientId,
  email,
  onQuick,
  loadingId,
}: {
  action: ClientMemoryAction;
  clientId: number;
  email: string | null;
  onQuick: (action: ClientMemoryAction, operation: string) => void;
  loadingId: string | null;
}) {
  const buttons = intelQuickButtonsForAction(action.id, clientId, email);
  const memoryRef = `intel:${action.id}`;
  const linked = buttons.some((b) => b.operation === "navigate");

  return (
    <li className="kxd-os-intel-actions__item">
      <div className="kxd-os-intel-actions__link">
        <span className="kxd-os-intel-actions__label">{action.label}</span>
        <span className="kxd-os-intel-actions__reason">{action.reason}</span>
      </div>
      <div className="kxd-os-intel-actions__controls">
        <span className="kxd-os-workspace-badge">{action.priority}</span>
        <div className="kxd-os-intel-actions__buttons">
          {buttons.map((btn) =>
            btn.operation === "navigate" && btn.href ? (
              <Link
                key={btn.label}
                href={btn.href}
                className="kxd-os-intel-actions__btn"
              >
                {btn.label}
              </Link>
            ) : (
              <button
                key={btn.label}
                type="button"
                className="kxd-os-intel-actions__btn"
                disabled={loadingId === memoryRef}
                onClick={() => onQuick(action, btn.operation)}
              >
                {loadingId === memoryRef ? "…" : btn.label}
              </button>
            ),
          )}
          {!linked ? (
            <Link
              href={action.href}
              className="kxd-os-intel-actions__btn kxd-os-intel-actions__btn--quiet"
            >
              Open
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function ClientIntelligencePanel({ data }: { data: ClientWorkspaceBundle }) {
  const router = useRouter();
  const memory = data.memory;
  const [snapshotStatus, setSnapshotStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [loadingRef, setLoadingRef] = useState<string | null>(null);

  async function publishSnapshot() {
    setSnapshotStatus("loading");
    setSnapshotError(null);
    try {
      const res = await fetch("/api/admin/client-command/memory/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: data.clientId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to publish snapshot.");
      }
      setSnapshotStatus("done");
      router.refresh();
    } catch (err) {
      setSnapshotStatus("error");
      setSnapshotError(err instanceof Error ? err.message : "Snapshot failed.");
    }
  }

  async function runQuick(action: ClientMemoryAction, operation: string) {
    if (operation === "navigate") return;
    const memoryReference = `intel:${action.id}`;
    setLoadingRef(memoryReference);
    setQuickError(null);
    try {
      const res = await fetch("/api/admin/client-command/actions/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          operation,
          memoryReference,
          title: action.label,
          description: action.reason,
          source: "Intelligence",
          priority:
            action.priority === "critical" || action.priority === "high"
              ? action.priority
              : "medium",
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Action failed.");
      }
      router.refresh();
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoadingRef(null);
    }
  }

  return (
    <div className="kxd-os-intel">
      <header className="kxd-os-intel__hero">
        <div>
          <p className="kxd-os-eyebrow">Client AI Memory</p>
          <h2 className="kxd-os-intel__title">Executive intelligence</h2>
          <p className="kxd-os-intel__status">{memory.currentStatus}</p>
        </div>
        <div className="kxd-os-intel__hero-actions">
          <Link
            href={`/admin/operations/client-command/${data.clientId}?tab=actions`}
            className="kxd-os-link-quiet"
          >
            Actions ({data.actions.openCount})
          </Link>
          <button
            type="button"
            className="kxd-os-command-timeline-actions__btn kxd-os-command-timeline-actions__btn--primary"
            disabled={snapshotStatus === "loading"}
            onClick={() => publishSnapshot()}
          >
            {snapshotStatus === "loading" ? "Publishing…" : "Publish timeline snapshot"}
          </button>
        </div>
      </header>

      {snapshotError ? (
        <p className="kxd-os-command-timeline-form__error">{snapshotError}</p>
      ) : null}
      {quickError ? (
        <p className="kxd-os-command-timeline-form__error">{quickError}</p>
      ) : null}
      {snapshotStatus === "done" ? (
        <p className="kxd-os-command-timeline-form__success">Snapshot added to client timeline.</p>
      ) : null}

      <div className="kxd-os-intel-scores">
        <ScoreCard label="Relationship" value={memory.scores.relationshipHealthScore} />
        <ScoreCard label="Revenue opp." value={memory.scores.revenueOpportunityScore} />
        <ScoreCard label="Urgency" value={memory.scores.urgencyScore} />
        <ScoreCard label="Retention risk" value={memory.scores.retentionRiskScore} />
        <ScoreCard label="Momentum" value={memory.scores.momentumScore} />
      </div>

      <WorkspaceChapter title="Executive summary" variant="compact">
        <ul className="kxd-os-workspace-list">
          {memory.executiveSummary.map((line, i) => (
            <li key={i} className="kxd-os-workspace-list__item">
              <WorkspaceProse>{line}</WorkspaceProse>
            </li>
          ))}
        </ul>
        <WorkspaceMetaLine label="Relationship health" value={memory.relationshipHealth} />
        <WorkspaceMetaLine
          label="Generated"
          value={new Date(memory.generatedAt).toLocaleString("en-US")}
        />
      </WorkspaceChapter>

      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Recent wins" variant="compact">
          <InsightList items={memory.wins} empty="No recent wins detected — log launches and milestones." />
        </WorkspaceChapter>
        <WorkspaceChapter title="Risks" variant="compact">
          <InsightList items={memory.risks} empty="No active risk signals." />
        </WorkspaceChapter>
      </div>

      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Follow-ups needed" variant="compact">
          <InsightList items={memory.followUpsNeeded} empty="No pending follow-ups flagged." />
        </WorkspaceChapter>
        <WorkspaceChapter title="Opportunities" variant="compact">
          <InsightList
            items={[...memory.revenueOpportunities, ...memory.retainerOpportunities]}
            empty="No revenue opportunities identified yet."
          />
        </WorkspaceChapter>
      </div>

      <WorkspaceChapter title="Upsell ideas" variant="compact">
        <InsightList items={memory.upsellIdeas} empty="No upsell signals from current workspace data." />
      </WorkspaceChapter>

      <WorkspaceChapter title="Next best actions" variant="compact">
        {memory.nextBestActions.length === 0 ? (
          <WorkspaceEmpty message="No actions recommended — relationship appears stable." />
        ) : (
          <ul className="kxd-os-intel-actions">
            {memory.nextBestActions.map((action) => (
              <IntelActionRow
                key={action.id}
                action={action}
                clientId={data.clientId}
                email={data.header.primaryEmail}
                onQuick={runQuick}
                loadingId={loadingRef}
              />
            ))}
          </ul>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Memory notes" variant="compact">
        <InsightList
          items={memory.memoryNotes}
          empty="Pinned notes and context will appear here as you build institutional memory."
        />
      </WorkspaceChapter>
    </div>
  );
}
