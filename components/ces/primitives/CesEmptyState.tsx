import type { ReactNode } from "react";

export function CesEmptyState({
  title,
  lead,
  actions,
  role = "status",
  variant = "panel",
}: {
  title: string;
  lead: string;
  actions?: ReactNode;
  role?: "status" | "region";
  variant?: "panel" | "editorial";
}) {
  return (
    <div
      className={
        variant === "editorial" ? "kxd-ces-empty kxd-ces-empty--editorial" : "kxd-ces-empty"
      }
      role={role}
    >
      <p className="kxd-ces-empty__title">{title}</p>
      <p className="kxd-ces-empty__lead">{lead}</p>
      {actions ? <div className="kxd-ces-empty__actions">{actions}</div> : null}
    </div>
  );
}
