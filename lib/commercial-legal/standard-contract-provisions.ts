/**
 * Reusable KXD contract foundation — operational commercial language.
 *
 * NOT attorney-approved. Preserve the internal-review / approve-for-signature gate.
 * Do not invent governing-law jurisdiction here.
 */

export const STANDARD_CONTRACT_FOUNDATION_VERSION = "kxd-contract-foundation-v1" as const;

export const STANDARD_PAYMENT_DEFAULT = [
  "Invoices and scheduled payments are due as stated in the payment schedule of this Agreement.",
  "If any scheduled amount becomes overdue, KXD may pause or reschedule work until the account is brought current after written notice.",
  "Allowing work to begin after a partial deposit or installment does not waive, postpone, cancel, or modify any remaining payment obligations.",
].join(" ");

export const STANDARD_INTELLECTUAL_PROPERTY = [
  "Upon KXD’s receipt of full payment for the applicable project fees under this Agreement, the Client receives the rights to the final client-specific website deliverables produced for the Client under this Agreement, as those deliverables are defined in the accepted scope.",
  "KXD retains all ownership of pre-existing intellectual property and reusable materials, including without limitation frameworks, systems, utilities, internal tooling, processes, methods, know-how, libraries, templates, design systems, and generalized components.",
  "Third-party software, fonts, stock assets, plugins, hosting platforms, and other licensed materials remain subject to their respective licenses and terms.",
  "Unpaid work, unfinished work, and work not included in the accepted scope do not transfer to the Client.",
  "Nothing in this Agreement assigns ownership of KXD OS, reusable KXD frameworks, internal systems, or generalized development intellectual property to the Client.",
].join(" ");

export const STANDARD_PORTFOLIO_PUBLICITY = [
  "Unless the Client provides a written restriction for confidentiality or another legitimate reason, KXD may display publicly launched, non-confidential work in KXD’s portfolio, case studies, website, social media, and sales or marketing materials.",
  "KXD will reasonably honor written Client restrictions that identify confidential materials or other legitimate limits on publicity.",
].join(" ");

export const STANDARD_CONFIDENTIALITY = [
  "Each party will protect the other party’s non-public confidential information and use it only to perform under this Agreement.",
  "Confidentiality obligations do not apply to information that is public through no fault of the receiving party, independently developed, rightfully received from a third party without duty of confidentiality, or required to be disclosed by law.",
].join(" ");

export const STANDARD_WARRANTIES_DISCLAIMERS = [
  "KXD will perform the services in a professional and workmanlike manner consistent with ordinary commercial practice for comparable services.",
  "Except as expressly stated in this Agreement, services and deliverables are provided as-is to the maximum extent permitted by law, and KXD disclaims all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement, to the extent such disclaimer is allowed.",
  "KXD does not guarantee specific search rankings, traffic, leads, conversions, or revenue.",
].join(" ");

export const STANDARD_LIMITATION_OF_LIABILITY = [
  "To the maximum extent permitted by law, KXD’s aggregate liability arising out of or related to this Agreement will not exceed the total fees actually paid by the Client to KXD under this Agreement for the services giving rise to the claim during the twelve (12) months before the claim arose.",
  "To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, or business interruption, even if advised of the possibility of such damages.",
  "Nothing in this section limits liability that cannot be limited under applicable law.",
].join(" ");

export const STANDARD_INDEMNITY = [
  "The Client will defend and indemnify KXD against third-party claims arising from Client-provided content, materials, instructions, or factual representations, or from the Client’s misuse of the deliverables, except to the extent caused by KXD’s willful misconduct.",
  "KXD will defend and indemnify the Client against third-party claims that the final client-specific deliverables originally created by KXD and delivered under this Agreement infringe a third party’s U.S. intellectual-property right, excluding claims arising from Client materials, third-party components, or modifications not made by KXD.",
].join(" ");

export const STANDARD_INDEPENDENT_CONTRACTOR =
  "Kreate by Design is an independent contractor. Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship between the parties.";

export const STANDARD_FORCE_MAJEURE =
  "Neither party is liable for delay or failure to perform caused by events beyond that party’s reasonable control, including natural disasters, war, terrorism, labor disputes, government action, utility or internet failures, or third-party platform outages. Payment obligations for work already performed remain due.";

export const STANDARD_DISPUTE_RESOLUTION =
  "Before filing a formal proceeding, the parties will attempt in good faith to resolve any dispute through direct discussion between authorized representatives. This does not prevent either party from seeking provisional relief to protect rights or property.";

/** Used when jurisdiction has not been configured in KXD OS. */
export const GOVERNING_LAW_PENDING_CONFIGURATION =
  "Governing law and venue will be confirmed by Kreate by Design before this agreement is approved for signature.";

export const STANDARD_ENTIRE_AGREEMENT =
  "This Agreement, including its exhibits and the accepted proposal snapshot referenced for commercial scope and pricing, is the entire agreement between the parties and supersedes prior discussions and drafts on the same subject. If a conflict exists between this Agreement and a proposal narrative, this signed Agreement controls legal terms, and the accepted commercial snapshot controls accepted scope, pricing, and selected options.";

export const STANDARD_AMENDMENTS =
  "Amendments must be in writing and agreed by both parties. Email or other written electronic confirmation may satisfy this requirement when both parties clearly agree to the specific change.";

export const STANDARD_ELECTRONIC_SIGNATURES =
  "Electronic signatures and electronic records may be used if both parties agree and applicable law permits. A typed name alone is not treated as a fully executed agreement unless the supported KXD signature workflow records execution.";

export const STANDARD_COUNTERPARTS =
  "This Agreement may be executed in counterparts, including electronic counterparts, each of which is deemed an original, and all of which together constitute one agreement.";

export const WEBSITE_CARE_LOCAL_VISIBILITY_INCLUDES = [
  "Routine website content updates and minor edits",
  "Website maintenance",
  "Basic technical SEO maintenance",
  "Google Search Console and indexing monitoring",
  "Local organic search visibility support",
  "Google Business Profile website and search alignment assistance",
  "GA4 / basic analytics monitoring",
  "DNS management",
  "Hosting management and oversight",
  "SSL and security monitoring",
  "Uptime and basic website health oversight",
  "Contact-form and critical-link checks",
  "Reasonable website support",
  "Minor technical troubleshooting",
] as const;

export const WEBSITE_CARE_LOCAL_VISIBILITY_EXCLUDES = [
  "Unlimited design or development",
  "New major pages or substantial page redesigns",
  "Custom application functionality",
  "Ecommerce development",
  "Large content migrations",
  "Extensive copywriting or content production",
  "Paid advertising management or ad spend",
  "Social media management",
  "Advanced SEO campaigns",
  "Backlink or link-building campaigns",
  "Guaranteed rankings, traffic, leads, or revenue",
  "Third-party subscription, license, or domain costs unless expressly included",
  "Emergency work outside the agreed service scope",
  "Major integrations or custom development",
] as const;

export const WEBSITE_CARE_RANKING_DISCLAIMER =
  "SEO and local visibility work improves and maintains the website’s search foundation. KXD does not guarantee specific rankings, traffic, leads, or revenue.";

export const DEPOSIT_INSTALLMENT_ACCOMMODATION =
  "KXD has agreed to permit the initial project deposit to be paid in scheduled installments as a payment accommodation. The installments together constitute one deposit obligation toward the accepted project total. Allowing work to begin after receipt of the first installment does not waive, postpone, cancel, or modify the remaining scheduled payment obligations. If a scheduled payment becomes overdue, KXD may pause or reschedule work until the account is brought current.";
