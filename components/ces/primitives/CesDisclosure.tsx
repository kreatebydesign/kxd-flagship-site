import type { ReactNode } from "react";

export function CesDisclosure({
  summary,
  lead,
  children,
}: {
  summary: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <details className="kxd-client-disclosure">
      <summary>{summary}</summary>
      {lead ? <p className="kxd-client-disclosure__lead">{lead}</p> : null}
      <div className="kxd-client-disclosure__content">{children}</div>
    </details>
  );
}
