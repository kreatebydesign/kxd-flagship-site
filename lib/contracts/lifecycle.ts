import type { ContractStatus } from "./types";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
  archived: "Archived",
};

export const UNSIGNED_CONTRACT_STATUSES: ContractStatus[] = ["draft", "sent", "viewed"];

export function displayContractStatus(status: string): string {
  return CONTRACT_STATUS_LABELS[status as ContractStatus] ?? status.replace(/-/g, " ");
}

export function isUnsignedContract(status: string): boolean {
  return UNSIGNED_CONTRACT_STATUSES.includes(status as ContractStatus);
}

export function statusToContractEvent(
  status: string,
  previousStatus?: string,
): string | null {
  if (status === previousStatus) return null;
  const map: Record<string, string> = {
    sent: "contract.sent",
    viewed: "contract.viewed",
    signed: "contract.signed",
    declined: "contract.declined",
    expired: "contract.expired",
    archived: "contract.archived",
  };
  return map[status] ?? null;
}
