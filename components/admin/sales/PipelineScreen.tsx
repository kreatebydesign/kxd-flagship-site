import Link from "next/link";
import { KxdMetric, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { PipelineBoardData } from "@/lib/sales/types";
import { PipelineBoard } from "./PipelineBoard";
import { fmtMoney } from "./shared";

export function PipelineScreen({ data }: { data: PipelineBoardData }) {
  const kpis = [
    { label: "Active leads", value: String(data.totalLeads) },
    { label: "Weighted pipeline", value: fmtMoney(data.totalPipelineValue) },
    {
      label: "In negotiation",
      value: String(
        data.columns.find((c) => c.status === "negotiation")?.leads.length ?? 0,
      ),
    },
    {
      label: "Won",
      value: String(data.columns.find((c) => c.status === "won")?.leads.length ?? 0),
    },
  ];

  return (
    <OperationsShell activeId="sales-pipeline">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Pipeline"
          lead="Kanban view of opportunities — drag-and-drop architecture ready. Move leads forward as discovery progresses."
        />

        <KxdSection>
          <div className="kxd-os-ops-kpi-grid">
            {kpis.map((kpi) => (
              <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
            ))}
          </div>
        </KxdSection>

        <KxdSection>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <p className="kxd-os-section__label">Board</p>
            <Link href="/admin/sales/leads" className="kxd-os-btn kxd-os-btn--ghost">
              All leads
            </Link>
          </div>
          <PipelineBoard columns={data.columns} />
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
