"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PortalUpgradeRequestView,
  UpgradeCapabilityCard,
  UpgradeRequestStatus,
} from "@/lib/client-upgrade-requests/types";
import { upgradeStatusLabel } from "@/lib/client-upgrade-requests/rules";

type ApiResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  requests?: PortalUpgradeRequestView[];
  capabilities?: UpgradeCapabilityCard[];
  planPaused?: boolean;
  request?: PortalUpgradeRequestView;
};

function statusClass(status: UpgradeRequestStatus): string {
  switch (status) {
    case "submitted":
      return "kxd-upgrade__status--submitted";
    case "reviewing":
      return "kxd-upgrade__status--reviewing";
    case "approved":
      return "kxd-upgrade__status--approved";
    case "declined":
      return "kxd-upgrade__status--declined";
    case "canceled":
      return "kxd-upgrade__status--canceled";
    default:
      return "";
  }
}

function statusDetail(
  status: UpgradeRequestStatus,
  accessGranted: boolean,
): string {
  if (accessGranted) return `${upgradeStatusLabel(status)} · Access granted`;
  if (status === "approved") {
    return "Approved · Access not yet enabled by KXD";
  }
  return upgradeStatusLabel(status);
}

export function PortalUpgradeOpportunities() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<UpgradeCapabilityCard[]>([]);
  const [requests, setRequests] = useState<PortalUpgradeRequestView[]>([]);
  const [planPaused, setPlanPaused] = useState(false);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/upgrade-requests", {
        credentials: "same-origin",
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Unable to load opportunities.");
      }
      setCapabilities(json.capabilities ?? []);
      setRequests(json.requests ?? []);
      setPlanPaused(Boolean(json.planPaused));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap
    void load();
  }, [load]);

  async function submit(moduleKey: string) {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch("/api/portal/upgrade-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey,
          clientMessage: message.trim() || null,
          sourceSurface: "portal-home",
        }),
      });
      const json = (await res.json()) as ApiResponse;
      if (json.code === "active_duplicate" || res.status === 409) {
        setFormError(
          json.message ||
            "You already have an open request for this capability.",
        );
        setActiveKey(null);
        setMessage("");
        await load();
        return;
      }
      if (!res.ok || !json.ok || !json.request) {
        throw new Error(json.message || "Unable to submit request.");
      }
      setFormSuccess(
        "Request submitted. Access is not unlocked automatically — KXD will review it.",
      );
      setMessage("");
      setActiveKey(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id: number) {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/portal/upgrade-requests/${id}/cancel`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Unable to cancel.");
      }
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to cancel.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="kxd-upgrade" aria-busy="true">
        <p className="kxd-upgrade__eyebrow">Workspace capabilities</p>
        <p className="kxd-upgrade__meta">Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="kxd-upgrade">
        <p className="kxd-upgrade__eyebrow">Workspace capabilities</p>
        <p className="kxd-upgrade__error">{error}</p>
      </section>
    );
  }

  if (capabilities.length === 0 && requests.length === 0 && !planPaused) {
    return null;
  }

  return (
    <section className="kxd-upgrade" aria-labelledby="kxd-upgrade-heading">
      <header className="kxd-upgrade__head">
        <p className="kxd-upgrade__eyebrow">Workspace capabilities</p>
        <h2 id="kxd-upgrade-heading" className="kxd-upgrade__title">
          Expand what your workspace can do
        </h2>
        <p className="kxd-upgrade__lead">
          Request access to additional capabilities when they would help your
          team. Submitting a request does not unlock access immediately.
        </p>
        {planPaused ? (
          <p className="kxd-upgrade__paused" role="status">
            Workspace access is currently paused. Contact KXD before requesting
            individual capabilities.
          </p>
        ) : null}
      </header>

      {!planPaused && capabilities.length > 0 ? (
      <div className="kxd-upgrade__grid">
        {capabilities.map((card) => {
          const open = activeKey === card.moduleKey;
          return (
            <article key={card.moduleKey} className="kxd-upgrade__card">
              <h3 className="kxd-upgrade__card-title">{card.label}</h3>
              <p className="kxd-upgrade__card-summary">{card.summary}</p>
              <p className="kxd-upgrade__card-value">{card.valueLine}</p>

              {card.accessGranted ? (
                <p className="kxd-upgrade__status kxd-upgrade__status--approved">
                  Access available
                </p>
              ) : card.activeRequest ? (
                <div className="kxd-upgrade__request-state">
                  <p
                    className={`kxd-upgrade__status ${statusClass(card.activeRequest.status)}`}
                  >
                    {statusDetail(
                      card.activeRequest.status,
                      card.activeRequest.accessGranted,
                    )}
                  </p>
                  {(card.activeRequest.status === "submitted" ||
                    card.activeRequest.status === "reviewing") && (
                    <button
                      type="button"
                      className="kxd-upgrade__text-btn"
                      disabled={submitting}
                      onClick={() => void cancelRequest(card.activeRequest!.id)}
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              ) : card.canRequest ? (
                <>
                  {!open ? (
                    <button
                      type="button"
                      className="kxd-upgrade__btn"
                      onClick={() => {
                        setActiveKey(card.moduleKey);
                        setFormError(null);
                        setFormSuccess(null);
                      }}
                    >
                      Request access
                    </button>
                  ) : (
                    <div className="kxd-upgrade__form">
                      <label className="kxd-upgrade__label">
                        Optional message
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          disabled={submitting}
                          placeholder="Tell us how this would help your team."
                        />
                      </label>
                      <div className="kxd-upgrade__form-actions">
                        <button
                          type="button"
                          className="kxd-upgrade__btn"
                          disabled={submitting}
                          aria-busy={submitting}
                          onClick={() => void submit(card.moduleKey)}
                        >
                          {submitting ? "Submitting…" : "Submit request"}
                        </button>
                        <button
                          type="button"
                          className="kxd-upgrade__text-btn"
                          disabled={submitting}
                          onClick={() => {
                            setActiveKey(null);
                            setMessage("");
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="kxd-upgrade__meta">
                  Not available to request right now.
                </p>
              )}
            </article>
          );
        })}
      </div>
      ) : null}

      {planPaused && capabilities.length > 0 ? (
        <div className="kxd-upgrade__grid">
          {capabilities.map((card) =>
            card.activeRequest ? (
              <article key={card.moduleKey} className="kxd-upgrade__card">
                <h3 className="kxd-upgrade__card-title">{card.label}</h3>
                <p
                  className={`kxd-upgrade__status ${statusClass(card.activeRequest.status)}`}
                >
                  {statusDetail(
                    card.activeRequest.status,
                    card.activeRequest.accessGranted,
                  )}
                </p>
              </article>
            ) : null,
          )}
        </div>
      ) : null}

      <div aria-live="polite">
        {formError ? <p className="kxd-upgrade__error">{formError}</p> : null}
        {formSuccess ? (
          <p className="kxd-upgrade__success">{formSuccess}</p>
        ) : null}
      </div>

      {requests.length > 0 ? (
        <div className="kxd-upgrade__history">
          <h3 className="kxd-upgrade__history-title">Your requests</h3>
          <ul className="kxd-upgrade__history-list">
            {requests.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.moduleLabel}</strong>
                  <span className={`kxd-upgrade__status ${statusClass(row.status)}`}>
                    {statusDetail(row.status, row.accessGranted)}
                  </span>
                  {row.clientMessage ? (
                    <p className="kxd-upgrade__history-message">{row.clientMessage}</p>
                  ) : null}
                </div>
                <time dateTime={row.createdAt}>
                  {new Date(row.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
