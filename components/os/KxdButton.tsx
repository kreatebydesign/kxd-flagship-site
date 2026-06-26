"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { kxdOsCn } from "./utils";

export type KxdButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type KxdButtonSize = "md" | "sm" | "icon";

export type KxdButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: KxdButtonVariant;
  size?: KxdButtonSize;
  loading?: boolean;
  children?: ReactNode;
};

export const KxdButton = forwardRef<HTMLButtonElement, KxdButtonProps>(
  function KxdButton(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    const variantClass =
      variant === "secondary"
        ? "kxd-os-btn--secondary"
        : variant === "ghost"
          ? "kxd-os-btn--ghost"
          : variant === "danger"
            ? "kxd-os-btn--danger"
            : "kxd-os-btn--primary";

    const sizeClass =
      size === "sm" ? "kxd-os-btn--sm" : size === "icon" ? "kxd-os-btn--icon" : "";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        className={kxdOsCn("kxd-os-btn", variantClass, sizeClass, className)}
        {...props}
      >
        {loading && <span className="kxd-os-btn__spinner" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
