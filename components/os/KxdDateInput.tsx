import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { kxdOsCn } from "./utils";

export const KxdDateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function KxdDateInput({ className, type = "date", ...props }, ref) {
    return (
      <input ref={ref} type={type} className={kxdOsCn("kxd-os-input", className)} {...props} />
    );
  },
);
