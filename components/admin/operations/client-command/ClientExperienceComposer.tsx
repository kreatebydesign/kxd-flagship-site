"use client";

import { useMemo, useState } from "react";
import { PortalPreviewQuickAction } from "./PortalPreviewQuickAction";
import type { ExperienceRecommendation } from "@/lib/client-command/experience/composer/types";
import type { OperatorExperienceSnapshot } from "@/lib/client-command/experience/types";

type RecommendResponse = {
  ok?: boolean;
  message?: string;
  recommendation?: ExperienceRecommendation;
};

type ActivateResponse = {
  ok?: boolean;
  message?: string;
  experience?: OperatorExperienceSnapshot;
};

function decisionLabel(decision: string): string {
  if (decision === "include") return "Recommended";
  if (decision === "needs-setup") return "Needs setup";
  if (decision === "always") return "Always on";
  if (decision === "gated") return "Gated";
  if (decision === "locked") return "Not available";
  return "Not included";
}

export function ClientExperienceComposer({
  clientId,
  onActivated,
}: {
  clientId: number;
  onActivated: (experience: OperatorExperienceSnapshot) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ExperienceRecommendation | null>(
    null,
  );
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience/recommend`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as RecommendResponse;
      if (!res.ok || !json.ok || !json.recommendation) {
        throw new Error(json.message || "Unable to generate recommendation.");
      }
      const rec = json.recommendation;
      setRecommendation(rec);
      setAccepted(new Set(rec.activationModules));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate recommendation.");
    } finally {
      setGenerating(false);
    }
  }

  function toggleAccepted(id: string, on: boolean) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const draftComposition = useMemo(() => {
    if (!recommendation) return undefined;
    return {
      modules: [...accepted],
      branding: {
        clientName: recommendation.branding.clientName,
        portalSidebarLabel: recommendation.branding.portalSidebarLabel,
        welcomeEyebrow: recommendation.branding.welcomeEyebrow,
        reassuranceLine: recommendation.branding.reassuranceLine,
        supportTone: recommendation.branding.supportTone,
        primaryColor: recommendation.branding.primaryColor,
        secondaryColor: recommendation.branding.secondaryColor,
        accentColor: recommendation.branding.accentColor,
      },
    };
  }, [accepted, recommendation]);

  async function activate() {
    if (!recommendation || activating) return;
    setActivating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/experience/activate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptedModules: [...accepted],
          branding: recommendation.branding,
        }),
      });
      const json = (await res.json()) as ActivateResponse;
      if (!res.ok || !json.ok || !json.experience) {
        throw new Error(json.message || "Unable to activate experience.");
      }
      onActivated(json.experience);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to activate experience.");
    } finally {
      setActivating(false);
    }
  }

  const grouped = useMemo(() => {
    const rec = recommendation?.modules ?? [];
    return {
      recommended: rec.filter((m) => m.decision === "include" || m.decision === "always"),
      needsSetup: rec.filter((m) => m.decision === "needs-setup"),
      gated: rec.filter((m) => m.decision === "gated"),
      excluded: rec.filter((m) => m.decision === "exclude" || m.decision === "locked"),
    };
  }, [recommendation]);

  return (
    <section className="kxd-os-card kxd-ces-exp kxd-ces-composer">
      <div className="kxd-plans-access__head">
        <div>
          <p className="kxd-os-section__label">Client Experience</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            KXD OS proposes branding, modules, and navigation from known client truth.
            Review, preview, then approve. Advanced Configuration remains the manual override.
          </p>
        </div>
        {recommendation ? (
          <span className="kxd-plans-access__badge kxd-plans-access__badge--active">
            Readiness {recommendation.readinessPercent}%
          </span>
        ) : null}
      </div>

      {recommendation ? (
        <p className="kxd-os-meta">
          Recommended {recommendation.counts.recommended} · Ready{" "}
          {recommendation.counts.ready} · Needs setup {recommendation.counts.needsSetup} ·
          Hidden {recommendation.counts.hidden} · Shell{" "}
          {recommendation.homeShell === "ces" ? "CES" : "Client HQ"}
        </p>
      ) : null}

      {error ? (
        <p className="kxd-os-meta kxd-ces-exp__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="kxd-plans-access__actions">
        <button
          type="button"
          className="kxd-plans-access__save"
          disabled={generating}
          onClick={() => void generate()}
        >
          {generating ? "Analyzing…" : "Generate Recommended Experience"}
        </button>
      </div>

      {recommendation ? (
        <>
          {recommendation.notes.length ? (
            <ul className="kxd-ces-exp__warnings">
              {recommendation.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <h3 className="kxd-ces-exp__h">Branding</h3>
          <p className="kxd-os-meta">
            {recommendation.branding.clientName} · {recommendation.branding.colorNote}{" "}
            Logo: {recommendation.branding.logoNote}
          </p>

          <h3 className="kxd-ces-exp__h">Recommended Experience</h3>
          <ul className="kxd-ces-exp__modules">
            {grouped.recommended.map((row) => (
              <li key={row.id} className="kxd-ces-exp__module">
                <label className="kxd-ces-exp__check">
                  <input
                    type="checkbox"
                    checked={row.decision === "always" || accepted.has(row.id)}
                    disabled={activating || row.decision === "always"}
                    onChange={(e) => toggleAccepted(row.id, e.target.checked)}
                  />
                  <span>
                    <strong>{row.label}</strong>
                    <span className="kxd-os-meta"> {decisionLabel(row.decision)}</span>
                  </span>
                </label>
                <div className="kxd-ces-exp__module-meta">
                  <span className="kxd-os-meta">{row.reason}</span>
                </div>
              </li>
            ))}
          </ul>

          {grouped.needsSetup.length ? (
            <>
              <h3 className="kxd-ces-exp__h">Needs Setup</h3>
              <ul className="kxd-ces-exp__modules">
                {grouped.needsSetup.map((row) => (
                  <li key={row.id} className="kxd-ces-exp__module">
                    <label className="kxd-ces-exp__check">
                      <input
                        type="checkbox"
                        checked={accepted.has(row.id)}
                        disabled={activating}
                        onChange={(e) => toggleAccepted(row.id, e.target.checked)}
                      />
                      <span>
                        <strong>{row.label}</strong>
                        <span className="kxd-ces-exp__state kxd-ces-exp__state--ineligible">
                          {" "}
                          Blocked
                        </span>
                      </span>
                    </label>
                    <div className="kxd-ces-exp__module-meta">
                      <span className="kxd-os-meta">{row.reason}</span>
                      {row.blocker ? (
                        <span className="kxd-os-meta">{row.blocker}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h3 className="kxd-ces-exp__h">Not Included</h3>
          <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
            {[...grouped.gated, ...grouped.excluded].map((row) => (
              <li key={row.id}>
                {row.label}
                <span>
                  {decisionLabel(row.decision)} — {row.reason}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="kxd-ces-exp__h">Effective navigation (proposed)</h3>
          {recommendation.navPreview.map((group) => (
            <div key={group.label} className="kxd-ces-exp__nav-group">
              <p className="kxd-os-section__label">{group.label}</p>
              <ul className="kxd-plans-access__list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    {item.label}
                    <span>{item.href}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <h3 className="kxd-ces-exp__h">Integrations</h3>
          <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
            {recommendation.integrations.map((row) => (
              <li key={row.id}>
                {row.label}
                <span>
                  {row.status.replace(/-/g, " ")} — {row.detail}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="kxd-ces-exp__h">Portal access</h3>
          <p className="kxd-os-meta">
            Memberships: {recommendation.portalAccess.activeMembershipCount} · Pending
            invites: {recommendation.portalAccess.pendingInvitationCount}. Invites stay on
            Manage Portal Access.
          </p>

          <div className="kxd-plans-access__actions">
            <PortalPreviewQuickAction
              clientId={clientId}
              label="Preview Portal"
              draftComposition={draftComposition}
            />
            <button
              type="button"
              className="kxd-plans-access__save"
              disabled={activating}
              onClick={() => void activate()}
            >
              {activating ? "Activating…" : "Approve & Activate"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
