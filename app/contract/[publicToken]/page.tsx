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

  return (
    <ContractSigningClient
      publicToken={publicToken}
      title={String(contract.title ?? "Agreement")}
      body={toClientFacingContractBody(String(contract.body ?? ""))}
      consentText={ELECTRONIC_SIGNATURE_CONSENT_TEXT}
      consentVersion={ELECTRONIC_SIGNATURE_CONSENT_VERSION}
      operatorSignedBy={pkg.operatorSignature.legalName}
      operatorSignedAt={pkg.operatorSignature.signedAt}
    />
  );
}
