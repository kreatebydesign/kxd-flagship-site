/**
 * Universal Proposal → Acceptance → Contract → Dual E-Sign → Billing lifecycle.
 * Server-only orchestration — import concrete paths from client components.
 */

export * from "./types.ts";
export * from "./progression.ts";
export * from "./hash.ts";
export * from "./delivery-preview.ts";
export * from "./structured-payment-terms.ts";
export * from "./billing-readiness.ts";
export * from "./signatures.ts";
export * from "./billing-plan.ts";
export * from "./mock-stripe-billing.ts";
export * from "./package.ts";
export * from "./executed-seal.ts";
export * from "./notifications.ts";
export * from "./transitions.ts";
export * from "./billing-identity.ts";
export * from "./email-templates.ts";
export * from "./mock-webhook.ts";
export {
  getContractLifecycle,
  ensureLifecycleHydrated,
  simulateLocalProposalSend,
  signContractAsOperator,
  sendContractForClientSignature,
  signContractAsClient,
  simulateVerifiedInitialPayment,
  summarizeProgression,
  markMaterialContractEdit,
  resolveClientBillingIdentity,
  voidContract,
  prepareMockStripeDraftsForContract,
  processLifecycleMockPaymentWebhook,
} from "./services.ts";
