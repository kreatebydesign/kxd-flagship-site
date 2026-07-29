"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  REVIEW_INBOX_BULK_COMPLETE_MAX_IDS,
  clientBreakdownForSelection,
  eligibleIdsInView,
  formatBulkCompleteNotice,
  isBulkCompleteEligibleItem,
  selectAllEligibleState,
  type ReviewInboxBulkCompleteResult,
} from "@/lib/website-review-inbox/bulk-eligibility";
import {
  formatLinkedWorkResultLine,
  type LinkedWorkCounts,
} from "@/lib/website-review-inbox/linked-work-types";
import {
  REVIEW_INBOX_OPEN_STATUSES,
  REVIEW_INBOX_STATUS_OPTIONS,
  reviewInboxStatusOption,
} from "@/lib/website-review-inbox/status";
import type { ReviewInboxData, ReviewInboxItem, ReviewInboxRequestStatus, ReviewWorkEngineLink } from "@/lib/website-review-inbox/types";
import { ReviewCompleteConfirmDialog } from "./ReviewCompleteConfirmDialog";
import { ReviewDeleteControl } from "./ReviewDeleteControl";
import { ReviewInboxBulkConfirmDialog } from "./ReviewInboxBulkConfirmDialog";
import { ReviewReconcileLinkedWorkDialog } from "./ReviewReconcileLinkedWorkDialog";

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

type InboxFilter = "new" | "active" | "all";

export interface ReviewInboxScreenProps {
  data: ReviewInboxData;
}

