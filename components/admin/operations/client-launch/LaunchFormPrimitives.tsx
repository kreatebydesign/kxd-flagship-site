"use client";

import type { CSSProperties, ReactNode } from "react";
import { LAUNCH_C } from "@/lib/client-launch/constants";

export function LaunchFieldLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: LAUNCH_C.sans,
        fontWeight: 400,
        fontSize: "0.6875rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.35)",
        marginBottom: "0.5rem",
      }}
    >
      {children}
    </p>
  );
}

export const launchInputStyle: CSSProperties = {
  width: "100%",
  fontFamily: LAUNCH_C.sans,
  fontSize: "0.875rem",
  color: LAUNCH_C.cream,
  background: LAUNCH_C.bgElevated,
  border: `1px solid ${LAUNCH_C.border}`,
  padding: "0.75rem 0.875rem",
  outline: "none",
};

export const launchTextareaStyle: CSSProperties = {
  ...launchInputStyle,
  minHeight: "5.5rem",
  resize: "vertical",
};

export function LaunchField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.125rem" }}>
      <LaunchFieldLabel>{label}</LaunchFieldLabel>
      {children}
    </div>
  );
}

export function LaunchPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        background: LAUNCH_C.bgElevated,
        border: `1px solid ${LAUNCH_C.border}`,
        padding: "1.5rem 1.625rem",
      }}
    >
      <p
        style={{
          fontFamily: LAUNCH_C.sans,
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          marginBottom: "1.25rem",
        }}
      >
        {title}
      </p>
      {children}
    </section>
  );
}
