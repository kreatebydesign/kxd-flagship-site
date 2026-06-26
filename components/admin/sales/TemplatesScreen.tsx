import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { fmtMoney, type SalesUiDoc } from "./shared";

export function TemplatesScreen({ templates }: { templates: SalesUiDoc[] }) {
  return (
    <OperationsShell activeId="sales-templates">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Templates"
          lead="Reusable proposal sections — About KXD, Discovery, Branding, Website, SEO, and more."
        />

        <KxdSection>
          {templates.length === 0 ? (
            <KxdEmptyState
              title="No templates"
              description="Proposal section templates are managed in Payload or seeded via migration."
            />
          ) : (
            <div className="kxd-os-card-list">
              {templates.map((t) => (
                <div key={t.id as number} className="kxd-os-card" style={{ marginBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-card__title">{String(t.title ?? "Section")}</p>
                      <p className="kxd-os-meta" style={{ marginTop: "0.3rem" }}>
                        {String(t.category ?? "general")}
                        {t.defaultPrice != null ? ` · ${fmtMoney(t.defaultPrice as number)}` : ""}
                        {t.isRecurring ? " · recurring" : ""}
                      </p>
                      {t.summary ? (
                        <p className="kxd-os-body" style={{ marginTop: "0.45rem" }}>
                          {String(t.summary)}
                        </p>
                      ) : null}
                    </div>
                    <KxdBadge variant={t.active ? "success" : "default"}>
                      {t.active ? "Active" : "Inactive"}
                    </KxdBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
