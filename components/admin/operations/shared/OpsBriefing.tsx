import Link from "next/link";
import type { ReactNode } from "react";
import { KxdBadge, KxdEmptyState, KxdSurface, type KxdBadgeVariant } from "@/components/os";

export function OpsSectionHead({
  label,
  count,
  href,
  linkText,
}: {
  label: string;
  count?: number;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="kxd-os-ops-section-head">
      <div className="kxd-os-ops-section-head__left">
        <p className="kxd-os-section__label">{label}</p>
        {count !== undefined && count > 0 && (
          <span className="kxd-os-ops-count">{count}</span>
        )}
      </div>
      {href && (
        <Link href={href} className="kxd-os-link-quiet">
          {linkText ?? "View"}
        </Link>
      )}
    </div>
  );
}

export function OpsCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <KxdSurface variant="glass" className={`kxd-os-ops-briefing-surface${className ? ` ${className}` : ""}`}>
      {children}
    </KxdSurface>
  );
}

export function OpsListRow({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  const rowClass = `kxd-os-ops-list-row${className ? ` ${className}` : ""}`;
  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {children}
      </Link>
    );
  }
  return <div className={rowClass}>{children}</div>;
}

export function OpsEmpty({ message }: { message: string }) {
  return <KxdEmptyState title={message} />;
}

export function OpsStatusBadge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: KxdBadgeVariant;
}) {
  return <KxdBadge variant={variant}>{label}</KxdBadge>;
}

export function OpsKpiStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    sub?: string;
    alert?: boolean;
  }>;
}) {
  return (
    <div className="kxd-os-ops-kpi-strip">
      {items.map((kpi) => (
        <div key={kpi.label} className="kxd-os-ops-kpi-cell">
          <p className="kxd-os-metric__label">{kpi.label}</p>
          <p
            className={`kxd-os-ops-kpi-cell__value${kpi.alert ? " kxd-os-ops-kpi-cell__value--alert" : ""}`}
          >
            {kpi.value}
          </p>
          {kpi.sub && <p className="kxd-os-metric__sub">{kpi.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function OpsFocusPill({
  label,
  description,
  tone = "default",
}: {
  label: string;
  description: string;
  tone?: "default" | "warning" | "critical" | "clear";
}) {
  return (
    <div className={`kxd-os-ops-focus kxd-os-ops-focus--${tone}`}>
      <span className="kxd-os-ops-focus__dot" aria-hidden="true" />
      <div>
        <p className="kxd-os-ops-focus__label">{label}</p>
        <p className="kxd-os-ops-focus__desc">{description}</p>
      </div>
    </div>
  );
}

export function OpsQuickGrid({
  items,
}: {
  items: Array<{ label: string; sub: string; href: string }>;
}) {
  return (
    <div className="kxd-os-ops-quick-grid">
      {items.map((action) => (
        <Link key={action.href} href={action.href} className="kxd-os-ops-quick-cell">
          <p className="kxd-os-ops-quick-cell__label">{action.label}</p>
          <p className="kxd-os-ops-quick-cell__sub">{action.sub}</p>
        </Link>
      ))}
    </div>
  );
}
