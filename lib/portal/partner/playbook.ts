export type PartnerPlaybookSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  pullQuote?: string;
  /** Visual treatment only — does not change meaning. */
  treatment?: "default" | "scripts" | "objections" | "checklist" | "commission";
};

export const PARTNER_COMPENSATION = {
  projectShare: "10% of collected project revenue for a lead you sourced.",
  retainerShare:
    "10% of any paid monthly care/growth retainer for the first 3 paid months.",
  approvalRule:
    "Earnings appear in My Earnings only after KXD internally approves them.",
  controlRule:
    "Partners cannot alter commissions, project values, statuses, or payout records.",
} as const;

export const PARTNER_PLAYBOOK_SECTIONS: PartnerPlaybookSection[] = [
  {
    id: "the-role",
    title: "The role",
    pullQuote: "You open the right doors. KXD owns the close.",
    treatment: "checklist",
    paragraphs: [
      "Your job is to open the right doors — not to sell KXD work.",
      "Find businesses that deserve a stronger digital presence, start a warm conversation, submit the opportunity, and book KXD into a real discovery call.",
    ],
    bullets: [
      "Find good-fit businesses",
      "Open the conversation with clarity",
      "Submit the opportunity here",
      "Book Matt / KXD when the timing is real",
    ],
  },
  {
    id: "what-kxd-sells",
    title: "What KXD sells",
    pullQuote: "Selective work. Real craft. Long partnerships.",
    treatment: "checklist",
    paragraphs: [
      "Kreate by Design builds premium websites, Growth Systems, and operating systems for ambitious businesses.",
      "The work is selective: credibility and long-term partnership over volume marketing.",
    ],
    bullets: [
      "Premium websites and digital presence",
      "Growth Systems and performance architecture",
      "Ongoing care and growth retainers when the fit is right",
      "Precise execution without the noise",
    ],
  },
  {
    id: "who-to-target",
    title: "Who to target",
    treatment: "checklist",
    paragraphs: [
      "Look for businesses that already have momentum — and a visible gap between how good they are and how they show up digitally.",
    ],
    bullets: [
      "Owner-operated or leadership-driven companies",
      "Clear offer and real customers already in motion",
      "Website or digital presence that underrepresents the business",
      "Industries where credibility and presentation matter",
    ],
  },
  {
    id: "qualification-signals",
    title: "Qualification signals",
    pullQuote: "A good lead is not every conversation.",
    treatment: "checklist",
    paragraphs: [
      "Submit opportunities that show seriousness, timing, and a decision path.",
    ],
    bullets: [
      "A real decision maker is available",
      "There is a visible problem or opportunity",
      "There is a reason this matters now",
      "They are open to a discovery conversation with KXD",
    ],
  },
  {
    id: "conversation-scripts",
    title: "Conversation scripts",
    treatment: "scripts",
    paragraphs: [
      "Keep it human. You are opening a door, not pitching a package.",
    ],
    bullets: [
      "I’ve been working with Kreate by Design — they build premium websites and Growth Systems for businesses that care about how they show up.",
      "If you’re open to it, I can introduce you to Matt for a short discovery call — no pressure, just clarity on fit.",
      "What would make the next twelve months feel more solid on the digital side?",
    ],
  },
  {
    id: "objections",
    title: "Objections",
    treatment: "objections",
    paragraphs: [
      "Stay steady. Do not negotiate price or invent scope. Offer the discovery call when interest is real.",
    ],
    bullets: [
      "“We’re not ready.” → Ask what would make timing clearer, then leave the door open.",
      "“We already have a website.” → Agree — then ask whether it reflects the business they are becoming.",
      "“What does it cost?” → “That depends on fit. A short discovery call with KXD is the cleanest next step.”",
    ],
  },
  {
    id: "lead-handoff",
    title: "Lead handoff",
    treatment: "checklist",
    paragraphs: [
      "Once interest is real, submit the lead here with clean context. Then book KXD into the call.",
      "After handoff, KXD owns qualification, the close, delivery, and final commission decisions. Your visibility states are updates — not an invitation to manage the sale.",
    ],
    bullets: [
      "Submit with clear business + contact context",
      "Note the opportunity and why now",
      "Book KXD in when discovery is real",
      "Stay available for useful follow-up notes",
    ],
  },
  {
    id: "commission-structure",
    title: "Commission structure",
    treatment: "commission",
    paragraphs: [
      PARTNER_COMPENSATION.projectShare,
      PARTNER_COMPENSATION.retainerShare,
      PARTNER_COMPENSATION.approvalRule,
      PARTNER_COMPENSATION.controlRule,
    ],
  },
];
