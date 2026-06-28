"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GENESIS_PHASES,
  phaseCompletionPercent,
} from "@/lib/genesis/discovery";
import type {
  GenesisDiscoveryData,
  GenesisPhaseId,
  GenesisSessionDetail,
  GenesisTemplateId,
} from "@/lib/genesis/types";
import { getGenesisTemplate } from "@/lib/genesis/templates";
import {
  KxdButton,
  KxdInput,
  KxdSelect,
  KxdTextarea,
} from "@/components/os";
import { kxdOsCn } from "@/components/os/utils";
import { GenesisField, GenesisPanel } from "./GenesisFormPrimitives";

export function GenesisWizard({ initialSession }: { initialSession: GenesisSessionDetail }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [phase, setPhase] = useState<GenesisPhaseId>(initialSession.currentPhase);
  const [discovery, setDiscovery] = useState<GenesisDiscoveryData>(initialSession.discovery);
  const [templateId, setTemplateId] = useState<GenesisTemplateId>(initialSession.templateId);
  const [autosaveNote, setAutosaveNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const phaseIndex = GENESIS_PHASES.findIndex((p) => p.id === phase);
  const progress = ((phaseIndex + 1) / GENESIS_PHASES.length) * 100;
  const template = getGenesisTemplate(templateId);

  const updateField = useCallback(
    (sectionKey: keyof GenesisDiscoveryData, fieldKey: string, value: string) => {
      setDiscovery((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          [fieldKey]: value,
        },
      }));
    },
    [],
  );

  useEffect(() => {
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/genesis/${session.id}/save`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discovery, currentPhase: phase, templateId }),
        });
        const data = await res.json();
        if (data.success && data.session) {
          setSession(data.session);
          setAutosaveNote("Blueprint saved");
          window.setTimeout(() => setAutosaveNote(""), 2000);
        }
      } catch {
        setAutosaveNote("Autosave failed");
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [discovery, phase, templateId, session.id]);

  const phaseDef = GENESIS_PHASES[phaseIndex] ?? GENESIS_PHASES[0];
  const section = discovery[phaseDef.sectionKey] as unknown as Record<string, string>;

  const reviewStats = useMemo(() => ({
    business: discovery.businessFoundation.businessName || "—",
    template: template.name,
    progress: session.progressPercent,
    readiness: session.launchReadiness,
    blueprint: session.blueprintStatus,
  }), [discovery, template, session]);

  const goNext = () => {
    if (phase === "business-foundation" && !discovery.businessFoundation.businessName.trim()) {
      setError("Business name is required.");
      return;
    }
    setError("");
    const next = GENESIS_PHASES[phaseIndex + 1];
    if (next) setPhase(next.id);
  };

  const goBack = () => {
    setError("");
    const prev = GENESIS_PHASES[phaseIndex - 1];
    if (prev) setPhase(prev.id);
  };

  const generateBlueprints = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/genesis/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-blueprints" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message ?? "Blueprint generation failed.");
        return;
      }
      setSession(data.session);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const finalizeGenesis = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/genesis/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message ?? "Genesis completion failed.");
        return;
      }
      router.push(data.commandCenterHref ?? `/admin/operations/client-command/${data.clientId}`);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const isReview = phase === "launch-planning";

  return (
    <div className="kxd-os-ops-genesis">
      <div className="kxd-os-ops-progress">
        <div className="kxd-os-ops-progress__head">
          <div>
            <p className="kxd-os-ops-progress__step">
              Phase {phaseIndex + 1} of {GENESIS_PHASES.length}
            </p>
            <p className="kxd-os-hero kxd-os-ops-progress__label">{phaseDef.label}</p>
            <p className="kxd-os-meta">{phaseDef.description}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {autosaveNote ? <p className="kxd-os-meta">{autosaveNote}</p> : null}
            <p className="kxd-os-meta">{session.progressPercent}% documented</p>
          </div>
        </div>
        <div className="kxd-os-ops-progress__track">
          <div className="kxd-os-ops-progress__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error ? <div className="kxd-os-ops-alert kxd-os-ops-alert--error">{error}</div> : null}

      <div className="kxd-os-ops-genesis__layout">
        <aside className="kxd-os-ops-genesis__sidebar">
          <p className="kxd-os-section-label">Blueprint phases</p>
          <nav className="kxd-os-ops-genesis__phase-list">
            {GENESIS_PHASES.map((p) => {
              const pct = phaseCompletionPercent(discovery, p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={kxdOsCn(
                    "kxd-os-ops-genesis__phase",
                    phase === p.id && "kxd-os-ops-genesis__phase--active",
                    pct >= 60 && phase !== p.id && "kxd-os-ops-genesis__phase--done",
                  )}
                  onClick={() => setPhase(p.id)}
                >
                  <span className="kxd-os-ops-genesis__phase-num">{p.short}</span>
                  <span className="kxd-os-ops-genesis__phase-label">{p.label}</span>
                  <span className="kxd-os-meta">{pct}%</span>
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "1.5rem" }}>
            <p className="kxd-os-section-label">Industry template</p>
            <KxdSelect
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as GenesisTemplateId)}
              style={{ marginTop: "0.5rem", width: "100%" }}
            >
              {["standard-business", "contractor", "motorsports", "restaurant", "hospitality", "political-campaign", "professional-services", "creative-agency"].map((id) => (
                <option key={id} value={id}>{getGenesisTemplate(id as GenesisTemplateId).name}</option>
              ))}
            </KxdSelect>
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>{template.description}</p>
          </div>

          <div className="kxd-os-ops-genesis__readiness" style={{ marginTop: "1.5rem" }}>
            <p className="kxd-os-section-label">Launch readiness</p>
            <p className="kxd-os-title">{session.launchReadiness}%</p>
            <p className="kxd-os-meta">{session.recommendedNextStep}</p>
          </div>
        </aside>

        <main className="kxd-os-ops-genesis__main">
          <GenesisPanel title={phaseDef.label}>
            <div className="grid gap-0 sm:grid-cols-2">
              {phaseDef.fields.map((field) => {
                const value = String(section[field.key] ?? "");
                const isLong = field.type === "textarea";
                return (
                  <GenesisField
                    key={field.key}
                    label={field.required ? `${field.label} *` : field.label}
                  >
                    {isLong ? (
                      <KxdTextarea
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          updateField(phaseDef.sectionKey, field.key, e.target.value)
                        }
                        rows={3}
                      />
                    ) : (
                      <KxdInput
                        type={field.type === "url" ? "url" : "text"}
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          updateField(phaseDef.sectionKey, field.key, e.target.value)
                        }
                      />
                    )}
                  </GenesisField>
                );
              })}
            </div>
          </GenesisPanel>

          {session.blueprints && session.blueprintStatus !== "pending" ? (
            <GenesisPanel title="Generated Blueprints">
              <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
                Deterministic blueprints from discovery — {session.blueprintStatus}
              </p>
              <div className="kxd-os-list-stack">
                {Object.values(session.blueprints).map((bp) => (
                  <div key={bp.id} className="kxd-os-ops-review-row">
                    <span className="kxd-os-ops-review-row__label">{bp.title}</span>
                    <span className="kxd-os-ops-review-row__value">
                      {bp.sections.length} sections
                    </span>
                  </div>
                ))}
              </div>
            </GenesisPanel>
          ) : null}

          {isReview ? (
            <GenesisPanel title="Finalize Engagement">
              <div className="kxd-os-ops-review-summary">
                {(
                  [
                    ["Business", reviewStats.business],
                    ["Template", reviewStats.template],
                    ["Discovery", `${reviewStats.progress}%`],
                    ["Readiness", `${reviewStats.readiness}%`],
                    ["Blueprints", reviewStats.blueprint],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="kxd-os-ops-review-row">
                    <span className="kxd-os-ops-review-row__label">{label}</span>
                    <span className="kxd-os-ops-review-row__value">{value}</span>
                  </div>
                ))}
              </div>
              <p className="kxd-os-body" style={{ marginTop: "1.25rem", lineHeight: 1.7 }}>
                Finalizing Genesis will launch the client into KXD OS — Client, Executive Profile,
                Command Center, Work Board, Playbooks, Success Plan, Timeline, and production drafts.
              </p>
              <div className="kxd-os-ops-workflow-actions" style={{ marginTop: "1rem" }}>
                <KxdButton variant="secondary" onClick={generateBlueprints} disabled={busy} loading={busy}>
                  Generate Blueprints
                </KxdButton>
                <KxdButton onClick={finalizeGenesis} disabled={busy} loading={busy}>
                  Finalize Genesis →
                </KxdButton>
              </div>
            </GenesisPanel>
          ) : null}
        </main>
      </div>

      <div className="kxd-os-ops-workflow-nav">
        <div className="kxd-os-ops-workflow-nav__group">
          <Link href="/admin/operations/genesis" className="kxd-os-link-quiet">← Genesis Hub</Link>
          {phaseIndex > 0 ? (
            <KxdButton variant="secondary" onClick={goBack}>Back</KxdButton>
          ) : null}
        </div>
        {!isReview ? (
          <KxdButton onClick={goNext}>Continue →</KxdButton>
        ) : null}
      </div>
    </div>
  );
}
