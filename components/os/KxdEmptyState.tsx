import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={kxdOsCn("kxd-os-empty", className)}>
      <p className="kxd-os-empty__title">{title}</p>
      {description && <p className="kxd-os-empty__body">{description}</p>}
      {action && <div style={{ marginTop: "1.5rem" }}>{action}</div>}
    </div>
  );
}
