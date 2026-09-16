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

  // Currently outstanding is currently-due remaining only — not contractual
  // project remaining + every future service charge.
  const openBalances = doc.openBalances;
  if (!openBalances) {
    issues.push("Open balances section is required.");
  } else {
    const openSum = addCents(...openBalances.items.map((item) => item.remainingCents));
    if (openSum !== openBalances.totalRemainingCents) {
      issues.push(
        `Open balances total ${openBalances.totalRemainingCents} ≠ sum of remaining ${openSum}`,
      );
    }
    if (openBalances.totalRemainingCents !== summary.totalOutstandingCents) {
      issues.push(
        `Open balances total ${openBalances.totalRemainingCents} ≠ summary outstanding ${summary.totalOutstandingCents}`,
      );
    }
    for (const item of openBalances.items) {
      const expectedRemaining = item.originalCents - item.paidCents;
      if (item.remainingCents !== expectedRemaining) {
        issues.push(
          `Open balance ${item.id} remaining ${item.remainingCents} ≠ original ${item.originalCents} − paid ${item.paidCents}`,
        );
      }
      if (item.remainingCents <= 0) {
        issues.push(`Open balance ${item.id} must have remaining > 0.`);
      }
    }
    const upcoming = openBalances.upcomingItems ?? [];
    for (const item of upcoming) {
      const expectedRemaining = item.originalCents - item.paidCents;
      if (item.remainingCents !== expectedRemaining) {
        issues.push(
          `Upcoming balance ${item.id} remaining ${item.remainingCents} ≠ original ${item.originalCents} − paid ${item.paidCents}`,
        );
      }
      if (item.remainingCents <= 0) {
        issues.push(`Upcoming balance ${item.id} must have remaining > 0.`);
      }
      if (openBalances.items.some((current) => current.id === item.id)) {
        issues.push(`Balance ${item.id} cannot be both currently due and upcoming.`);
      }
    }
  }

  if (
    summary.accountPaymentsReceivedCents != null &&
    summary.accountPaymentsReceivedCents !== paymentHistory.totalReceivedCents
  ) {
    issues.push(
      `Account payments ${summary.accountPaymentsReceivedCents} ≠ history total ${paymentHistory.totalReceivedCents}`,
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
