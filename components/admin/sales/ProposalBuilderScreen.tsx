"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { OptionalService, ProposalSectionBlock } from "@/lib/sales/types";
import { fmtMoney, type SalesUiDoc } from "./shared";

interface ProposalBuilderScreenProps {
  mode: "create" | "edit";
  proposal?: SalesUiDoc | null;
  templates: SalesUiDoc[];
  leads: SalesUiDoc[];
  clients: SalesUiDoc[];
  initialLeadId?: number;
  initialClientId?: number;
}

export function ProposalBuilderScreen({
  mode,
  proposal,
  templates,
  leads,
  clients,
  initialLeadId,
  initialClientId,
}: ProposalBuilderScreenProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(String(proposal?.title ?? ""));
  const [leadId, setLeadId] = useState<number | "">(
    initialLeadId ?? (typeof proposal?.lead === "object" ? (proposal.lead as SalesUiDoc).id : proposal?.lead) ?? "",
  );
  const [clientId, setClientId] = useState<number | "">(
    initialClientId ??
      (typeof proposal?.client === "object" ? (proposal.client as SalesUiDoc).id : proposal?.client) ??
      "",
  );
  const [executiveSummary, setExecutiveSummary] = useState(String(proposal?.executiveSummary ?? ""));
  const [scope, setScope] = useState(String(proposal?.scope ?? ""));
  const [deliverables, setDeliverables] = useState(String(proposal?.deliverables ?? ""));
  const [timeline, setTimeline] = useState(String(proposal?.timeline ?? ""));
  const [terms, setTerms] = useState(
    String(proposal?.terms ?? "Payment terms, revision rounds, and project boundaries as outlined above."),
  );
  const [investment, setInvestment] = useState(String(proposal?.investment ?? ""));
  const [recurringAmount, setRecurringAmount] = useState(String(proposal?.recurringAmount ?? ""));
  const [investmentSummary, setInvestmentSummary] = useState(String(proposal?.investmentSummary ?? ""));
  const [sectionBlocks, setSectionBlocks] = useState<ProposalSectionBlock[]>(
    (proposal?.sectionBlocks as ProposalSectionBlock[]) ?? [],
  );
  const [optionalServices, setOptionalServices] = useState<OptionalService[]>(
    (proposal?.optionalServices as OptionalService[]) ?? [],
  );

  const oneTimeTotal = useMemo(() => {
    const sections = sectionBlocks
      .filter((s) => !s.isRecurring && !s.optional)
      .reduce((sum, s) => sum + Number(s.price ?? 0), 0);
    const base = Number(investment || 0);
    return base || sections;
  }, [sectionBlocks, investment]);

  const recurringTotal = useMemo(() => {
    const sections = sectionBlocks
      .filter((s) => s.isRecurring && !s.optional)
      .reduce((sum, s) => sum + Number(s.price ?? 0), 0);
    const base = Number(recurringAmount || 0);
    return base || sections;
  }, [sectionBlocks, recurringAmount]);

  function addTemplate(template: SalesUiDoc) {
    const block: ProposalSectionBlock = {
      sectionId: template.id as number,
      category: String(template.category ?? "general"),
      title: String(template.title ?? "Section"),
      content: String(template.content ?? ""),
      price: template.defaultPrice != null ? Number(template.defaultPrice) : undefined,
      isRecurring: Boolean(template.isRecurring),
      optional: false,
      sortOrder: sectionBlocks.length + 1,
    };
    setSectionBlocks((prev) => [...prev, block]);
  }

  function addOptionalService() {
    setOptionalServices((prev) => [
      ...prev,
      { title: "Optional service", price: 0, isRecurring: false },
    ]);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        executiveSummary,
        scope,
        deliverables,
        timeline,
        terms,
        investment: oneTimeTotal || undefined,
        recurringAmount: recurringTotal || undefined,
        investmentSummary: investmentSummary || `One-time ${fmtMoney(oneTimeTotal)} · Recurring ${fmtMoney(recurringTotal)}/mo`,
        sectionBlocks,
        optionalServices,
      };

      const res = await fetch("/api/admin/sales/proposals", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "edit" ? { id: proposal?.id, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to save proposal.");
        return;
      }
      router.push(`/admin/sales/proposals/${json.id}`);
      router.refresh();
    } catch {
      setError("Failed to save proposal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title={mode === "edit" ? "Edit proposal" : "Proposal builder"}
          lead="Sections, pricing, deliverables, timeline, terms — signature and approval placeholders included."
          presence
        />

        {error ? (
          <p className="kxd-os-body" style={{ color: "var(--kxd-os-critical)", marginBottom: "1rem" }}>
            {error}
          </p>
        ) : null}

        <KxdSection label="Relationship">
          <div className="kxd-os-form-grid">
            <label className="kxd-os-field">
              <span className="kxd-os-label">Title</span>
              <input className="kxd-os-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="kxd-os-field">
              <span className="kxd-os-label">Lead</span>
              <select
                className="kxd-os-input"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">—</option>
                {leads.map((l) => (
                  <option key={l.id as number} value={l.id as number}>
                    {String(l.companyName)}
                  </option>
                ))}
              </select>
            </label>
            <label className="kxd-os-field">
              <span className="kxd-os-label">Client (optional)</span>
              <select
                className="kxd-os-input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id as number} value={c.id as number}>
                    {String(c.name)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </KxdSection>

        <KxdSection label="Executive summary">
          <textarea
            className="kxd-os-input kxd-os-textarea"
            rows={4}
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
          />
        </KxdSection>

        <KxdSection label="Sections">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {templates.map((t) => (
              <button
                key={t.id as number}
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost"
                onClick={() => addTemplate(t)}
              >
                + {String(t.title)}
              </button>
            ))}
          </div>
          {sectionBlocks.map((block, index) => (
            <div key={`${block.sectionId}-${index}`} className="kxd-os-card" style={{ marginBottom: "0.75rem" }}>
              <p className="kxd-os-card__title">{block.title}</p>
              <p className="kxd-os-body" style={{ marginTop: "0.45rem", whiteSpace: "pre-wrap" }}>
                {block.content}
              </p>
              <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                {block.isRecurring ? "Recurring" : "One-time"}
                {block.price != null ? ` · ${fmtMoney(block.price)}` : ""}
              </p>
            </div>
          ))}
        </KxdSection>

        <KxdSection label="Pricing">
          <div className="kxd-os-form-grid">
            <label className="kxd-os-field">
              <span className="kxd-os-label">One-time investment ($)</span>
              <input
                className="kxd-os-input"
                type="number"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                placeholder={String(oneTimeTotal || "")}
              />
            </label>
            <label className="kxd-os-field">
              <span className="kxd-os-label">Recurring ($/mo)</span>
              <input
                className="kxd-os-input"
                type="number"
                value={recurringAmount}
                onChange={(e) => setRecurringAmount(e.target.value)}
                placeholder={String(recurringTotal || "")}
              />
            </label>
          </div>
          <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
            Investment summary: {fmtMoney(oneTimeTotal)} one-time · {fmtMoney(recurringTotal)}/mo recurring
          </p>
          <textarea
            className="kxd-os-input kxd-os-textarea"
            rows={2}
            style={{ marginTop: "0.75rem" }}
            value={investmentSummary}
            onChange={(e) => setInvestmentSummary(e.target.value)}
            placeholder="Investment summary narrative"
          />
        </KxdSection>

        <KxdSection label="Optional services">
          <button type="button" className="kxd-os-btn kxd-os-btn--ghost" onClick={addOptionalService}>
            Add optional service
          </button>
          {optionalServices.map((svc, i) => (
            <div key={i} className="kxd-os-form-grid" style={{ marginTop: "0.75rem" }}>
              <input
                className="kxd-os-input"
                value={svc.title}
                onChange={(e) => {
                  const next = [...optionalServices];
                  next[i] = { ...svc, title: e.target.value };
                  setOptionalServices(next);
                }}
              />
              <input
                className="kxd-os-input"
                type="number"
                value={svc.price}
                onChange={(e) => {
                  const next = [...optionalServices];
                  next[i] = { ...svc, price: Number(e.target.value) };
                  setOptionalServices(next);
                }}
              />
            </div>
          ))}
        </KxdSection>

        <KxdSection label="Deliverables & timeline">
          <textarea
            className="kxd-os-input kxd-os-textarea"
            rows={3}
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            placeholder="Deliverables"
          />
          <textarea
            className="kxd-os-input kxd-os-textarea"
            rows={3}
            style={{ marginTop: "0.75rem" }}
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="Timeline"
          />
          <textarea
            className="kxd-os-input kxd-os-textarea"
            rows={2}
            style={{ marginTop: "0.75rem" }}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Scope"
          />
        </KxdSection>

        <KxdSection label="Terms & placeholders">
          <textarea
            className="kxd-os-input kxd-os-textarea"
            rows={4}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />
          <div className="kxd-os-card" style={{ marginTop: "1rem" }}>
            <p className="kxd-os-meta">Signature placeholder</p>
            <p className="kxd-os-body" style={{ marginTop: "0.35rem" }}>
              {String(proposal?.signaturePlaceholder ?? "Authorized signature · Date")}
            </p>
          </div>
          <div className="kxd-os-card" style={{ marginTop: "0.65rem" }}>
            <p className="kxd-os-meta">Approval placeholder</p>
            <p className="kxd-os-body" style={{ marginTop: "0.35rem" }}>
              {String(proposal?.approvalPlaceholder ?? "Client approval · Date")}
            </p>
          </div>
        </KxdSection>

        <div style={{ marginTop: "1.5rem" }}>
          <button type="button" className="kxd-os-btn" disabled={busy} onClick={handleSave}>
            {busy ? "Saving…" : mode === "edit" ? "Save proposal" : "Create proposal"}
          </button>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
