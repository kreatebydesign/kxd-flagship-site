import { Suspense } from "react";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientPortfolioWorkspace } from "@/components/admin/operations/client-portfolio/ClientPortfolioWorkspace";
import type { PortfolioRow } from "@/lib/client-portfolio/types";

export interface ClientPortfolioScreenProps {
  dateDisplay: string;
  rows: PortfolioRow[];
  withProfiles: number;
  activeCount: number;
  totalMRR: number;
  totalPotential: number;
  criticalCount: number;
  duplicateCount: number;
  duplicateWarnings: Record<number, string>;
}

export function ClientPortfolioScreen(props: ClientPortfolioScreenProps) {
  const { dateDisplay, rows, duplicateWarnings, ...kpi } = props;

  return (
    <OperationsShell activeId="clients" dateDisplay={dateDisplay} showQuickActions={false}>
      <Suspense
        fallback={
          <div className="kxd-founder-page kxd-founder-clients">
            <p className="kxd-founder-empty">Loading portfolio…</p>
          </div>
        }
      >
        <ClientPortfolioWorkspace
          dateDisplay={dateDisplay}
          allRows={rows}
          duplicateWarnings={duplicateWarnings}
          {...kpi}
        />
      </Suspense>
    </OperationsShell>
  );
}