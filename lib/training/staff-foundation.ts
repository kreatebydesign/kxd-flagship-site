/**
 * Executive Operations Coordinator — Foundation
 * Role-based learning path for Heather and every future ops teammate.
 */

import type { TrainingPathDefinition } from "@/lib/training/types";

function lesson(
  partial: TrainingPathDefinition["lessons"][number],
): TrainingPathDefinition["lessons"][number] {
  return partial;
}

function ops(frame: {
  osAlreadyDoes: string[];
  yourResponsibility: string[];
  askIntelligenceWhen: string[];
  escalateWhen: string[];
  successLooksLike?: string[];
}) {
  return {
    successLooksLike: frame.successLooksLike ?? [
      "You know what to do next without guessing",
      "You stayed inside your permission boundary",
    ],
    osAlreadyDoes: frame.osAlreadyDoes,
    yourResponsibility: frame.yourResponsibility,
    askIntelligenceWhen: frame.askIntelligenceWhen,
    escalateWhen: frame.escalateWhen,
  };
}

export const STAFF_FOUNDATION_PATH: TrainingPathDefinition = {
  slug: "executive-ops-foundation",
  title: "Executive Operations Coordinator — Foundation",
  summary:
    "The permanent first path for Heather and future KXD operations teammates.",
  description:
    "Learn how KXD works, what you may do independently, what always returns to Matt, and how KXD Intelligence guides real work without crossing approval boundaries.",
  estimatedMinutes: 180,
  sortOrder: 5,
  status: "published",
  audience: "Operations Coordinator track",
  lessons: [
    lesson({
      slug: "welcome-to-kxd-staff",
      title: "Welcome to KXD",
      summary: "Meet the studio and your role beside the operating system.",
      objective: "Describe KXD, KXD OS, and your responsibility on day one.",
      estimatedMinutes: 10,
      sortOrder: 10,
      status: "published",
      workStage: "learn",
      content: {
        body: `Kreate by Design is a premium creative studio. KXD OS is the business operating system that remembers work, clients, and context.

You are here to operate with care: verify, communicate, prepare, and escalate wisely. The system handles repetition. You protect relationships and quality.`,
        walkthrough: [
          {
            title: "Open your staff home",
            detail: "After login you land on a personalized home — not raw Payload admin.",
            href: "/admin/operations/staff",
            actionLabel: "Staff home",
          },
        ],
        steps: [],
        operations: ops({
          osAlreadyDoes: [
            "Holds client and work memory",
            "Surfaces assigned work and training progress",
          ],
          yourResponsibility: [
            "Show up calmly",
            "Follow Start here",
            "Never invent client status",
          ],
          askIntelligenceWhen: ["Explain this page", "What should I do next?"],
          escalateWhen: ["Client trust, money, access, or legal questions"],
        }),
        intelligencePrompts: [],
        examples: ["Start here is one button — not ten equal choices."],
        commonMistakes: ["Wandering the full navigation before finishing onboarding"],
        bestPractices: ["Read Start here before exploring"],
        checklist: [
          { id: "role", label: "I can explain my role in one sentence", required: true },
          { id: "home", label: "I know where staff home lives", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder:
          "In one sentence: what does KXD OS do vs what do you do?",
        practiceTaskPlaceholder: "Open staff home and find Start here.",
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "staff-workspace",
      title: "How your staff workspace works",
      summary: "Home, guided work, training, and asking for help.",
      objective: "Navigate staff home without needing the full OS map.",
      estimatedMinutes: 12,
      sortOrder: 20,
      status: "published",
      workStage: "learn",
      content: {
        body: `Your workspace is intentionally small at first: staff home, guided assignments, training, and settings.

You do not need to master every KXD OS screen to be productive.`,
        walkthrough: [
          {
            title: "Staff home sections",
            detail: "Welcome, Start here, daily plan, and guidance.",
            href: "/admin/operations/staff",
          },
        ],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Builds a deterministic daily plan from real assignments"],
          yourResponsibility: ["Follow the sequence", "Complete training when work is quiet"],
          askIntelligenceWhen: ["Walk me through this"],
          escalateWhen: ["You cannot find assigned work that Matt said exists"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Treating every sidebar link as required day-one reading"],
        bestPractices: ["One primary action at a time"],
        checklist: [
          { id: "sections", label: "I can name the staff home sections", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: "What are the four parts of staff home?",
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "security-confidentiality",
      title: "Security and confidentiality",
      summary: "Protect client and studio information.",
      objective: "List what must never be shared outside authorized channels.",
      estimatedMinutes: 12,
      sortOrder: 30,
      status: "published",
      workStage: "learn",
      content: {
        body: `Client details, pricing, credentials, dietary or relationship notes, and unpublished work are confidential.

Never paste secrets into public tools. Never share login links casually.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Keeps portal and admin auth separate"],
          yourResponsibility: [
            "Use only authorized systems",
            "Ask Matt before sharing sensitive material",
          ],
          askIntelligenceWhen: ["Is this safe to share?"],
          escalateWhen: ["Any credential, banking, or personal-sensitive data request"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Forwarding client threads to personal email"],
        bestPractices: ["When unsure, do not share — ask Matt"],
        checklist: [
          { id: "confidential", label: "I know what must stay confidential", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: "Name three things you must never share externally.",
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "independent-authority",
      title: "What you can do independently",
      summary: "Your safe day-one authority.",
      objective: "List independent actions vs approval-required actions.",
      estimatedMinutes: 10,
      sortOrder: 40,
      status: "published",
      workStage: "learn",
      content: {
        body: `Independently you may: view assigned work, update permitted records, prepare drafts, add internal notes, triage approved inbox items, propose schedules, complete training, and submit work for Matt's review.

You may not: send externally without approval, change plans or entitlements, execute financial transactions, finalize pricing, delete material records, or approve your own work.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Enforces server-side permission checks"],
          yourResponsibility: ["Stay inside the list", "Submit for review when unsure"],
          askIntelligenceWhen: ["Am I allowed to do this?"],
          escalateWhen: ["Any action not on the independent list"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Assuming navigation visibility equals permission"],
        bestPractices: ["If it changes money, access, or public content — prepare for Matt"],
        checklist: [
          { id: "independent", label: "I can list my independent actions", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: "Name two actions that always require Matt.",
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "always-requires-matt",
      title: "What always requires Matt",
      summary: "Approval boundaries you must not cross.",
      objective: "Recognize approval gates without hesitation.",
      estimatedMinutes: 10,
      sortOrder: 50,
      status: "published",
      workStage: "learn",
      content: {
        body: `Matt approves: external messages, upgrades, access/entitlements, pricing and agreements, money movement, public publishing, restricted scheduling, deletions, role changes, and production configuration.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Blocks many restricted mutations server-side"],
          yourResponsibility: ["Prepare packets", "Never bypass approval"],
          askIntelligenceWhen: ["Why does this require approval?"],
          escalateWhen: ["Anytime the boundary feels fuzzy"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Sending a 'quick' client reply to save time"],
        bestPractices: ["Draft → Check my work → Prepare for Matt"],
        checklist: [
          { id: "gates", label: "I can name the always-Matt categories", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "executive-today-assigned-work",
      title: "Executive Today and assigned work",
      summary: "How work appears and how you progress it.",
      objective: "Use staff home and guided work mode correctly.",
      estimatedMinutes: 12,
      sortOrder: 60,
      status: "published",
      workStage: "practice",
      content: {
        body: `Founder Executive Today is Matt's ritual surface. Your home is staff home — personalized to assignments and training.

Guided work mode walks one assignment at a time.`,
        walkthrough: [
          {
            title: "Open an assignment",
            detail: "From Start here, open guided work mode.",
            href: "/admin/operations/staff",
          },
        ],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Filters work assigned to you"],
          yourResponsibility: ["Update status honestly", "Do not complete without review"],
          askIntelligenceWhen: ["Check my work"],
          escalateWhen: ["Assignment seems wrong or missing context"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Marking complete to clear the queue"],
        bestPractices: ["One assignment fully through the checklist"],
        checklist: [
          { id: "guided", label: "I understand guided work mode", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: "Open staff home and identify Start here.",
        operationalPractice: {
          kind: "work-create",
          title: "Read an assigned item",
          summary: "Open guided work for an assigned item when available.",
          practiceWorkKey: "staff.foundation.assigned-work",
          targetHref: "/admin/operations/staff",
        },
      },
    }),
    lesson({
      slug: "client-records-docs",
      title: "Client records and documentation",
      summary: "Maintain accurate internal records.",
      objective: "Update permitted fields without inventing facts.",
      estimatedMinutes: 12,
      sortOrder: 70,
      status: "published",
      workStage: "learn",
      content: {
        body: `Documentation should be calm, factual, and dated. If you do not know, say so and ask.

Never invent history to make a record look complete.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Stores client memory and activity"],
          yourResponsibility: ["Write clear notes", "Cite sources"],
          askIntelligenceWhen: ["What information is missing?"],
          escalateWhen: ["Conflicting client facts"],
        }),
        intelligencePrompts: [],
        examples: ["Note: Confirmed parking address with client email on file — Jul 24."],
        commonMistakes: ["Filling gaps with assumptions"],
        bestPractices: ["Facts only; questions separately"],
        checklist: [
          { id: "docs", label: "I will not invent missing client facts", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "website-review-inbox",
      title: "Website Review and Review Inbox",
      summary: "Intake and triage without over-approving.",
      objective: "Triage review items and prepare clear next steps.",
      estimatedMinutes: 14,
      sortOrder: 80,
      status: "published",
      workStage: "practice",
      content: {
        body: `Website Review is a client collaboration surface. Review Inbox is the operator queue.

Your job is careful intake and preparation — not silent approval of risky changes.`,
        walkthrough: [
          {
            title: "Review Inbox",
            detail: "Open only when assigned or during supervised practice.",
            href: "/admin/operations/review-inbox",
          },
        ],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Tracks review requests and revisions"],
          yourResponsibility: ["Triage clearly", "Escalate ambiguous client asks"],
          askIntelligenceWhen: ["Explain this page"],
          escalateWhen: ["Scope, pricing, or access changes appear inside a review"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Closing items without documenting why"],
        bestPractices: ["Capture the ask in plain language first"],
        checklist: [
          { id: "review", label: "I know Review Inbox is assignment-gated for me", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: {
          kind: "website-review",
          title: "Supervised review triage",
          summary: "Practice triage with Matt before independent inbox work.",
          practiceWorkKey: "staff.foundation.website-review",
          targetHref: "/admin/operations/review-inbox",
        },
      },
    }),
    lesson({
      slug: "communications-drafting",
      title: "Communications drafting",
      summary: "Draft with warmth; send only with approval.",
      objective: "Prepare a client-ready draft for Matt.",
      estimatedMinutes: 12,
      sortOrder: 90,
      status: "published",
      workStage: "practice",
      content: {
        body: `Tone: calm, clear, human. No hype. No promises Matt did not approve.

Label AI-assisted drafts. Review every line before submitting for approval.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Stores communication history"],
          yourResponsibility: ["Draft", "Check", "Submit for Matt — do not send alone"],
          askIntelligenceWhen: ["Prepare the first draft", "Show me an example"],
          escalateWhen: ["Anything contractual or emotional escalation"],
        }),
        intelligencePrompts: [],
        examples: ["Draft subject + body with 'Needs Matt approval' at the top."],
        commonMistakes: ["Sending from personal email"],
        bestPractices: ["One ask per message"],
        checklist: [
          { id: "no-send", label: "I will not send externally without approval", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: "Write a 4-sentence draft and mark it for Matt.",
        operationalPractice: {
          kind: "communications-review",
          title: "Draft for approval",
          summary: "Prepare a draft communication packet.",
          practiceWorkKey: "staff.foundation.comms",
          targetHref: "/admin/operations/staff",
        },
      },
    }),
    lesson({
      slug: "upgrade-inbox-approval",
      title: "Upgrade Inbox and approval-versus-access",
      summary: "Prepare upgrades; never grant access alone.",
      objective: "Separate preparation from entitlement changes.",
      estimatedMinutes: 12,
      sortOrder: 100,
      status: "published",
      workStage: "learn",
      content: {
        body: `Upgrade requests may be triaged and summarized. Approving access or changing entitlements is Matt's authority.`,
        walkthrough: [
          {
            title: "Upgrade requests",
            detail: "View when assigned — prepare summaries only.",
            href: "/admin/operations/upgrade-requests",
          },
        ],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Tracks upgrade request status"],
          yourResponsibility: ["Summarize the ask", "Never flip entitlements"],
          askIntelligenceWhen: ["Why does this require approval?"],
          escalateWhen: ["Any access grant decision"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Treating triage as approval"],
        bestPractices: ["Write: Requested module, reason, risk, recommendation for Matt"],
        checklist: [
          { id: "no-entitle", label: "I will not change entitlements", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "scheduling-proposals",
      title: "Scheduling proposals",
      summary: "Suggest times; founders approve restricted writes.",
      objective: "Propose schedules without writing restricted calendar events.",
      estimatedMinutes: 12,
      sortOrder: 110,
      status: "published",
      workStage: "practice",
      content: {
        body: `You may suggest. Matt (or admin) approves restricted and external scheduling writes.

Never invent availability.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Scheduling capability model: suggest vs approve"],
          yourResponsibility: ["Propose clearly", "Wait for approval when required"],
          askIntelligenceWhen: ["Suggest scheduling options"],
          escalateWhen: ["Client-facing meeting commitments"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Confirming a meeting before approval"],
        bestPractices: ["Offer 2–3 options with timezone"],
        checklist: [
          { id: "suggest-only", label: "I understand suggest vs approve", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "onboarding-launch-wizard",
      title: "Client onboarding and Launch Wizard",
      summary: "Coordinate onboarding without inventing readiness.",
      objective: "Assist Launch Wizard checklists under supervision.",
      estimatedMinutes: 14,
      sortOrder: 120,
      status: "published",
      workStage: "practice",
      content: {
        body: `Onboarding and Launch Wizard are high-trust workflows. Prepare checklists and missing-info lists. Do not declare a client launched alone.`,
        walkthrough: [
          {
            title: "Launch Wizard",
            detail: "Open when assigned for coordination support.",
            href: "/admin/operations/clients/launch",
          },
        ],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Tracks launch readiness stages"],
          yourResponsibility: ["Gather missing inputs", "Coordinate with Matt"],
          askIntelligenceWhen: ["Prepare an onboarding checklist"],
          escalateWhen: ["Go-live decisions"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Marking stages complete without evidence"],
        bestPractices: ["Evidence links or notes on every checkbox"],
        checklist: [
          { id: "launch", label: "I will not declare launch alone", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: {
          kind: "onboarding-check",
          title: "Onboarding checklist assist",
          summary: "Prepare a missing-info list for a launch draft.",
          practiceWorkKey: "staff.foundation.launch",
          targetHref: "/admin/operations/clients/launch",
        },
      },
    }),
    lesson({
      slug: "billing-invoice-verification",
      title: "Billing and invoice verification",
      summary: "Verify carefully; never move money.",
      objective: "Prepare an invoice verification summary for Matt.",
      estimatedMinutes: 14,
      sortOrder: 130,
      status: "published",
      workStage: "practice",
      content: {
        body: `You may verify line items against agreements and note discrepancies. You may not charge, refund, transfer, or pay.

Financial command stays founder/admin authority.`,
        walkthrough: [],
        steps: [],
        operations: ops({
          osAlreadyDoes: ["Stores commercial and billing records"],
          yourResponsibility: ["Compare facts", "Write a clear discrepancy list"],
          askIntelligenceWhen: ["Prepare invoice verification summary"],
          escalateWhen: ["Any payment or exception decision"],
        }),
        intelligencePrompts: [],
        examples: ["Verified: Plan X vs invoice Y — mismatch on addon Z."],
        commonMistakes: ["Approving an invoice verbally to a client"],
        bestPractices: ["Numbers + source of truth + question for Matt"],
        checklist: [
          { id: "no-money", label: "I will not execute financial transactions", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: {
          kind: "invoice-verify",
          title: "Invoice verification packet",
          summary: "Prepare a verification summary without mutating billing.",
          practiceWorkKey: "staff.foundation.invoice",
          targetHref: "/admin/operations/staff",
        },
      },
    }),
    lesson({
      slug: "prepare-for-matt",
      title: "Preparing work for Matt's approval",
      summary: "Build clean approval packets.",
      objective: "Submit a packet Matt can decide in under two minutes.",
      estimatedMinutes: 10,
      sortOrder: 140,
      status: "published",
      workStage: "practice",
      content: {
        body: `A good packet: what was asked, what you did, evidence, risks, and the exact decision needed.

No novels. No missing ask.`,
        walkthrough: [],
        steps: [
          { title: "State the ask", detail: "One sentence." },
          { title: "Show evidence", detail: "Links or notes." },
          { title: "Name the decision", detail: "Approve / return / clarify." },
        ],
        operations: ops({
          osAlreadyDoes: ["Tracks review status on work items"],
          yourResponsibility: ["Write the packet", "Submit for review"],
          askIntelligenceWhen: ["Help me prepare this for Matt"],
          escalateWhen: ["You cannot name the decision needed"],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Submitting without a clear ask"],
        bestPractices: ["Decision line at the top"],
        checklist: [
          { id: "packet", label: "I can build a two-minute approval packet", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: null,
        operationalPractice: null,
      },
    }),
    lesson({
      slug: "supervised-dry-runs",
      title: "Three supervised operational dry runs",
      summary: "Practice with Matt before independent live work.",
      objective: "Complete three supervised dry runs with feedback.",
      estimatedMinutes: 30,
      sortOrder: 150,
      status: "published",
      workStage: "review",
      content: {
        body: `Dry runs prove readiness: one communications draft, one verification summary, and one intake triage — each reviewed by Matt.

Do not fabricate completion. Progress only when Matt confirms.`,
        walkthrough: [],
        steps: [
          { title: "Dry run A", detail: "Communications draft for approval." },
          { title: "Dry run B", detail: "Invoice or record verification summary." },
          { title: "Dry run C", detail: "Review or upgrade intake summary." },
        ],
        operations: ops({
          osAlreadyDoes: ["Tracks training progress"],
          yourResponsibility: ["Complete dry runs honestly", "Incorporate feedback"],
          askIntelligenceWhen: ["Check my work"],
          escalateWhen: ["You are unsure whether a dry run is complete"],
          successLooksLike: [
            "Three dry runs reviewed by Matt",
            "Feedback incorporated",
            "Ready for supervised live assignments",
          ],
        }),
        intelligencePrompts: [],
        examples: [],
        commonMistakes: ["Self-marking dry runs complete"],
        bestPractices: ["Ask Matt for explicit dry-run approval"],
        checklist: [
          { id: "a", label: "Dry run A reviewed by Matt", required: true },
          { id: "b", label: "Dry run B reviewed by Matt", required: true },
          { id: "c", label: "Dry run C reviewed by Matt", required: true },
        ],
        resources: [],
        images: [],
        knowledgeCheckPlaceholder: null,
        practiceTaskPlaceholder: "Schedule three dry runs with Matt.",
        operationalPractice: {
          kind: "custom",
          title: "Supervised dry runs",
          summary: "Complete three Matt-reviewed practice packets.",
          practiceWorkKey: "staff.foundation.dry-runs",
          targetHref: "/admin/operations/staff",
        },
      },
    }),
  ],
};
