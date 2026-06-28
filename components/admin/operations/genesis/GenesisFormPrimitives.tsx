"use client";

import type { ReactNode } from "react";
import { KxdField, KxdLabel, KxdSection, KxdSurface } from "@/components/os";

export function GenesisFieldLabel({ children }: { children: ReactNode }) {
  return <KxdLabel>{children}</KxdLabel>;
}

export function GenesisField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return <KxdField label={label}>{children}</KxdField>;
}

export function GenesisPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <KxdSurface variant="panel" className="kxd-os-ops-workflow-panel">
      <KxdSection label={title}>{children}</KxdSection>
    </KxdSurface>
  );
}
