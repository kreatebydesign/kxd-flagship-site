"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsEmpty,
  OpsKpiStrip,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { UpgradeRequestStatus } from "@/lib/client-upgrade-requests/types";
import {
  allowedNextUpgradeStatuses,
  upgradeStatusLabel,
} from "@/lib/client-upgrade-requests/rules";

type AdminRequestRow = {
  id: number;
  clientId: number;
  clientName: string | null;
  moduleKey: string;
  moduleLabel: string;
  status: UpgradeRequestStatus;
  clientMessage: string | null;
  operatorNote: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  createdAt: string;
  entitlementSnapshot: {
    planKey: string | null;
    planStatus: string;
    isLegacy: boolean;
    isPaused: boolean;
    effectiveModules: string[];
  } | null;
  accessGranted?: boolean;
  currentPlanKey?: string | null;
  currentPlanStatus?: string | null;
  currentEffectiveModules?: string[];
};

type ListResponse = {
  ok?: boolean;
  message?: string;
  requests?: AdminRequestRow[];
};

type DetailResponse = {
  ok?: boolean;
  message?: string;
  request?: AdminRequestRow;
  accessGranted?: boolean;
  plansAccessUrl?: string;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UpgradeRequestsInboxScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [items, setItems] = useState<AdminRequestRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminRequestRow | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [plansUrl, setPlansUrl] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<UpgradeRequestStatus>("submitted");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/upgrade-requests?status=${filter}`,
        { credentials: "same-origin" },
      );
      const json = (await res.json()) as ListResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Unable to load requests.");
      }
      setItems(json.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap
    void load();
  }, [load]);

  const selected = useMemo(
    () => items.find((row) => row.id === selectedId) ?? detail,
    [items, selectedId, detail],
  );

  async function openDetail(id: number) {
    setSelectedId(id);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/upgrade-requests/${id}`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || !json.ok || !json.request) {
        throw new Error(json.message || "Unable to load request.");
      }
      setDetail(json.request);
      setStatusDraft(json.request.status);
      setNoteDraft(json.request.operatorNote ?? "");
      setAccessGranted(Boolean(json.accessGranted));
      setPlansUrl(json.plansAccessUrl ?? null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to load.");
    }
  }

  async function save() {
    if (!selectedId || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/upgrade-requests/${selectedId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusDraft,
          operatorNote: noteDraft.trim() || null,
        }),
      });
      const json = (await res.json()) as DetailResponse & {
        message?: string;
      };
      if (!res.ok || !json.ok || !json.request) {
        throw new Error(json.message || "Unable to save.");
      }
      setDetail(json.request);
      setAccessGranted(Boolean(json.accessGranted));
      setSaveMessage(
        json.message ||
          `Saved · ${upgradeStatusLabel(json.request.status)}.`,
      );
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  const openCount = items.filter(
    (row) => row.status === "submitted" || row.status === "reviewing",
  ).length;

  return (
    <OperationsShell activeId="upgrade-requests">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Requests"
          title="Upgrade Requests"
          lead="Clients requesting capabilities they do not currently have. Approval does not grant access — use Plans & Access."
          presence
        />

        <OpsKpiStrip
          items={[
            { label: "Visible", value: String(items.length) },
            { label: "Open", value: String(openCount) },
            { label: "Filter", value: filter === "open" ? "Open" : "All" },
          ]}
        />

        <div className="kxd-upgrade-admin__filters">
          <button
            type="button"
            className={filter === "open" ? "is-active" : undefined}
            onClick={() => setFilter("open")}
          >
            Open
          </button>
          <button
            type="button"
            className={filter === "all" ? "is-active" : undefined}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>

        {loading ? <p className="kxd-os-meta">Loading requests…</p> : null}
        {error ? <p className="kxd-os-meta" style={{ color: "var(--kxd-os-critical)" }}>{error}</p> : null}

        <div className="kxd-upgrade-admin__layout">
          <div>
            <OpsSectionHead label="Queue" />
            {items.length === 0 && !loading ? (
              <OpsEmpty message="No upgrade requests in this filter." />
            ) : (
              <ul className="kxd-upgrade-admin__list">
                {items.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={selectedId === row.id ? "is-active" : undefined}
                      onClick={() => void openDetail(row.id)}
                    >
                      <strong>{row.moduleLabel}</strong>
                      <span>{row.clientName ?? `Client #${row.clientId}`}</span>
                      <em>{upgradeStatusLabel(row.status)}</em>
                      <time>{fmtDate(row.createdAt)}</time>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="kxd-upgrade-admin__detail">
            <OpsSectionHead label="Review" />
            {!selected ? (
              <OpsEmpty message="Select a request to review." />
            ) : (
              <div className="kxd-upgrade-admin__panel">
                <p className="kxd-os-meta">
                  {selected.clientName ?? `Client #${selected.clientId}`} ·{" "}
                  {selected.moduleLabel}
                </p>
                <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
                  {selected.clientMessage || "No client message."}
                </p>

                <dl className="kxd-upgrade-admin__meta">
                  <div>
                    <dt>Requester</dt>
                    <dd>
                      {selected.requesterName ?? "—"}
                      {selected.requesterEmail
                        ? ` · ${selected.requesterEmail}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Plan at request</dt>
                    <dd>
                      {selected.entitlementSnapshot?.planKey ?? "legacy/none"} ·{" "}
                      {selected.entitlementSnapshot?.planStatus ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Current plan</dt>
                    <dd>
                      {selected.currentPlanKey ?? "legacy/none"} ·{" "}
                      {selected.currentPlanStatus ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Access now</dt>
                    <dd>{accessGranted ? "Granted" : "Not granted"}</dd>
                  </div>
                </dl>

                {selected.status === "approved" && !accessGranted ? (
                  <p className="kxd-upgrade-admin__callout" role="status">
                    Request approved — access is not yet granted. Open Plans &amp;
                    Access to enable the module intentionally.
                  </p>
                ) : null}
                {accessGranted ? (
                  <p className="kxd-upgrade-admin__callout kxd-upgrade-admin__callout--ok" role="status">
                    Access is currently effective for this capability.
                  </p>
                ) : null}

                <label className="kxd-upgrade-admin__field">
                  Status
                  <select
                    value={statusDraft}
                    disabled={saving}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as UpgradeRequestStatus)
                    }
                  >
                    {(
                      [
                        selected.status,
                        ...allowedNextUpgradeStatuses(selected.status),
                      ] as UpgradeRequestStatus[]
                    )
                      .filter(
                        (status, index, all) => all.indexOf(status) === index,
                      )
                      .map((status) => (
                        <option key={status} value={status}>
                          {upgradeStatusLabel(status)}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="kxd-upgrade-admin__field">
                  Internal operator note
                  <textarea
                    value={noteDraft}
                    disabled={saving}
                    rows={3}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Operator-only. Never shown to portal users."
                  />
                </label>

                <div className="kxd-upgrade-admin__actions">
                  <button
                    type="button"
                    className="kxd-upgrade-admin__save"
                    disabled={saving}
                    onClick={() => void save()}
                  >
                    {saving ? "Saving…" : "Save review"}
                  </button>
                  {plansUrl ? (
                    <Link href={plansUrl} className="kxd-os-link-quiet">
                      Review Plans &amp; Access
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/operations/client-command/${selected.clientId}`}
                      className="kxd-os-link-quiet"
                    >
                      Review Plans &amp; Access
                    </Link>
                  )}
                </div>

                <div aria-live="polite">
                  {saveError ? (
                    <p className="kxd-upgrade-admin__error">{saveError}</p>
                  ) : null}
                  {saveMessage ? (
                    <p className="kxd-upgrade-admin__success">{saveMessage}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
