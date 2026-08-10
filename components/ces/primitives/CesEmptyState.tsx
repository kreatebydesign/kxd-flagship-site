import type { ReactNode } from "react";

export function CesEmptyState({
  title,
  lead,
  actions,
  role = "status",
}: {
  title: string;
  lead: string;
  actions?: ReactNode;
  role?: "status" | "region";
}) {
  return (
    <div className="kxd-ces-empty" role={role}>
      <p className="kxd-ces-empty__title">{title}</p>
      <p className="kxd-ces-empty__lead">{lead}</p>
      {actions ? <div className="kxd-ces-empty__actions">{actions}</div> : null}
    </div>
  );
}
