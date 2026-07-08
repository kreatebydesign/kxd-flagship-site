import type { ReactNode } from "react";

export interface CesPageProps {
  children: ReactNode;
  /** Tighter measure for guided flows */
  narrow?: boolean;
  className?: string;
}

export function CesPage({ children, narrow = false, className }: CesPageProps) {
  return (
    <div
      className={[
        "kxd-ces-page",
        narrow ? "kxd-ces-page--narrow" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
