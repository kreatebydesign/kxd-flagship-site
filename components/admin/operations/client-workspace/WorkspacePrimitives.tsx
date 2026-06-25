import type { CSSProperties, ReactNode } from "react";
import { WORKSPACE_C } from "@/lib/executive-client-workspace/theme";

export function WorkspaceLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: WORKSPACE_C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function WorkspacePanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      style={{
        background: WORKSPACE_C.bgElevated,
        border: `1px solid ${WORKSPACE_C.border}`,
        padding: "1.375rem 1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "0.875rem",
        }}
      >
        <WorkspaceLabel>{title}</WorkspaceLabel>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WorkspaceProse({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: WORKSPACE_C.sans,
        fontSize: "0.875rem",
        fontWeight: 300,
        lineHeight: 1.75,
        color: WORKSPACE_C.creamMuted,
      }}
    >
      {children}
    </p>
  );
}

export function WorkspaceMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.625rem 0",
        borderBottom: `1px solid ${WORKSPACE_C.border}`,
      }}
    >
      <span style={{ fontFamily: WORKSPACE_C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: WORKSPACE_C.sans,
          fontSize: "0.8125rem",
          color: WORKSPACE_C.cream,
          textAlign: "right",
          maxWidth: "65%",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function WorkspaceEmpty({ message }: { message: string }) {
  return (
    <div
      style={{
        background: WORKSPACE_C.bgElevated,
        border: `1px solid ${WORKSPACE_C.border}`,
        padding: "1.5rem",
      }}
    >
      <WorkspaceProse>{message}</WorkspaceProse>
    </div>
  );
}

export function WorkspaceList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item) => (
        <li
          key={item}
          style={{
            display: "flex",
            gap: "0.625rem",
            padding: "0.5rem 0",
            borderBottom: `1px solid ${WORKSPACE_C.border}`,
          }}
        >
          <span style={{ color: WORKSPACE_C.gold, fontSize: "0.5rem", lineHeight: "1.5rem" }}>—</span>
          <WorkspaceProse>{item}</WorkspaceProse>
        </li>
      ))}
    </ul>
  );
}

export function WorkspaceKpiGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            background: WORKSPACE_C.bgElevated,
            border: `1px solid ${WORKSPACE_C.border}`,
            padding: "1.125rem 1.25rem",
          }}
        >
          <WorkspaceLabel>{kpi.label}</WorkspaceLabel>
          <p
            style={{
              fontFamily: WORKSPACE_C.serif,
              fontWeight: 300,
              fontSize: "1.375rem",
              color: WORKSPACE_C.cream,
              marginTop: "0.375rem",
              lineHeight: 1.1,
            }}
          >
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WorkspacePlaceholderBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: WORKSPACE_C.sans,
        fontSize: "0.5625rem",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: WORKSPACE_C.goldDim,
        border: `1px solid ${WORKSPACE_C.borderGold}`,
        padding: "0.2rem 0.5rem",
      }}
    >
      {label}
    </span>
  );
}
