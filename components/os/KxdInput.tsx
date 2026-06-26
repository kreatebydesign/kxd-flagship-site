import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { kxdOsCn } from "./utils";

export const KxdInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function KxdInput({ className, ...props }, ref) {
    return <input ref={ref} className={kxdOsCn("kxd-os-input", className)} {...props} />;
  },
);
