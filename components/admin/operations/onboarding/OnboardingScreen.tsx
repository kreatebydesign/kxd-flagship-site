import Link from "next/link";
import {
  KxdBadge,
  KxdEmptyState,
  KxdPage,
  KxdSection,
  KxdSurface,
  KxdTable,
  KxdTableBody,
  KxdTableCell,
  KxdTableHead,
  KxdTableHeaderCell,
  KxdTableRow,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import type {
  ChecklistItem,
  OnboardingWorkflowStatus,
  ReadinessLabel,
} from "@/lib/client-onboarding";

export interface OnboardingRow {
  id: number;
  clientId: number | null;
  clientName: string;
  status: string;
  statusLabel: string;
  workflow: OnboardingWorkflowStatus;
  workflowLabel: string;
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  completionPercent: number;
  updatedAt: string;
  notes: string;
  missingItems: string[];
  checklist: {
    assets: ChecklistItem[];
    domainDns: ChecklistItem[];
    brand: ChecklistItem[];
    content: ChecklistItem[];
  };
}

export interface OnboardingScreenProps {
  total: number;
  kpis: Array<{
    label: string;
    value: string;
    sub?: string;
    alert?: boolean;
  }>;
  activeIntakes: OnboardingRow[];
  missingIntakes: OnboardingRow[];
  allRows: OnboardingRow[];
}

function statusVariant(status: string): KxdBadgeVariant {
  if (status === "approved") return "success";
  if (status === "submitted") return "tier";
  if (status === "in-progress") return "warning";
  if (status === "sent") return "status";
  return "pending";
}

function workflowVariant(workflow: OnboardingWorkflowStatus): KxdBadgeVariant {
  if (workflow === "approved") return "success";
  if (workflow === "ready-for-build") return "tier";
  if (workflow === "waiting-on-client") return "warning";
  if (workflow === "waiting-on-kxd") return "status";
  return "pending";
}

function readinessVariant(label: ReadinessLabel): KxdBadgeVariant {
  if (label === "Ready") return "success";
  if (label === "Needs Information") return "warning";
  return "critical";
}

function checklistSummary(items: ChecklistItem[]): string {
  const done = items.filter((item) => item.done).length;
  return `${done}/${items.length}`;
}

export function OnboardingScreen({
  total,
  kpis,
  activeIntakes,
  missingIntakes,
  allRows,
}: OnboardingScreenProps) {
  return (
    <OperationsShell activeId="onboarding">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Premium Intake"
          title="Client Onboarding"
          lead="Structured onboarding command for premium intake readiness, missing requirements, workflow state, and handoff confidence before build."
        />

        <OpsKpiStrip items={kpis} />

        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <KxdSection label="Active Intake Detail" className="mb-0">
            <OpsSectionHead
              label="High-Context Queue"
              count={activeIntakes.length}
              href="/admin/collections/client-onboarding"
              linkText="All Intakes →"
            />
            <OpsCard>
              {activeIntakes.length === 0 ? (
                <KxdEmptyState title="No active onboarding intakes." />
              ) : (
                activeIntakes.map((row) => (
                  <OpsListRow
                    key={row.id}
                    href={`/admin/collections/client-onboarding/${row.id}`}
                  >
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{row.clientName}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {row.statusLabel} · Updated {row.updatedAt}
                      </p>
                      <p className="kxd-os-ops-list-row__meta">
                        Assets {checklistSummary(row.checklist.assets)} · Domain{" "}
                        {checklistSummary(row.checklist.domainDns)} · Brand{" "}
                        {checklistSummary(row.checklist.brand)} · Content{" "}
                        {checklistSummary(row.checklist.content)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <KxdBadge variant={workflowVariant(row.workflow)}>
                        {row.workflowLabel}
                      </KxdBadge>
                      <KxdBadge variant={readinessVariant(row.readinessLabel)}>
                        {row.readinessScore}% Ready
                      </KxdBadge>
                    </div>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>

          <KxdSection label="Missing Requirements" className="mb-0">
            <OpsSectionHead
              label="Client Dependencies"
              count={missingIntakes.length}
              href="/admin/collections/client-onboarding"
              linkText="Manage Intakes →"
            />
            <OpsCard>
              {missingIntakes.length === 0 ? (
                <KxdEmptyState title="No missing requirements. All records are complete." />
              ) : (
                missingIntakes.slice(0, 12).map((row) => (
                  <OpsListRow
                    key={row.id}
                    href={`/admin/collections/client-onboarding/${row.id}`}
                  >
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{row.clientName}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {row.statusLabel} · {row.readinessScore}% ready
                      </p>
                      <p className="kxd-os-ops-list-row__meta">
                        {row.missingItems.slice(0, 4).join(" · ")}
                        {row.missingItems.length > 4
                          ? ` · +${row.missingItems.length - 4} more`
                          : ""}
                      </p>
                    </div>
                    <KxdBadge variant="critical">{row.missingItems.length} missing</KxdBadge>
                  </OpsListRow>
                ))
              )}
            </OpsCard>
          </KxdSection>
        </div>

        <KxdSection label="All Onboarding Records" className="kxd-os-ops-section">
          <OpsSectionHead
            label="Premium Intake Ledger"
            count={total}
            href="/admin/collections/client-onboarding"
            linkText="Payload Collection →"
          />
          {allRows.length === 0 ? (
            <KxdEmptyState
              title="No onboarding records yet."
              description="Create one in Payload → Client Onboarding."
            />
          ) : (
            <KxdSurface variant="panel">
              <KxdTable>
                <KxdTableHead>
                  <KxdTableRow>
                    {[
                      "Client",
                      "Status",
                      "Workflow",
                      "Completion",
                      "Readiness",
                      "Last Updated",
                    ].map((heading) => (
                      <KxdTableHeaderCell key={heading}>{heading}</KxdTableHeaderCell>
                    ))}
                  </KxdTableRow>
                </KxdTableHead>
                <KxdTableBody>
                  {allRows.map((row) => (
                    <KxdTableRow key={row.id}>
                      <KxdTableCell primary>
                        {row.clientId ? (
                          <Link
                            href={`/admin/collections/clients/${row.clientId}`}
                            className="kxd-os-ops-link-row"
                          >
                            {row.clientName}
                          </Link>
                        ) : (
                          <span>{row.clientName}</span>
                        )}
                        <Link
                          href={`/admin/collections/client-onboarding/${row.id}`}
                          className="kxd-os-ops-link-row kxd-os-ops-link-row--inline"
                        >
                          View intake →
                        </Link>
                      </KxdTableCell>
                      <KxdTableCell>
                        <KxdBadge variant={statusVariant(row.status)}>{row.statusLabel}</KxdBadge>
                      </KxdTableCell>
                      <KxdTableCell>
                        <KxdBadge variant={workflowVariant(row.workflow)}>
                          {row.workflowLabel}
                        </KxdBadge>
                      </KxdTableCell>
                      <KxdTableCell>{row.completionPercent}%</KxdTableCell>
                      <KxdTableCell>
                        <KxdBadge variant={readinessVariant(row.readinessLabel)}>
                          {row.readinessLabel}
                        </KxdBadge>
                      </KxdTableCell>
                      <KxdTableCell>{row.updatedAt}</KxdTableCell>
                    </KxdTableRow>
                  ))}
                </KxdTableBody>
              </KxdTable>
            </KxdSurface>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
