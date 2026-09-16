/**
 * KXD OS — Account Statement commercial document.
 *
 * Canonical client-facing Account Statement for every KXD client.
 * Path: ledger obligations → composeAccountStatement → AccountStatementDocument
 * → Admin Statements UI / Portal Billing projection / PDF renderer.
 *
 * Do not create client-specific statement templates or parallel PDF renderers.
 * Extend this composer + document model instead.
 */

export type {
  AccountStatementClosingNote,
  AccountStatementDocument,
  AccountStatementMoneyLine,
  AccountStatementOpenBalance,
  AccountStatementPayment,
  AccountStatementServiceCharge,
} from "./types";

export {
  assertAccountStatementValid,
  validateAccountStatement,
} from "./validate";

export {
  composeAccountStatement,
  clientFacingOpenBalanceStatusLabel,
  clientFacingServiceChargeLabel,
  buildFinalAccountPositionLines,
  type AccountStatementLedgerTotals,
  type ComposeAccountStatementInput,
  type ComposeAccountStatementResult,
  type OpenInvoiceContext,
} from "./compose";

export {
  clientFacingPaymentLabel,
  clientFacingPaymentReference,
  isClientFacingPaymentReference,
  normalizeObligationPaymentHistory,
  projectServiceFamily,
  type NormalizedStatementPayment,
} from "./normalize-payment-history";

export {
  PLATINUM_FILM_WORKZ_STATEMENT_2026_09_12,
  PLATINUM_OPEN_INVOICE_CONTEXT,
  buildPlatinumFilmWorkzLedgerObligations,
  composePlatinumFilmWorkzStatement20260912,
} from "./platinum-film-workz-2026-09-12";

export {
  buildAccountStatementFilename,
  renderAccountStatementPdf,
} from "./export-pdf";
