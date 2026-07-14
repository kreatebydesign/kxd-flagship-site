/**
 * Phase 33A.1 — Bounded provider execution timeout.
 */

export class ReportingProviderTimeoutError extends Error {
  readonly timedOut = true as const;

  constructor(ms: number) {
    super(`Provider execution timed out after ${ms}ms.`);
    this.name = "ReportingProviderTimeoutError";
  }
}

export async function withReportingProviderTimeout<T>(
  ms: number,
  work: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new ReportingProviderTimeoutError(ms));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
