export type ContractStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "declined"
  | "expired"
  | "archived";

export type ContractType =
  | "service-agreement"
  | "monthly-retainer"
  | "website-agreement"
  | "marketing-retainer"
  | "crm-agreement"
  | "consulting"
  | "custom";

export const CONTRACT_STATUSES: ContractStatus[] = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
  "archived",
];

export const CONTRACT_EVENT_TYPES = [
  "contract.created",
  "contract.sent",
  "contract.viewed",
  "contract.signed",
  "contract.declined",
  "contract.expired",
  "contract.archived",
] as const;

export type ContractEventType = (typeof CONTRACT_EVENT_TYPES)[number];

export interface ContractMergeContext {
  clientName: string;
  businessName: string;
  services: string;
  pricing: string;
  terms: string;
  startDate: string;
  monthlyAmount: string;
  projectAmount: string;
  executiveName: string;
}