export function ReviewInboxScreen({ data: initialData }: ReviewInboxScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectAllId = useId();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState(initialData.items);
  const [filter, setFilter] = useState<InboxFilter>("active");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState<{ id: number; message: string } | null>(null);
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDetailLines, setBulkDetailLines] = useState<string[]>([]);
  const [batchOperationId, setBatchOperationId] = useState<string | null>(null);
  const [completeLinkedWork, setCompleteLinkedWork] = useState(true);
  const [linkedWorkPreview, setLinkedWorkPreview] = useState<LinkedWorkCounts | null>(
    null,
  );
  const [linkedWorkPreviewLoading, setLinkedWorkPreviewLoading] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcilePreview, setReconcilePreview] = useState<LinkedWorkCounts | null>(
    null,
  );
  const [reconcilePreviewLoading, setReconcilePreviewLoading] = useState(false);
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [individualCompleteItem, setIndividualCompleteItem] =
    useState<ReviewInboxItem | null>(null);
  const [individualCompleteOpen, setIndividualCompleteOpen] = useState(false);
  const [individualLinkedWork, setIndividualLinkedWork] =
    useState<ReviewWorkEngineLink | null>(null);
  const [individualLinkedWorkLoading, setIndividualLinkedWorkLoading] =
    useState(false);
  const [individualCompleteLinkedWork, setIndividualCompleteLinkedWork] =
    useState(true);
  const [individualCompleteSubmitting, setIndividualCompleteSubmitting] =
    useState(false);
  const [individualCompleteError, setIndividualCompleteError] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (searchParams.get("deleted") !== "1") return;
    // Defer so the deleted query can be cleared without a sync setState-in-effect cascade.
    const frame = window.requestAnimationFrame(() => {
      setShowDeletedNotice(true);
      router.replace("/admin/operations/review-inbox");
    });
    return () => window.cancelAnimationFrame(frame);
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

  const eligibleVisibleIds = useMemo(
    () => eligibleIdsInView(visibleItems),
    [visibleItems],
  );

  const selectedVisibleItems = useMemo(
    () => visibleItems.filter((item) => selectedIds.has(item.id)),
    [visibleItems, selectedIds],
  );

  const selectedBulkEligibleCount = useMemo(
    () => selectedVisibleItems.filter((item) => isBulkCompleteEligibleItem(item)).length,
    [selectedVisibleItems],
  );

  const selectedCompletedIds = useMemo(
    () => selectedVisibleItems.filter((item) => item.status === "complete").map((i) => i.id),
    [selectedVisibleItems],
  );

  const selectedCount = selectedIds.size;
  const selectAllState = selectAllEligibleState(eligibleVisibleIds, selectedIds);
  const clientBreakdown = useMemo(
    () => clientBreakdownForSelection(visibleItems, selectedIds),
    [visibleItems, selectedIds],
  );

  async function loadBulkLinkedWorkPreview(ids: number[]) {
    setLinkedWorkPreviewLoading(true);
    setLinkedWorkPreview(null);
    try {
      const res = await fetch("/api/admin/review-inbox/bulk-complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          preview: true,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        linkedWork?: LinkedWorkCounts;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.linkedWork) {
        setBulkError(body.error ?? "Could not preview linked Work.");
        setLinkedWorkPreview(null);
        return;
      }
      setLinkedWorkPreview(body.linkedWork);
      setCompleteLinkedWork(body.linkedWork.eligible > 0);
    } catch {
      setBulkError("Could not preview linked Work.");
      setLinkedWorkPreview(null);
    } finally {
      setLinkedWorkPreviewLoading(false);
    }
  }

  async function loadReconcilePreview(ids: number[]) {
    setReconcilePreviewLoading(true);
    setReconcilePreview(null);
    try {
      const res = await fetch("/api/admin/review-inbox/reconcile-linked-work", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          dryRun: true,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        success?: boolean;
        linkedWork?: LinkedWorkCounts;
        error?: string;
      };
      if (!res.ok || !(body.ok || body.success) || !body.linkedWork) {
        setReconcileError(body.error ?? "Could not preview reconciliation.");
        setReconcilePreview(null);
        return;
      }
      setReconcilePreview(body.linkedWork);
    } catch {
      setReconcileError("Could not preview reconciliation.");
      setReconcilePreview(null);
    } finally {
      setReconcilePreviewLoading(false);
    }
  }

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectAllState === "indeterminate";
    }
  }, [selectAllState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmOpen || reconcileOpen || bulkSubmitting || reconcileSubmitting) return;
      if (selectedIds.size === 0) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setSelectedIds(new Set());
      setSelectionNotice("Selection cleared.");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, reconcileOpen, bulkSubmitting, reconcileSubmitting, selectedIds.size]);

  function clearSelection(message?: string) {
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setBulkError(null);
    if (message) setSelectionNotice(message);
  }

  function changeFilter(next: InboxFilter) {
    if (next === filter) return;
    setFilter(next);
    if (selectedIds.size > 0) {
      clearSelection("Selection cleared because the inbox filter changed.");
    }
  }

  function canSelectItem(item: ReviewInboxItem): boolean {
    return isBulkCompleteEligibleItem(item) || item.status === "complete";
  }

  function toggleRow(item: ReviewInboxItem, checked: boolean) {
    if (!canSelectItem(item)) return;
    setSelectionNotice(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= REVIEW_INBOX_BULK_COMPLETE_MAX_IDS && !next.has(item.id)) {
          setSelectionNotice(
            `You can select up to ${REVIEW_INBOX_BULK_COMPLETE_MAX_IDS} requests at once.`,
          );
          return prev;
        }
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
      return next;
    });
  }

  function toggleSelectAllEligible(checked: boolean) {
    setSelectionNotice(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!checked) {
        for (const id of eligibleVisibleIds) next.delete(id);
        return next;
      }

      for (const id of eligibleVisibleIds) {
        if (next.size >= REVIEW_INBOX_BULK_COMPLETE_MAX_IDS) {
          setSelectionNotice(
            `You can select up to ${REVIEW_INBOX_BULK_COMPLETE_MAX_IDS} requests at once.`,
          );
          break;
        }
        next.add(id);
      }
      return next;
    });
  }

  async function openIndividualCompleteConfirm(item: ReviewInboxItem) {
    setIndividualCompleteItem(item);
    setIndividualCompleteOpen(true);
    setIndividualCompleteError(null);
    setIndividualLinkedWork(null);
    setIndividualCompleteLinkedWork(true);
    setIndividualLinkedWorkLoading(true);

    try {
      const res = await fetch("/api/admin/review-inbox/bulk-complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id], preview: true }),
      });
      if (res.status === 401) {
        const returnPath = window.location.pathname;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(returnPath)}`;
        return;
      }
      const body = (await res.json()) as {
        ok?: boolean;
        rows?: Array<{
          eligibility?: string;
          workId?: number | null;
          workNumber?: string | null;
          workStatusLabel?: string | null;
          adminUrl?: string | null;
        }>;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Could not look up linked Work.");
      }
      const row = body.rows?.[0];
      if (row?.workId != null && row.workId > 0) {
        const eligible = row.eligibility === "eligible";
        setIndividualLinkedWork({
          workId: row.workId,
          workNumber: row.workNumber ?? `WK-${String(row.workId).padStart(6, "0")}`,
          adminUrl: `/admin/work/${row.workId}`,
          statusLabel: row.workStatusLabel ?? undefined,
          completionEligible: eligible,
        });
        setIndividualCompleteLinkedWork(eligible);
      } else {
        setIndividualLinkedWork(null);
        setIndividualCompleteLinkedWork(false);
      }
    } catch (err) {
      setIndividualCompleteError(
        err instanceof Error ? err.message : "Could not look up linked Work.",
      );
      setIndividualLinkedWork(null);
      setIndividualCompleteLinkedWork(false);
    } finally {
      setIndividualLinkedWorkLoading(false);
    }
  }

  async function updateStatus(
    item: ReviewInboxItem,
    status: ReviewInboxRequestStatus,
    options?: { completeLinkedWork?: boolean },
  ) {
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
        body: JSON.stringify({
          status,
          completeLinkedWork:
            status === "complete" && typeof options?.completeLinkedWork === "boolean"
              ? options.completeLinkedWork
              : undefined,
        }),
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
        linkedWork?: {
          outcome?: string;
          workNumber?: string | null;
          reason?: string | null;
        } | null;
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

      if (nextStatus === "complete" || !isBulkCompleteEligibleItem({ status: nextStatus })) {
        setSelectedIds((prev) => {
          if (!prev.has(item.id)) return prev;
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }

      if (nextStatus === "complete") {
        let notice =
          filter === "all"
            ? `Marked complete: ${item.title}.`
            : `Marked complete: ${item.title}. It moved out of Active — open All to find it again.`;
        if (body.linkedWork?.outcome === "completed") {
          notice += ` Linked Work ${body.linkedWork.workNumber ?? ""} completed.`
            .replace(/\s+/g, " ")
            .trimEnd();
        } else if (body.linkedWork?.outcome === "failed") {
          notice += ` Linked Work failed: ${body.linkedWork.reason ?? "unknown error"}.`;
        } else if (body.linkedWork?.outcome === "skipped_by_operator") {
          notice += " Linked Work left open.";
        } else if (body.linkedWork?.reason) {
          notice += ` ${body.linkedWork.reason}`;
        }
        setStatusNotice(notice);
      } else if (
        !REVIEW_INBOX_OPEN_STATUSES.includes(nextStatus) &&
        filter === "active"
      ) {
        setStatusNotice(`Status updated: ${item.title}.`);
      } else {
        setStatusNotice(null);
      }

      setIndividualCompleteOpen(false);
      setIndividualCompleteItem(null);
      router.refresh();
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, status: previous } : row)),
      );
      const message = err instanceof Error ? err.message : "Could not update status.";
      setStatusError({
        id: item.id,
        message,
      });
      setIndividualCompleteError(message);
    } finally {
      setUpdatingId(null);
      setIndividualCompleteSubmitting(false);
    }
  }

  function handleStatusSelectChange(
    item: ReviewInboxItem,
    next: ReviewInboxRequestStatus,
  ) {
    if (next === item.status) return;
    if (next === "complete") {
      void openIndividualCompleteConfirm(item);
      return;
    }
    void updateStatus(item, next);
  }

  async function confirmBulkComplete() {
    if (bulkSubmitting || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    setBulkSubmitting(true);
    setBulkError(null);

    const nextBatchId =
      batchOperationId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `bulk-${Date.now()}`);
    setBatchOperationId(nextBatchId);

    try {
      const res = await fetch("/api/admin/review-inbox/bulk-complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          confirm: true,
          batchOperationId: nextBatchId,
          completeLinkedWork,
        }),
      });

      if (res.status === 401) {
        const returnPath = window.location.pathname;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(returnPath)}`;
        return;
      }

      let body: Partial<ReviewInboxBulkCompleteResult> & {
        ok?: boolean;
        success?: boolean;
        error?: string;
      } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
        throw new Error("Could not complete requests (invalid response).");
      }

      if (!res.ok || !(body.ok || body.success) || !body.counts || !Array.isArray(body.results)) {
        throw new Error(body.error ?? "Could not complete selected requests.");
      }

      const bulkResults = body.results;
      const bulkCounts = body.counts;

      const completedIds = new Set(
        bulkResults.filter((row) => row.outcome === "completed").map((row) => row.id),
      );

      setItems((prev) =>
        prev.map((row) =>
          completedIds.has(row.id) ? { ...row, status: "complete" as const } : row,
        ),
      );

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of completedIds) next.delete(id);
        for (const row of bulkResults) {
          if (row.outcome === "completed") continue;
          if (
            row.reasonCode === "already_complete" ||
            row.reasonCode === "ineligible_status" ||
            row.reasonCode === "not_found" ||
            row.reasonCode === "wrong_module"
          ) {
            next.delete(row.id);
          }
        }
        return next;
      });

      const notice = formatBulkCompleteNotice(bulkCounts, filter !== "all");
      setStatusNotice(notice);
      setSelectionNotice(null);

      const attention = bulkResults
        .filter(
          (row) =>
            row.outcome !== "completed" ||
            row.linkedWork?.outcome === "failed",
        )
        .slice(0, 6)
        .map((row) => {
          const label = row.title ?? `#${row.id}`;
          if (row.linkedWork?.outcome === "failed") {
            return `${label}: Work failed — ${row.linkedWork.reason ?? "error"}`;
          }
          return `${label}: ${row.reason ?? row.outcome}`;
        });
      setBulkDetailLines(attention);

      setConfirmOpen(false);
      setBatchOperationId(null);
      router.refresh();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Could not complete selected requests.");
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function confirmReconcileLinkedWork() {
    if (reconcileSubmitting || selectedCompletedIds.length === 0) return;
    setReconcileSubmitting(true);
    setReconcileError(null);
    try {
      const res = await fetch("/api/admin/review-inbox/reconcile-linked-work", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedCompletedIds,
          dryRun: false,
          confirm: true,
        }),
      });
      if (res.status === 401) {
        const returnPath = window.location.pathname;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(returnPath)}`;
        return;
      }
      const body = (await res.json()) as {
        ok?: boolean;
        success?: boolean;
        linkedWork?: LinkedWorkCounts;
        error?: string;
        results?: Array<{
          reviewId: number;
          title: string;
          work: { outcome: string; reason?: string | null };
        }>;
      };
      if (!res.ok || !(body.ok || body.success) || !body.linkedWork) {
        throw new Error(body.error ?? "Could not reconcile linked Work.");
      }
      setStatusNotice(formatLinkedWorkResultLine(body.linkedWork));
      const attention = (body.results ?? [])
        .filter((row) => row.work.outcome === "failed")
        .slice(0, 6)
        .map((row) => `${row.title}: ${row.work.reason ?? "failed"}`);
      setBulkDetailLines(attention);
      setReconcileOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      setReconcileError(
        err instanceof Error ? err.message : "Could not reconcile linked Work.",
      );
    } finally {
      setReconcileSubmitting(false);
    }
  }

  return (
    <OperationsShell activeId="review-inbox">
      <KxdPage className="kxd-os-page--ops kxd-os-review-inbox">
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

        {selectionNotice ? (
          <p className="kxd-os-review-inbox__notice" role="status">
            {selectionNotice}
          </p>
        ) : null}

        {bulkDetailLines.length > 0 ? (
          <div className="kxd-os-review-inbox__notice kxd-os-review-inbox__notice--detail" role="status">
            <p className="kxd-os-review-inbox-bulk__detail-label">Needs attention</p>
            <ul className="kxd-os-review-inbox-bulk__detail-list">
              {bulkDetailLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
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
                onClick={() => changeFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="kxd-os-review-inbox__toolbar">
            <OpsSectionHead
              label={filter === "new" ? "New revisions" : filter === "active" ? "Active revisions" : "All revisions"}
              count={visibleItems.length}
            />

            {eligibleVisibleIds.length > 0 ? (
              <div className="kxd-os-review-inbox-bulk__select-all">
                <input
                  ref={selectAllRef}
                  id={selectAllId}
                  type="checkbox"
                  className="kxd-os-review-inbox-bulk__checkbox"
                  checked={selectAllState === "checked"}
                  onChange={(event) => toggleSelectAllEligible(event.target.checked)}
                  aria-label="Select all eligible requests in this view"
                />
                <label htmlFor={selectAllId}>
                  Select all eligible in this view
                  <span className="kxd-os-review-inbox-bulk__select-all-hint">
                    {" "}
                    ({eligibleVisibleIds.length} In progress)
                  </span>
                </label>
              </div>
            ) : null}
          </div>

          {selectedCount > 0 ? (
            <div
              className="kxd-os-review-inbox-bulk__bar"
              role="region"
              aria-label="Bulk actions"
            >
              <p className="kxd-os-review-inbox-bulk__bar-count">
                {selectedCount === 1
                  ? "1 request selected"
                  : `${selectedCount} requests selected`}
              </p>
              <div className="kxd-os-review-inbox-bulk__bar-actions">
                <button
                  type="button"
                  className="kxd-os-btn kxd-os-btn--secondary"
                  disabled={bulkSubmitting || reconcileSubmitting}
                  onClick={() => clearSelection()}
                >
                  Clear selection
                </button>
                {selectedCompletedIds.length > 0 ? (
                  <button
                    type="button"
                    className="kxd-os-btn kxd-os-btn--secondary"
                    disabled={
                      bulkSubmitting ||
                      reconcileSubmitting ||
                      selectedCompletedIds.length !== selectedCount
                    }
                    title={
                      selectedCompletedIds.length !== selectedCount
                        ? "Select only completed reviews to reconcile linked Work"
                        : undefined
                    }
                    onClick={() => {
                      setReconcileError(null);
                      setReconcileOpen(true);
                      void loadReconcilePreview(selectedCompletedIds);
                    }}
                  >
                    Reconcile linked Work
                  </button>
                ) : null}
                <button
                  type="button"
                  className="kxd-os-btn kxd-os-btn--primary"
                  disabled={
                    bulkSubmitting ||
                    reconcileSubmitting ||
                    selectedBulkEligibleCount === 0 ||
                    selectedBulkEligibleCount !== selectedCount
                  }
                  title={
                    selectedBulkEligibleCount !== selectedCount
                      ? "Mark Completed only applies to In progress selections"
                      : undefined
                  }
                  onClick={() => {
                    setBulkError(null);
                    setConfirmOpen(true);
                    void loadBulkLinkedWorkPreview(Array.from(selectedIds));
                  }}
                >
                  Mark Completed
                </button>
              </div>
            </div>
          ) : null}

          {visibleItems.length === 0 ? (
            <OpsEmpty message="No website review revisions in this view." />
          ) : (
            <OpsCard className="kxd-os-review-inbox__table">
              <div className="kxd-os-review-inbox__head" aria-hidden>
                <span className="kxd-os-review-inbox__head-select">Select</span>
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
                const eligible = canSelectItem(item);
                const selected = selectedIds.has(item.id);
                const checkboxId = `review-inbox-select-${item.id}`;
                const selectHint = isBulkCompleteEligibleItem(item)
                  ? undefined
                  : item.status === "complete"
                    ? "Completed — selectable for linked Work reconciliation"
                    : "Only In progress or Completed requests can be selected";

                return (
                  <div
                    key={item.id}
                    className={`kxd-os-review-inbox__row${selected ? " kxd-os-review-inbox__row--selected" : ""}`}
                  >
                    <div className="kxd-os-review-inbox__select-cell">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        className="kxd-os-review-inbox-bulk__checkbox"
                        checked={eligible ? selected : false}
                        disabled={!eligible}
                        title={selectHint}
                        aria-label={
                          eligible
                            ? `Select request: ${item.title}`
                            : `Cannot select request: ${item.title}.`
                        }
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleRow(item, event.target.checked);
                        }}
                      />
                    </div>

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
                          disabled={updatingId === item.id || bulkSubmitting}
                          aria-busy={updatingId === item.id}
                          aria-label={`Update status for ${item.title}`}
                          onChange={(e) =>
                            handleStatusSelectChange(
                              item,
                              e.target.value as ReviewInboxRequestStatus,
                            )
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
                          setSelectedIds((prev) => {
                            if (!prev.has(item.id)) return prev;
                            const next = new Set(prev);
                            next.delete(item.id);
                            return next;
                          });
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

      <ReviewCompleteConfirmDialog
        open={individualCompleteOpen}
        reviewTitle={individualCompleteItem?.title ?? ""}
        linkedWork={individualLinkedWork}
        linkedWorkLoading={individualLinkedWorkLoading}
        completeLinkedWork={individualCompleteLinkedWork}
        onCompleteLinkedWorkChange={setIndividualCompleteLinkedWork}
        submitting={individualCompleteSubmitting}
        error={individualCompleteError}
        onCancel={() => {
          if (individualCompleteSubmitting) return;
          setIndividualCompleteOpen(false);
          setIndividualCompleteItem(null);
          setIndividualCompleteError(null);
        }}
        onConfirm={() => {
          if (!individualCompleteItem || individualLinkedWorkLoading) return;
          setIndividualCompleteSubmitting(true);
          void updateStatus(individualCompleteItem, "complete", {
            completeLinkedWork: individualCompleteLinkedWork,
          });
        }}
      />

      <ReviewInboxBulkConfirmDialog
        open={confirmOpen}
        selectedCount={selectedCount}
        selectedItems={selectedVisibleItems}
        clientBreakdown={clientBreakdown}
        linkedWorkPreview={linkedWorkPreview}
        linkedWorkPreviewLoading={linkedWorkPreviewLoading}
        completeLinkedWork={completeLinkedWork}
        onCompleteLinkedWorkChange={setCompleteLinkedWork}
        submitting={bulkSubmitting}
        error={bulkError}
        onCancel={() => {
          if (bulkSubmitting) return;
          setConfirmOpen(false);
          setBulkError(null);
        }}
        onConfirm={() => void confirmBulkComplete()}
      />

      <ReviewReconcileLinkedWorkDialog
        open={reconcileOpen}
        selectedCount={selectedCompletedIds.length}
        preview={reconcilePreview}
        previewLoading={reconcilePreviewLoading}
        submitting={reconcileSubmitting}
        error={reconcileError}
        onCancel={() => {
          if (reconcileSubmitting) return;
          setReconcileOpen(false);
          setReconcileError(null);
        }}
        onConfirm={() => void confirmReconcileLinkedWork()}
      />
    </OperationsShell>
  );
}
