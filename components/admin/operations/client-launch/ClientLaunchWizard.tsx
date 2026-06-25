"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAUNCH_C,
  LAUNCH_DRAFT_STORAGE_KEY,
  LAUNCH_SERVICE_OPTIONS,
  LAUNCH_STEPS,
} from "@/lib/client-launch/constants";
import type { ClientLaunchDraft, ClientLaunchStepId } from "@/lib/client-launch/types";
import { EMPTY_LAUNCH_DRAFT } from "@/lib/client-launch/types";
import {
  LaunchField,
  LaunchPanel,
  launchInputStyle,
  launchTextareaStyle,
} from "./LaunchFormPrimitives";

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
    return (
      <p style={{ fontFamily: LAUNCH_C.sans, color: LAUNCH_C.creamMuted, fontSize: "0.875rem" }}>
        Loading launch workflow…
      </p>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <p
              style={{
                fontFamily: LAUNCH_C.sans,
                fontSize: "0.625rem",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Step {stepIndex + 1} of {LAUNCH_STEPS.length}
            </p>
            <p
              style={{
                fontFamily: LAUNCH_C.serif,
                fontWeight: 300,
                fontSize: "1.75rem",
                color: LAUNCH_C.cream,
                marginTop: "0.25rem",
              }}
            >
              {LAUNCH_STEPS[stepIndex]?.label}
            </p>
          </div>
          {autosaveNote && (
            <p style={{ fontFamily: LAUNCH_C.sans, fontSize: "0.6875rem", color: LAUNCH_C.goldDim }}>
              {autosaveNote}
            </p>
          )}
        </div>
        <div
          style={{
            height: "3px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "2px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: LAUNCH_C.gold,
              borderRadius: "2px",
              transition: "width 0.35s ease",
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {LAUNCH_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              style={{
                fontFamily: LAUNCH_C.sans,
                fontSize: "0.5625rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.35rem 0.625rem",
                border: `1px solid ${i <= stepIndex ? LAUNCH_C.borderGold : LAUNCH_C.border}`,
                background: step === s.id ? "rgba(201,169,98,0.12)" : "transparent",
                color: i <= stepIndex ? LAUNCH_C.gold : "rgba(255,255,255,0.3)",
                cursor: "pointer",
              }}
            >
              {s.short} {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.875rem 1rem",
            border: `1px solid rgba(210,90,90,0.35)`,
            background: "rgba(210,90,90,0.08)",
            fontFamily: LAUNCH_C.sans,
            fontSize: "0.8125rem",
            color: LAUNCH_C.red,
          }}
        >
          {error}
        </div>
      )}

      {/* Step content */}
      <div style={{ marginBottom: "2rem" }}>
        {step === "business" && (
          <LaunchPanel title="Business Foundation">
            <div className="grid gap-0 sm:grid-cols-2">
              <LaunchField label="Business Name *">
                <input
                  style={launchInputStyle}
                  value={draft.business.businessName}
                  onChange={(e) => update("business", "businessName", e.target.value)}
                  placeholder="Company or brand name"
                />
              </LaunchField>
              <LaunchField label="Industry">
                <input
                  style={launchInputStyle}
                  value={draft.business.industry}
                  onChange={(e) => update("business", "industry", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Website">
                <input
                  style={launchInputStyle}
                  value={draft.business.website}
                  onChange={(e) => update("business", "website", e.target.value)}
                  placeholder="https://"
                />
              </LaunchField>
              <LaunchField label="Status">
                <select
                  style={launchInputStyle}
                  value={draft.business.status}
                  onChange={(e) =>
                    update("business", "status", e.target.value as "prospect" | "active")
                  }
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                </select>
              </LaunchField>
              <LaunchField label="Primary Goal">
                <input
                  style={launchInputStyle}
                  value={draft.business.primaryGoal}
                  onChange={(e) => update("business", "primaryGoal", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Lead Source">
                <input
                  style={launchInputStyle}
                  value={draft.business.leadSource}
                  onChange={(e) => update("business", "leadSource", e.target.value)}
                />
              </LaunchField>
            </div>
            <LaunchField label="Business Description">
              <textarea
                style={launchTextareaStyle}
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
                <input
                  style={launchInputStyle}
                  value={draft.contacts.primaryDecisionMaker}
                  onChange={(e) => update("contacts", "primaryDecisionMaker", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Role">
                <input
                  style={launchInputStyle}
                  value={draft.contacts.role}
                  onChange={(e) => update("contacts", "role", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Email">
                <input
                  type="email"
                  style={launchInputStyle}
                  value={draft.contacts.email}
                  onChange={(e) => update("contacts", "email", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Phone">
                <input
                  style={launchInputStyle}
                  value={draft.contacts.phone}
                  onChange={(e) => update("contacts", "phone", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Preferred Communication">
                <input
                  style={launchInputStyle}
                  value={draft.contacts.preferredCommunication}
                  onChange={(e) => update("contacts", "preferredCommunication", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Meeting Cadence">
                <input
                  style={launchInputStyle}
                  value={draft.contacts.meetingCadence}
                  onChange={(e) => update("contacts", "meetingCadence", e.target.value)}
                />
              </LaunchField>
            </div>
            <LaunchField label="Additional Contacts (name, role, email — one per line)">
              <textarea
                style={launchTextareaStyle}
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
                <input
                  style={launchInputStyle}
                  value={draft.financial.projectValue}
                  onChange={(e) => update("financial", "projectValue", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Monthly Retainer ($)">
                <input
                  style={launchInputStyle}
                  value={draft.financial.monthlyRetainer}
                  onChange={(e) => update("financial", "monthlyRetainer", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Billing Start Date">
                <input
                  type="date"
                  style={launchInputStyle}
                  value={draft.financial.billingStartDate}
                  onChange={(e) => update("financial", "billingStartDate", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Contract Status">
                <select
                  style={launchInputStyle}
                  value={draft.financial.contractStatus}
                  onChange={(e) => update("financial", "contractStatus", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="paused">Paused</option>
                </select>
              </LaunchField>
              <LaunchField label="Expected Annual Value ($)">
                <input
                  style={launchInputStyle}
                  value={draft.financial.expectedAnnualValue}
                  onChange={(e) => update("financial", "expectedAnnualValue", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Payment Terms">
                <input
                  style={launchInputStyle}
                  value={draft.financial.paymentTerms}
                  onChange={(e) => update("financial", "paymentTerms", e.target.value)}
                />
              </LaunchField>
            </div>
          </LaunchPanel>
        )}

        {step === "services" && (
          <LaunchPanel title="Services Scope">
            <p
              style={{
                fontFamily: LAUNCH_C.sans,
                fontSize: "0.8125rem",
                color: LAUNCH_C.creamMuted,
                marginBottom: "1rem",
              }}
            >
              Select all services included in this partnership launch.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {LAUNCH_SERVICE_OPTIONS.map((service) => {
                const active = draft.services.selected.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    style={{
                      fontFamily: LAUNCH_C.sans,
                      fontSize: "0.75rem",
                      padding: "0.625rem 0.75rem",
                      textAlign: "left",
                      border: `1px solid ${active ? LAUNCH_C.borderGold : LAUNCH_C.border}`,
                      background: active ? "rgba(201,169,98,0.1)" : "transparent",
                      color: active ? LAUNCH_C.gold : LAUNCH_C.creamMuted,
                      cursor: "pointer",
                    }}
                  >
                    {service}
                  </button>
                );
              })}
            </div>
            <LaunchField label="Custom Services">
              <textarea
                style={launchTextareaStyle}
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
                  ["stagingUrl", "Staging URL"],
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
                  <input
                    style={launchInputStyle}
                    value={draft.technical[key]}
                    onChange={(e) => update("technical", key, e.target.value)}
                  />
                </LaunchField>
              ))}
            </div>
            <LaunchField label="API Integrations">
              <textarea
                style={launchTextareaStyle}
                value={draft.technical.apiIntegrations}
                onChange={(e) => update("technical", "apiIntegrations", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Technical Notes">
              <textarea
                style={launchTextareaStyle}
                value={draft.technical.technicalNotes}
                onChange={(e) => update("technical", "technicalNotes", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Secure References (no passwords)">
              <textarea
                style={launchTextareaStyle}
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
                <select
                  style={launchInputStyle}
                  value={draft.executive.clientTier}
                  onChange={(e) => update("executive", "clientTier", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="A">Tier A</option>
                  <option value="B">Tier B</option>
                  <option value="C">Tier C</option>
                </select>
              </LaunchField>
              <LaunchField label="Health Score">
                <input
                  style={launchInputStyle}
                  value={draft.executive.healthScore}
                  onChange={(e) => update("executive", "healthScore", e.target.value)}
                  placeholder="0–100"
                />
              </LaunchField>
              <LaunchField label="Relationship Status">
                <select
                  style={launchInputStyle}
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
                </select>
              </LaunchField>
            </div>
            <LaunchField label="Current Priority">
              <input
                style={launchInputStyle}
                value={draft.executive.currentPriority}
                onChange={(e) => update("executive", "currentPriority", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Executive Summary">
              <textarea
                style={launchTextareaStyle}
                value={draft.executive.executiveSummary}
                onChange={(e) => update("executive", "executiveSummary", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Strategic Notes">
              <textarea
                style={launchTextareaStyle}
                value={draft.executive.strategicNotes}
                onChange={(e) => update("executive", "strategicNotes", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Growth Opportunities">
              <textarea
                style={launchTextareaStyle}
                value={draft.executive.growthOpportunities}
                onChange={(e) => update("executive", "growthOpportunities", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Upsell Opportunities">
              <textarea
                style={launchTextareaStyle}
                value={draft.executive.upsellOpportunities}
                onChange={(e) => update("executive", "upsellOpportunities", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Risk Notes">
              <textarea
                style={launchTextareaStyle}
                value={draft.executive.riskNotes}
                onChange={(e) => update("executive", "riskNotes", e.target.value)}
              />
            </LaunchField>
            <div className="grid gap-0 sm:grid-cols-4">
              <LaunchField label="Case Study">
                <select
                  style={launchInputStyle}
                  value={draft.executive.caseStudyPotential}
                  onChange={(e) => update("executive", "caseStudyPotential", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="flagship">Flagship</option>
                </select>
              </LaunchField>
              <LaunchField label="Referral">
                <select
                  style={launchInputStyle}
                  value={draft.executive.referralPotential}
                  onChange={(e) => update("executive", "referralPotential", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </LaunchField>
              <LaunchField label="Productization">
                <select
                  style={launchInputStyle}
                  value={draft.executive.productizationPotential}
                  onChange={(e) => update("executive", "productizationPotential", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </LaunchField>
              <LaunchField label="Internal Priority">
                <select
                  style={launchInputStyle}
                  value={draft.executive.internalPriority}
                  onChange={(e) => update("executive", "internalPriority", e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </LaunchField>
            </div>
          </LaunchPanel>
        )}

        {step === "roadmap" && (
          <LaunchPanel title="Roadmap & First Action">
            <LaunchField label="Current Focus">
              <textarea
                style={launchTextareaStyle}
                value={draft.roadmap.current}
                onChange={(e) => update("roadmap", "current", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Next">
              <textarea
                style={launchTextareaStyle}
                value={draft.roadmap.next}
                onChange={(e) => update("roadmap", "next", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Future">
              <textarea
                style={launchTextareaStyle}
                value={draft.roadmap.future}
                onChange={(e) => update("roadmap", "future", e.target.value)}
              />
            </LaunchField>
            <LaunchField label="Long-term Vision">
              <textarea
                style={launchTextareaStyle}
                value={draft.roadmap.longTermVision}
                onChange={(e) => update("roadmap", "longTermVision", e.target.value)}
              />
            </LaunchField>
            <div className="grid gap-0 sm:grid-cols-2">
              <LaunchField label="First Next Action">
                <input
                  style={launchInputStyle}
                  value={draft.roadmap.firstNextAction}
                  onChange={(e) => update("roadmap", "firstNextAction", e.target.value)}
                />
              </LaunchField>
              <LaunchField label="Next Action Due Date">
                <input
                  type="date"
                  style={launchInputStyle}
                  value={draft.roadmap.nextActionDueDate}
                  onChange={(e) => update("roadmap", "nextActionDueDate", e.target.value)}
                />
              </LaunchField>
            </div>
          </LaunchPanel>
        )}

        {step === "review" && (
          <LaunchPanel title="Launch Review">
            <p
              style={{
                fontFamily: LAUNCH_C.serif,
                fontWeight: 300,
                fontSize: "1.375rem",
                color: LAUNCH_C.cream,
                marginBottom: "1rem",
              }}
            >
              Ready to launch {draft.business.businessName || "this client"} into KXD OS?
            </p>
            <div
              style={{
                border: `1px solid ${LAUNCH_C.border}`,
                padding: "1.25rem",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {[
                ["Business", reviewSummary.business],
                ["Primary Contact", reviewSummary.contact],
                ["Monthly Retainer", reviewSummary.retainer],
                ["Services Selected", String(reviewSummary.services)],
                ["Executive Tier", reviewSummary.tier],
                ["First Next Action", reviewSummary.nextAction],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: `1px solid ${LAUNCH_C.border}`,
                    fontFamily: LAUNCH_C.sans,
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
                  <span style={{ color: LAUNCH_C.cream }}>{value}</span>
                </div>
              ))}
            </div>
            <p
              style={{
                fontFamily: LAUNCH_C.sans,
                fontSize: "0.8125rem",
                color: LAUNCH_C.creamMuted,
                marginTop: "1.25rem",
                lineHeight: 1.7,
              }}
            >
              Launching will create the Client record, Executive Client Profile, initial Retainer
              (if applicable), timeline event, and workspace — ready for operations.
            </p>
          </LaunchPanel>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              style={{
                fontFamily: LAUNCH_C.sans,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: LAUNCH_C.creamMuted,
                background: "transparent",
                border: `1px solid ${LAUNCH_C.border}`,
                padding: "0.625rem 1.125rem",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(LAUNCH_DRAFT_STORAGE_KEY);
              setDraft(EMPTY_LAUNCH_DRAFT);
              setStep("business");
            }}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Clear draft
          </button>
        </div>
        {step !== "review" ? (
          <button
            type="button"
            onClick={goNext}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.bgBase,
              background: LAUNCH_C.gold,
              border: "none",
              padding: "0.625rem 1.5rem",
              cursor: "pointer",
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={launch}
            disabled={saving}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.bgBase,
              background: LAUNCH_C.gold,
              border: "none",
              padding: "0.75rem 1.75rem",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Launching…" : "Launch Client →"}
          </button>
        )}
      </div>
    </div>
  );
}
