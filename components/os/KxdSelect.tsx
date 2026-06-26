import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { kxdOsCn } from "./utils";

export const KxdSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function KxdSelect({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={kxdOsCn("kxd-os-select", className)} {...props}>
        {children}
      </select>
    );
  },
);
