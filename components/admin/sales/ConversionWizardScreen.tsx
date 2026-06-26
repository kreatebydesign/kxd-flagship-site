"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { ConversionWizardDraft } from "@/lib/sales/acquisition";
import { fmtMoney } from "./shared";

const STEPS = ["Client", "Project", "Retainer", "Infrastructure", "Launch"] as const;

export function ConversionWizardScreen({
  proposalId,
  proposalTitle,
  initialDraft,
  conversionExecuted,
}: {
  proposalId: number;
  proposalTitle: string;
  initialDraft: ConversionWizardDraft;
  conversionExecuted: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ConversionWizardDraft>(initialDraft);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/conversion/${proposalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.join(" ") ?? json.error ?? "Conversion failed.");
        return;
      }
      if (json.result?.alreadyExecuted) {
        setResult("Conversion was already executed (idempotent).");
      } else {
        setResult(
          `Client created · Portal invite ${json.result.portalInviteEmail ?? "pending"} · Project #${json.result.projectId}`,
        );
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales · Conversion"
          title="Conversion wizard"
          lead={`Review and execute client creation for ${proposalTitle}.`}
          presence
        />

        <KxdSection label="Steps">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`kxd-os-btn${i === step ? "" : " kxd-os-btn--ghost"}`}
                onClick={() => setStep(i)}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>
        </KxdSection>

        {step === 0 ? (
          <KxdSection label="Client">
            <div className="kxd-os-form-grid">
              <input className="kxd-os-input" value={String(draft.client.name ?? "")} onChange={(e) => setDraft({ ...draft, client: { ...draft.client, name: e.target.value } })} placeholder="Client name" />
              <input className="kxd-os-input" value={String(draft.client.slug ?? "")} onChange={(e) => setDraft({ ...draft, client: { ...draft.client, slug: e.target.value } })} placeholder="Slug" />
              <input className="kxd-os-input" value={String(draft.client.primaryContactEmail ?? "")} onChange={(e) => setDraft({ ...draft, client: { ...draft.client, primaryContactEmail: e.target.value } })} placeholder="Email" />
            </div>
          </KxdSection>
        ) : null}

        {step === 1 ? (
          <KxdSection label="Project">
            <input className="kxd-os-input" value={String(draft.project.name ?? "")} onChange={(e) => setDraft({ ...draft, project: { ...draft.project, name: e.target.value } })} placeholder="Project name" />
            <textarea className="kxd-os-input kxd-os-textarea" style={{ marginTop: "0.75rem" }} value={String(draft.project.deliverables ?? "")} onChange={(e) => setDraft({ ...draft, project: { ...draft.project, deliverables: e.target.value } })} placeholder="Deliverables" />
          </KxdSection>
        ) : null}

        {step === 2 ? (
          <KxdSection label="Retainer">
            {draft.retainer ? (
              <div className="kxd-os-form-grid">
                <input className="kxd-os-input" value={String(draft.retainer.name ?? "")} onChange={(e) => setDraft({ ...draft, retainer: { ...draft.retainer!, name: e.target.value } })} placeholder="Retainer name" />
                <input className="kxd-os-input" type="number" value={String(draft.retainer.monthlyAmount ?? "")} onChange={(e) => setDraft({ ...draft, retainer: { ...draft.retainer!, monthlyAmount: Number(e.target.value) } })} placeholder="Monthly amount" />
              </div>
            ) : (
              <p className="kxd-os-body">No recurring retainer in this proposal.</p>
            )}
          </KxdSection>
        ) : null}

        {step === 3 ? (
          <KxdSection label="Infrastructure">
            <textarea className="kxd-os-input kxd-os-textarea" value={String(draft.infrastructure.notes ?? "")} onChange={(e) => setDraft({ ...draft, infrastructure: { ...draft.infrastructure, notes: e.target.value } })} />
          </KxdSection>
        ) : null}

        {step === 4 ? (
          <KxdSection label="Launch">
            <div className="kxd-os-card">
              <p className="kxd-os-card__title">{String(draft.client.name)}</p>
              <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                Project: {String(draft.project.name)}
              </p>
              {draft.retainer ? (
                <p className="kxd-os-body">Retainer: {fmtMoney(Number(draft.retainer.monthlyAmount ?? 0))}/mo</p>
              ) : null}
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                Creates client, executive profile, project, infrastructure, onboarding, portal user, and publishes timeline + automation events.
              </p>
            </div>
            {conversionExecuted ? (
              <p className="kxd-os-body" style={{ marginTop: "1rem", color: "var(--kxd-os-success)" }}>
                Conversion already executed for this proposal.
              </p>
            ) : (
              <button type="button" className="kxd-os-btn" style={{ marginTop: "1rem" }} disabled={busy} onClick={execute}>
                {busy ? "Executing…" : "Execute conversion"}
              </button>
            )}
          </KxdSection>
        ) : null}

        {error ? <p className="kxd-os-body" style={{ color: "var(--kxd-os-critical)", marginTop: "1rem" }}>{error}</p> : null}
        {result ? <p className="kxd-os-body" style={{ color: "var(--kxd-os-success)", marginTop: "1rem" }}>{result}</p> : null}
      </KxdPage>
    </OperationsShell>
  );
}
