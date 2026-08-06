/**
 * Canonical KXD standard — Cancellation, Termination, and Refunds.
 *
 * Single authoritative source for Direct Agreements and proposal-generated
 * contract drafts where the same boilerplate is intended to apply.
 * Deal-specific overrides remain on the agreement record / form fields.
 */

export const STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS_TITLE =
  "Cancellation, Termination, and Refunds";

export const STANDARD_RENEWAL_BEHAVIOR =
  "Services do not automatically renew unless this Agreement expressly includes an automatic-renewal provision and the Client affirmatively accepts those renewal terms.";

/**
 * Full approved standard section, including Renewal.
 * Use as the default for Direct Agreement `cancellationRefundLanguage`
 * and proposal contract `termAndTermination`.
 */
export const STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS = [
  "Client cancellation. The Client may request cancellation or discontinuation of services at any time by providing written notice to Kreate by Design (“KXD”). A cancellation request stops future work only after KXD confirms receipt and identifies an effective stop date. Cancellation does not cancel, reduce, or reverse fees already earned, invoiced, paid, committed, or otherwise due under this Agreement.",
  "",
  "Non-refundable fees. Unless this Agreement expressly states otherwise, all setup fees, deposits, advance payments, prepaid service fees, design fees, retainers, and payments for reserved production capacity are non-refundable once work has begun, project scheduling or capacity has been reserved, services have been made available, or the service term has started. This applies whether the Client uses all included services, hours, revisions, credits, or capacity.",
  "",
  "Fixed-term and prepaid agreements. For a fixed-term or prepaid engagement, the Client is purchasing KXD’s availability, reserved capacity, planning, and services for the full agreed term. If the Client chooses to stop, pause, reduce, or discontinue the engagement before the end of that term, no refund, credit, proration, or transfer is due, and any unpaid committed balance remains payable.",
  "",
  "Monthly services. For a month-to-month engagement, cancellation becomes effective at the end of the current paid billing period unless the Agreement states a different notice period. Amounts already paid or due for the current billing period are non-refundable and are not prorated.",
  "",
  "Unused services and capacity. Unused hours, revisions, credits, deliverables, or production capacity expire according to the terms of the applicable service period and do not roll over, convert to cash, transfer to another client or project, or create a refund unless KXD agrees otherwise in writing.",
  "",
  "Client delay or nonperformance. Delays caused by missing content, approvals, access, feedback, payment, or other Client responsibilities do not extend the service term or create a refund. KXD may pause or reschedule work until the Client fulfills those responsibilities.",
  "",
  "KXD suspension or termination. KXD may suspend or terminate services for nonpayment, material breach, unlawful activity, abusive conduct, repeated failure to provide required materials or approvals, or conduct that prevents KXD from reasonably performing the work. In those circumstances, paid amounts remain non-refundable and all earned or committed fees remain due.",
  "",
  "Termination by KXD without Client breach. If KXD terminates an engagement for reasons unrelated to the Client’s breach and is unable or unwilling to complete material services already paid for, KXD may, at its discretion, provide a reasonable prorated refund or service credit for clearly unperformed work. This does not include reserved capacity, completed strategy, administrative work, third-party costs, completed deliverables, or work already performed.",
  "",
  "Third-party costs. Domain fees, hosting, printing, advertising spend, software costs, licensing fees, stock assets, payment-processing fees, subcontractor expenses, and other third-party charges are non-refundable once incurred or committed.",
  "",
  "Billing disputes. The Client agrees to contact KXD and make a good-faith effort to resolve any billing concern before initiating a payment dispute or chargeback. This does not waive any rights that cannot legally be waived.",
  "",
  "Exceptions. Any refund, credit, extension, transfer, or exception must be approved by KXD in writing. Nothing in this section limits any non-waivable right or remedy required by applicable law.",
  "",
  `Renewal. ${STANDARD_RENEWAL_BEHAVIOR}`,
].join("\n");

/** Stable markers used by verification — do not treat as customer-facing copy. */
export const STANDARD_CANCELLATION_REFUND_MARKERS = [
  "Client cancellation.",
  "Non-refundable fees.",
  "Fixed-term and prepaid agreements.",
  "Monthly services.",
  "Unused services and capacity.",
  "Client delay or nonperformance.",
  "KXD suspension or termination.",
  "Termination by KXD without Client breach.",
  "Third-party costs.",
  "Billing disputes.",
  "Exceptions.",
  "Renewal.",
] as const;
