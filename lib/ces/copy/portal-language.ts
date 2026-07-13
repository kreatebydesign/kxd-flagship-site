/**
 * Client-facing portal language — hospitality, not software.
 */

export const PORTAL_CLIENT_LANGUAGE = {
  homeEyebrow: "Your workspace",
  primalWorkspaceLabel: "Primal Workspace",
  homeWelcome: (name: string) => `Welcome back, ${name}`,
  homeLead:
    "Everything Kreate by Design is actively delivering, planning, and recommending for your partnership.",

  launchEyebrow: "Getting started",
  launchTitle: "What to do first",
  launchLead:
    "Your workspace is ready. Here is the clearest path to share website feedback with us.",
  launchLeadActive:
    "Keep momentum going — review your site, submit notes, and track every revision here.",
  launchSteps: [
    "Open your website and review the pages that matter most.",
    "Submit feedback through Website Review — notes, screenshots, or both.",
    "Attach references if they help explain what you'd like changed.",
    "We'll review your feedback and keep you updated here.",
  ] as const,

  statActiveRevisions: "Active revisions",
  statAwaitingYou: "Waiting on you",
  statCurrentReview: "Current review",
  statAllClear: "You're all caught up.",
  currentStatusHeading: "Current review status",
  openRevision: "Open this revision",
  openLatestRevision: "Open latest revision",
  recentRevisionsHeading: "Recent revisions",
  moduleActiveCount: (count: number) =>
    count === 1 ? "1 revision in progress" : `${count} revisions in progress`,

  welcomeTitle: "Welcome to your workspace",
  welcomeWorkspaceLabel: "Your collaboration space",
  welcomeIntroWithBrand: (clientName: string) =>
    `This is where ${clientName} reviews website progress with our team.`,
  welcomeIntroNoBrand: "This is where you review website progress with our team.",
  welcomePurposeHeading: "What you can do here",
  welcomePurposeSteps: [
    "Review your live website and leave feedback where it matters.",
    "Submit revision requests with clear notes and screenshots.",
    "Track progress as updates move forward — nothing gets lost.",
  ] as const,
  welcomeBody:
    "This is your professional collaboration workspace — not a generic dashboard. Every website update is organized here.",
  welcomeClosingWithBrand: (clientName: string) =>
    `Focus on ${clientName}. We'll handle the rest.`,
  welcomeClosingNoBrand: "Focus on what matters most. We'll handle the rest.",
  welcomeStartReviewing: "Review your website",
  welcomeEnterWorkspace: "Go to workspace",
  welcomeOpening: "Opening review…",
  welcomeEntering: "Opening workspace…",
  welcomeError: "We couldn't open your workspace just now. Please try again.",

  revisionGoneTitle: "This revision is no longer available",
  revisionGoneLead:
    "It may have been removed or the link is no longer active. Your other revisions are still organized in Website Review.",
  revisionGoneCta: "Back to Website Review",

  attentionHeading: "Waiting on you",
  attentionEmpty: "You're all caught up. Your site is in good hands.",
  happeningHeading: "In progress",
  nextHeading: "Website Review",
  focusEyebrow: "Website Review",
  focusReassurance: "Every creative update is tracked. Nothing gets lost.",
  viewAllRevisions: "View all revisions",

  reviewHeroTitle: "Website Review",
  reviewHeroLead:
    "Review the site, leave precise feedback, and follow every revision with clarity.",
  reviewCtaPrimary: "Start a revision",
  reviewCtaVisual: "Review visually",
  reviewCtaSecondary: "View live site",
  reviewActiveSection: "Active revisions",
  reviewCompletedSection: "Recently complete",
  reviewEmptyTitle: "No updates yet",
  reviewEmptyLead:
    "Submit your first website review request and we'll organize every update here.",
  reviewEmptyCta: "Start a revision",

  reviewReassuranceLine1: "Every revision is tracked. Nothing gets lost.",
  reviewReassuranceLine2: "You'll always know what we're working on.",
  reviewEmptyGuideTitle: "Ready when you are.",
  reviewEmptyGuideSteps: [
    "Open your site.",
    "Click anywhere.",
    "Tell us what you'd like to improve.",
  ] as const,
  reviewEmptyGuideClosing: "We'll take care of the rest.",

  requestEyebrow: "New revision",
  requestTitle: "Submit website feedback",
  requestLead:
    "Tell us what you'd like changed on your site. Be specific — we'll handle the rest and keep you updated here.",
  requestFocusIntro: "What would you like us to update?",
  requestDetailsHint:
    "Be specific — current copy, what should change, or what you're seeing. The more context, the fewer back-and-forths.",
  requestLocationHint:
    "Pick a page and section so we go straight to the right place. Leave blank if it applies site-wide.",
  requestConfirmIntro: "Does this look right?",
  contextFromReviewUrl: "We pre-filled the page from your review link. Adjust anything before sending.",
  requestFlowStepFocus: "What to change",
  requestFlowStepDetails: "Your notes",
  requestFlowStepConfirm: "Review & send",

  confirmTitle: "Thank you — we've received it.",
  confirmMessage:
    "Your feedback is with our team. We'll keep you updated here as work moves forward.",
  confirmReferenceLabel: "Reference",
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

  identityWorkspace: "Your workspace",

  authLoginEyebrow: "Your workspace",
  authLoginTitle: "Sign in",
  authLoginLead:
    "Review your site, share feedback, and follow every revision — all in one place.",
  authLoginEmail: "Email",
  authLoginPassword: "Password",
  authLoginSubmit: "Sign in",
  authLoginSubmitting: "Signing in…",
  authLoginForgot: "Forgot your password?",
  authLoginErrorGeneric: "We couldn't sign you in. Please check your email and password.",
  authLoginErrorUnavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
  authLoginErrorInactive:
    "This workspace account isn't active. Please reach out to us for help.",

  authForgotTitle: "Reset your workspace password",
  authForgotLead: "We'll send a secure link to the email on your account.",
  authForgotSubmit: "Send reset link",
  authForgotSubmitting: "Sending…",
  authForgotSuccessTitle: "Check your email",
  authForgotSuccessMessage:
    "If we found your account, a reset link is on its way. It expires in one hour.",
  authForgotError: "We couldn't send the reset link just now. Please try again.",
  authForgotBack: "Back to sign in",

  authResetTitle: "Choose a new password",
  authResetLead: "Use at least 8 characters. You'll sign in with this password going forward.",
  authResetPassword: "New password",
  authResetSubmit: "Update password",
  authResetSubmitting: "Updating…",
  authResetSuccessTitle: "You're all set",
  authResetSuccessMessage: "Your password has been updated.",
  authResetSuccessCta: "Enter your workspace",
  authResetInvalidLink: "This link isn't valid anymore.",
  authResetInvalidCta: "Request a new link",
  authResetError: "We couldn't update your password. Please try again or request a new link.",

  authEmailSubject: "Reset your workspace password",
  authEmailFooter: "Powered by Kreate by Design",

  confirmErrorTitle: "Something didn't go through",

  connectedCurrentWork: "Current updates",
  connectedCurrentWorkEmpty:
    "No active updates yet. Submit your first website review request and we'll track everything here.",
  connectedWebsite: "Your website",
  connectedWebsiteReview: "Website Review",
  connectedWebsiteAvailable: "Available",
  connectedWebsiteActiveRevisions: (count: number) =>
    count === 1 ? "1 active revision" : `${count} active revisions`,
  connectedWebsiteLastActivity: "Last activity",
  connectedWebsiteNoActivity: "No recent activity yet",
  connectedRecentActivity: "Recent Activity",
  connectedRecentActivityEmpty:
    "Updates will appear here as revisions move forward. Start with a website review when you're ready.",
  connectedDeliverables: "Latest deliverables",
  connectedDeliverablesEmpty:
    "New deliverables will appear here when they're ready to share.",
  connectedQuickActions: "Quick actions",
  connectedQuickActionReviewWebsite: "Review website",
  connectedQuickActionStartReview: "Submit feedback",
  connectedQuickActionUploadAssets: "Upload Assets",
  connectedQuickActionMessageKxd: "Message KXD",
  connectedQuickActionComingSoon: "Coming soon",
  connectedWebsiteUnavailable: "Unavailable",
  connectedWebsiteUrlMissing: "Website URL not configured",
  connectedWebsiteLatestStatus: "Latest status",
  connectedViewDeliverables: "View deliverables",
  connectedOpenRevision: "Open revision",
  connectedWorkAwaiting: "Waiting on you",
  connectedWorkInProgress: "In progress",
  connectedWorkRecentlyComplete: "Recently complete",
} as const;

export function portalCopy(
  profileTerminology: Record<string, string> | undefined,
  key: string,
  fallback: string,
): string {
  return profileTerminology?.[key] ?? fallback;
}
