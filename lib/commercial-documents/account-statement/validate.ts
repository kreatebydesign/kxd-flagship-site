/**
 * Validate Account Statement arithmetic before render.
 * Returns human-readable issues (empty = valid).
 */

import { addCents } from "@/lib/proposal-builder/money";
import type { AccountStatementDocument } from "./types";

export function validateAccountStatement(
  doc: AccountStatementDocument,
): string[] {
  const issues: string[] = [];
  const { summary, paymentHistory, currentCharges, finalPosition } = doc;

  const expectedProjectBalance = summary.originalProjectCents - summary.paymentsReceivedCents;
  if (summary.projectBalanceCents !== expectedProjectBalance) {
    issues.push(
      `Project balance ${summary.projectBalanceCents} ≠ original ${summary.originalProjectCents} − payments ${summary.paymentsReceivedCents}`,
    );
  }

  const paymentsSum = addCents(
    ...paymentHistory.payments.map((p) => p.amountCents),
  );
  if (paymentsSum !== paymentHistory.totalReceivedCents) {
    issues.push(
      `Payment history total ${paymentHistory.totalReceivedCents} ≠ sum of payments ${paymentsSum}`,
    );
  }
  // History may include all account payments; summary.paymentsReceived is
  // project-scoped for the project-balance identity. Require history ≥ project paid.
  if (paymentHistory.totalReceivedCents < summary.paymentsReceivedCents) {
    issues.push(
      `Payment history total ${paymentHistory.totalReceivedCents} < project payments ${summary.paymentsReceivedCents}`,
    );
  }
  if (paymentHistory.remainingCents !== summary.projectBalanceCents) {
    issues.push(
      `History remaining ${paymentHistory.remainingCents} ≠ summary balance ${summary.projectBalanceCents}`,
    );
  }

  const chargesSum = addCents(...currentCharges.items.map((i) => i.amountCents));
  if (chargesSum !== currentCharges.subtotalCents) {
    issues.push(
      `Current charges subtotal ${currentCharges.subtotalCents} ≠ sum ${chargesSum}`,
    );
  }
  if (currentCharges.subtotalCents !== summary.currentChargesCents) {
    issues.push(
      `Summary current charges ${summary.currentChargesCents} ≠ section subtotal ${currentCharges.subtotalCents}`,
    );
  }

  const finalSum = addCents(...finalPosition.lines.map((l) => l.amountCents));
  if (finalSum !== finalPosition.totalCents) {
    issues.push(
      `Final position total ${finalPosition.totalCents} ≠ sum of lines ${finalSum}`,
    );
  }
  if (finalPosition.totalCents !== summary.totalOutstandingCents) {
    issues.push(
      `Summary outstanding ${summary.totalOutstandingCents} ≠ final total ${finalPosition.totalCents}`,
    );
  }

  const expectedOutstanding = addCents(
    summary.projectBalanceCents,
    summary.currentChargesCents,
  );
  if (summary.totalOutstandingCents !== expectedOutstanding) {
    issues.push(
      `Outstanding ${summary.totalOutstandingCents} ≠ balance ${summary.projectBalanceCents} + charges ${summary.currentChargesCents}`,
    );
  }

  return issues;
}

export function assertAccountStatementValid(
  doc: AccountStatementDocument,
): void {
  const issues = validateAccountStatement(doc);
  if (issues.length > 0) {
    throw new Error(
      `Account Statement arithmetic invalid:\n- ${issues.join("\n- ")}`,
    );
  }
}
