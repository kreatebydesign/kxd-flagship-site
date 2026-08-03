"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "@/components/admin/operations/command-search";
import { ActivityCenter } from "@/components/admin/operations/activity";
import { QuickCaptureNote } from "@/components/admin/operations/strategy/QuickCaptureNote";
import { WorkComposerHost } from "@/components/admin/work/composer";
import {
  KxdIntelligenceProvider,
  KxdIntelligenceWorkspace,
} from "@/components/os";
import type { ExecutiveWorkspaceId } from "@/lib/executive-workspace";
import { ExecutiveHeader } from "./ExecutiveHeader";
import { QuickCreateHost } from "./QuickCreateHost";
import { WorkspaceMemoryProvider } from "./WorkspaceMemoryProvider";

export interface ExecutiveWorkspaceShellProps {
  children: ReactNode;
  workspaceId?: ExecutiveWorkspaceId;
  userLabel?: string;
  clientId?: number;
  /** When false, omit WorkComposerHost (caller mounts with callbacks). */
  includeWorkComposer?: boolean;
  /** Mount global KXD Intelligence workspace (internal authenticated shell only). */
  includeIntelligence?: boolean;
}

/**
 * Permanent Executive Workspace environment.
 * Mount once per authenticated surface tree — hosts header + universal systems.
 */
export function ExecutiveWorkspaceShell({
  children,
  workspaceId,
  userLabel,
  clientId,
  includeWorkComposer = true,
  includeIntelligence = true,
}: ExecutiveWorkspaceShellProps) {
  const arrival = workspaceId === "today";

  const shell = (
    <div
      className={
        arrival ? "kxd-exec-workspace kxd-exec-workspace--arrival" : "kxd-exec-workspace"
      }
    >
      <ExecutiveHeader userLabel={userLabel} arrival={arrival} />
      <div className="kxd-exec-workspace__body">{children}</div>
      <CommandPalette />
      <ActivityCenter hideTrigger />
      <QuickCreateHost />
      <QuickCaptureNote defaultClientId={clientId} hideTrigger />
      {includeWorkComposer ? <WorkComposerHost /> : null}
      {includeIntelligence ? <KxdIntelligenceWorkspace /> : null}
    </div>
  );

  return (
    <WorkspaceMemoryProvider workspaceId={workspaceId}>
      {includeIntelligence ? (
        <KxdIntelligenceProvider>{shell}</KxdIntelligenceProvider>
      ) : (
        shell
      )}
    </WorkspaceMemoryProvider>
  );
}
