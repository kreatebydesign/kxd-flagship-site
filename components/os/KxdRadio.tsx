import type { InputHTMLAttributes, ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdRadio({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={kxdOsCn("kxd-os-radio", className)}>
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}
