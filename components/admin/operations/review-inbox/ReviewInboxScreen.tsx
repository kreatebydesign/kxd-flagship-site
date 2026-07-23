"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsKpiStrip,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { KxdBadgeVariant } from "@/components/os";
import { KxdPage } from "@/components/os";
import {
  REVIEW_INBOX_OPEN_STATUSES,
  REVIEW_INBOX_STATUS_OPTIONS,
  reviewInboxStatusOption,
} from "@/lib/website-review-inbox/status";
import type { ReviewInboxData, ReviewInboxItem, ReviewInboxRequestStatus } from "@/lib/website-review-inbox/types";
import { ReviewDeleteControl } from "./ReviewDeleteControl";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PRIO_VARIANT: Record<string, KxdBadgeVariant> = {
  urgent: "critical",
  high: "warning",
  normal: "default",
  low: "default",
};

export interface ReviewInboxScreenProps {
  data: ReviewInboxData;
}

export function ReviewInboxScreen({ data: initialData }: ReviewInboxScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialData.items);
  const [filter, setFilter] = useState<"new" | "active" | "all">("active");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState<{ id: number; message: string } | null>(null);
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("deleted") === "1") {
      setShowDeletedNotice(true);
      router.replace("/admin/operations/review-inbox");
    }
  }, [router, searchParams]);

  const newCount = items.filter((item) => item.status === "new").length;
  const activeCount = items.filter((item) =>
    REVIEW_INBOX_OPEN_STATUSES.includes(item.status),
  ).length;

  const visibleItems = useMemo(() => {
    if (filter === "new") return items.filter((item) => item.status === "new");
    if (filter === "active") {
      return items.filter((item) => REVIEW_INBOX_OPEN_STATUSES.includes(item.status));
    }
    return items;
  }, [filter, items]);

  async function updateStatus(item: ReviewInboxItem, status: ReviewInboxRequestStatus) {
    if (item.status === status) return;
    const previous = item.status;

    // Optimistic: keep the controlled select from snapping back during save.
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row)),
    );
    setUpdatingId(item.id);
    setStatusError(null);
    try {
      const res = await fetch(`/api/admin/client-requests/${item.id}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.status === 401) {
        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, status: previous } : row)),
        );
        const returnPath = window.location.pathname;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(returnPath)}`;
        return;
      }

      let body: {
        ok?: boolean;
        success?: boolean;
        status?: ReviewInboxRequestStatus;
        error?: string;
      } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
        throw new Error("Could not update status (invalid response).");
      }
      if (!res.ok || !(body.ok || body.success) || !body.status) {
        throw new Error(body.error ?? "Could not update status.");
      }

      const nextStatus = body.status!;
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, status: nextStatus } : row)),
      );

      if (nextStatus === "complete") {
        setStatusNotice(
          filter === "all"
            ? `Marked complete: ${item.title}.`
            : `Marked complete: ${item.title}. It moved out of Active — open All to find it again.`,
        );
      } else if (
        !REVIEW_INBOX_OPEN_STATUSES.includes(nextStatus) &&
        filter === "active"
      ) {
        setStatusNotice(`Status updated: ${item.title}.`);
      } else {
        setStatusNotice(null);
      }

      router.refresh();
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, status: previous } : row)),
      );
      setStatusError({
        id: item.id,
        message: err instanceof Error ? err.message : "Could not update status.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <OperationsShell activeId="review-inbox">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="Website Review"
          title="Review Inbox"
          lead="Client revisions in one focused queue. Triage fast, keep clients confident."
        />

        <OpsKpiStrip
          items={[
            { label: "New", value: String(newCount) },
            { label: "Active", value: String(activeCount) },
            { label: "Total", value: String(items.length) },
          ]}
        />

        {showDeletedNotice ? (
          <p className="kxd-os-review-inbox__notice" role="status">
            Revision deleted. It no longer appears in the client workspace or Review Inbox.
          </p>
        ) : null}

        {statusNotice ? (
          <p className="kxd-os-review-inbox__notice" role="status">
            {statusNotice}
          </p>
        ) : null}

        <section className="kxd-os-ops-section">
          <div className="kxd-os-review-inbox__filters" role="tablist" aria-label="Inbox filter">
            {(
              [
                ["new", `New (${newCount})`],
                ["active", `Active (${activeCount})`],
                ["all", `All (${items.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                className={`kxd-os-review-inbox__filter${filter === id ? " kxd-os-review-inbox__filter--active" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <OpsSectionHead
            label={filter === "new" ? "New revisions" : filter === "active" ? "Active revisions" : "All revisions"}
            count={visibleItems.length}
          />

          {visibleItems.length === 0 ? (
            <OpsEmpty message="No website review revisions in this view." />
          ) : (
            <OpsCard className="kxd-os-review-inbox__table">
              <div className="kxd-os-review-inbox__head" aria-hidden>
                <span>Revision</span>
                <span>Client</span>
                <span>Location</span>
                <span>Priority</span>
                <span>Files</span>
                <span>Submitted</span>
                <span>Status</span>
              </div>

              {visibleItems.map((item) => {
                const status = reviewInboxStatusOption(item.status);
                const prioVariant = PRIO_VARIANT[item.priority] ?? "default";

                return (
                  <div key={item.id} className="kxd-os-review-inbox__row">
                    <div className="kxd-os-review-inbox__primary">
                      <Link href={item.workspaceUrl} className="kxd-os-review-inbox__title">
                        {item.title}
                      </Link>
                      <p className="kxd-os-review-inbox__notes">{item.notesPreview || "—"}</p>
                      <p className="kxd-os-review-inbox__meta">
                        {item.experienceModule === "website-workspace"
                          ? "Website Workspace"
                          : "Website Review"}
                        {" · "}
                        {item.submittedBy ?? "Client"}
                        {item.submittedByEmail ? ` · ${item.submittedByEmail}` : ""}
                      </p>
                    </div>

                    <div className="kxd-os-review-inbox__cell" data-label="Client">
                      {item.clientId ? (
                        <Link
                          href={`/admin/operations/client-command/${item.clientId}`}
                          className="kxd-os-link-quiet"
                        >
                          {item.clientName}
                        </Link>
                      ) : (
                        item.clientName
                      )}
                    </div>

                    <div className="kxd-os-review-inbox__cell" data-label="Location">
                      {item.pageLocation}
                    </div>

                    <div className="kxd-os-review-inbox__cell" data-label="Priority">
                      <OpsStatusBadge
                        label={item.priority}
                        variant={prioVariant}
                      />
                    </div>

                    <div className="kxd-os-review-inbox__cell" data-label="Files">
                      {item.attachmentCount > 0 ? item.attachmentCount : "—"}
                    </div>

                    <div className="kxd-os-review-inbox__cell" data-label="Submitted">
                      <time dateTime={item.submittedAt}>{fmtDate(item.submittedAt)}</time>
                    </div>

                    <div className="kxd-os-review-inbox__cell kxd-os-review-inbox__cell--status" data-label="Status">
                      <OpsStatusBadge label={status.label} variant={status.variant} />
                      <label className="kxd-os-review-inbox__status-select">
                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
                          aria-busy={updatingId === item.id}
                          aria-label={`Update status for ${item.title}`}
                          onChange={(e) =>
                            void updateStatus(item, e.target.value as ReviewInboxRequestStatus)
                          }
                        >
                          {REVIEW_INBOX_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {updatingId === item.id ? (
                          <span className="kxd-os-review-inbox__status-saving" role="status">
                            Saving…
                          </span>
                        ) : null}
                      </label>
                      <ReviewDeleteControl
                        requestId={item.id}
                        title={item.title}
                        className="kxd-os-review-delete--inbox"
                        onDeleted={() => {
                          setItems((prev) => prev.filter((row) => row.id !== item.id));
                        }}
                      />
                      {statusError?.id === item.id ? (
                        <p className="kxd-os-review-inbox__notice kxd-os-review-inbox__notice--error" role="alert">
                          {statusError.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </OpsCard>
          )}
        </section>
      </KxdPage>
    </OperationsShell>
  );
}
