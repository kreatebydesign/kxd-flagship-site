import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { ContractLifecycleActions } from "@/components/admin/sales/ContractLifecycleActions";
import {
  ensureLifecycleHydrated,
  getContractLifecycle,
  summarizeProgression,
} from "@/lib/proposal-lifecycle/services";
import { contractStatusLabel, proposalStatusLabel } from "@/lib/proposal-lifecycle/progression";
import { formatCents } from "@/lib/proposal-builder/money";
import { getKxdInvoiceConfig } from "@/lib/proposal-lifecycle/billing-identity";

export const dynamic = "force-dynamic";

export default async function ContractLifecycleWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!id) notFound();

  let pkg;
  let contract;
  let proposal;
  let canonical;
  try {
    pkg = await ensureLifecycleHydrated(id);
    ({ contract, proposal, canonical } = await getContractLifecycle(id));
  } catch {
    notFound();
  }

  const proposalStatus = String(proposal?.status ?? "draft");
  const contractStatus = String(contract.status);
  const progression = summarizeProgression({
    proposalStatus,
    contractStatus,
    pkg,
  });
  const issues = pkg.billingReadinessIssues ?? [];
  const blockers = issues.filter((i) => i.severity === "blocker");
  const terms = pkg.structuredPaymentTerms;
  const kxd = getKxdInvoiceConfig();
  const acceptance = proposal?.acceptanceRecord as
    | { name?: string; email?: string; organization?: string; acceptedAt?: string }
    | null
    | undefined;

  const nextAction = !pkg.operatorSignature
    ? "Resolve readiness, then apply KXD typed signature"
    : !pkg.clientSignature
      ? "Simulate local client delivery, then wait for client signature"
      : !pkg.onboardingEligible
        ? "Review billing plan and simulate mock payment if appropriate"
        : "Onboarding eligible — start onboarding manually when ready";

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Contract lifecycle"
          title={String(contract.title ?? "Agreement")}
          lead="Operator workspace for acceptance evidence, readiness, dual signature, simulated delivery, executed package, and mock billing. No live email or Stripe."
        />
        <KxdSection>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {proposal ? (
              <Link
                href={`/admin/sales/proposals/${proposal.id}`}
                className="kxd-os-btn kxd-os-btn--ghost"
                style={{ borderRadius: 2 }}
              >
                Open proposal
              </Link>
            ) : null}
            <Link
              href="/admin/sales/lifecycle"
              className="kxd-os-btn kxd-os-btn--ghost"
              style={{ borderRadius: 2 }}
            >
              Lifecycle queues
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginBottom: "1.5rem",
            }}
          >
            <MetaCard label="Human progression" value={progression} />
            <MetaCard label="Proposal status" value={proposalStatusLabel(proposalStatus)} />
            <MetaCard label="Contract status" value={contractStatusLabel(contractStatus)} />
            <MetaCard
              label="Onboarding"
              value={pkg.onboardingEligible ? "Eligible (manual)" : "Not eligible"}
            />
          </div>

          <Panel title="Next required action">
            <p>{nextAction}</p>
          </Panel>

          <Panel title="Invoice & Billing Readiness">
            {blockers.length === 0 ? (
              <p>No blockers recorded (verify KXD invoice configuration before any live send).</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.55 }}>
                {blockers.map((b) => (
                  <li key={b.code}>
                    <strong>{b.code}</strong> — {b.message}
                  </li>
                ))}
              </ul>
            )}
            <p style={{ marginTop: "0.75rem", opacity: 0.7, fontSize: 13 }}>
              KXD config: {kxd.displayName} · legal{" "}
              {kxd.legalEntity.state}/{kxd.legalEntity.value ? "set" : "empty"} · numbering{" "}
              {kxd.invoiceNumberingState}
            </p>
          </Panel>

          <Panel title="Acceptance evidence">
            {acceptance ? (
              <>
                <p>
                  {acceptance.name} · {acceptance.organization} · {acceptance.email}
                </p>
                <p style={{ opacity: 0.75, fontSize: 13 }}>Accepted {acceptance.acceptedAt}</p>
              </>
            ) : (
              <p>No acceptance record on linked proposal.</p>
            )}
            <p>
              Contact: {canonical?.primaryContact?.name ?? "—"} ·{" "}
              {canonical?.primaryContact?.email ?? "—"}
            </p>
            <p>Proposal: {String(canonical?.proposalNumber ?? proposal?.proposalNumber ?? "—")}</p>
          </Panel>

          {terms ? (
            <Panel title="Structured payment terms">
              <p>
                One-time {formatCents(terms.oneTimeTotalCents, terms.currency)} · Monthly{" "}
                {formatCents(terms.monthlyTotalCents, terms.currency)}
              </p>
              <ul style={{ paddingLeft: "1.2rem" }}>
                {terms.installments.map((i) => (
                  <li key={i.id}>
                    {i.label}: {formatCents(i.amountCents, terms.currency)} · {i.dueTerms}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {pkg.billingPlan ? (
            <Panel title="Billing plan (TEST/MOCK)">
              <p>
                Status {pkg.billingPlan.status} · readiness {pkg.billingPlan.invoiceReadiness} · Δ{" "}
                {pkg.billingPlan.reconciliation.differenceCents}¢
              </p>
              <p style={{ fontSize: 13, opacity: 0.8 }}>
                Mock customer {pkg.billingPlan.mockStripe?.customerId ?? "—"} · drafts{" "}
                {(pkg.billingPlan.mockStripe?.draftInvoiceIds ?? []).join(", ") || "—"}
              </p>
              <ul style={{ paddingLeft: "1.2rem" }}>
                {pkg.billingPlan.obligations.map((o) => (
                  <li key={o.id}>
                    {o.label} · {formatCents(o.amountCents, o.currency)} · {o.status}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Operator actions">
            <ContractLifecycleActions
              contractId={id}
              contractStatus={contractStatus}
              agreementSource={String(contract.agreementSource ?? "proposal")}
              commercialStatus={pkg.commercialStatus ?? null}
              hasOperatorSignature={Boolean(pkg.operatorSignature)}
              hasClientSignature={Boolean(pkg.clientSignature)}
              hasExternalAcceptance={Boolean(pkg.externalAcceptance)}
              onboardingEligible={Boolean(pkg.onboardingEligible)}
              blockers={blockers.map((b) => ({ code: b.code, message: b.message }))}
              defaultRecipientName={String(
                contract.signerName ?? acceptance?.name ?? canonical?.primaryContact?.name ?? "",
              )}
              defaultRecipientEmail={String(
                contract.signerEmail ??
                  acceptance?.email ??
                  canonical?.primaryContact?.email ??
                  "",
              )}
              documentRefs={(pkg.documentRefs ?? []).map((d) => ({ id: d.id, kind: d.kind }))}
              externalAcceptanceSummary={
                pkg.externalAcceptance
                  ? `Externally recorded: ${pkg.externalAcceptance.acceptedBy} via ${pkg.externalAcceptance.method} on ${pkg.externalAcceptance.acceptedAt}. Not an electronic signature.`
                  : null
              }
            />
          </Panel>

          <Panel title="Audit timeline">
            {(pkg.auditEvents ?? []).length === 0 ? (
              <p>No lifecycle audit events yet.</p>
            ) : (
              <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.55 }}>
                {[...(pkg.auditEvents ?? [])].reverse().map((e) => (
                  <li key={e.id}>
                    <strong>{e.action}</strong>
                    {e.fromStatus || e.toStatus
                      ? ` · ${e.fromStatus ?? "—"} → ${e.toStatus ?? "—"}`
                      : ""}
                    <span style={{ opacity: 0.65 }}> · {e.at}</span>
                    {e.reason ? <span style={{ opacity: 0.75 }}> — {e.reason}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "0.85rem 1rem",
        borderRadius: 2,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 0.06, textTransform: "uppercase", opacity: 0.6 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 15 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.65rem" }}>{title}</h2>
      <div style={{ lineHeight: 1.55 }}>{children}</div>
    </section>
  );
}
