import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <label className={kxdOsCn("kxd-os-label", className)}>{children}</label>;
}

export function KxdField({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={kxdOsCn("kxd-os-field", className)}>
      {label && <KxdLabel>{label}</KxdLabel>}
      {children}
    </div>
  );
}
