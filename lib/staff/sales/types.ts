import type { AttentionKind } from "@/lib/sales/attention";
import type { NextAction } from "@/lib/sales/next-action";

export type StaffSalesProspectRow = {
  id: number;
  companyName: string;
  contactName: string;
  email: string | null;
  status: string;
  statusLabel: string;
  nextAction: NextAction;
  nextActionLabel: string;
  nextFollowUp: string | null;
  attentionKind: AttentionKind | null;
  attentionLabel: string | null;
  updatedAt: string;
  href: string;
};

export type StaffSalesActivityRow = {
  id: number;
  activityType: string;
  title: string;
  summary: string | null;
  occurredAt: string;
};

export type StaffSalesListData = {
  prospects: StaffSalesProspectRow[];
  attention: StaffSalesProspectRow[];
  counts: {
    total: number;
    open: number;
    overdue: number;
    dueToday: number;
  };
  generatedAt: string;
};

export type StaffSalesDetailData = {
  prospect: StaffSalesProspectRow & {
    phone: string | null;
    website: string | null;
    opportunityUrl: string | null;
    industry: string | null;
    notes: string | null;
    nextActionNote: string | null;
    probability: number | null;
    createdAt: string;
    isOperatorControlled: boolean;
  };
  activities: StaffSalesActivityRow[];
  allowedNextActions: Array<{ value: NextAction; label: string }>;
  allowedStatuses: Array<{ value: string; label: string }>;
};
