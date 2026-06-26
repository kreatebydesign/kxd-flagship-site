import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { kxdOsCn } from "./utils";

export const KxdTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function KxdTextarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={kxdOsCn("kxd-os-textarea", className)} {...props} />;
});
