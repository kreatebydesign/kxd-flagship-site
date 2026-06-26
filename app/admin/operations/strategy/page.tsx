import { StrategyVaultScreen } from "@/components/admin/operations/strategy/StrategyVaultScreen";
import { getStrategyVaultData } from "@/lib/executive-notes/vault";
import type { VaultView } from "@/lib/executive-notes";

export const dynamic = "force-dynamic";

const VALID_VIEWS = new Set<VaultView>([
  "all",
  "by-client",
  "pinned",
  "recent",
  "reminders",
  "opportunities",
  "research",
  "search",
]);

export default async function StrategyVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; client?: string; q?: string }>;
}) {
  const params = await searchParams;
  const view = VALID_VIEWS.has(params.view as VaultView)
    ? (params.view as VaultView)
    : "all";
  const clientId = params.client ? Number(params.client) : undefined;
  const q = params.q?.trim() || undefined;

  const data = await getStrategyVaultData({ view, clientId, q });

  return (
    <StrategyVaultScreen
      data={data}
      activeView={view}
      searchQuery={q}
      clientId={clientId}
    />
  );
}
