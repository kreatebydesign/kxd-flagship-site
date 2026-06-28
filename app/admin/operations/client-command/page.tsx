/**
 * /admin/operations/client-command
 * KXD OS Phase 8A — Client Command Center hub
 */

import { ClientCommandHub } from "@/components/admin/operations/client-command/ClientCommandHub";
import { loadClientCommandHub } from "@/lib/client-command/hub";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ClientCommandHubPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const clients = await loadClientCommandHub(q);
  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return <ClientCommandHub clients={clients} query={q ?? ""} dateDisplay={dateDisplay} />;
}
