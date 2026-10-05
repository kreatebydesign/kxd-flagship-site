export const PORTAL_ACCESS_MODES = ["client", "partner"] as const;
export type PortalAccessMode = (typeof PORTAL_ACCESS_MODES)[number];

export const PARTNER_VISIBILITY_STATES = [
  "submitted",
  "reviewing",
  "qualified",
  "discovery_booked",
  "proposal_in_motion",
  "won",
  "not_moving_forward",
] as const;

export type PartnerVisibilityState = (typeof PARTNER_VISIBILITY_STATES)[number];

export const PARTNER_VISIBILITY_LABELS: Record<PartnerVisibilityState, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  qualified: "Qualified",
  discovery_booked: "Discovery booked",
  proposal_in_motion: "Proposal in motion",
  won: "Won",
  not_moving_forward: "Not moving forward",
};

export const PARTNER_VISIBILITY_MEANINGS: Record<PartnerVisibilityState, string> = {
  submitted: "Your introduction is in. KXD will review it shortly.",
  reviewing: "KXD is reviewing fit. No action needed from you right now.",
  qualified: "This looks like a fit. Discovery is the natural next step.",
  discovery_booked: "A discovery session is on the calendar with KXD.",
  proposal_in_motion: "KXD is advancing a proposal. You do not manage the close.",
  won: "This introduction became a KXD client partnership.",
  not_moving_forward: "This opportunity is not moving forward right now.",
};

export type PartnerEarningType =
  | "project_commission"
  | "monthly_bonus"
  | "retention_kicker"
  | "performance_bonus"
  | "adjustment";

export const PARTNER_EARNING_TYPE_LABELS: Record<PartnerEarningType, string> = {
  project_commission: "Project commission",
  monthly_bonus: "Monthly bonus",
  retention_kicker: "Retention kicker",
  performance_bonus: "Performance bonus",
  adjustment: "Adjustment",
};

export type PartnerProfileRecord = {
  id: number;
  portalUserId: number;
  displayName: string;
  status: "active" | "inactive";
};

export type PartnerReferralSubmitInput = {
  businessName: string;
  contactName: string;
  contactRole?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagramSocial?: string;
  industry?: string;
  whatTheyWantMoreOf?: string;
  visibleProblemOpportunity?: string;
  whyNow?: string;
  decisionMakerConfirmed?: boolean;
  bestTimeForDiscoveryCall?: string;
  partnerNotes?: string;
};

export type PartnerReferralListItem = {
  id: number;
  businessName: string;
  contactName: string;
  industry: string | null;
  visibilityState: PartnerVisibilityState;
  visibilityLabel: string;
  submittedAt: string;
  nextCallAt: string | null;
};

export type PartnerNoteItem = {
  id: number;
  body: string;
  actorDisplayName: string;
  createdAt: string;
};

export type PartnerBookingSafeItem = {
  id: number;
  status: string;
  statusLabel: string;
  bookingMode: "request" | "calendar_slot";
  slotStart: string | null;
  slotEnd: string | null;
  timezone: string | null;
  businessName: string | null;
};

export type PartnerReferralDetail = {
  id: number;
  businessName: string;
  contactName: string;
  contactRole: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagramSocial: string | null;
  industry: string | null;
  whatTheyWantMoreOf: string | null;
  visibleProblemOpportunity: string | null;
  whyNow: string | null;
  decisionMakerConfirmed: boolean;
  bestTimeForDiscoveryCall: string | null;
  initialPartnerNotes: string | null;
  visibilityState: PartnerVisibilityState;
  visibilityLabel: string;
  visibilityMeaning: string;
  submittedAt: string;
  notes: PartnerNoteItem[];
  bookings: PartnerBookingSafeItem[];
  earnings: PartnerEarningListItem[];
};

export type PartnerEarningListItem = {
  id: number;
  earningType: PartnerEarningType;
  earningTypeLabel: string;
  relatedBusinessName: string;
  amountCents: number;
  paymentStatus: "approved" | "paid";
  paymentStatusLabel: string;
  relevantMonth: string | null;
  paidAt: string | null;
  relatedReferralId: number | null;
};

export type PartnerHomeSnapshot = {
  submittedLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
  wonClients: number;
  approvedEarningsCents: number;
  paidEarningsCents: number;
  nextAction: { label: string; href: string; hint: string };
};

export type PartnerBookingSubmitInput = {
  preferredTimes: string;
  notes?: string;
  relatedPartnerReferralId?: number;
};

export type PartnerSlotBookingInput = {
  relatedPartnerReferralId: number;
  slotStart: string;
  slotEnd: string;
  timezone: string;
  notes?: string;
};
