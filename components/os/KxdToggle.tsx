"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdToggle({
  label,
  className,
  checked,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  return (
    <label className={kxdOsCn("kxd-os-toggle", className)}>
      <input type="checkbox" checked={checked} onChange={onChange} {...props} />
      <span className="kxd-os-toggle__track">
        <span className="kxd-os-toggle__thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}
