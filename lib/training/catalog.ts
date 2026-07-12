import type {
  TrainingLessonContent,
  TrainingLessonDefinition,
  TrainingPathDefinition,
} from "./types";

function frame(
  partial: Partial<TrainingLessonContent["operations"]> &
    Pick<
      TrainingLessonContent["operations"],
      "osAlreadyDoes" | "yourResponsibility" | "askIntelligenceWhen" | "escalateWhen"
    >,
): TrainingLessonContent["operations"] {
  return {
    successLooksLike: partial.successLooksLike ?? [],
    osAlreadyDoes: partial.osAlreadyDoes,
    yourResponsibility: partial.yourResponsibility,
    askIntelligenceWhen: partial.askIntelligenceWhen,
    escalateWhen: partial.escalateWhen,
  };
}

function content(
  partial: Partial<TrainingLessonContent> &
    Pick<TrainingLessonContent, "body" | "operations" | "walkthrough" | "checklist">,
): TrainingLessonContent {
  return {
    body: partial.body,
    walkthrough: partial.walkthrough,
    steps: partial.steps ?? [],
    operations: partial.operations,
    intelligencePrompts: partial.intelligencePrompts ?? [],
    examples: partial.examples ?? [],
    commonMistakes: partial.commonMistakes ?? [],
    bestPractices: partial.bestPractices ?? [],
    checklist: partial.checklist,
    resources: partial.resources ?? [],
    images: partial.images ?? [],
    knowledgeCheckPlaceholder: partial.knowledgeCheckPlaceholder ?? null,
    practiceTaskPlaceholder: partial.practiceTaskPlaceholder ?? null,
    operationalPractice: partial.operationalPractice ?? null,
  };
}

function lesson(partial: TrainingLessonDefinition): TrainingLessonDefinition {
  return partial;
}

/**
 * Phase 20G — Operational learning catalog.
 * Paths teach how to operate Kreate by Design *through* KXD OS.
 */
