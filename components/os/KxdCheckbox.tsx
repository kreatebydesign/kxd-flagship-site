import type { InputHTMLAttributes, ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdCheckbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={kxdOsCn("kxd-os-check", className)}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
