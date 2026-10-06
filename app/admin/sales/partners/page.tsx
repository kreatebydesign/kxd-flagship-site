import {
  loadNetworkCommandWorkspace,
  operatorGetPolicy,
} from "@/lib/portal/partner/operator";
import { selectNetworkCommandPartner } from "@/lib/portal/partner/network-command";
import { getGoogleCalendarConnectionStatus } from "@/lib/google/calendar";
import { NetworkCommandDesk } from "@/components/admin/sales/NetworkCommandDesk";
import "@/design-system/os/styles/kxd-network-command.css";

export const dynamic = "force-dynamic";

export default async function PartnerOperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  const params = await searchParams;
  const requestedId = /^\d+$/.test(params.partner ?? "")
    ? Number(params.partner)
    : null;

  const [workspace, policy] = await Promise.all([
    loadNetworkCommandWorkspace(),
    operatorGetPolicy(),
  ]);
  const calendar = getGoogleCalendarConnectionStatus();
  const selected = selectNetworkCommandPartner(workspace, requestedId);

  return (
    <NetworkCommandDesk
      workspace={workspace}
      selectedPartnerId={selected?.id ?? null}
      policy={{
        projectRateBps: policy.projectRateBps,
        monthlyRateBps: policy.monthlyRateBps,
        monthlyBonusMonths: policy.monthlyBonusMonths,
        retentionKickerEnabled: policy.retentionKickerEnabled,
        retentionKickerRateBps: policy.retentionKickerRateBps,
        retentionKickerMonth: policy.retentionKickerMonth,
        performanceBonusAmountCents: policy.performanceBonusAmountCents,
        performanceBonusProjectCount: policy.performanceBonusProjectCount,
        performanceBonusWindowDays: policy.performanceBonusWindowDays,
        eligibleRecurringServices: policy.eligibleRecurringServices.join("\n"),
      }}
      calendar={{
        configured: calendar.configured,
        connected: calendar.connected,
        writeEnabled: calendar.writeEnabled,
        missingEnv: calendar.missingEnv,
      }}
    />
  );
}
