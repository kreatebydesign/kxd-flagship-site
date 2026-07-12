"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "@/components/admin/operations/command-search";
import { ActivityCenter } from "@/components/admin/operations/activity";
import { QuickCaptureNote } from "@/components/admin/operations/strategy/QuickCaptureNote";
import { WorkComposerHost } from "@/components/admin/work/composer";
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
}: ExecutiveWorkspaceShellProps) {
  return (
    <WorkspaceMemoryProvider workspaceId={workspaceId}>
      <div className="kxd-exec-workspace">
        <ExecutiveHeader userLabel={userLabel} />
        <div className="kxd-exec-workspace__body">{children}</div>
        <CommandPalette />
        <ActivityCenter hideTrigger />
        <QuickCreateHost />
        <QuickCaptureNote defaultClientId={clientId} hideTrigger />
        {includeWorkComposer ? <WorkComposerHost /> : null}
      </div>
    </WorkspaceMemoryProvider>
  );
}
