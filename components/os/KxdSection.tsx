import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdSection({
  label,
  description,
  children,
  className,
}: {
  label?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={kxdOsCn("kxd-os-section", className)}>
      {label && <p className="kxd-os-section__label">{label}</p>}
      {description && <p className="kxd-os-section__description">{description}</p>}
      {children}
    </section>
  );
}
