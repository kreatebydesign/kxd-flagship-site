"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { DEFAULT_LEGAL_COPY } from "@/lib/direct-agreement/default-legal-copy";

export function DirectAgreementCreateForm(props: {
  clientId: number;
  clientName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    contractType: "marketing-retainer",
    publicTitle: "",
    body: "",
    executiveNotes: "",
    commercialStructure: "one-time" as "one-time" | "recurring" | "combined",
    oneTimeAmountDollars: "",
    monthlyAmountDollars: "0",
    serviceStartDate: "",
    serviceEndDate: "",
    scope: "",
    includedServices: "",
    exclusions: "",
    capacityHoursPerMonth: "",
    rolloverPolicy: "none" as "none" | "manual-approval",
    revisionAllowance: "",
    autoRenew: false,
    billingEmail: "",
    billingContactName: "",
    payerLegalName: "",
    overagePreapprovalRule: DEFAULT_LEGAL_COPY.overagePreapprovalRule as string,
    paymentTerms: DEFAULT_LEGAL_COPY.paymentTerms as string,
    cancellationRefundLanguage: DEFAULT_LEGAL_COPY.cancellationRefundLanguage as string,
    intellectualPropertyLanguage: DEFAULT_LEGAL_COPY.intellectualPropertyLanguage as string,
    portfolioUseLanguage: DEFAULT_LEGAL_COPY.portfolioUseLanguage as string,
    clientResponsibilities: DEFAULT_LEGAL_COPY.clientResponsibilities as string,
    renewalBehavior: DEFAULT_LEGAL_COPY.renewalBehavior as string,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const oneTimeAmountCents = Math.round(Number(form.oneTimeAmountDollars || 0) * 100);
      const monthlyAmountCents = Math.round(Number(form.monthlyAmountDollars || 0) * 100);
      const res = await fetch("/api/admin/sales/contracts/direct-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: props.clientId,
          title: form.title,
          contractType: form.contractType,
          publicTitle: form.publicTitle || form.title,
          body: form.body,
          executiveNotes: form.executiveNotes || null,
          agreementTerms: {
            commercialStructure: form.commercialStructure,
            oneTimeAmountCents,
            monthlyAmountCents,
            serviceStartDate: form.serviceStartDate,
            serviceEndDate: form.serviceEndDate || null,
            scope: form.scope,
            includedServices: form.includedServices,
            exclusions: form.exclusions,
            capacityHoursPerMonth: form.capacityHoursPerMonth
              ? Number(form.capacityHoursPerMonth)
              : null,
            rolloverPolicy: form.rolloverPolicy,
            revisionAllowance: form.revisionAllowance,
            overagePreapprovalRule: form.overagePreapprovalRule,
            paymentTerms: form.paymentTerms,
            cancellationRefundLanguage: form.cancellationRefundLanguage,
            intellectualPropertyLanguage: form.intellectualPropertyLanguage,
            portfolioUseLanguage: form.portfolioUseLanguage,
            clientResponsibilities: form.clientResponsibilities,
            renewalBehavior: form.renewalBehavior,
            autoRenew: form.autoRenew,
            billingEmail: form.billingEmail || null,
            billingContactName: form.billingContactName || null,
            payerLegalName: form.payerLegalName || null,
          },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; href?: string; contractId?: number };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Create failed.");
      router.push(data.href ?? `/admin/sales/contracts/${data.contractId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="kxd-os-direct-agreement-form" style={{ display: "grid", gap: "1rem", maxWidth: 880 }}>
      <p style={{ margin: 0, color: "var(--kxd-os-muted, #666)" }}>
        Creating a Direct Agreement for <strong>{props.clientName}</strong> (client #{props.clientId}).
        No proposal will be created.
      </p>

      {error ? (
        <p role="alert" style={{ color: "#8a1f1f", margin: 0 }}>
          {error}
        </p>
      ) : null}

      <Field label="Agreement title">
        <input required value={form.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Public title">
        <input value={form.publicTitle} onChange={(e) => set("publicTitle", e.target.value)} />
      </Field>
      <Field label="Agreement type">
        <select value={form.contractType} onChange={(e) => set("contractType", e.target.value)}>
          <option value="service-agreement">Service Agreement</option>
          <option value="monthly-retainer">Monthly Retainer</option>
          <option value="marketing-retainer">Marketing Retainer</option>
          <option value="website-agreement">Website Agreement</option>
          <option value="consulting">Consulting</option>
          <option value="custom">Custom</option>
        </select>
      </Field>
      <Field label="Commercial structure">
        <select
          value={form.commercialStructure}
          onChange={(e) =>
            set("commercialStructure", e.target.value as typeof form.commercialStructure)
          }
        >
          <option value="one-time">One-time prepaid</option>
          <option value="recurring">Recurring</option>
          <option value="combined">Combined</option>
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field label="One-time amount (USD)">
          <input
            required={form.commercialStructure !== "recurring"}
            inputMode="decimal"
            value={form.oneTimeAmountDollars}
            onChange={(e) => set("oneTimeAmountDollars", e.target.value)}
          />
        </Field>
        <Field label="Monthly amount (USD)">
          <input
            inputMode="decimal"
            value={form.monthlyAmountDollars}
            onChange={(e) => set("monthlyAmountDollars", e.target.value)}
          />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field label="Service start">
          <input
            required
            type="date"
            value={form.serviceStartDate}
            onChange={(e) => set("serviceStartDate", e.target.value)}
          />
        </Field>
        <Field label="Service end">
          <input
            type="date"
            value={form.serviceEndDate}
            onChange={(e) => set("serviceEndDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Scope">
        <textarea required rows={3} value={form.scope} onChange={(e) => set("scope", e.target.value)} />
      </Field>
      <Field label="Included services">
        <textarea
          required
          rows={4}
          value={form.includedServices}
          onChange={(e) => set("includedServices", e.target.value)}
        />
      </Field>
      <Field label="Exclusions">
        <textarea rows={2} value={form.exclusions} onChange={(e) => set("exclusions", e.target.value)} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field label="Capacity hours / month">
          <input
            inputMode="decimal"
            value={form.capacityHoursPerMonth}
            onChange={(e) => set("capacityHoursPerMonth", e.target.value)}
          />
        </Field>
        <Field label="Rollover policy">
          <select
            value={form.rolloverPolicy}
            onChange={(e) => set("rolloverPolicy", e.target.value as typeof form.rolloverPolicy)}
          >
            <option value="none">No automatic rollover</option>
            <option value="manual-approval">Manual approval only</option>
          </select>
        </Field>
      </div>
      <Field label="Revision allowance">
        <input value={form.revisionAllowance} onChange={(e) => set("revisionAllowance", e.target.value)} />
      </Field>
      <Field label="Overage / preapproval rule">
        <textarea
          required
          rows={2}
          value={form.overagePreapprovalRule}
          onChange={(e) => set("overagePreapprovalRule", e.target.value)}
        />
      </Field>
      <Field label="Payment terms">
        <textarea
          required
          rows={2}
          value={form.paymentTerms}
          onChange={(e) => set("paymentTerms", e.target.value)}
        />
      </Field>
      <Field label="Agreement body (legal copy)">
        <textarea required rows={10} value={form.body} onChange={(e) => set("body", e.target.value)} />
      </Field>
      <Field label="Cancellation / refund">
        <textarea
          required
          rows={2}
          value={form.cancellationRefundLanguage}
          onChange={(e) => set("cancellationRefundLanguage", e.target.value)}
        />
      </Field>
      <Field label="Intellectual property">
        <textarea
          required
          rows={2}
          value={form.intellectualPropertyLanguage}
          onChange={(e) => set("intellectualPropertyLanguage", e.target.value)}
        />
      </Field>
      <Field label="Portfolio use">
        <textarea
          required
          rows={2}
          value={form.portfolioUseLanguage}
          onChange={(e) => set("portfolioUseLanguage", e.target.value)}
        />
      </Field>
      <Field label="Client responsibilities">
        <textarea
          required
          rows={2}
          value={form.clientResponsibilities}
          onChange={(e) => set("clientResponsibilities", e.target.value)}
        />
      </Field>
      <Field label="Renewal behavior">
        <textarea
          required
          rows={2}
          value={form.renewalBehavior}
          onChange={(e) => set("renewalBehavior", e.target.value)}
        />
      </Field>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={form.autoRenew}
          onChange={(e) => set("autoRenew", e.target.checked)}
        />
        Auto-renew (must stay off for prepaid one-time agreements)
      </label>
      <Field label="Internal notes">
        <textarea
          rows={2}
          value={form.executiveNotes}
          onChange={(e) => set("executiveNotes", e.target.value)}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <Field label="Billing contact">
          <input
            value={form.billingContactName}
            onChange={(e) => set("billingContactName", e.target.value)}
          />
        </Field>
        <Field label="Billing email">
          <input
            type="email"
            value={form.billingEmail}
            onChange={(e) => set("billingEmail", e.target.value)}
          />
        </Field>
        <Field label="Payer legal name">
          <input value={form.payerLegalName} onChange={(e) => set("payerLegalName", e.target.value)} />
        </Field>
      </div>

      <button type="submit" className="kxd-os-btn" disabled={busy} style={{ borderRadius: 2 }}>
        {busy ? "Creating…" : "Create Direct Agreement"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
