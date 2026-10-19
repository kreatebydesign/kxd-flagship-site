/**
 * Staff client workspace — assignment-scoped, no executive financials.
 */

import { notFound } from "next/navigation";
import { StaffClientWorkspaceScreen } from "@/components/admin/operations/staff/StaffClientWorkspaceScreen";
import { staffActorFromUser } from "@/lib/staff/actor";
import { loadStaffClientWorkspace } from "@/lib/staff/client-context/load";
import { requireOperatorClientPageAccess } from "@/lib/staff/operator-client-access";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
  requireStaffAwarePage,
} from "@/lib/staff";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function StaffClientWorkspacePage({ params }: PageProps) {
  const user = await requireStaffAwarePage("/admin/operations/staff/my-clients");
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) {
    notFound();
  }
  if (!actorHasStaffCapability(actor, "staff.client-context.limited")) {
    notFound();
  }

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!Number.isFinite(clientId) || clientId <= 0) notFound();

  await requireOperatorClientPageAccess(clientId);

  const data = await loadStaffClientWorkspace(actor, clientId);
  if (!data) notFound();

  return <StaffClientWorkspaceScreen data={data} />;
}
