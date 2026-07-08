import type { ReactNode } from "react";

export interface CesFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

export function CesField({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
}: CesFieldProps) {
  const hintId = hint ? `${htmlFor ?? label}-hint` : undefined;
  const errorId = error ? `${htmlFor ?? label}-error` : undefined;

  return (
    <div className={`kxd-ces-field${error ? " kxd-ces-field--error" : ""}`}>
      <div className="kxd-ces-field__head">
        <label className="kxd-ces-field__label" htmlFor={htmlFor}>
          {label}
          {optional ? <span className="kxd-ces-field__optional">Optional</span> : null}
        </label>
      </div>
      <div
        className="kxd-ces-field__control"
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      >
        {children}
      </div>
      {hint ? (
        <p className="kxd-ces-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="kxd-ces-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
