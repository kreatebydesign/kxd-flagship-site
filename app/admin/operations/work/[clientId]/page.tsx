/**
 * /admin/operations/work/[clientId]
 * KXD Core Phase 7H — Client work board
 */

import { notFound } from "next/navigation";
import { ClientWorkScreen } from "@/components/admin/operations/work/ClientWorkScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getClientWorkBoard } from "@/lib/client-tasks";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ clientId: string }> };

export default async function ClientWorkPage({
  params,
  searchParams,
}: Props & { searchParams: Promise<{ view?: string }> }) {
  await requirePayloadAdminPage();
  const { clientId: clientIdRaw } = await params;
  const clientId = Number(clientIdRaw);
  if (!Number.isFinite(clientId)) notFound();

  const board = await getClientWorkBoard(clientId);
  if (!board) notFound();

  const sp = await searchParams;

  return <ClientWorkScreen data={board} initialView={sp.view} />;
}