export const TRAINING_CATALOG: TrainingPathDefinition[] = [
  {
    slug: "welcome-to-kxd",
    title: "Welcome to KXD",
    summary: "Meet the studio, the operating system, and your role beside automation.",
    description:
      "Orientation for every future teammate. KXD OS does repetitive work. You provide judgment, verification, communication, and care.",
    estimatedMinutes: 40,
    sortOrder: 10,
    status: "published",
    audience: "Every new teammate",
    lessons: [
      lesson({
        slug: "welcome-orientation",
        title: "Welcome & posture",
        summary: "How KXD thinks — calm, premium, and human where it matters.",
        objective: "Describe what KXD OS owns vs what you own on day one.",
        estimatedMinutes: 12,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.welcome.orientation",
        workStage: "learn",
        content: content({
          body: `You are not here to replace the system. You are here to operate it with taste.

KXD OS remembers, tracks, and prepares. You verify, communicate, escalate wisely, and protect relationships.

Heather is the first Operations Coordinator on this path. The path is built for every future teammate.`,
          operations: frame({
            osAlreadyDoes: [
              "Holds client, work, and activity memory",
              "Surfaces briefs, queues, and status without asking you to rebuild context from scratch",
            ],
            yourResponsibility: [
              "Show up calmly and read the system before reacting",
              "Ask clear questions when something feels off",
              "Never invent status for a client",
            ],
            askIntelligenceWhen: [
              "I'm stuck on where to look",
              "Explain what this screen is for",
              "What should I do next?",
            ],
            escalateWhen: [
              "Client trust is at risk",
              "Money, legal, or access decisions are unclear",
              "You would need Matt's judgment to proceed",
            ],
            successLooksLike: [
              "You can say what the system does vs what you do in one calm sentence",
            ],
          }),
          walkthrough: [
            {
              title: "Open Operations Experience",
              detail: "This workspace is your operating guide inside KXD OS — not a separate manual.",
              href: "/admin/training",
              actionLabel: "Open Training home",
            },
            {
              title: "Open Morning Brief",
              detail: "See how the day orients without a status meeting.",
              href: "/admin/operations/brief",
              actionLabel: "Open Brief",
            },
            {
              title: "Return and mark the checklist",
              detail: "Completion means you could explain the posture to a teammate.",
              href: "/admin/training/welcome-to-kxd/welcome-orientation",
              actionLabel: "Back to lesson",
            },
          ],
          checklist: [
            { id: "posture", label: "Can explain OS vs human responsibility", required: true },
            { id: "brief-opened", label: "Opened Morning Brief once", required: true },
          ],
          resources: [
            { label: "Morning Brief", href: "/admin/operations/brief" },
            { label: "Work Engine", href: "/admin/work" },
          ],
          intelligencePrompts: [
            {
              id: "explain",
              label: "Explain this",
              prompt: "Explain the KXD posture: what the OS owns vs what I own.",
            },
            {
              id: "matt-style",
              label: "How would Matt handle this?",
              prompt: "How would Matt welcome a new Operations Coordinator on day one?",
            },
          ],
          practiceTaskPlaceholder:
            "Future: supervised orientation check-in work item for your mentor.",
          operationalPractice: {
            kind: "custom",
            title: "Orientation check-in",
            summary: "Confirm you can name OS vs human responsibilities.",
            practiceWorkKey: "ops.welcome.orientation",
            targetHref: "/admin/training",
          },
        }),
      }),
    ],
  },
  {
    slug: "how-kxd-operates",
    title: "How KXD Operates",
    summary: "The operating map — Brief, Work, Clients, Activity, Intelligence.",
    description: "A mental model of the studio so you never feel lost inside the system.",
    estimatedMinutes: 35,
    sortOrder: 20,
    status: "published",
    audience: "Operations",
    lessons: [
      lesson({
        slug: "operating-map",
        title: "The operating map",
        summary: "Name the surfaces you will use every day and why each exists.",
        objective: "Navigate KXD OS without hunting.",
        estimatedMinutes: 15,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.map.surfaces",
        workStage: "learn",
        content: content({
          body: `Complex underneath. Simple on top.

Brief orients. Work executes. Client Success protects relationships. Activity remembers what moved. Intelligence will mentor in context.`,
          operations: frame({
            osAlreadyDoes: [
              "Aggregates work, clients, and activity into calm surfaces",
              "Keeps a durable timeline of meaningful events",
            ],
            yourResponsibility: [
              "Start from the right surface before messaging anyone",
              "Update the system so the next person inherits truth",
            ],
            askIntelligenceWhen: [
              "Show me where client health lives",
              "Walk me through opening today's work",
            ],
            escalateWhen: ["You cannot find a source of truth after a careful look"],
            successLooksLike: ["You can point to Brief, Work, Client Success, and Activity by purpose"],
          }),
          walkthrough: [
            {
              title: "Open Work Engine",
              detail: "See what is waiting on the studio vs the client.",
              href: "/admin/work",
              actionLabel: "Open Work",
            },
            {
              title: "Open Client Success",
              detail: "Scan relationship health without inventing status.",
              href: "/admin/operations/client-success",
              actionLabel: "Open Client Success",
            },
            {
              title: "Open Activity from the sidebar",
              detail: "Notice what moved — editorial, not noisy.",
              href: "/admin/operations/intelligence",
              actionLabel: "Open Intelligence hub",
            },
          ],
          checklist: [
            { id: "named-map", label: "Can name Brief, Work, Client Success, Activity", required: true },
          ],
          resources: [
            { label: "Work Engine", href: "/admin/work" },
            { label: "Client Success", href: "/admin/operations/client-success" },
          ],
          practiceTaskPlaceholder: "Future: supervised map walkthrough checked by a mentor.",
          operationalPractice: {
            kind: "activity-review",
            title: "Review Executive Activity",
            summary: "Open Activity and note one meaningful movement.",
            practiceWorkKey: "ops.map.activity",
            targetHref: "/admin/operations/intelligence",
          },
        }),
      }),
    ],
  },
  {
    slug: "daily-operations",
    title: "Daily Operations",
    summary: "A calm daily rhythm — orient, execute, update, close.",
    description: "How an Operations Coordinator runs an ordinary excellent day.",
    estimatedMinutes: 40,
    sortOrder: 30,
    status: "published",
    audience: "Operations Coordinator",
    lessons: [
      lesson({
        slug: "daily-rhythm",
        title: "Daily rhythm",
        summary: "Orient → execute → update → close — without noise.",
        objective: "Run a day where the right things move and the system stays true.",
        estimatedMinutes: 14,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.daily.rhythm",
        workStage: "learn",
        content: content({
          body: `A strong day is not a busy day. It is a day where priorities are few, blockers are visible, and status is honest.`,
          operations: frame({
            osAlreadyDoes: [
              "Lists today's work and waiting states",
              "Keeps activity and notes for later recall",
            ],
            yourResponsibility: [
              "Choose a small set of outcomes",
              "Update Work before you leave",
              "Escalate early when stuck",
            ],
            askIntelligenceWhen: [
              "What should I do next?",
              "Help me prioritize today's Work queue",
            ],
            escalateWhen: [
              "A client deadline is at risk and you lack authority to decide",
            ],
            successLooksLike: ["Three outcomes chosen; Work statuses truthful at close"],
          }),
          walkthrough: [
            {
              title: "Open Brief",
              detail: "Orient before inbox gravity takes over.",
              href: "/admin/operations/brief",
              actionLabel: "Open Brief",
            },
            {
              title: "Open Work Engine",
              detail: "Identify waiting-on-client vs waiting-on-KXD.",
              href: "/admin/work",
              actionLabel: "Open Work",
            },
            {
              title: "Close cleanly",
              detail: "Leave one honest note for tomorrow's self.",
              href: "/admin/work",
              actionLabel: "Update Work",
            },
          ],
          checklist: [
            { id: "rhythm", label: "Can recite Orient → Execute → Update → Close", required: true },
          ],
          operationalPractice: {
            kind: "work-create",
            title: "Create a Work item",
            summary: "Practice opening a clear Work item with honest status.",
            practiceWorkKey: "ops.daily.work-create",
            targetHref: "/admin/work",
          },
          practiceTaskPlaceholder: "Future: supervised Work create + close exercise.",
        }),
      }),
    ],
  },
  {
    slug: "client-success",
    title: "Client Success",
    summary: "Protect relationships with evidence, not memory.",
    description: "How to read health, act with care, and never invent status.",
    estimatedMinutes: 45,
    sortOrder: 40,
    status: "published",
    audience: "Operations & Client Success",
    lessons: [
      lesson({
        slug: "client-success-walkthrough",
        title: "Client Success walkthrough",
        summary: "Open Client Success, read health, identify one recommendation, ask why it matters.",
        objective: "Use Client Success as the relationship source of truth.",
        estimatedMinutes: 18,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.cs.walkthrough",
        workStage: "learn",
        content: content({
          body: `Client Success is where relationship health becomes visible. You do not rebuild the story from email. You read the record, then act.`,
          operations: frame({
            osAlreadyDoes: [
              "Tracks client health signals and plans",
              "Surfaces work and timeline context per client",
            ],
            yourResponsibility: [
              "Review health calmly",
              "Identify one clear recommendation",
              "Communicate only from verified status",
            ],
            askIntelligenceWhen: [
              "Explain why this health signal matters",
              "What should I do next for this client?",
              "Check my recommendation before I send anything",
            ],
            escalateWhen: [
              "Health drop involves a sensitive relationship or commercial risk",
              "You are unsure whether to message the client",
            ],
            successLooksLike: [
              "One client reviewed; one recommendation noted; no invented status",
            ],
          }),
          walkthrough: [
            {
              title: "Open Client Success",
              detail: "Enter the portfolio view.",
              href: "/admin/operations/client-success",
              actionLabel: "Open Client Success",
            },
            {
              title: "Open one client",
              detail: "Prefer an active client such as Primal when available.",
              href: "/admin/operations/client-success",
              actionLabel: "Choose a client",
            },
            {
              title: "Review health",
              detail: "Read what the system already knows before forming an opinion.",
            },
            {
              title: "Identify one recommendation",
              detail: "Write it as a calm next step — not a panic list.",
            },
            {
              title: "Ask why it matters",
              detail: "Use Intelligence prompts on this lesson before you act.",
            },
            {
              title: "Mark complete",
              detail: "Only when you could explain the recommendation to Matt.",
            },
          ],
          checklist: [
            { id: "opened-cs", label: "Opened Client Success", required: true },
            { id: "one-rec", label: "Identified one evidence-bound recommendation", required: true },
          ],
          resources: [
            { label: "Client Success", href: "/admin/operations/client-success" },
          ],
          operationalPractice: {
            kind: "onboarding-check",
            title: "Review client health",
            summary: "Supervised review of one client's health and next step.",
            practiceWorkKey: "ops.cs.health-review",
            targetHref: "/admin/operations/client-success",
          },
          practiceTaskPlaceholder: "Future: supervised Client Success review work item.",
        }),
      }),
    ],
  },
  {
    slug: "work-engine",
    title: "Work Engine",
    summary: "Execution without chaos — status, waiting states, and honest updates.",
    description: "Operate the Work Engine so the studio always knows what is moving.",
    estimatedMinutes: 40,
    sortOrder: 50,
    status: "published",
    audience: "Operations",
    lessons: [
      lesson({
        slug: "work-engine-confidence",
        title: "Work Engine confidence",
        summary: "Open Work, read queues, update status with judgment.",
        objective: "Keep Work truthful — especially waiting-on-client vs waiting-on-KXD.",
        estimatedMinutes: 16,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.work.confidence",
        workStage: "learn",
        content: content({
          body: `Work Engine is where execution lives. Status is a promise to the team. Never leave silent blockers.`,
          operations: frame({
            osAlreadyDoes: [
              "Creates and tracks work items",
              "Records activity history and lifecycle events",
              "Groups today / waiting / upcoming",
            ],
            yourResponsibility: [
              "Start, wait, review, and complete with honest status",
              "Write notes a stranger could continue from",
            ],
            askIntelligenceWhen: [
              "Walk me through updating this work item",
              "Check my status choice before I save",
            ],
            escalateWhen: [
              "Work is blocked on a decision only Matt can make",
            ],
            successLooksLike: ["One work item reviewed; status matches reality"],
          }),
          walkthrough: [
            {
              title: "Open Work Engine",
              detail: "Scan Today's Work and waiting lanes.",
              href: "/admin/work",
              actionLabel: "Open Work",
            },
            {
              title: "Open one work item",
              detail: "Read detail, not just the title.",
            },
            {
              title: "Decide the true status",
              detail: "Waiting on client? Waiting on KXD? In review?",
            },
          ],
          checklist: [
            { id: "opened-work", label: "Opened Work Engine", required: true },
            { id: "status-truth", label: "Can explain waiting-on-client vs waiting-on-KXD", required: true },
          ],
          resources: [{ label: "Work Engine", href: "/admin/work" }],
          operationalPractice: {
            kind: "work-create",
            title: "Create or update a Work item",
            summary: "Supervised practice creating or correcting a work item.",
            practiceWorkKey: "ops.work.practice",
            targetHref: "/admin/work",
          },
          practiceTaskPlaceholder: "Future: supervised Work update exercise.",
        }),
      }),
    ],
  },
  {
    slug: "website-review",
    title: "Website Review",
    summary: "Review submissions with care — system tracks; you verify and guide.",
    description: "Operate Website Review so clients feel heard and work stays ordered.",
    estimatedMinutes: 40,
    sortOrder: 60,
    status: "published",
    audience: "Operations",
    lessons: [
      lesson({
        slug: "website-review-ops",
        title: "Website Review operations",
        summary: "Open Review Inbox, understand what the OS captured, verify before acting.",
        objective: "Triage a review without losing attachments, context, or tone.",
        estimatedMinutes: 16,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.review.triage",
        workStage: "learn",
        content: content({
          body: `Website Review is a hospitality workflow. The system captures the request. You verify completeness, route work, and communicate clearly.`,
          operations: frame({
            osAlreadyDoes: [
              "Accepts client review submissions and attachments",
              "Can spawn related work items",
              "Tracks review status through the inbox",
            ],
            yourResponsibility: [
              "Verify the request is complete",
              "Confirm the right work exists",
              "Communicate next steps without overpromising",
            ],
            askIntelligenceWhen: [
              "Walk me through this review",
              "Check my reply before I send it",
              "What should I do next?",
            ],
            escalateWhen: [
              "Scope has expanded beyond the agreement",
              "Tone suggests relationship risk",
            ],
            successLooksLike: ["One review opened; completeness verified; next step clear"],
          }),
          walkthrough: [
            {
              title: "Open Review Inbox",
              detail: "See what is waiting for studio attention.",
              href: "/admin/operations/review-inbox",
              actionLabel: "Open Review Inbox",
            },
            {
              title: "Open one review",
              detail: "Check attachments, notes, and linked work.",
            },
            {
              title: "Verify before acting",
              detail: "Completeness first — then route or reply.",
            },
          ],
          checklist: [
            { id: "opened-inbox", label: "Opened Review Inbox", required: true },
            { id: "verify", label: "Knows to verify completeness before promising timing", required: true },
          ],
          resources: [
            { label: "Review Inbox", href: "/admin/operations/review-inbox" },
          ],
          operationalPractice: {
            kind: "website-review",
            title: "Review a Website Revision",
            summary: "Supervised triage of one website review.",
            practiceWorkKey: "ops.review.practice",
            targetHref: "/admin/operations/review-inbox",
          },
          practiceTaskPlaceholder: "Future: supervised website review exercise.",
        }),
      }),
    ],
  },
  {
    slug: "billing-finance",
    title: "Billing & Finance",
    summary: "Verify money with care — the system prepares; you confirm.",
    description: "Invoice verification and billing review for Operations Coordinators.",
    estimatedMinutes: 35,
    sortOrder: 70,
    status: "published",
    audience: "Operations · Billing review",
    lessons: [
      lesson({
        slug: "invoice-verification",
        title: "Invoice verification",
        summary: "What the system generates vs what you must verify before anything leaves.",
        objective: "Verify an invoice path without inventing numbers.",
        estimatedMinutes: 14,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.billing.verify",
        workStage: "learn",
        content: content({
          body: `Money requires quiet precision. KXD OS can prepare proposals and financial views. You verify client, amounts, and timing before anything is trusted as final.`,
          operations: frame({
            osAlreadyDoes: [
              "Generates proposals and related financial records",
              "Tracks billing profiles and revenue events where configured",
            ],
            yourResponsibility: [
              "Verify client identity and amounts",
              "Flag mismatches early",
              "Never send financial messages from memory alone",
            ],
            askIntelligenceWhen: [
              "Explain this billing record",
              "Check this before I confirm anything",
            ],
            escalateWhen: [
              "Amounts disagree with the agreement",
              "A client disputes billing",
            ],
            successLooksLike: ["You know what to verify before treating an invoice as ready"],
          }),
          walkthrough: [
            {
              title: "Open Sales / proposals area",
              detail: "Find where proposals and billing artifacts live.",
              href: "/admin/sales",
              actionLabel: "Open Sales",
            },
            {
              title: "Note what you would verify",
              detail: "Client name, line items, dates, and status — without changing production data yet.",
            },
          ],
          checklist: [
            { id: "verify-list", label: "Can list three things to verify on an invoice", required: true },
          ],
          operationalPractice: {
            kind: "invoice-verify",
            title: "Verify a generated invoice",
            summary: "Supervised invoice verification checklist.",
            practiceWorkKey: "ops.billing.practice",
            targetHref: "/admin/sales",
          },
          practiceTaskPlaceholder: "Future: supervised invoice verification exercise.",
        }),
      }),
    ],
  },
  {
    slug: "google-workspace",
    title: "Google Workspace",
    summary: "Organize Drive and shared work so anyone can continue.",
    description: "Internal organization standards for files and shared spaces.",
    estimatedMinutes: 30,
    sortOrder: 80,
    status: "published",
    audience: "Operations",
    lessons: [
      lesson({
        slug: "drive-organization",
        title: "Drive organization",
        summary: "Naming, filing, and leaving a trail the studio can trust.",
        objective: "Organize assets so a teammate finds them in under a minute.",
        estimatedMinutes: 12,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.drive.organize",
        workStage: "learn",
        content: content({
          body: `If a teammate cannot find it quickly, the system of work failed — even if the file exists.`,
          operations: frame({
            osAlreadyDoes: [
              "Links work and client records inside KXD OS",
              "Holds notes and activity that point to artifacts",
            ],
            yourResponsibility: [
              "Name clearly",
              "File once",
              "Leave breadcrumbs in Work when relevant",
            ],
            askIntelligenceWhen: [
              "How should I name this?",
              "Where should this live?",
            ],
            escalateWhen: ["Access permissions involve client confidentiality questions"],
            successLooksLike: ["A clear naming pattern you can apply today"],
          }),
          walkthrough: [
            {
              title: "Review naming pattern",
              detail: "Client · artifact · date when useful.",
            },
            {
              title: "Note one cleanup",
              detail: "Identify one folder or file that would confuse a new teammate.",
            },
          ],
          checklist: [
            { id: "naming", label: "Can explain the studio naming pattern", required: true },
          ],
          operationalPractice: {
            kind: "drive-organize",
            title: "Organize Google Drive assets",
            summary: "Supervised Drive cleanup for one client folder.",
            practiceWorkKey: "ops.drive.practice",
          },
          practiceTaskPlaceholder: "Future: supervised Drive organization exercise.",
        }),
      }),
    ],
  },
  {
    slug: "internal-communication",
    title: "Internal Communication",
    summary: "Write like KXD — clear, warm, precise — inside the team.",
    description: "How Operations Coordinators communicate without noise or panic.",
    estimatedMinutes: 30,
    sortOrder: 90,
    status: "published",
    audience: "Everyone",
    lessons: [
      lesson({
        slug: "internal-voice",
        title: "Internal voice",
        summary: "Purpose, truth, next step — for teammates and mentors.",
        objective: "Draft an internal update Matt could trust at a glance.",
        estimatedMinutes: 12,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.comms.internal",
        workStage: "learn",
        content: content({
          body: `Internal communication is part of operations quality. Short paragraphs. Concrete next steps. No fluff.`,
          operations: frame({
            osAlreadyDoes: [
              "Stores notes, activity, and work context you can reference",
            ],
            yourResponsibility: [
              "State purpose",
              "Share verified truth",
              "Ask for one clear reply when needed",
            ],
            askIntelligenceWhen: [
              "Review before I send this",
              "Check my tone",
            ],
            escalateWhen: ["The message could affect a client relationship or commercial terms"],
            successLooksLike: ["A draft with purpose + truth + next step"],
          }),
          walkthrough: [
            {
              title: "Write a three-line update",
              detail: "Purpose. What moved. What you need.",
            },
            {
              title: "Ask Intelligence to review",
              detail: "Use the mentor prompts before you would send.",
            },
          ],
          checklist: [
            { id: "three-line", label: "Can write purpose · truth · next step", required: true },
          ],
          operationalPractice: {
            kind: "communications-review",
            title: "Review client or internal communication",
            summary: "Supervised review of a draft before send.",
            practiceWorkKey: "ops.comms.practice",
          },
          practiceTaskPlaceholder: "Future: supervised communication review exercise.",
        }),
      }),
    ],
  },
  {
    slug: "documentation-standards",
    title: "Documentation Standards",
    summary: "Leave records that reduce stress for the next person.",
    description: "How KXD documents decisions and operations without wiki bloat.",
    estimatedMinutes: 25,
    sortOrder: 100,
    status: "published",
    audience: "Operations",
    lessons: [
      lesson({
        slug: "documentation-quality",
        title: "Documentation quality",
        summary: "Evidence-bound notes beat long documents nobody reads.",
        objective: "Write an operational note that stands alone.",
        estimatedMinutes: 10,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.docs.quality",
        workStage: "learn",
        content: content({
          body: `Documentation in KXD is operational memory — short, linked, and true.`,
          operations: frame({
            osAlreadyDoes: [
              "Stores executive notes, activity, and work history",
            ],
            yourResponsibility: [
              "Capture decisions and blockers where the work lives",
              "Link instead of duplicating",
            ],
            askIntelligenceWhen: ["Help me compress this note", "What is missing?"],
            escalateWhen: ["A decision needs Matt's explicit approval recorded"],
            successLooksLike: ["A note with decision, context, and next step"],
          }),
          walkthrough: [
            {
              title: "Open Strategy / notes surface",
              detail: "See where institutional notes live.",
              href: "/admin/operations/strategy",
              actionLabel: "Open Strategy",
            },
          ],
          checklist: [
            { id: "note-shape", label: "Can name decision · context · next step", required: true },
          ],
          practiceTaskPlaceholder: "Future: supervised documentation exercise.",
          operationalPractice: {
            kind: "custom",
            title: "Write an operational note",
            summary: "Supervised note that a mentor can continue from.",
            practiceWorkKey: "ops.docs.practice",
            targetHref: "/admin/operations/strategy",
          },
        }),
      }),
    ],
  },
  {
    slug: "quality-control",
    title: "Quality Control",
    summary: "What “done” means — accuracy, clarity, system truth.",
    description: "Protect the KXD bar before anything is called complete.",
    estimatedMinutes: 30,
    sortOrder: 110,
    status: "published",
    audience: "Everyone",
    lessons: [
      lesson({
        slug: "definition-of-done",
        title: "Definition of done",
        summary: "Accuracy → clarity → system — then complete.",
        objective: "Apply the done checklist before marking work finished.",
        estimatedMinutes: 12,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.quality.done",
        workStage: "learn",
        content: content({
          body: `If Matt would hesitate to forward it, it is not done.`,
          operations: frame({
            osAlreadyDoes: [
              "Holds status and artifacts once you update them",
            ],
            yourResponsibility: [
              "Accuracy pass",
              "Clarity pass",
              "System pass — status matches reality",
            ],
            askIntelligenceWhen: [
              "Check my work",
              "I think I made a mistake",
            ],
            escalateWhen: ["Quality tradeoffs affect client delivery dates"],
            successLooksLike: ["You refuse to mark complete with silent gaps"],
          }),
          walkthrough: [
            {
              title: "Pick one open work item",
              detail: "Ask whether it would survive Accuracy → Clarity → System.",
              href: "/admin/work",
              actionLabel: "Open Work",
            },
          ],
          checklist: [
            { id: "three-passes", label: "Can recite Accuracy → Clarity → System", required: true },
          ],
          operationalPractice: {
            kind: "custom",
            title: "Quality review",
            summary: "Supervised done-check on one deliverable or work item.",
            practiceWorkKey: "ops.quality.practice",
            targetHref: "/admin/work",
          },
          practiceTaskPlaceholder: "Future: supervised quality review exercise.",
        }),
      }),
    ],
  },
  {
    slug: "privacy-security",
    title: "Privacy & Security",
    summary: "Protect clients, credentials, and studio trust.",
    description: "Non-negotiable habits for every role.",
    estimatedMinutes: 25,
    sortOrder: 120,
    status: "published",
    audience: "Everyone",
    lessons: [
      lesson({
        slug: "trust-basics",
        title: "Trust basics",
        summary: "Access, secrets, and what never leaves the studio.",
        objective: "Follow KXD security habits without exception.",
        estimatedMinutes: 10,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.security.basics",
        workStage: "learn",
        content: content({
          body: `Trust is the product underneath the product. When unsure, stop and ask.`,
          operations: frame({
            osAlreadyDoes: [
              "Gates admin surfaces behind authenticated access",
              "Keeps portal and internal worlds separate",
            ],
            yourResponsibility: [
              "Never share credentials in chat",
              "Minimize access",
              "Escalate suspected exposure immediately",
            ],
            askIntelligenceWhen: ["Is this safe to share?", "What should I do next?"],
            escalateWhen: ["Any suspected exposure or access mistake"],
            successLooksLike: ["You pause instead of guessing with secrets"],
          }),
          walkthrough: [
            {
              title: "Confirm this workspace is internal-only",
              detail: "Operations Experience is never portal-facing.",
              href: "/admin/training",
              actionLabel: "Confirm home",
            },
          ],
          checklist: [
            { id: "no-chat-secrets", label: "Commits to never sharing credentials in chat", required: true },
            { id: "escalate-fast", label: "Knows to escalate exposure immediately", required: true },
          ],
          practiceTaskPlaceholder: "Future: supervised access hygiene checklist.",
          operationalPractice: {
            kind: "custom",
            title: "Security hygiene check",
            summary: "Supervised confirmation of access habits.",
            practiceWorkKey: "ops.security.practice",
          },
        }),
      }),
    ],
  },
  {
    slug: "future-ai-workflows",
    title: "Future AI Workflows",
    summary: "Work alongside Intelligence — never replace judgment with automation theater.",
    description: "How Operations Coordinators will use KXD Intelligence as a mentor.",
    estimatedMinutes: 25,
    sortOrder: 130,
    status: "published",
    audience: "Everyone",
    lessons: [
      lesson({
        slug: "intelligence-as-mentor",
        title: "Intelligence as mentor",
        summary: "Explain · show · walk through · check · next — without feeling lost.",
        objective: "Know when to ask Intelligence vs when to escalate to Matt.",
        estimatedMinutes: 12,
        sortOrder: 10,
        status: "published",
        practiceWorkKey: "ops.ai.mentor",
        workStage: "learn",
        content: content({
          body: `KXD Intelligence becomes the permanent mentor inside operational pages. It does not replace Matt. It reduces loneliness and hesitation while you learn to operate.`,
          operations: frame({
            osAlreadyDoes: [
              "Will host contextual assistance on operational surfaces (future)",
              "Already holds the structured context Intelligence will need",
            ],
            yourResponsibility: [
              "Ask clear questions",
              "Verify suggestions before acting",
              "Escalate when judgment is truly founder-level",
            ],
            askIntelligenceWhen: [
              "Explain this",
              "Walk me through it",
              "Check my work",
              "Review before sending",
              "What should I do next?",
              "How would Matt normally handle this?",
            ],
            escalateWhen: [
              "Intelligence is unsure and client trust is involved",
              "The decision changes commercial or relationship posture",
            ],
            successLooksLike: [
              "You feel guided, not abandoned — and you still verify",
            ],
          }),
          walkthrough: [
            {
              title: "Open this lesson's mentor prompts",
              detail: "Practice choosing the right ask — AI arrives later; the habit starts now.",
            },
            {
              title: "Open Activity Center mindset",
              detail: "Notice how calm operational context will feed future mentoring.",
              href: "/admin/operations/intelligence",
              actionLabel: "Open Intelligence hub",
            },
          ],
          checklist: [
            { id: "ask-vs-escalate", label: "Can distinguish ask Intelligence vs escalate to Matt", required: true },
          ],
          intelligencePrompts: [
            {
              id: "explain",
              label: "Explain this",
              prompt: "Explain how I should use KXD Intelligence while operating day to day.",
            },
            {
              id: "matt-style",
              label: "How would Matt handle this?",
              prompt: "When should I stop asking Intelligence and escalate to Matt?",
            },
            {
              id: "next",
              label: "What should I do next?",
              prompt: "I understand the mentor model. What operational path should I continue next?",
            },
          ],
          practiceTaskPlaceholder: "Future: supervised Intelligence mentoring session.",
          operationalPractice: {
            kind: "proposal-review",
            title: "Review an AI proposal",
            summary: "Supervised review of an Intelligence-assisted draft.",
            practiceWorkKey: "ops.ai.proposal-review",
            targetHref: "/admin/sales/proposals",
          },
        }),
      }),
    ],
  },
];

export function getCatalogPath(slug: string): TrainingPathDefinition | null {
  return TRAINING_CATALOG.find((path) => path.slug === slug) ?? null;
}

export function getCatalogLesson(
  pathSlug: string,
  lessonSlug: string,
): TrainingPathDefinition["lessons"][number] | null {
  const path = getCatalogPath(pathSlug);
  if (!path) return null;
  return path.lessons.find((row) => row.slug === lessonSlug) ?? null;
}

export function listCatalogLessonsFlat(): Array<{
  pathSlug: string;
  pathTitle: string;
  lesson: TrainingPathDefinition["lessons"][number];
}> {
  return TRAINING_CATALOG.flatMap((path) =>
    path.lessons.map((row) => ({
      pathSlug: path.slug,
      pathTitle: path.title,
      lesson: row,
    })),
  );
}
