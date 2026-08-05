import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage, KxdSection, KxdSurface } from "@/components/os";

const TOOLS = [
  {
    href: "/admin/operations/tools/qr",
    title: "QR Generator",
    description:
      "Create print-ready PNG and SVG codes that encode exact absolute URLs — client-side only.",
  },
] as const;

export function ToolsIndexScreen() {
  return (
    <OperationsShell activeId="tools">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · System"
          title="Tools"
          lead="Lightweight internal utilities for studio operations. No CRM, no automation."
        />

        <KxdSection label="Utilities" className="kxd-os-operations-section">
          <div className="kxd-os-tools-index">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="kxd-os-tools-index__card"
              >
                <KxdSurface
                  variant="glass"
                  className="kxd-os-tools-index__card-inner"
                >
                  <p className="kxd-os-tools-index__title">{tool.title}</p>
                  <p className="kxd-os-meta">{tool.description}</p>
                </KxdSurface>
              </Link>
            ))}
          </div>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
