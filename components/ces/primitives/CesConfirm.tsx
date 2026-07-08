import type { ReactNode } from "react";

export interface CesConfirmProps {
  title: string;
  message: string;
  reference?: string;
  referenceLabel?: string;
  actions?: ReactNode;
}

export function CesConfirm({ title, message, reference, referenceLabel, actions }: CesConfirmProps) {
  const refLabel = referenceLabel ?? "Revision no.";
  return (
    <div className="kxd-ces-confirm" role="status">
      <div className="kxd-ces-confirm__mark" aria-hidden>
        <span className="kxd-ces-confirm__mark-inner" />
      </div>
      <h2 className="kxd-ces-confirm__title">{title}</h2>
      <p className="kxd-ces-confirm__message">{message}</p>
      {reference ? (
        <p className="kxd-ces-confirm__reference">
          {refLabel} <span>{reference}</span>
        </p>
      ) : null}
      {actions ? <div className="kxd-ces-confirm__actions">{actions}</div> : null}
    </div>
  );
}
