import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { kxdOsCn } from "./utils";

export const KxdSearch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function KxdSearch({ className, type = "search", ...props }, ref) {
    return (
      <div className="kxd-os-search-wrap">
        <svg
          className="kxd-os-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={ref}
          type={type}
          className={kxdOsCn("kxd-os-input", className)}
          {...props}
        />
      </div>
    );
  },
);
