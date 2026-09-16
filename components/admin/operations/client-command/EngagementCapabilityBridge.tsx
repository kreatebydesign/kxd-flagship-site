"use client";

import { useCallback, useEffect, useState } from "react";
import type { EngagementCapabilityProposal } from "@/lib/service-capabilities/propose-from-engagement";
import type { ResolvedServiceScope, ServiceCapabilityId } from "@/lib/service-capabilities/types";

type BridgeResponse = {
  ok: boolean;
  message?: string;
  proposal?: EngagementCapabilityProposal;
  scope?: ResolvedServiceScope;
  result?: {
    applied: Array<{ capabilityId: string }>;
    skipped: Array<{ capabilityId: string; reason: string }>;
  };
};

export function EngagementCapabilityBridge({
  clientId,
  onApplied,
}: {
  clientId: number;
  onApplied?: (scope: ResolvedServiceScope) => void;
}) {
  const [proposal, setProposal] = useState<EngagementCapabilityProposal | null>(null);
  const [selected, setSelected] = useState<Set<ServiceCapabilityId>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/engagement-capabilities`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as BridgeResponse;
      if (!res.ok || !json.ok || !json.proposal) {
        throw new Error(json.message || "Unable to propose engagement capabilities.");
      }
      setProposal(json.proposal);
      setSelected(
        new Set(
          json.proposal.proposals
            .filter((row) => row.confidence === "high")
            .map((row) => row.capabilityId),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load proposal.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply() {
    if (selected.size === 0) {
      setError("Select at least one proposed capability.");
      return;
    }
    setApplying(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/engagement-capabilities`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          action: "apply",
          capabilityIds: [...selected],
        }),
      });
      const json = (await res.json()) as BridgeResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Unable to apply mapping.");
      }
      const appliedCount = json.result?.applied.length ?? 0;
      setNotice(
        `Applied ${appliedCount} capability assignment(s). Economics and portal modules unchanged.`,
      );
      if (json.proposal) setProposal(json.proposal);
      if (json.scope) onApplied?.(json.scope);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply mapping.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="kxd-ces-exp__bridge" style={{ marginBottom: "1.25rem" }}>
      <h3 className="kxd-ces-exp__h">Engagement → capability bridge</h3>
      <p className="kxd-os-meta">
        Propose included capabilities from accepted/direct commercial evidence. Review before
        apply. Does not change prices, obligations, payments, or portal modules.
      </p>
      {loading ? <p className="kxd-os-meta">Loading proposal…</p> : null}
      {error ? (
        <p className="kxd-os-meta kxd-ces-exp__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="kxd-os-meta kxd-ces-exp__notice" role="status">
          {notice}
        </p>
      ) : null}
      {proposal && proposal.proposals.length === 0 ? (
        <p className="kxd-os-meta">No new capability mappings proposed from current evidence.</p>
      ) : null}
      {proposal && proposal.proposals.length > 0 ? (
        <ul className="kxd-ces-exp__modules">
          {proposal.proposals.map((row) => (
            <li key={row.capabilityId} className="kxd-ces-exp__module">
              <label className="kxd-ces-exp__check">
                <input
                  type="checkbox"
                  checked={selected.has(row.capabilityId)}
                  disabled={applying || loading}
                  onChange={(e) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(row.capabilityId);
                      else next.delete(row.capabilityId);
                      return next;
                    });
                  }}
                />
                <span>
                  <strong>{row.capabilityId}</strong>
                  <span className="kxd-os-meta"> · {row.confidence}</span>
                </span>
              </label>
              <div className="kxd-ces-exp__module-meta">
                <span className="kxd-os-meta">{row.rationale}</span>
                {row.evidence[0] ? (
                  <span className="kxd-os-meta">Evidence: {row.evidence[0]}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
        <button
          type="button"
          className="kxd-os-button kxd-os-button--secondary"
          disabled={loading || applying}
          onClick={() => void load()}
        >
          Refresh proposal
        </button>
        <button
          type="button"
          className="kxd-os-button"
          disabled={loading || applying || selected.size === 0}
          onClick={() => void apply()}
        >
          {applying ? "Applying…" : "Apply selected assignments"}
        </button>
      </div>
    </div>
  );
}
