import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";

export type CommercialDocumentRef = NonNullable<
  ContractLifecyclePackage["documentRefs"]
>[number];

function isNewerDocumentRef(
  candidate: CommercialDocumentRef,
  current: CommercialDocumentRef,
): boolean {
  if (candidate.version !== current.version) {
    return candidate.version > current.version;
  }
  return candidate.id > current.id;
}

/** Latest filed document for a kind — by version, then id. Ignores array order. */
export function resolveLatestDocumentRef(
  refs: CommercialDocumentRef[] | null | undefined,
  kind: string,
): CommercialDocumentRef | undefined {
  let latest: CommercialDocumentRef | undefined;
  for (const ref of refs ?? []) {
    if (ref.kind !== kind) continue;
    if (!latest || isNewerDocumentRef(ref, latest)) {
      latest = ref;
    }
  }
  return latest;
}

/**
 * Primary agreement artifact for operator quick actions:
 * latest executed contract, else latest direct agreement, else first ref (legacy single-doc).
 */
export function resolvePrimaryAgreementDocumentRef(
  refs: CommercialDocumentRef[] | null | undefined,
): CommercialDocumentRef | undefined {
  return (
    resolveLatestDocumentRef(refs, "executed-contract") ??
    resolveLatestDocumentRef(refs, "direct-agreement") ??
    refs?.[0]
  );
}
