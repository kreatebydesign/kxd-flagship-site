/**
 * Client-facing portal language — hospitality, not software.
 */

export const PORTAL_CLIENT_LANGUAGE = {
  homeEyebrow: "Your workspace",
  homeWelcome: (name: string) => `Welcome back, ${name}`,
  homeLead: "Everything related to your website and creative work is organized here.",

  welcomeTitle: "Welcome.",
  welcomeWorkspaceLabel: "Private workspace",
  welcomeIntroWithBrand: (clientName: string) =>
    `Welcome to your private ${clientName} workspace.`,
  welcomeIntroNoBrand: "Welcome to your private workspace.",
  welcomeBody:
    "Everything related to your website, creative projects, revisions, and future initiatives now lives here.",
  welcomeClosingWithBrand: (clientName: string) =>
    `Focus on growing ${clientName}. We'll handle the rest.`,
  welcomeClosingNoBrand: "Focus on what matters most. We'll handle the rest.",
  welcomeStartReviewing: "Start reviewing",
  welcomeEnterWorkspace: "Enter workspace",
  welcomeOpening: "Starting review…",
  welcomeEntering: "Entering workspace…",
  welcomeError: "We couldn't open your workspace just now. Please try again.",

  revisionGoneTitle: "This revision is no longer available",
  revisionGoneLead:
    "It may have been removed or the link is no longer active. Your other revisions are still organized in Website Review.",
  revisionGoneCta: "Back to Website Review",

  attentionHeading: "Waiting on you",
  attentionEmpty: "Nothing waiting on you right now. Your site is in good hands.",
  happeningHeading: "In progress",
  nextHeading: "Website Review",
  focusEyebrow: "Website Review",
  focusReassurance: "Every creative update is tracked. Nothing gets lost.",
  viewAllRevisions: "View all revisions",

  reviewHeroTitle: "Website Review",
  reviewHeroLead:
    "Review your site, leave feedback, and follow every revision with clarity.",
  reviewCtaPrimary: "Start a revision",
  reviewCtaVisual: "Review visually",
  reviewCtaSecondary: "View live site",
  reviewActiveSection: "Active revisions",
  reviewCompletedSection: "Recently complete",
  reviewEmptyTitle: "Ready whenever inspiration strikes",
  reviewEmptyLead:
    "Every update you share will appear here — tracked, organized, and clear.",
  reviewEmptyCta: "Start a revision",

  reviewReassuranceLine1: "Every revision is tracked. Nothing gets lost.",
  reviewReassuranceLine2: "You'll always know what we're working on.",
  reviewEmptyGuideTitle: "Let's review your website together.",
  reviewEmptyGuideSteps: [
    "Open your site.",
    "Click anywhere.",
    "Tell us what you'd like to improve.",
  ] as const,
  reviewEmptyGuideClosing: "We'll take care of the rest.",

  requestEyebrow: "New revision",
  requestTitle: "Start a revision",
  requestLead: "Tell us what to change. Attach references if helpful — we handle the rest.",
  requestFocusIntro: "What would you like updated?",
  requestDetailsHint:
    "Be specific — current copy, what should change, or what you're seeing. The more context, the fewer back-and-forths.",
  requestLocationHint:
    "Pick a page and section so we go straight to the right place. Leave blank if it applies site-wide.",
  requestConfirmIntro: "Does this look right?",
  contextFromReviewUrl: "We pre-filled the page from your review link. Adjust anything before sending.",
  confirmTitle: "Thanks — we've got it.",
  confirmMessage:
    "Your revision is with us now. You'll see progress here as work moves forward.",
  confirmReferenceLabel: "Revision no.",
  submitError:
    "We couldn't send your revision just now. Please try again in a moment.",
  sendRevision: "Send revision",

  attachmentLabel: "Reference files",
  attachmentHint: "Screenshots, PDFs, or documents — up to 5 files, 10 MB each.",
  attachmentDropTitle: "Drop files here",
  attachmentDropLead: "Images, PDFs, and documents welcome",
  attachmentTypeError: "That file type isn't supported. Try an image, PDF, or document.",
  attachmentSizeError: "Files must be 10 MB or smaller.",
  attachmentLimitError: "You can attach up to 5 files per revision.",
  attachmentUploadError: "Upload didn't complete. Please try again.",

  detailReference: "Revision no.",
  detailProgress: "Progress",
  detailDetails: "Creative brief",
  detailAttachments: "Reference files",
  detailTimelineLead: "We'll update this as your revision moves forward.",
  detailTimelineReassurance: "You're in good hands — we'll reach out if we need anything else.",

  needsReview: "Needs your review",
  revisionComplete: "Revision complete",
  requestedUpdate: "Creative update",

  attentionTapHint: "Open revision",
  cardUpdated: (date: string) => date,

  loadingWorkspace: "Opening your workspace…",
  sendingRevision: "Sending your revision…",

  reviewSessionTitle: "Website Review",
  reviewSessionHintBrowse: "Browse freely — leave feedback when you're ready.",
  reviewSessionHintComment: "Click anywhere to place feedback.",
  reviewSessionCommentBanner: "Focused feedback — click anywhere on the page.",
  reviewSessionFabLabel: "Leave feedback",
  reviewSessionFabActiveLabel: "Commenting",
  reviewSessionExit: "Exit review",
  reviewSessionToolbarLabel: "Visual review",
  reviewSessionPageLabel: "Page",
  reviewSessionGo: "Go",
  reviewSessionIframeTitle: "Your website",
  reviewSessionParentContext: "Alongside",
  reviewSessionPopoverTitle: "Leave feedback",
  reviewSessionNewPin: "New feedback",
  reviewSessionPinLabel: "Pin",
  reviewSessionFieldTitle: "Revision title",
  reviewSessionFieldTitlePlaceholder: "What should change here?",
  reviewSessionFieldDetails: "Revision details",
  reviewSessionFieldDetailsPlaceholder:
    "Describe what you'd like updated — the more specific, the better.",
  reviewSessionFieldPriority: "Priority",
  reviewSessionSave: "Save feedback",
  reviewSessionCancel: "Cancel",
  reviewSessionClose: "Close",
  reviewSessionViewRevision: "View revision",
  reviewSessionTitleRequired: "Add a short title for this feedback.",
  reviewSessionDetailsRequired: "Add a few details so we know exactly what to change.",
  reviewSessionSaveError: "We couldn't save your feedback just now. Please try again.",
  reviewSessionUnavailableTitle: "Visual review isn't available yet",
  reviewSessionUnavailableLead:
    "We couldn't open a review session for this link. Your site URL may not be configured yet, or this revision may no longer be available.",
  reviewSessionBack: "Back to Website Review",

  identityWorkspace: "Private workspace",
} as const;

export function portalCopy(
  profileTerminology: Record<string, string> | undefined,
  key: string,
  fallback: string,
): string {
  return profileTerminology?.[key] ?? fallback;
}
