"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAUNCH_DRAFT_STORAGE_KEY,
  LAUNCH_SERVICE_OPTIONS,
  LAUNCH_STEPS,
} from "@/lib/client-launch/constants";
import type { ClientLaunchDraft, ClientLaunchStepId } from "@/lib/client-launch/types";
import { EMPTY_LAUNCH_DRAFT } from "@/lib/client-launch/types";
import {
  KxdButton,
  KxdDateInput,
  KxdInput,
  KxdSelect,
  KxdTextarea,
} from "@/components/os";
import { kxdOsCn } from "@/components/os/utils";
import { LaunchField, LaunchPanel } from "./LaunchFormPrimitives";

function loadDraft(): ClientLaunchDraft {
  if (typeof window === "undefined") return EMPTY_LAUNCH_DRAFT;
  try {
    const raw = localStorage.getItem(LAUNCH_DRAFT_STORAGE_KEY);
    if (!raw) return EMPTY_LAUNCH_DRAFT;
    return { ...EMPTY_LAUNCH_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_LAUNCH_DRAFT;
  }
}

export function ClientLaunchWizard() {
  const router = useRouter();
  const [step, setStep] = useState<ClientLaunchStepId>("business");
  const [draft, setDraft] = useState<ClientLaunchDraft>(EMPTY_LAUNCH_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autosaveNote, setAutosaveNote] = useState("");

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      localStorage.setItem(LAUNCH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setAutosaveNote("Draft saved locally");
      window.setTimeout(() => setAutosaveNote(""), 2000);
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft, hydrated]);

  const stepIndex = LAUNCH_STEPS.findIndex((s) => s.id === step);
  const progress = ((stepIndex + 1) / LAUNCH_STEPS.length) * 100;

  const update = useCallback(
    <K extends keyof ClientLaunchDraft>(
      section: K,
      field: keyof ClientLaunchDraft[K],
      value: unknown,
    ) => {
      setDraft((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: value },
      }));
    },
    [],
  );

  const toggleService = (service: string) => {
    setDraft((prev) => {
      const selected = prev.services.selected.includes(service)
        ? prev.services.selected.filter((s) => s !== service)
        : [...prev.services.selected, service];
      return { ...prev, services: { ...prev.services, selected } };
    });
  };

  const goNext = () => {
    if (step === "business" && !draft.business.businessName.trim()) {
      setError("Business name is required.");
      return;
    }
    setError("");
    const next = LAUNCH_STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    setError("");
    const prev = LAUNCH_STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const launch = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/client-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Launch failed.");
      localStorage.removeItem(LAUNCH_DRAFT_STORAGE_KEY);
      router.push(data.workspaceUrl + "?tab=overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed.");
      setSaving(false);
    }
  };

  const reviewSummary = useMemo(() => {
    return {
      business: draft.business.businessName || "—",
      contact: draft.contacts.primaryDecisionMaker || "—",
      retainer: draft.financial.monthlyRetainer || "—",
      services: draft.services.selected.length,
      tier: draft.executive.clientTier || "—",
      nextAction: draft.roadmap.firstNextAction || "—",
    };
  }, [draft]);

  if (!hydrated) {
    return <p className="kxd-os-body">Loading launch workflow…</p>;
  }

  return (
    <div>
      <div className="kxd-os-ops-progress">
        <div className="kxd-os-ops-progress__head">
          <div>
            <p className="kxd-os-ops-progress__step">
              Step {stepIndex + 1} of {LAUNCH_STEPS.length}
            </p>
            <p className="kxd-os-hero kxd-os-ops-progress__label">
              {LAUNCH_STEPS[stepIndex]?.label}
            </p>
          </div>
          {autosaveNote && <p className="kxd-os-meta">{autosaveNote}</p>}
        </div>
        <div className="kxd-os-ops-progress__track">
          <div className="kxd-os-ops-progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="kxd-os-ops-step-nav">
          {LAUNCH_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={kxdOsCn(
                "kxd-os-ops-step-pill",
                step === s.id && "kxd-os-ops-step-pill--active",
                i <= stepIndex && step !== s.id && "kxd-os-ops-step-pill--done",
              )}
            >
              {s.short} {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="kxd-os-ops-alert kxd-os-ops-alert--error">{error}</div>}

      <div style={{ marginBottom: "2rem" }}>
        {step === "business" && (
          <LaunchPanel title="Business Foundation">
            <div className="grid gap-0 sm:grid-cols-2">
              <LaunchField label="Business Name *">
                <KxdInput
                  value={draft.business.businessName}
                  onChange={(e) => update("business", "businessName", e.target.value)}
                  placeholder="Company or brand name"
                />
              </LaunchField>
              <LaunchField label="Industry">
                <KxdInput
                  value={draft.business.industry}
                  onChange={(e) => update("business", "industry", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Website">
                <KxdInput
                  value={draft.business.website}
                  onChange={(e) => update("business", "website", e.target.value)}
                  placeholder="https://"
                />
              </LaunchField>
              <LaunchField label="Status">
                <KxdSelect
                  value={draft.business.status}
                  onChange={(e) =>
                    update("business", "status", e.target.value as "prospect" | "active")
                  }
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                </KxdSelect>
              </LaunchField>
              <LaunchField label="Primary Goal">
                <KxdInput
                  value={draft.business.primaryGoal}
                  onChange={(e) => update("business", "primaryGoal", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Lead Source">
                <KxdInput
                  value={draft.business.leadSource}
                  onChange={(e) => update("business", "leadSource", e.target.value)}
                />
              </LaunchField>
            </div>
            <LaunchField label="Business Description">
              <KxdTextarea
                value={draft.business.businessDescription}
                onChange={(e) => update("business", "businessDescription", e.target.value)}
              />
            </LaunchField>
          </LaunchPanel>
        )}

        {step === "contacts" && (
          <LaunchPanel title="Contacts & Communication">
            <div className="grid gap-0 sm:grid-cols-2">
              <LaunchField label="Primary Decision Maker">
                <KxdInput
                  value={draft.contacts.primaryDecisionMaker}
                  onChange={(e) => update("contacts", "primaryDecisionMaker", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Role">
                <KxdInput
                  value={draft.contacts.role}
                  onChange={(e) => update("contacts", "role", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Email">
                <KxdInput
                  type="email"
                  value={draft.contacts.email}
                  onChange={(e) => update("contacts", "email", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Phone">
                <KxdInput
                  value={draft.contacts.phone}
                  onChange={(e) => update("contacts", "phone", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Preferred Communication">
                <KxdInput
                  value={draft.contacts.preferredCommunication}
                  onChange={(e) =>
                    update("contacts", "preferredCommunication", e.target.value)
                  }
                />
              </LaunchField>
              <LaunchField label="Meeting Cadence">
                <KxdInput
                  value={draft.contacts.meetingCadence}
                  onChange={(e) => update("contacts", "meetingCadence", e.target.value)}
                />
              </LaunchField>
            </div>
            <LaunchField label="Additional Contacts (name, role, email — one per line)">
              <KxdTextarea
                placeholder="Jane Smith, Operations, jane@company.com"
                value={draft.contacts.additionalContacts
                  .map((c) => [c.name, c.role, c.email].filter(Boolean).join(", "))
                  .join("\n")}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").filter((l) => l.trim());
                  const additional = lines.map((line) => {
                    const parts = line.split(",").map((p) => p.trim());
                    return { name: parts[0] || "", role: parts[1] || "", email: parts[2] || "" };
                  });
                  setDraft((prev) => ({
                    ...prev,
                    contacts: { ...prev.contacts, additionalContacts: additional },
                  }));
                }}
              />
            </LaunchField>
          </LaunchPanel>
        )}

        {step === "financial" && (
          <LaunchPanel title="Financial Agreement">
            <div className="grid gap-0 sm:grid-cols-2">
              <LaunchField label="Project Value ($)">
                <KxdInput
                  value={draft.financial.projectValue}
                  onChange={(e) => update("financial", "projectValue", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Monthly Retainer ($)">
                <KxdInput
                  value={draft.financial.monthlyRetainer}
                  onChange={(e) => update("financial", "monthlyRetainer", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Billing Start Date">
                <KxdDateInput
                  value={draft.financial.billingStartDate}
                  onChange={(e) => update("financial", "billingStartDate", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Contract Status">
                <KxdSelect
                  value={draft.financial.contractStatus}
                  onChange={(e) => update("financial", "contractStatus", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="paused">Paused</option>
                </KxdSelect>
              </LaunchField>
              <LaunchField label="Expected Annual Value ($)">
                <KxdInput
                  value={draft.financial.expectedAnnualValue}
                  onChange={(e) => update("financial", "expectedAnnualValue", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Payment Terms">
                <KxdInput
                  value={draft.financial.paymentTerms}
                  onChange={(e) => update("financial", "paymentTerms", e.target.value)}
                />
              </LaunchField>
            </div>
          </LaunchPanel>
        )}

        {step === "services" && (
          <LaunchPanel title="Services Scope">
            <p className="kxd-os-body" style={{ marginBottom: "1rem" }}>
              Select all services included in this partnership launch.
            </p>
            <div className="kxd-os-ops-service-grid">
              {LAUNCH_SERVICE_OPTIONS.map((service) => {
                const active = draft.services.selected.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={kxdOsCn(
                      "kxd-os-ops-service-pill",
                      active && "kxd-os-ops-service-pill--active",
                    )}
                  >
                    {service}
                  </button>
                );
              })}
            </div>
            <LaunchField label="Custom Services">
              <KxdTextarea
                placeholder="Additional services, one per line"
                value={draft.services.customServices}
                onChange={(e) => update("services", "customServices", e.target.value)}
              />
            </LaunchField>
          </LaunchPanel>
        )}

        {step === "technical" && (
          <LaunchPanel title="Technical Foundation">
            <div className="grid gap-0 sm:grid-cols-2">
              {(
                [
                  ["productionUrl", "Production URL"],
                  ["stagingUrl", "Preview Website"],
                  ["domainRegistrar", "Domain Registrar"],
                  ["dnsProvider", "DNS Provider"],
                  ["hosting", "Hosting"],
                  ["githubRepo", "GitHub Repository"],
                  ["vercelProject", "Vercel Project"],
                  ["workspaceStatus", "Google Workspace"],
                  ["analyticsStatus", "Analytics"],
                  ["searchConsoleStatus", "Search Console"],
                  ["crm", "CRM"],
                  ["stripe", "Stripe"],
                ] as const
              ).map(([key, label]) => (
                <LaunchField key={key} label={label}>
                  <KxdInput
                    value={draft.technical[key]}
                    onChange={(e) => update("technical", key, e.target.value)}
                  />
                </LaunchField>
              ))}
            </div>
            <LaunchField label="API Integrations">
              <KxdTextarea
                value={draft.technical.apiIntegrations}
                onChange={(e) => update("technical", "apiIntegrations", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Technical Notes">
              <KxdTextarea
                value={draft.technical.technicalNotes}
                onChange={(e) => update("technical", "technicalNotes", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Secure References (no passwords)">
              <KxdTextarea
                placeholder="1Password vault, Google Drive folder, etc."
                value={draft.technical.loginNotesReference}
                onChange={(e) => update("technical", "loginNotesReference", e.target.value)}
              />
            </LaunchField>
          </LaunchPanel>
        )}

        {step === "executive" && (
          <LaunchPanel title="Executive Intelligence">
            <div className="grid gap-0 sm:grid-cols-3">
              <LaunchField label="Tier">
                <KxdSelect
                  value={draft.executive.clientTier}
                  onChange={(e) => update("executive", "clientTier", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="A">Tier A</option>
                  <option value="B">Tier B</option>
                  <option value="C">Tier C</option>
                </KxdSelect>
              </LaunchField>
              <LaunchField label="Health Score">
                <KxdInput
                  value={draft.executive.healthScore}
                  onChange={(e) => update("executive", "healthScore", e.target.value)}
                  placeholder="0–100"
                />
              </LaunchField>
              <LaunchField label="Relationship Status">
                <KxdSelect
                  value={draft.executive.relationshipStatus}
                  onChange={(e) =>
                    update(
                      "executive",
                      "relationshipStatus",
                      e.target.value as ClientLaunchDraft["executive"]["relationshipStatus"],
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="at-risk">At Risk</option>
                  <option value="archived">Archived</option>
                </KxdSelect>
              </LaunchField>
            </div>
            <LaunchField label="Current Priority">
              <KxdInput
                value={draft.executive.currentPriority}
                onChange={(e) => update("executive", "currentPriority", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Executive Summary">
              <KxdTextarea
                value={draft.executive.executiveSummary}
                onChange={(e) => update("executive", "executiveSummary", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Strategic Notes">
              <KxdTextarea
                value={draft.executive.strategicNotes}
                onChange={(e) => update("executive", "strategicNotes", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Growth Opportunities">
              <KxdTextarea
                value={draft.executive.growthOpportunities}
                onChange={(e) => update("executive", "growthOpportunities", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Upsell Opportunities">
              <KxdTextarea
                value={draft.executive.upsellOpportunities}
                onChange={(e) => update("executive", "upsellOpportunities", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Risk Notes">
              <KxdTextarea
                value={draft.executive.riskNotes}
                onChange={(e) => update("executive", "riskNotes", e.target.value)}
              />
            </LaunchField>
            <div className="grid gap-0 sm:grid-cols-4">
              <LaunchField label="Case Study">
                <KxdSelect
                  value={draft.executive.caseStudyPotential}
                  onChange={(e) => update("executive", "caseStudyPotential", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="flagship">Flagship</option>
                </KxdSelect>
              </LaunchField>
              <LaunchField label="Referral">
                <KxdSelect
                  value={draft.executive.referralPotential}
                  onChange={(e) => update("executive", "referralPotential", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </KxdSelect>
              </LaunchField>
              <LaunchField label="Productization">
                <KxdSelect
                  value={draft.executive.productizationPotential}
                  onChange={(e) =>
                    update("executive", "productizationPotential", e.target.value)
                  }
                >
                  <option value="">—</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </KxdSelect>
              </LaunchField>
              <LaunchField label="Internal Priority">
                <KxdSelect
                  value={draft.executive.internalPriority}
                  onChange={(e) => update("executive", "internalPriority", e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </KxdSelect>
              </LaunchField>
            </div>
          </LaunchPanel>
        )}

        {step === "roadmap" && (
          <LaunchPanel title="Roadmap & First Action">
            <LaunchField label="Current Focus">
              <KxdTextarea
                value={draft.roadmap.current}
                onChange={(e) => update("roadmap", "current", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Next">
              <KxdTextarea
                value={draft.roadmap.next}
                onChange={(e) => update("roadmap", "next", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Future">
              <KxdTextarea
                value={draft.roadmap.future}
                onChange={(e) => update("roadmap", "future", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Long-term Vision">
              <KxdTextarea
                value={draft.roadmap.longTermVision}
                onChange={(e) => update("roadmap", "longTermVision", e.target.value)}
              />
            </LaunchField>
            <div className="grid gap-0 sm:grid-cols-2">
              <LaunchField label="First Next Action">
                <KxdInput
                  value={draft.roadmap.firstNextAction}
                  onChange={(e) => update("roadmap", "firstNextAction", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Next Action Due Date">
                <KxdDateInput
                  value={draft.roadmap.nextActionDueDate}
                  onChange={(e) => update("roadmap", "nextActionDueDate", e.target.value)}
                />
              </LaunchField>
            </div>
          </LaunchPanel>
        )}

        {step === "review" && (
          <LaunchPanel title="Launch Review">
            <p className="kxd-os-title" style={{ marginBottom: "1rem" }}>
              Ready to launch {draft.business.businessName || "this client"} into KXD OS?
            </p>
            <div className="kxd-os-ops-review-summary">
              {(
                [
                  ["Business", reviewSummary.business],
                  ["Primary Contact", reviewSummary.contact],
                  ["Monthly Retainer", reviewSummary.retainer],
                  ["Services Selected", String(reviewSummary.services)],
                  ["Executive Tier", reviewSummary.tier],
                  ["First Next Action", reviewSummary.nextAction],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="kxd-os-ops-review-row">
                  <span className="kxd-os-ops-review-row__label">{label}</span>
                  <span className="kxd-os-ops-review-row__value">{value}</span>
                </div>
              ))}
            </div>
            <p className="kxd-os-body" style={{ marginTop: "1.25rem", lineHeight: 1.7 }}>
              Launching will create the Client record, Executive Client Profile, initial Retainer
              (if applicable), timeline event, and workspace — ready for operations.
            </p>
          </LaunchPanel>
        )}
      </div>

      <div className="kxd-os-ops-workflow-nav">
        <div className="kxd-os-ops-workflow-nav__group">
          {stepIndex > 0 && (
            <KxdButton variant="secondary" onClick={goBack}>
              Back
            </KxdButton>
          )}
          <KxdButton
            variant="ghost"
            onClick={() => {
              localStorage.removeItem(LAUNCH_DRAFT_STORAGE_KEY);
              setDraft(EMPTY_LAUNCH_DRAFT);
              setStep("business");
            }}
          >
            Clear draft
          </KxdButton>
        </div>
        {step !== "review" ? (
          <KxdButton onClick={goNext}>Continue →</KxdButton>
        ) : (
          <KxdButton onClick={launch} disabled={saving} loading={saving}>
            {saving ? "Launching…" : "Launch Client →"}
          </KxdButton>
        )}
      </div>
    </div>
  );
}
