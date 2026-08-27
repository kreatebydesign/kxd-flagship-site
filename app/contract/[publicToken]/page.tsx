import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { ContractSigningClient } from "@/components/proposal/ContractSigningClient";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import {
  ELECTRONIC_SIGNATURE_CONSENT_TEXT,
  ELECTRONIC_SIGNATURE_CONSENT_VERSION,
} from "@/lib/proposal-lifecycle/signatures";
import { hashPublicToken } from "@/lib/proposal-lifecycle/hash";
import { isSigningLinkExpired } from "@/lib/proposal-lifecycle/token-expiry";
import { toClientFacingContractBody } from "@/lib/proposal-lifecycle/client-facing-contract";
import { legacyPlaintextTokensAllowed } from "@/lib/proposal-builder/protection";
import { parseStoredDirectAgreementTerms } from "@/lib/direct-agreement/validate";
import {
  assertDirectAgreementSigningBindingCurrent,
  DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE,
  isDirectAgreementSource,
  resolveDirectAgreementClientFacingBody,
} from "@/lib/direct-agreement/signing-integrity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KXD Agreement",
  robots: { index: false, follow: false },
  other: {
    referrer: "no-referrer",
  },
};

function Unavailable({ title, message }: { title: string; message: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f4efe6",
        padding: "2.5rem 1.15rem 3.5rem",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/migrated-assets/brand/kxd-logo-transparent.png"
          alt="Kreate by Design"
          width={96}
          height={90}
          style={{ width: "5.25rem", height: "auto", display: "block", marginBottom: "1.25rem" }}
        />
        <p
          style={{
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontSize: 11,
            color: "#c2aa72",
            fontFamily: "system-ui, sans-serif",
            margin: "0 0 0.65rem",
          }}
        >
          Agreement
        </p>
        <h1
          style={{
            fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif",
            fontWeight: 500,
            fontSize: "clamp(1.65rem, 4.5vw, 2.15rem)",
            lineHeight: 1.2,
            margin: "0 0 0.85rem",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            lineHeight: 1.65,
            color: "rgba(244, 239, 230, 0.62)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 15,
            maxWidth: 540,
          }}
        >
          {message}
        </p>
      </div>
    </main>
  );
}

function resolveSigningBody(
  contract: Record<string, unknown>,
  pkg: ReturnType<typeof normalizeLifecyclePackage>,
): string {
  const agreementSource = contract.agreementSource ? String(contract.agreementSource) : null;
  if (isDirectAgreementSource(agreementSource, pkg)) {
    const daTerms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
    if (daTerms) {
      return resolveDirectAgreementClientFacingBody({
        body: String(contract.body ?? ""),
        terms: daTerms,
        commercialStatus: pkg.commercialStatus,
      });
    }
  }
  return toClientFacingContractBody(String(contract.body ?? ""));
}

export default async function PublicContractSigningPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  if (!publicToken || publicToken.length < 16) {
    return (
      <Unavailable
        title="Agreement unavailable"
        message="This signing link is invalid, expired, or has already been completed."
      />
    );
  }

  const payload = await getPayload({ config });
  const tokenHash = hashPublicToken(publicToken);
  const found = await payload.find({
    collection: "contracts" as never,
    where: { signingTokenHash: { equals: tokenHash } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  let contract = found.docs[0] as Record<string, unknown> | undefined;
  if (!contract && legacyPlaintextTokensAllowed()) {
    const legacy = await payload.find({
      collection: "contracts" as never,
      where: { publicToken: { equals: publicToken } },
      limit: 1,
      overrideAccess: true,
    });
    contract = legacy.docs[0] as Record<string, unknown> | undefined;
  }
  if (!contract) {
    return (
      <Unavailable
        title="Agreement unavailable"
        message="This signing link is invalid, expired, or has already been completed."
      />
    );
  }

  const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  const status = String(contract.status);
  if (["voided", "superseded", "declined", "expired"].includes(status)) {
    return (
      <Unavailable
        title="Agreement closed"
        message="This agreement is no longer open for signature."
      />
    );
  }
  if (pkg.externalAcceptance) {
    return (
      <Unavailable
        title="Already accepted"
        message="This agreement was accepted outside KXD electronic signing. Contact Kreate by Design if you need assistance."
      />
    );
  }
  if (pkg.signingTokenRevokedAt || pkg.clientSignature) {
    return (
      <Unavailable
        title="Already completed"
        message="This signing link has already been used or revoked. Contact Kreate by Design if you need the executed package."
      />
    );
  }
  if (!pkg.operatorSignature) {
    return (
      <Unavailable
        title="Not ready for signature"
        message="Kreate by Design has not yet signed this agreement. Please wait for the operator signing step."
      />
    );
  }
  if (isSigningLinkExpired(pkg.signingTokenExpiresAt)) {
    return (
      <Unavailable
        title="Link expired"
        message="This signing link has expired. Ask Kreate by Design to send a fresh link."
      />
    );
  }

  const agreementSource = contract.agreementSource ? String(contract.agreementSource) : null;
  if (isDirectAgreementSource(agreementSource, pkg)) {
    const daTerms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
    const terms = pkg.structuredPaymentTerms;
    if (!daTerms || !terms) {
      return (
        <Unavailable
          title="Agreement unavailable"
          message="This agreement is not ready for electronic signature. Contact Kreate by Design."
        />
      );
    }
    try {
      assertDirectAgreementSigningBindingCurrent({
        pkg,
        operatorDocumentHash: pkg.operatorSignature.documentHash,
        contractId: Number(contract.id),
        rawContractBody: String(contract.body ?? ""),
        terms,
        daTerms,
        revisionNumber: Number(contract.revisionNumber ?? 1) || 1,
        commercialStatus: pkg.commercialStatus,
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message === DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE
          ? err.message
          : "This agreement has been updated since the signing link was prepared. Ask Kreate by Design for a fresh link.";
      return <Unavailable title="Agreement updated" message={message} />;
    }
  }

  return (
    <ContractSigningClient
      publicToken={publicToken}
      title={String(contract.title ?? "Agreement")}
      clientName={resolveAgreementClientName(contract)}
      body={resolveSigningBody(contract, pkg)}
      consentText={ELECTRONIC_SIGNATURE_CONSENT_TEXT}
      consentVersion={ELECTRONIC_SIGNATURE_CONSENT_VERSION}
      operatorSignedBy={pkg.operatorSignature.legalName}
      operatorSignedAt={pkg.operatorSignature.signedAt}
    />
  );
}

/** Display-only client label — never mutates stored contract fields. */
function resolveAgreementClientName(contract: Record<string, unknown>): string {
  const draft = contract.contractDraftSnapshot as
    | { parties?: { clientName?: string | null } }
    | null
    | undefined;
  const fromDraft = String(draft?.parties?.clientName ?? "").trim();
  if (fromDraft) return fromDraft;

  const client = contract.client;
  if (client && typeof client === "object") {
    const named = String((client as { name?: string | null }).name ?? "").trim();
    if (named) return named;
  }

  const bodyMatch = String(contract.body ?? "").match(/^Client:\s*(.+)$/m);
  return bodyMatch?.[1]?.trim() ?? "";
}
