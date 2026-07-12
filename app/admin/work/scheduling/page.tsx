/**
 * /admin/work/scheduling
 * Phase 26B — Scheduling Proposal Workspace
 */

import { SchedulingWorkspaceClient } from "@/components/admin/work/scheduling/SchedulingWorkspaceClient";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { schedulingActorFromUser } from "@/lib/scheduling/actor";
import { listSchedulingProposals } from "@/lib/scheduling/proposals-list";
import {
  buildWorkspaceCapabilities,
  resolveSchedulingCapabilities,
} from "@/lib/scheduling";

export const dynamic = "force-dynamic";

export default async function SchedulingWorkspacePage() {
  const user = await requirePayloadAdminPage("/admin/work");
  const actor = schedulingActorFromUser(user);
  const capabilities = buildWorkspaceCapabilities(
    resolveSchedulingCapabilities(actor),
  );
  const { proposals } = await listSchedulingProposals({ limit: 100 });

  return (
    <SchedulingWorkspaceClient
      initialProposals={proposals}
      capabilities={capabilities}
      actor={{
        userId: actor.userId,
        email: actor.email ?? null,
        displayName: actor.displayName ?? null,
        role: actor.role ?? null,
      }}
    />
  );
}
