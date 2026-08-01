/**
 * Phase 4 Batch I — one-time recovery codes.
 */

import {
  generateRecoveryCode,
  hashRecoveryCode,
  RECOVERY_CODE_COUNT,
  recoveryCodesMatch,
} from "./crypto";

export type GeneratedRecoveryBatch = {
  batchId: string;
  plaintextCodes: string[];
  hashes: string[];
};

export function generateRecoveryCodeBatch(
  count = RECOVERY_CODE_COUNT,
): GeneratedRecoveryBatch {
  const batchId = `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const plaintextCodes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateRecoveryCode();
    plaintextCodes.push(code);
    hashes.push(hashRecoveryCode(code));
  }
  return { batchId, plaintextCodes, hashes };
}

export function findMatchingRecoveryCodeHash(
  rawCode: string,
  unusedHashes: string[],
): string | null {
  for (const hash of unusedHashes) {
    if (recoveryCodesMatch(rawCode, hash)) return hash;
  }
  return null;
}
